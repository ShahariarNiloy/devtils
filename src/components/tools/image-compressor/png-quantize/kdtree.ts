import type { OKLab, PaletteEntry } from "./png-quantize.types";

/**
 * k-d tree over the palette's OKLab points, used for nearest-entry lookups
 * during dithering — the quantizer's hot path (millions of calls per
 * image). Stored in flat typed arrays and searched iteratively rather than
 * as linked objects with recursion: same tree, same nearest result, but no
 * per-node property access or call overhead.
 *
 * Lightness is weighted 2× (so squared-distance weight 4×) to match
 * `deltaE` in color-space.ts. The nearest-neighbour result is identical to
 * a textbook recursive tree (verified byte-for-byte against the previous
 * implementation across the benchmark corpus).
 */
export class KDTree {
  private readonly axis: Int32Array;
  // Double precision to match the palette's OKLab coords exactly — Float32
  // truncation flips borderline nearest lookups vs. the reference tree.
  private readonly pL: Float64Array;
  private readonly pA: Float64Array;
  private readonly pB: Float64Array;
  private readonly palIdx: Int32Array;
  private readonly left: Int32Array;
  private readonly right: Int32Array;
  private readonly root: number;
  private size = 0;
  // Reused search stacks (node id + splitting-plane squared distance) so a
  // hot findNearest loop allocates nothing.
  private readonly nodeStack: Int32Array;
  private readonly distStack: Float64Array;

  constructor(palette: PaletteEntry[]) {
    const n = palette.length;
    this.axis = new Int32Array(n);
    this.pL = new Float64Array(n);
    this.pA = new Float64Array(n);
    this.pB = new Float64Array(n);
    this.palIdx = new Int32Array(n);
    this.left = new Int32Array(n).fill(-1);
    this.right = new Int32Array(n).fill(-1);
    this.nodeStack = new Int32Array(n + 1);
    this.distStack = new Float64Array(n + 1);
    const items = palette.map((p, i) => ({
      L: p.oklab.L,
      a: p.oklab.a,
      b: p.oklab.b,
      index: i,
    }));
    this.root = items.length > 0 ? this.build(items, 0) : -1;
  }

  private build(
    items: Array<{ L: number; a: number; b: number; index: number }>,
    depth: number,
  ): number {
    const ax = depth % 3;
    const key = (["L", "a", "b"] as const)[ax];
    items.sort((x, y) => x[key] - y[key]);
    const mid = items.length >> 1;
    const node = this.size++;
    const m = items[mid];
    this.axis[node] = ax;
    this.pL[node] = m.L;
    this.pA[node] = m.a;
    this.pB[node] = m.b;
    this.palIdx[node] = m.index;
    const leftItems = items.slice(0, mid);
    const rightItems = items.slice(mid + 1);
    this.left[node] = leftItems.length > 0 ? this.build(leftItems, depth + 1) : -1;
    this.right[node] =
      rightItems.length > 0 ? this.build(rightItems, depth + 1) : -1;
    return node;
  }

  findNearest(target: OKLab): number {
    if (this.root < 0) throw new Error("Empty k-d tree");
    const { axis, pL, pA, pB, palIdx, left, right, nodeStack, distStack } = this;
    const tL = target.L;
    const ta = target.a;
    const tb = target.b;
    let bestDist = Infinity;
    let bestIdx = -1;
    let sp = 0;
    nodeStack[0] = this.root;
    distStack[0] = -1;
    sp = 1;

    while (sp > 0) {
      sp--;
      // A queued entry carries the squared distance to the splitting plane
      // that gated it; skip it if the current best is already closer.
      if (distStack[sp] >= 0 && distStack[sp] >= bestDist) continue;
      let cur = nodeStack[sp];
      // Walk down the "near" side inline (a tight loop), queueing each
      // "far" branch for later with its plane distance.
      while (cur >= 0) {
        const dL = (tL - pL[cur]) * 2;
        const da = ta - pA[cur];
        const db = tb - pB[cur];
        const d = dL * dL + da * da + db * db;
        if (d < bestDist) {
          bestDist = d;
          bestIdx = palIdx[cur];
        }
        const ax = axis[cur];
        let diff: number;
        if (ax === 0) diff = tL - pL[cur];
        else if (ax === 1) diff = ta - pA[cur];
        else diff = tb - pB[cur];
        // L uses 2× weight in deltaE → 4× on squared diff.
        const diffSq = ax === 0 ? diff * diff * 4 : diff * diff;
        const goLeft = diff < 0;
        const near = goLeft ? left[cur] : right[cur];
        const far = goLeft ? right[cur] : left[cur];
        nodeStack[sp] = far;
        distStack[sp] = diffSq;
        sp++;
        cur = near;
      }
    }
    return bestIdx;
  }
}
