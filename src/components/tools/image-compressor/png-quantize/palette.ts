/**
 * Palette construction: variance-minimising median cut (Wu-style best
 * split along the best axis) followed by weighted k-means (Lloyd /
 * Voronoi) refinement. Both run on the histogram, never on raw pixels.
 *
 * Clusters are single-class: opaque clusters (α pinned to 255) and
 * translucent ones. Opaque pixels may only use opaque clusters, so they
 * stay exactly opaque; translucent pixels may use any cluster.
 */

import type { Histogram } from "./histogram";
import { PaletteSearch } from "./nearest";
import { internalToRgba, rgbaToInternal } from "./space";

const BINS = 64;
/** Cap on outlier entries considered for rescue (keeps the greedy cover O(n·k)). */
const MAX_OUTLIER_CANDIDATES = 4096;
/** Max existing clusters an outlier rescue may repurpose when the palette is full. */
const MAX_REPLACED = 16;

export interface Palette {
  size: number;
  /** Internal vectors of the (8-bit-snapped) entries, 4 per entry. */
  vec: Float64Array;
  /** 8-bit RGBA, 4 per entry. */
  rgba: Uint8Array;
  /** 1 when the entry is an opaque-class cluster. */
  opaque: Uint8Array;
}

export interface MedianCutResult {
  /** Box id per histogram entry. */
  assign: Int32Array;
  boxes: number;
  /** 1 when the box holds opaque entries (boxes are single-class). */
  opaque: Uint8Array;
  /** Total weighted SSE after each split: sseAfter[k-1] = SSE with k boxes. */
  sseAfter: Float64Array;
}

interface BoxStats {
  w: number;
  sse: number;
}

function boxStats(
  h: Histogram,
  wt: Float64Array,
  perm: Int32Array,
  lo: number,
  hi: number,
): BoxStats {
  const v = h.vec;
  let W = 0;
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;
  let q = 0;
  for (let i = lo; i < hi; i++) {
    const e = perm[i];
    const o = e * 4;
    const w = wt[e];
    const a = v[o];
    const b = v[o + 1];
    const c = v[o + 2];
    const d = v[o + 3];
    W += w;
    s0 += w * a;
    s1 += w * b;
    s2 += w * c;
    s3 += w * d;
    q += w * (a * a + b * b + c * c + d * d);
  }
  const sse = W > 0 ? q - (s0 * s0 + s1 * s1 + s2 * s2 + s3 * s3) / W : 0;
  return { w: W, sse: sse > 0 ? sse : 0 };
}

/**
 * Split the histogram into up to `k` boxes. Each step splits the box with
 * the largest weighted SSE at the axis/position that minimises the sum of
 * the two halves' SSE (evaluated on a 64-bin projection, O(n) per split).
 */
/** `wt` selects the per-entry mass (pixel counts or importance). */
export function medianCut(h: Histogram, k: number, wt: Float64Array = h.weight): MedianCutResult {
  const n = h.size;
  const perm = new Int32Array(n);
  for (let i = 0; i < n; i++) perm[i] = i;
  const lo = new Int32Array(k);
  const hi = new Int32Array(k);
  const sse = new Float64Array(k);
  const sseAfter = new Float64Array(k);
  let boxes = 0;

  // Class split first: opaque entries | translucent entries. Every box
  // (and so every cluster) is then single-class.
  let p = 0;
  for (let i = 0; i < n; i++) {
    if (h.opaque[perm[i]] === 1) {
      const t = perm[p];
      perm[p] = perm[i];
      perm[i] = t;
      p++;
    }
  }
  if (p > 0 && p < n && k >= 2) {
    lo[0] = 0;
    hi[0] = p;
    lo[1] = p;
    hi[1] = n;
    boxes = 2;
  } else {
    lo[0] = 0;
    hi[0] = n;
    boxes = 1;
  }
  // A single mixed box must be opaque: opaque pixels may only use opaque
  // entries, translucent ones can still fall back to it or to transparent.
  const mixedSingle = boxes === 1 && p > 0;
  let total = 0;
  for (let b = 0; b < boxes; b++) {
    sse[b] = boxStats(h, wt, perm, lo[b], hi[b]).sse;
    total += sse[b];
  }
  for (let b = 0; b < boxes; b++) sseAfter[b] = total;

  const bw = new Float64Array(BINS);
  const bs = new Float64Array(BINS * 4);
  const bq = new Float64Array(BINS);
  const binOf = new Uint8Array(n);
  const v = h.vec;

  while (boxes < k) {
    let pick = -1;
    let pickSse = 0;
    for (let b = 0; b < boxes; b++) {
      if (hi[b] - lo[b] >= 2 && sse[b] > pickSse) {
        pickSse = sse[b];
        pick = b;
      }
    }
    if (pick < 0) break;
    const L = lo[pick];
    const H = hi[pick];

    let bestAxis = -1;
    let bestCut = -1;
    let bestScore = Infinity;
    let bestMin = 0;
    let bestScale = 0;
    for (let axis = 0; axis < 4; axis++) {
      let mn = Infinity;
      let mx = -Infinity;
      for (let i = L; i < H; i++) {
        const x = v[perm[i] * 4 + axis];
        if (x < mn) mn = x;
        if (x > mx) mx = x;
      }
      if (!(mx - mn > 1e-9)) continue;
      const scale = (BINS - 1e-6) / (mx - mn);
      bw.fill(0);
      bs.fill(0);
      bq.fill(0);
      for (let i = L; i < H; i++) {
        const e = perm[i];
        const o = e * 4;
        const bin = ((v[o + axis] - mn) * scale) | 0;
        const w = wt[e];
        const a = v[o];
        const b2 = v[o + 1];
        const c = v[o + 2];
        const d = v[o + 3];
        bw[bin] += w;
        const bo = bin * 4;
        bs[bo] += w * a;
        bs[bo + 1] += w * b2;
        bs[bo + 2] += w * c;
        bs[bo + 3] += w * d;
        bq[bin] += w * (a * a + b2 * b2 + c * c + d * d);
      }
      let TW = 0;
      let T0 = 0;
      let T1 = 0;
      let T2 = 0;
      let T3 = 0;
      let TQ = 0;
      for (let bin = 0; bin < BINS; bin++) {
        TW += bw[bin];
        T0 += bs[bin * 4];
        T1 += bs[bin * 4 + 1];
        T2 += bs[bin * 4 + 2];
        T3 += bs[bin * 4 + 3];
        TQ += bq[bin];
      }
      let LW = 0;
      let L0 = 0;
      let L1 = 0;
      let L2 = 0;
      let L3 = 0;
      let LQ = 0;
      for (let bin = 0; bin < BINS - 1; bin++) {
        LW += bw[bin];
        L0 += bs[bin * 4];
        L1 += bs[bin * 4 + 1];
        L2 += bs[bin * 4 + 2];
        L3 += bs[bin * 4 + 3];
        LQ += bq[bin];
        const RW = TW - LW;
        if (LW <= 0 || RW <= 0) continue;
        const R0 = T0 - L0;
        const R1 = T1 - L1;
        const R2 = T2 - L2;
        const R3 = T3 - L3;
        const score =
          LQ - (L0 * L0 + L1 * L1 + L2 * L2 + L3 * L3) / LW +
          (TQ - LQ) - (R0 * R0 + R1 * R1 + R2 * R2 + R3 * R3) / RW;
        if (score < bestScore) {
          bestScore = score;
          bestAxis = axis;
          bestCut = bin;
          bestMin = mn;
          bestScale = scale;
        }
      }
    }
    if (bestAxis < 0) {
      sse[pick] = 0; // indivisible (all identical): never pick again
      continue;
    }
    // Partition perm[L..H) by bin ≤ bestCut.
    for (let i = L; i < H; i++) {
      binOf[i] = ((v[perm[i] * 4 + bestAxis] - bestMin) * bestScale) | 0;
    }
    let a = L;
    let b = H - 1;
    while (a <= b) {
      if (binOf[a] <= bestCut) {
        a++;
      } else {
        const t = perm[a];
        perm[a] = perm[b];
        perm[b] = t;
        const tb = binOf[a];
        binOf[a] = binOf[b];
        binOf[b] = tb;
        b--;
      }
    }
    if (a === L || a === H) {
      sse[pick] = 0;
      continue;
    }
    const oldSse = sse[pick];
    hi[pick] = a;
    lo[boxes] = a;
    hi[boxes] = H;
    sse[pick] = boxStats(h, wt, perm, L, a).sse;
    sse[boxes] = boxStats(h, wt, perm, a, H).sse;
    total += sse[pick] + sse[boxes] - oldSse;
    sseAfter[boxes] = total > 0 ? total : 0;
    boxes++;
  }

  const assign = new Int32Array(n);
  const opaque = new Uint8Array(boxes);
  for (let b = 0; b < boxes; b++) {
    for (let i = lo[b]; i < hi[b]; i++) assign[perm[i]] = b;
    if (mixedSingle) opaque[b] = 1;
    else if (hi[b] > lo[b]) opaque[b] = h.opaque[perm[lo[b]]];
  }
  return { assign, boxes, opaque, sseAfter: sseAfter.subarray(0, boxes) };
}

/**
 * Recompute centroids from an assignment, snapping each to an exact
 * 8-bit RGBA colour (so the search sees what will be written). Returns
 * the palette; empty clusters get weight 0 and are re-seeded by the
 * caller.
 */
function centroids(
  h: Histogram,
  assign: Int32Array,
  k: number,
  out: Palette,
  clusterW: Float64Array,
): void {
  const sums = new Float64Array(k * 4);
  clusterW.fill(0);
  const v = h.vec;
  const wt = h.weight;
  for (let e = 0; e < h.size; e++) {
    const c = assign[e];
    const w = wt[e];
    const o = e * 4;
    const co = c * 4;
    sums[co] += w * v[o];
    sums[co + 1] += w * v[o + 1];
    sums[co + 2] += w * v[o + 2];
    sums[co + 3] += w * v[o + 3];
    clusterW[c] += w;
  }
  for (let c = 0; c < k; c++) {
    const W = clusterW[c];
    if (W <= 0) continue;
    const co = c * 4;
    sums[co] /= W;
    sums[co + 1] /= W;
    sums[co + 2] /= W;
    sums[co + 3] /= W;
    internalToRgba(sums, co, out.rgba, co, out.opaque[c] === 1);
    rgbaToInternal(out.rgba[co], out.rgba[co + 1], out.rgba[co + 2], out.rgba[co + 3], out.vec, co);
  }
}

/** Sub-palette of one class, with local→global index map. */
interface ClassSearch {
  search: PaletteSearch | null;
  globalOf: Int32Array;
  localOf: Int32Array;
}

function classSearch(pal: Palette, opaqueOnly: boolean, clusterW: Float64Array): ClassSearch {
  const ids: number[] = [];
  for (let c = 0; c < pal.size; c++) {
    if (clusterW[c] > 0 && (!opaqueOnly || pal.opaque[c] === 1)) ids.push(c);
  }
  const globalOf = Int32Array.from(ids);
  const localOf = new Int32Array(pal.size).fill(-1);
  const vec = new Float64Array(ids.length * 4);
  for (let i = 0; i < ids.length; i++) {
    localOf[ids[i]] = i;
    vec.set(pal.vec.subarray(ids[i] * 4, ids[i] * 4 + 4), i * 4);
  }
  return {
    search: ids.length > 0 ? new PaletteSearch(vec, ids.length) : null,
    globalOf,
    localOf,
  };
}

/**
 * Weighted k-means refinement from a median-cut assignment. Runs at most
 * `iterations` Lloyd steps, stopping early once the error improves by
 * less than `minGain` (relative). Empty clusters are re-seeded on the
 * histogram entry with the largest weighted error.
 */
export function refinePalette(
  h: Histogram,
  mc: MedianCutResult,
  iterations: number,
  minGain: number,
): Palette {
  const k = mc.boxes;
  const assign = mc.assign;
  const pal: Palette = {
    size: k,
    vec: new Float64Array(k * 4),
    rgba: new Uint8Array(k * 4),
    opaque: mc.opaque.slice(),
  };
  const clusterW = new Float64Array(k);
  const err = new Float64Array(h.size);
  centroids(h, assign, k, pal, clusterW);
  let prevErr = Infinity;
  const v = h.vec;
  for (let it = 0; it < iterations; it++) {
    // Opaque entries may only join opaque clusters; translucent entries
    // may join any (a near-opaque pixel can become opaque, not vice versa).
    const op = classSearch(pal, true, clusterW);
    const any = classSearch(pal, false, clusterW);
    let total = 0;
    for (let e = 0; e < h.size; e++) {
      const cs = h.opaque[e] === 1 ? op : any;
      const s = cs.search;
      if (s === null) continue;
      const o = e * 4;
      const prev = cs.localOf[assign[e]];
      const local = s.nearest(v[o], v[o + 1], v[o + 2], v[o + 3], prev >= 0 ? prev : 0);
      assign[e] = cs.globalOf[local];
      const ew = s.lastDist2 * h.weight[e];
      err[e] = ew;
      total += ew;
    }
    centroids(h, assign, k, pal, clusterW);
    // Re-seed clusters that emptied on the worst-served entries.
    for (let c = 0; c < k; c++) {
      if (clusterW[c] > 0) continue;
      let worst = -1;
      let worstErr = 0;
      for (let e = 0; e < h.size; e++) {
        if (err[e] > worstErr) {
          worstErr = err[e];
          worst = e;
        }
      }
      if (worst < 0) break;
      err[worst] = 0;
      assign[worst] = c;
      pal.opaque[c] = h.opaque[worst];
      const o = worst * 4;
      clusterW[c] = h.weight[worst];
      internalToRgba(v, o, pal.rgba, c * 4, pal.opaque[c] === 1);
      rgbaToInternal(pal.rgba[c * 4], pal.rgba[c * 4 + 1], pal.rgba[c * 4 + 2], pal.rgba[c * 4 + 3], pal.vec, c * 4);
    }
    if (prevErr - total < minGain * total) break;
    prevErr = total;
  }
  return pal;
}

/**
 * Rescue small but distinct colours that the error-minimising palette
 * absorbed into a neighbour (a few bright flowers in a meadow, a small
 * saturated icon): MSE barely notices them, the eye does — as a hue
 * shift. Entries farther than `maxDist` from their cluster centre seed up
 * to `budget` new clusters, greedily by weighted error, when at least
 * `minWeight` outlier pixels lie within `maxDist/2` of the seed. Returns a new
 * starting assignment for another k-means pass, or null if none qualify.
 */
export function addOutlierClusters(
  h: Histogram,
  pal: Palette,
  assign: Int32Array,
  budget: number,
  maxDist: number,
  minWeight: number,
): MedianCutResult | null {
  const v = h.vec;
  let cand: number[] = [];
  const score = new Float64Array(h.size);
  const max2 = maxDist * maxDist;
  for (let e = 0; e < h.size; e++) {
    const o = e * 4;
    const co = assign[e] * 4;
    const d0 = v[o] - pal.vec[co];
    const d1 = v[o + 1] - pal.vec[co + 1];
    const d2 = v[o + 2] - pal.vec[co + 2];
    const d3 = v[o + 3] - pal.vec[co + 3];
    const d = d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3;
    if (d > max2) {
      cand.push(e);
      score[e] = d * h.weight[e];
    }
  }
  if (cand.length === 0) return null;
  cand.sort((x, y) => score[y] - score[x]);
  if (cand.length > MAX_OUTLIER_CANDIDATES) cand = cand.slice(0, MAX_OUTLIER_CANDIDATES);
  // Greedy cover: a seed must gather ≥ minWeight pixels of outliers
  // within maxDist/2 (rich images spread one feature over many entries).
  const seeds: number[] = [];
  const seedGain: number[] = [];
  const covered = new Uint8Array(cand.length);
  const near2 = max2 / 4;
  for (let i = 0; i < cand.length && seeds.length < budget + MAX_REPLACED; i++) {
    if (covered[i] === 1) continue;
    const o = cand[i] * 4;
    let mass = 0;
    let gain = 0;
    for (let j = i; j < cand.length; j++) {
      if (covered[j] === 1) continue;
      const so = cand[j] * 4;
      const d0 = v[o] - v[so];
      const d1 = v[o + 1] - v[so + 1];
      const d2 = v[o + 2] - v[so + 2];
      const d3 = v[o + 3] - v[so + 3];
      if (d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3 < near2) {
        mass += h.weight[cand[j]];
        gain += score[cand[j]];
      }
    }
    if (mass < minWeight) continue;
    seeds.push(cand[i]);
    seedGain.push(gain);
    for (let j = i; j < cand.length; j++) {
      const so = cand[j] * 4;
      const d0 = v[o] - v[so];
      const d1 = v[o + 1] - v[so + 1];
      const d2 = v[o + 2] - v[so + 2];
      const d3 = v[o + 3] - v[so + 3];
      if (d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3 < near2) covered[j] = 1;
    }
  }
  if (seeds.length === 0) return null;

  // Seeds beyond the free budget replace the cheapest-to-lose clusters:
  // those whose pixels would move the least (weight × distance² to the
  // nearest cluster they could merge into), if that loses less than the
  // seed's outliers currently cost (Σ weight × distance²).
  const extra = seeds.length - budget;
  const next = Int32Array.from(assign);
  const reuse: number[] = [];
  if (extra > 0) {
    const W = new Float64Array(pal.size);
    for (let e = 0; e < h.size; e++) W[assign[e]] += h.weight[e];
    const nn = new Int32Array(pal.size).fill(-1);
    const cost = new Float64Array(pal.size);
    for (let c = 0; c < pal.size; c++) {
      const co = c * 4;
      let best = Infinity;
      for (let d = 0; d < pal.size; d++) {
        if (d === c || (pal.opaque[c] === 1 && pal.opaque[d] !== 1)) continue;
        const dO = d * 4;
        const e0 = pal.vec[co] - pal.vec[dO];
        const e1 = pal.vec[co + 1] - pal.vec[dO + 1];
        const e2 = pal.vec[co + 2] - pal.vec[dO + 2];
        const e3 = pal.vec[co + 3] - pal.vec[dO + 3];
        const dd = e0 * e0 + e1 * e1 + e2 * e2 + e3 * e3;
        if (dd < best) {
          best = dd;
          nn[c] = d;
        }
      }
      cost[c] = nn[c] < 0 ? Infinity : W[c] * best;
    }
    const removed = new Uint8Array(pal.size);
    for (let i = budget; i < seeds.length; i++) {
      let pick = -1;
      for (let c = 0; c < pal.size; c++) {
        if (removed[c] === 1 || nn[c] < 0 || removed[nn[c]] === 1) continue;
        if (pick < 0 || cost[c] < cost[pick]) pick = c;
      }
      if (pick < 0 || cost[pick] >= seedGain[i]) break;
      removed[pick] = 1;
      reuse.push(pick);
    }
    for (let e = 0; e < h.size; e++) {
      if (removed[next[e]] === 1) next[e] = nn[next[e]];
    }
    seeds.length = Math.min(seeds.length, budget + reuse.length);
    if (seeds.length === 0) return null;
  }
  const fresh = seeds.length - reuse.length;
  const k = pal.size + fresh;
  const opaque = new Uint8Array(k);
  opaque.set(pal.opaque);
  for (let i = 0; i < seeds.length; i++) {
    const id = i < fresh ? pal.size + i : reuse[i - fresh];
    next[seeds[i]] = id;
    opaque[id] = h.opaque[seeds[i]];
  }
  return { assign: next, boxes: k, opaque, sseAfter: new Float64Array(0) };
}
