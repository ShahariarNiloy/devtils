/**
 * JSON diff engine — text in, render-ready model out. Pure (no React, no
 * DOM); runs on the main thread for small inputs and inside
 * `json-diff.worker.ts` for large ones, so both paths produce the exact
 * same model.
 *
 * The model is deliberately compact and transferable: rows are typed
 * arrays plus one string pool per side, and changes carry short previews
 * rather than whole subtrees. The parsed documents stay where they were
 * parsed (`DiffSession`), so the patch can be built later, on demand.
 */

import {
  assertDiffableDepth,
  canonicalize,
  DiffTooDeepError,
  diffJson,
  dollarPath,
  inlineDisplay,
  MAX_DIFF_DEPTH,
  toJsonPatch,
  verifyPatch,
  type ArrayStrategy,
  type DiffKind,
  type DiffOptions,
  type JsonValue,
  type RowTable,
} from "./json-diff.lib";

export interface CompareSettings {
  arrayStrategy: ArrayStrategy;
  identityKey: string;
  ignore: readonly string[];
  /** Show keys alphabetically in the row view (compare is order-free anyway). */
  sortKeys: boolean;
}

export type SideStatus =
  | { state: "empty" }
  | { state: "ok"; lines: number }
  | { state: "error"; message: string; line: number; col: number };

export interface ChangeItem {
  kind: DiffKind;
  /** `$.order.items[id=12].qty` */
  path: string;
  /** RFC 6901 pointer. */
  pointer: string;
  /** Short previews (absent when that side is missing). */
  a?: string;
  b?: string;
  /** `"string → number"` for type changes. */
  types?: string;
  /** `[from, to]` for moves. */
  move?: [number, number];
  /** First row in the row table. */
  row: number;
}

export interface DiffCounts {
  added: number;
  removed: number;
  changed: number;
  type: number;
  moved: number;
  ignored: number;
  total: number;
}

export interface DiffModel {
  left: SideStatus;
  right: SideStatus;
  /** Both sides parsed and compared. */
  ok: boolean;
  /** Both parsed, but the compare failed (too deep…). */
  error: string | null;
  changes: ChangeItem[];
  counts: DiffCounts;
  rows: RowTable | null;
  /** Milliseconds spent (parse + diff + rows), for the curious. */
  ms: number;
}

export interface PatchModel {
  text: string;
  ops: number;
  verified: boolean;
}

/** Parsed documents + options of the last compare, kept for the patch. */
export interface DiffSession {
  left: JsonValue;
  right: JsonValue;
  options: DiffOptions;
}

const PREVIEW = 64;

function countLines(text: string): number {
  let n = 1;
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) n++;
  return n;
}

/** Trailing whitespace-only line doesn't count ("…\n" is one line). */
function visibleLines(text: string): number {
  const n = countLines(text);
  return /\n\s*$/.test(text.slice(-64)) ? n - 1 : n;
}

export function parseSide(text: string): { status: SideStatus; value?: JsonValue } {
  if (!text.trim()) return { status: { state: "empty" } };
  try {
    return { status: { state: "ok", lines: visibleLines(text) }, value: JSON.parse(text) as JsonValue };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    let line = 1;
    let col = 1;
    const lc = /line (\d+) column (\d+)/i.exec(raw);
    const pos = /position (\d+)/i.exec(raw);
    if (lc) {
      line = Number(lc[1]);
      col = Number(lc[2]);
    } else if (pos) {
      const before = text.slice(0, Number(pos[1])).split("\n");
      line = before.length;
      col = (before[before.length - 1]?.length ?? 0) + 1;
    }
    const message = raw
      .replace(/\s*in JSON at position \d+.*$/i, "")
      .replace(/\s*\(line \d+ column \d+\)/i, "")
      .replace(/^JSON\.parse:\s*/i, "")
      .replace(/\s+at line \d+ column \d+ of the JSON data$/i, "")
      .trim();
    return { status: { state: "error", message: message || "Invalid JSON", line, col } };
  }
}

export function toDiffOptions(s: CompareSettings): DiffOptions {
  return {
    arrayStrategy: s.arrayStrategy,
    identityKey: s.arrayStrategy === "identity" ? s.identityKey.trim() || "id" : undefined,
    ignore: s.ignore,
  };
}

const EMPTY_COUNTS: DiffCounts = { added: 0, removed: 0, changed: 0, type: 0, moved: 0, ignored: 0, total: 0 };

export function computeDiff(leftText: string, rightText: string, settings: CompareSettings): { model: DiffModel; session: DiffSession | null } {
  const t0 = performance.now();
  const L = parseSide(leftText);
  const R = parseSide(rightText);
  const base: DiffModel = {
    left: L.status,
    right: R.status,
    ok: false,
    error: null,
    changes: [],
    counts: EMPTY_COUNTS,
    rows: null,
    ms: 0,
  };
  if (L.value === undefined || R.value === undefined) {
    base.ms = performance.now() - t0;
    return { model: base, session: null };
  }
  try {
    // `diffJson` guards depth itself; canonicalize recurses first.
    if (settings.sortKeys) {
      assertDiffableDepth(L.value);
      assertDiffableDepth(R.value);
    }
    const lv = settings.sortKeys ? canonicalize(L.value) : L.value;
    const rv = settings.sortKeys ? canonicalize(R.value) : R.value;
    const options = toDiffOptions(settings);
    const res = diffJson(lv, rv, options, { rows: true });
    const changes: ChangeItem[] = res.entries.map((e) => {
      const item: ChangeItem = { kind: e.kind, path: dollarPath(e.path), pointer: e.pointer, row: e.row ?? 0 };
      if (e.kind === "moved") {
        item.move = e.move;
        item.a = inlineDisplay(e.left, PREVIEW);
      } else {
        if (e.left !== undefined) item.a = inlineDisplay(e.left, PREVIEW);
        if (e.right !== undefined) item.b = inlineDisplay(e.right, PREVIEW);
      }
      if (e.typeChange) item.types = `${e.typeChange[0]} → ${e.typeChange[1]}`;
      return item;
    });
    const st = res.stats;
    return {
      model: {
        ...base,
        ok: true,
        changes,
        counts: {
          added: st.added,
          removed: st.removed,
          changed: st.changed,
          type: st.typeChanges,
          moved: st.moves,
          ignored: st.ignored,
          total: st.total,
        },
        rows: res.rows ?? null,
        ms: performance.now() - t0,
      },
      session: { left: lv, right: rv, options },
    };
  } catch (e) {
    let message = `Couldn't compare these documents: ${e instanceof Error ? e.message : String(e)}`;
    if (e instanceof DiffTooDeepError) message = e.message;
    // Safety net — recursion is depth-guarded, but never take the page down.
    else if (e instanceof RangeError) message = `Too deeply nested to diff (>${MAX_DIFF_DEPTH} levels)`;
    return { model: { ...base, error: message, ms: performance.now() - t0 }, session: null };
  }
}

/** RFC 6902 patch for the session, checked by applying it to the original. */
export function computePatch(session: DiffSession): PatchModel {
  const ops = toJsonPatch(session.left, session.right, session.options);
  const verified = verifyPatch(session.left, session.right, ops, session.options);
  return { text: JSON.stringify(ops, null, 2), ops: ops.length, verified };
}

/** Typed-array buffers of a model, for a zero-copy `postMessage`. */
export function modelTransferables(model: DiffModel): ArrayBuffer[] {
  const r = model.rows;
  if (!r) return [];
  const list = [r.kind, r.cid, r.l, r.r, r.left.start, r.left.key, r.left.meta, r.right.start, r.right.key, r.right.meta];
  const out: ArrayBuffer[] = [];
  for (const a of list) if (a.buffer instanceof ArrayBuffer) out.push(a.buffer);
  return out;
}
