/**
 * Colour counting and histogram building.
 *
 * Everything here is allocation-light: open-addressing hash tables over
 * typed arrays, one pass over the pixels per attempt.
 */

import { rgbaToInternal } from "./space";

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function hash(key: number, shift: number): number {
  return Math.imul(key, 0x9e3779b1) >>> shift;
}

/**
 * Exact count of distinct RGBA values, treating every fully transparent
 * pixel as the same colour. Stops as soon as the count exceeds `limit`
 * and returns `limit + 1`. Also reports whether the image has several
 * distinct RGB values hiding under α=0 (so a pass-through can normalise).
 */
export function countUniqueColors(
  data: Uint8ClampedArray,
  limit: number,
): { count: number; transparentVariants: boolean } {
  const bits = Math.max(4, Math.log2(nextPow2(limit * 4)));
  const size = 1 << bits;
  const mask = size - 1;
  const shift = 32 - bits;
  const keys = new Uint32Array(size);
  const used = new Uint8Array(size);
  const u32 = new Uint32Array(data.buffer, data.byteOffset, data.byteLength >> 2);
  let count = 0;
  let hasTransparent = false;
  let firstTransparent = -1;
  let transparentVariants = false;
  let last = -1;
  let lastValid = false;
  for (let p = 0; p < u32.length; p++) {
    const key = u32[p];
    if (lastValid && key === last) continue;
    if (data[(p << 2) + 3] === 0) {
      if (!hasTransparent) {
        hasTransparent = true;
        firstTransparent = key;
        count++;
        if (count > limit) return { count, transparentVariants };
      } else if (key !== firstTransparent) {
        transparentVariants = true;
      }
      last = key;
      lastValid = true;
      continue;
    }
    let h = hash(key, shift);
    for (;;) {
      if (used[h] === 0) {
        used[h] = 1;
        keys[h] = key;
        count++;
        if (count > limit) return { count, transparentVariants };
        break;
      }
      if (keys[h] === key) break;
      h = (h + 1) & mask;
    }
    last = key;
    lastValid = true;
  }
  return { count, transparentVariants };
}

/** Histogram of (possibly bucketed) colours in internal space. */
export interface Histogram {
  /** Number of entries. */
  size: number;
  /** Internal-space vectors, 4 per entry. */
  vec: Float64Array;
  /** Pixel count per entry (drives palette building). */
  weight: Float64Array;
  /** Importance-weighted pixel mass per entry (drives palette sizing). */
  importance: Float64Array;
  /** 1 when every pixel in the entry is fully opaque. */
  opaque: Uint8Array;
  /** Count of fully transparent pixels (not in the histogram). */
  transparentPixels: number;
  /** Smooth-pixel (gradient, unmasked) count per entry. */
  smooth: Float64Array;
  /** Total smooth-pixel count. */
  totalSmooth: number;
  /** Total importance over all entries. */
  totalImportance: number;
  /** Total weight over all entries. */
  totalWeight: number;
}

/**
 * Build a histogram with RGB(A) bucketed by `precisionShift` low bits.
 * Bucket centroids are exact alpha-weighted means of their pixels, so
 * bucketing only merges near-identical colours, it doesn't bias them.
 * Returns null when more than `cap` buckets would be needed.
 *
 * `importance` (optional, per pixel) is accumulated separately; colour
 * means and `weight` are plain pixel counts.
 */
export function buildHistogram(
  data: Uint8ClampedArray,
  importance: Float32Array | null,
  smoothMask: Uint8Array | null,
  precisionShift: number,
  cap: number,
): Histogram | null {
  const bits = Math.max(4, Math.log2(nextPow2(cap * 2)));
  const size = 1 << bits;
  const mask = size - 1;
  const hshift = 32 - bits;
  const keys = new Uint32Array(size);
  const slot = new Int32Array(size).fill(-1);
  // Accumulators, indexed by entry id.
  const w = new Float64Array(cap);
  const wi = new Float64Array(cap);
  const wsm = new Float64Array(cap);
  const sr = new Float64Array(cap);
  const sg = new Float64Array(cap);
  const sb = new Float64Array(cap);
  const sa = new Float64Array(cap);
  const opaque = new Uint8Array(cap);
  let n = 0;
  let transparent = 0;
  const s = precisionShift;
  const pixels = data.length >> 2;
  let lastKey = -1;
  let lastId = -1;
  for (let p = 0; p < pixels; p++) {
    const i = p << 2;
    const a = data[i + 3];
    if (a === 0) {
      transparent++;
      continue;
    }
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // α=255 keeps its own code so opaque never merges with α=254.
    const ak = a === 255 ? 255 : a >> s;
    const key = (((r >> s) << 24) | ((g >> s) << 16) | ((b >> s) << 8) | ak) >>> 0;
    let id: number;
    if (key === lastKey) {
      id = lastId;
    } else {
      let h = hash(key, hshift);
      for (;;) {
        const sl = slot[h];
        if (sl === -1) {
          if (n >= cap) return null;
          slot[h] = n;
          keys[h] = key;
          opaque[n] = a === 255 ? 1 : 0;
          id = n++;
          break;
        }
        if (keys[h] === key) {
          id = sl;
          break;
        }
        h = (h + 1) & mask;
      }
      lastKey = key;
      lastId = id;
    }
    w[id] += 1;
    wi[id] += importance === null ? 1 : importance[p];
    if (smoothMask !== null) wsm[id] += smoothMask[p];
    sa[id] += a;
    sr[id] += a * r;
    sg[id] += a * g;
    sb[id] += a * b;
  }

  const vec = new Float64Array(n * 4);
  let total = 0;
  let totalImp = 0;
  let totalSmooth = 0;
  for (let e = 0; e < n; e++) {
    const ws = w[e];
    total += ws;
    totalImp += wi[e];
    totalSmooth += wsm[e];
    const asum = sa[e];
    rgbaToInternal(sr[e] / asum, sg[e] / asum, sb[e] / asum, asum / ws, vec, e * 4);
  }
  return {
    size: n,
    vec,
    weight: w.subarray(0, n),
    importance: wi.subarray(0, n),
    totalImportance: totalImp,
    smooth: wsm.subarray(0, n),
    totalSmooth,
    opaque: opaque.subarray(0, n),
    transparentPixels: transparent,
    totalWeight: total,
  };
}

/**
 * Build a histogram of at most `cap` entries, coarsening precision until
 * it fits. Exact (shift 0) whenever the image has ≤ cap colours.
 */
export function buildAdaptiveHistogram(
  data: Uint8ClampedArray,
  importance: Float32Array | null,
  smoothMask: Uint8Array | null,
  cap: number,
): Histogram {
  for (let s = 0; s < 5; s++) {
    const h = buildHistogram(data, importance, smoothMask, s, cap);
    if (h !== null) return h;
  }
  // 3 bits per channel always fits any sane cap (≤ 4096 RGB × alpha codes).
  const h = buildHistogram(data, importance, smoothMask, 5, Math.max(cap, 8 * 8 * 8 * 9));
  if (h === null) throw new Error("histogram overflow");
  return h;
}
