/**
 * Remapping with adaptive Floyd–Steinberg error diffusion.
 *
 * Dither only where it buys something:
 *   - per-pixel strength from a contrast map: full in smooth gradients
 *     (where banding shows), fading out on edges and texture (where the
 *     noise is masked anyway and only costs deflate bytes);
 *   - a dead zone: if the source colour already has a palette entry
 *     within `deadZone`, emit it and diffuse nothing, so flat regions
 *     stay flat (and compress) instead of sprouting checkerboards;
 *   - residuals are clamped, so a single bad pixel can't streak;
 *   - fully transparent pixels are never dithered and never receive or
 *     emit error; opaque pixels never receive alpha error.
 * Serpentine scan to avoid FS's directional worms.
 */

import { PaletteSearch } from "./nearest";
import type { Palette } from "./palette";
import { rgbaToInternal } from "./space";

export interface RemapOptions {
  /** Global dither level 0–1 (0 disables diffusion). */
  level: number;
  /** Euclidean internal-space distance under which a colour is "close enough". */
  deadZone: number;
  /** Max residual magnitude carried to neighbours (premultiplied sRGB, 0–1). */
  maxError: number;
  /** Max extra internal-space distance a dithered pick may add over the nearest. */
  guard: number;
}

export interface DitherMap {
  /** Dither strength per pixel, 0–1. */
  strength: Float32Array;
  /** 1 where the pixel equals all four neighbours (a flat fill). */
  flat: Uint8Array;
  /**
   * Share of visible, non-flat pixels whose neighbours differ by < 2 luma
   * levels: how much of the image is smooth shading (where banding is
   * unmasked) rather than texture or edges.
   */
  smoothFraction: number;
}

/**
 * Contrast-driven dither strength per pixel: full in smooth regions
 * (gradients, where banding shows), fading to none on edges and busy
 * texture. Uses the max absolute luma difference to the 4 neighbours,
 * alpha-premultiplied so a silhouette edge counts as an edge. Also flags
 * flat fills, where a near-miss palette colour is better left undithered.
 */
export function computeDitherMap(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  t0: number,
  t1: number,
): DitherMap {
  const n = width * height;
  const luma = new Float32Array(n);
  const u32 = new Uint32Array(data.buffer, data.byteOffset, n);
  for (let p = 0; p < n; p++) {
    const i = p << 2;
    luma[p] = ((0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) * data[i + 3]) / 255;
  }
  const strength = new Float32Array(n);
  const flat = new Uint8Array(n);
  const span = t1 - t0;
  let busy = 0;
  let smooth = 0;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const p = row + x;
      const c = luma[p];
      const k = u32[p];
      let m = 0;
      let same = true;
      let d: number;
      if (x > 0) {
        d = Math.abs(luma[p - 1] - c);
        if (d > m) m = d;
        same = same && u32[p - 1] === k;
      }
      if (x < width - 1) {
        d = Math.abs(luma[p + 1] - c);
        if (d > m) m = d;
        same = same && u32[p + 1] === k;
      }
      if (y > 0) {
        d = Math.abs(luma[p - width] - c);
        if (d > m) m = d;
        same = same && u32[p - width] === k;
      }
      if (y < height - 1) {
        d = Math.abs(luma[p + width] - c);
        if (d > m) m = d;
        same = same && u32[p + width] === k;
      }
      strength[p] = Math.min(1, Math.max(0, 1 - (m - t0) / span));
      flat[p] = same ? 1 : 0;
      if (!same && data[(p << 2) + 3] !== 0) {
        busy++;
        if (m < 2) smooth++;
      }
    }
  }
  return { strength, flat, smoothFraction: busy > 0 ? smooth / busy : 0 };
}

/**
 * Map every pixel to a palette index. `transparentIndex` is the entry
 * used for α=0 pixels (−1 when the image has none).
 */
export function remapPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  pal: Palette,
  transparentIndex: number,
  ditherMap: DitherMap | null,
  opts: RemapOptions,
): Uint8Array {
  const out = new Uint8Array(width * height);
  const all = new PaletteSearch(pal.vec, pal.size);
  // Opaque pixels may only land on opaque entries.
  const opIds: number[] = [];
  for (let c = 0; c < pal.size; c++) if (pal.opaque[c] === 1) opIds.push(c);
  const opVec = new Float64Array(opIds.length * 4);
  for (let i = 0; i < opIds.length; i++) opVec.set(pal.vec.subarray(opIds[i] * 4, opIds[i] * 4 + 4), i * 4);
  const op = opIds.length > 0 ? new PaletteSearch(opVec, opIds.length) : null;

  const stride = (width + 2) * 4;
  let cur = new Float64Array(stride);
  let next = new Float64Array(stride);
  const px = new Float64Array(4);
  const level = opts.level;
  const dz2 = opts.deadZone * opts.deadZone;
  const maxE = opts.maxError;
  const maxE2 = maxE * maxE;
  const guard = opts.guard;
  // Error diffusion runs in alpha-premultiplied sRGB (0–1): that is the
  // space browsers composite in, its gamut is a box (so clamping keeps
  // diffusion stable), and the eye averages dither patterns there well
  // enough. Matching still happens in perceptual internal space.
  const PR = new Float64Array(pal.size * 4);
  for (let c = 0; c < pal.size; c++) {
    const al = pal.rgba[c * 4 + 3] / 255;
    PR[c * 4] = (pal.rgba[c * 4] / 255) * al;
    PR[c * 4 + 1] = (pal.rgba[c * 4 + 1] / 255) * al;
    PR[c * 4 + 2] = (pal.rgba[c * 4 + 2] / 255) * al;
    PR[c * 4 + 3] = al;
  }
  const qv = new Float64Array(4);
  const P = pal.vec;
  let guessOp = 0;
  let guessAll = 0;
  let lastKey = -1;
  let lastNear = 0;
  let lastNearD2 = 0;

  for (let y = 0; y < height; y++) {
    const ltr = (y & 1) === 0;
    const dir = ltr ? 1 : -1;
    next.fill(0);
    for (let k = 0, x = ltr ? 0 : width - 1; k < width; k++, x += dir) {
      const p = y * width + x;
      const i = p << 2;
      const a = data[i + 3];
      const eo = (x + 1) * 4;
      if (a === 0) {
        out[p] = transparentIndex < 0 ? 0 : transparentIndex;
        continue;
      }
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
      const opaque = a === 255;
      if (key !== lastKey) {
        rgbaToInternal(r, g, b, a, px, 0);
        // Undithered nearest for this exact colour (cached across runs).
        if (opaque && op !== null) {
          const l = op.nearest(px[0], px[1], px[2], px[3], guessOp);
          guessOp = l;
          lastNear = opIds[l];
          lastNearD2 = op.lastDist2;
        } else {
          const l = all.nearest(px[0], px[1], px[2], px[3], guessAll);
          guessAll = l;
          lastNear = l;
          lastNearD2 = all.lastDist2;
        }
        lastKey = key;
      }
      const s = ditherMap === null ? 0 : level * ditherMap.strength[p];
      if (s <= 0 || (lastNearD2 <= dz2 && ditherMap !== null && ditherMap.flat[p] === 1)) {
        out[p] = lastNear;
        continue;
      }
      let e0 = cur[eo] * s;
      let e1 = cur[eo + 1] * s;
      let e2 = cur[eo + 2] * s;
      let e3 = opaque ? 0 : cur[eo + 3] * s;
      const m2 = e0 * e0 + e1 * e1 + e2 * e2 + e3 * e3;
      if (m2 > maxE2) {
        const f = maxE / Math.sqrt(m2);
        e0 *= f;
        e1 *= f;
        e2 *= f;
        e3 *= f;
      }
      const al = a / 255;
      let qa = opaque ? 1 : al + e3;
      qa = Math.min(1, Math.max(0, qa));
      let qr = (r / 255) * al + e0;
      let qg = (g / 255) * al + e1;
      let qb = (b / 255) * al + e2;
      qr = Math.min(qa, Math.max(0, qr));
      qg = Math.min(qa, Math.max(0, qg));
      qb = Math.min(qa, Math.max(0, qb));
      let idx: number;
      if (qa <= 0) {
        idx = transparentIndex >= 0 ? transparentIndex : lastNear;
      } else {
        const inv = 255 / qa;
        rgbaToInternal(qr * inv, qg * inv, qb * inv, qa * 255, qv, 0);
        if (opaque && op !== null) {
          const l = op.nearest(qv[0], qv[1], qv[2], qv[3], guessOp);
          idx = opIds[l];
        } else {
          idx = all.nearest(qv[0], qv[1], qv[2], qv[3], lastNear);
        }
      }
      if (idx !== lastNear) {
        // Speckle guard: a dithered pick may differ from the undithered
        // one only by a bounded perceptual step; otherwise accumulated
        // error (e.g. at gamut or alpha edges) would plant outlier dots.
        const vo = idx * 4;
        const d0 = px[0] - P[vo];
        const d1 = px[1] - P[vo + 1];
        const d2 = px[2] - P[vo + 2];
        const d3 = px[3] - P[vo + 3];
        const dd = Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3);
        if (dd > Math.sqrt(lastNearD2) + guard) idx = lastNear;
      }
      out[p] = idx;
      const io = idx * 4;
      const r0 = qr - PR[io];
      const r1 = qg - PR[io + 1];
      const r2 = qb - PR[io + 2];
      const r3 = opaque ? 0 : qa - PR[io + 3];
      // Floyd–Steinberg: 7/16 ahead, 3/16 behind-below, 5/16 below, 1/16 ahead-below.
      const ahead = eo + dir * 4;
      const behind = eo - dir * 4;
      cur[ahead] += r0 * 0.4375;
      cur[ahead + 1] += r1 * 0.4375;
      cur[ahead + 2] += r2 * 0.4375;
      cur[ahead + 3] += r3 * 0.4375;
      next[behind] += r0 * 0.1875;
      next[behind + 1] += r1 * 0.1875;
      next[behind + 2] += r2 * 0.1875;
      next[behind + 3] += r3 * 0.1875;
      next[eo] += r0 * 0.3125;
      next[eo + 1] += r1 * 0.3125;
      next[eo + 2] += r2 * 0.3125;
      next[eo + 3] += r3 * 0.3125;
      next[ahead] += r0 * 0.0625;
      next[ahead + 1] += r1 * 0.0625;
      next[ahead + 2] += r2 * 0.0625;
      next[ahead + 3] += r3 * 0.0625;
    }
    const t = cur;
    cur = next;
    next = t;
  }
  return out;
}
