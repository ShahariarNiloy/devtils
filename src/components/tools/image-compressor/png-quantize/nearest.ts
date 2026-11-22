/**
 * Exact nearest-palette-entry search in the 4-D internal space.
 *
 * "Locally sorted search": for each palette entry we precompute every
 * other entry sorted by distance. A query starts from a guess `g` (the
 * previous pixel's answer, or the previous k-means assignment — both are
 * usually right or close). By the triangle inequality an entry `c` can
 * only beat the current best `b` when `d(g,c) < d(q,g) + d(q,b)`, so the
 * walk down g's sorted list stops early. With a good guess a query
 * touches a handful of entries instead of all 256.
 */
export class PaletteSearch {
  readonly size: number;
  private readonly vec: Float64Array;
  private readonly order: Uint16Array;
  private readonly dist: Float64Array;
  /** Squared distance of the last query's answer. */
  lastDist2 = 0;

  /** `vec` holds 4 floats per entry. */
  constructor(vec: Float64Array, size: number) {
    this.size = size;
    this.vec = vec;
    this.order = new Uint16Array(size * size);
    this.dist = new Float64Array(size * size);
    const tmpD = new Float64Array(size);
    const idx: number[] = new Array<number>(size);
    for (let i = 0; i < size; i++) {
      const io = i * 4;
      for (let j = 0; j < size; j++) {
        const jo = j * 4;
        const d0 = vec[io] - vec[jo];
        const d1 = vec[io + 1] - vec[jo + 1];
        const d2 = vec[io + 2] - vec[jo + 2];
        const d3 = vec[io + 3] - vec[jo + 3];
        tmpD[j] = Math.sqrt(d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3);
        idx[j] = j;
      }
      idx.sort((x, y) => tmpD[x] - tmpD[y]);
      const base = i * size;
      for (let j = 0; j < size; j++) {
        this.order[base + j] = idx[j];
        this.dist[base + j] = tmpD[idx[j]];
      }
    }
  }

  /** Nearest entry to (q0..q3), starting the walk at `guess`. */
  nearest(q0: number, q1: number, q2: number, q3: number, guess: number): number {
    const vec = this.vec;
    const n = this.size;
    let g = guess;
    if (g < 0 || g >= n) g = 0;
    const go = g * 4;
    let e0 = q0 - vec[go];
    let e1 = q1 - vec[go + 1];
    let e2 = q2 - vec[go + 2];
    let e3 = q3 - vec[go + 3];
    const dg2 = e0 * e0 + e1 * e1 + e2 * e2 + e3 * e3;
    const dg = Math.sqrt(dg2);
    let best = g;
    let bestD2 = dg2;
    let bound = dg + dg;
    const order = this.order;
    const dist = this.dist;
    const base = g * n;
    for (let j = 1; j < n; j++) {
      if (dist[base + j] >= bound) break;
      const c = order[base + j];
      const co = c * 4;
      e0 = q0 - vec[co];
      e1 = q1 - vec[co + 1];
      e2 = q2 - vec[co + 2];
      e3 = q3 - vec[co + 3];
      const d2 = e0 * e0 + e1 * e1 + e2 * e2 + e3 * e3;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = c;
        bound = dg + Math.sqrt(d2);
      }
    }
    this.lastDist2 = bestD2;
    return best;
  }
}
