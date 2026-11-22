/**
 * Pure helpers that turn a `RowTable` into the display lists the views
 * virtualize: unchanged-run folding, the unified (one-column) expansion,
 * row → item lookup for navigation, and patch-text tokenizing. No React.
 */

import { ROW_ADD, ROW_CHG, ROW_DEL, ROW_IGN, ROW_SAME, type RowTable } from "./json-diff.lib";

/**
 * Display list. `items[i] >= 0` is a payload (split: row index; unified:
 * `row * 2 + side`, side 0 = left/unchanged, 1 = right); `items[i] < 0` is
 * a fold of `-items[i]` unchanged rows. `first[i]` is the first row the
 * item covers — non-decreasing, so it can be binary-searched.
 */
export interface DisplayList {
  count: number;
  items: Int32Array;
  first: Int32Array;
}

/** Runs of unchanged rows longer than this collapse (2 kept on each side). */
const FOLD_MIN = 6;
const FOLD_KEEP = 2;

class Out {
  items: Int32Array;
  first: Int32Array;
  count = 0;
  constructor(cap: number) {
    this.items = new Int32Array(Math.max(cap, 16));
    this.first = new Int32Array(Math.max(cap, 16));
  }
  push(item: number, row: number): void {
    if (this.count === this.items.length) {
      const a = new Int32Array(this.items.length * 2);
      a.set(this.items);
      this.items = a;
      const b = new Int32Array(this.first.length * 2);
      b.set(this.first);
      this.first = b;
    }
    this.items[this.count] = item;
    this.first[this.count] = row;
    this.count++;
  }
  done(): DisplayList {
    return { count: this.count, items: this.items.subarray(0, this.count), first: this.first.subarray(0, this.count) };
  }
}

const isQuiet = (k: number) => k === ROW_SAME || k === ROW_IGN;

function build(rows: RowTable, hide: boolean, unified: boolean): DisplayList {
  const out = new Out(unified ? rows.count + 64 : rows.count);
  const emit = (r: number) => {
    if (!unified) {
      out.push(r, r);
      return;
    }
    const k = rows.kind[r];
    if (k === ROW_SAME || k === ROW_IGN) out.push(r * 2 + (rows.l[r] >= 0 ? 0 : 1), r);
    else {
      if (k === ROW_DEL || k === ROW_CHG) out.push(r * 2, r);
      if (k === ROW_ADD || k === ROW_CHG) out.push(r * 2 + 1, r);
    }
  };
  let r = 0;
  while (r < rows.count) {
    if (!hide || !isQuiet(rows.kind[r])) {
      emit(r++);
      continue;
    }
    const start = r;
    while (r < rows.count && isQuiet(rows.kind[r])) r++;
    const len = r - start;
    if (len > FOLD_MIN) {
      for (let i = start; i < start + FOLD_KEEP; i++) emit(i);
      out.push(-(len - 2 * FOLD_KEEP), start + FOLD_KEEP);
      for (let i = r - FOLD_KEEP; i < r; i++) emit(i);
    } else {
      for (let i = start; i < r; i++) emit(i);
    }
  }
  return out.done();
}

export function splitList(rows: RowTable, hideUnchanged: boolean): DisplayList {
  return build(rows, hideUnchanged, false);
}

export function unifiedList(rows: RowTable, hideUnchanged: boolean): DisplayList {
  return build(rows, hideUnchanged, true);
}

/** First item whose `first` row is ≥ `row` (clamped). */
export function itemForRow(list: DisplayList, row: number): number {
  let lo = 0;
  let hi = list.count;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list.first[mid] < row) lo = mid + 1;
    else hi = mid;
  }
  return Math.min(lo, Math.max(0, list.count - 1));
}

// ── Patch text tokens ────────────────────────────────────────────────────────

export type PatchTokenKind = "key" | "op" | "string" | "number" | "bool" | "null" | "punct" | "plain";

export interface PatchToken {
  v: string;
  k: PatchTokenKind;
}

const TOKEN_RE = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false)|(null)|([{}[\],:])|(\s+)/g;
const OP_RE = /^"(add|remove|replace|move|copy|test)"$/;

/** Tokenize one line of pretty-printed JSON Patch for colouring. */
export function tokenizePatchLine(line: string): PatchToken[] {
  const out: PatchToken[] = [];
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  for (let m = TOKEN_RE.exec(line); m; m = TOKEN_RE.exec(line)) {
    if (m.index > last) out.push({ v: line.slice(last, m.index), k: "plain" });
    if (m[1]) {
      let k: PatchTokenKind = OP_RE.test(m[1]) ? "op" : "string";
      if (m[2]) k = "key";
      out.push({ v: m[1], k });
      if (m[2]) out.push({ v: m[2], k: "punct" });
    } else if (m[3]) out.push({ v: m[3], k: "number" });
    else if (m[4]) out.push({ v: m[4], k: "bool" });
    else if (m[5]) out.push({ v: m[5], k: "null" });
    else if (m[6]) out.push({ v: m[6], k: "punct" });
    else out.push({ v: m[7], k: "plain" });
    last = TOKEN_RE.lastIndex;
  }
  if (last < line.length) out.push({ v: line.slice(last), k: "plain" });
  return out;
}
