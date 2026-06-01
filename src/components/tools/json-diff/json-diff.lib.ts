/**
 * JSON diff — pure semantic comparison library.
 *
 * Compares two JSON values structurally (not as text), produces a flat list
 * of `DiffEntry` records describing every difference plus a stats summary.
 * Three array-compare strategies (ordered+LCS, set, identity-keyed) make
 * real-world cases tractable: APIs return items in any order, schemas use
 * stable ids, queues care about position. Type-changes are flagged as a
 * distinct kind because they're almost always bugs. Move-detection on
 * ordered arrays uses Longest-Common-Subsequence so reordering reads as
 * "moved" instead of "removed + added".
 *
 * Also exports `toJsonPatch()` to convert the diff into an RFC 6902 patch
 * document — the operational form most engineers actually want.
 *
 * No React, no DOM. Pure value algebra over `JsonValue`.
 */

// ── Value types ──────────────────────────────────────────────────────────────

export type JsonPrimitive = null | boolean | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };
export type JsonType = "null" | "boolean" | "number" | "string" | "array" | "object";

export function typeOf(value: JsonValue): JsonType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as JsonType;
}

// ── Public types ─────────────────────────────────────────────────────────────

export type DiffKind = "added" | "removed" | "changed" | "type" | "moved";

export interface DiffEntry {
  kind: DiffKind;
  /** RFC 6901 JSON Pointer to the path. Always uses positional indices for
   *  arrays so the entry stays compatible with JSON Patch operations. */
  pointer: string;
  /** Friendly dot/bracket notation: `users[3].address.city`. Used in the UI;
   *  not RFC-spec'd. */
  path: string;
  /** Value on the left side (undefined for "added"). */
  left?: JsonValue;
  /** Value on the right side (undefined for "removed"). */
  right?: JsonValue;
  /** For "moved": [fromIndex, toIndex] in the array. */
  move?: [number, number];
  /** For "type": old type → new type. */
  typeChange?: [JsonType, JsonType];
}

export type ArrayStrategy = "ordered" | "set" | "identity";

export interface DiffOptions {
  /** Per-array compare strategy. Default `"ordered"`. */
  arrayStrategy?: ArrayStrategy;
  /** Identity key for `arrayStrategy: "identity"`. Items missing the key
   *  fall back to positional matching. */
  identityKey?: string;
  /** When true, skip Longest-Common-Subsequence move detection for ordered
   *  arrays; report moves as remove+add pairs instead. */
  noMoves?: boolean;
  /** Hard cap on array length for LCS — beyond this we fall back to
   *  positional compare (O(N) instead of O(N²)). Default 1000. */
  lcsThreshold?: number;
}

export interface DiffStats {
  added: number;
  removed: number;
  changed: number;
  typeChanges: number;
  moves: number;
  /** Total of all kinds. */
  total: number;
}

export interface DiffResult {
  entries: DiffEntry[];
  stats: DiffStats;
}

// ── Deep equality ────────────────────────────────────────────────────────────

/**
 * Structural equality on `JsonValue`. Used by every array strategy and by
 * move detection. Object key order is ignored (JSON spec semantics).
 */
export function deepEqual(a: JsonValue, b: JsonValue): boolean {
  if (a === b) return true;
  const ta = typeOf(a);
  const tb = typeOf(b);
  if (ta !== tb) return false;
  if (ta === "array") {
    const aa = a as JsonValue[];
    const bb = b as JsonValue[];
    if (aa.length !== bb.length) return false;
    for (let i = 0; i < aa.length; i++) {
      if (!deepEqual(aa[i], bb[i])) return false;
    }
    return true;
  }
  if (ta === "object") {
    const ao = a as Record<string, JsonValue>;
    const bo = b as Record<string, JsonValue>;
    const aKeys = Object.keys(ao);
    if (aKeys.length !== Object.keys(bo).length) return false;
    for (const k of aKeys) {
      if (!(k in bo)) return false;
      if (!deepEqual(ao[k], bo[k])) return false;
    }
    return true;
  }
  return false;
}

// ── Path helpers (RFC 6901) ──────────────────────────────────────────────────

/** Escape a single path component per RFC 6901 (`~` → `~0`, `/` → `~1`). */
function escapePointer(token: string): string {
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

/** RFC 6901-compliant pointer extension. */
function joinPointer(parent: string, token: string | number): string {
  return `${parent}/${escapePointer(String(token))}`;
}

/** Friendly path extension — dot-notation for keys, brackets for indices. */
function joinPath(parent: string, token: string | number): string {
  if (typeof token === "number") return `${parent}[${token}]`;
  // Object keys with non-identifier characters get bracket-quoted notation.
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(token)) {
    return parent ? `${parent}.${token}` : token;
  }
  return `${parent}[${JSON.stringify(token)}]`;
}

// ── Canonicalize (sort keys, recursively) ────────────────────────────────────

/**
 * Recursively sort object keys. Used by the "sort keys" toggle — affects
 * pretty-printed display only. The semantic diff is already key-order
 * insensitive, so this doesn't change which entries get emitted.
 */
export function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const out: Record<string, JsonValue> = {};
    for (const k of Object.keys(value).sort()) {
      out[k] = canonicalize((value as Record<string, JsonValue>)[k]);
    }
    return out;
  }
  return value;
}

// ── Core walk ────────────────────────────────────────────────────────────────

/**
 * Pick the array strategy to use for a given pair. Identity-keyed mode only
 * kicks in when both sides are arrays of objects and every item has the
 * identity key — otherwise we'd silently mis-match items. Falls back to
 * `ordered` in the ambiguous case so behaviour stays predictable.
 */
function pickArrayStrategy(
  left: JsonValue[],
  right: JsonValue[],
  options: DiffOptions,
): ArrayStrategy {
  if (options.arrayStrategy === "set") return "set";
  if (options.arrayStrategy === "identity") {
    const key = options.identityKey;
    if (!key) return "ordered";
    const okLeft = left.every(
      (x) => typeOf(x) === "object" && key in (x as Record<string, JsonValue>),
    );
    const okRight = right.every(
      (x) => typeOf(x) === "object" && key in (x as Record<string, JsonValue>),
    );
    if (okLeft && okRight) return "identity";
    return "ordered"; // safer fallback
  }
  return "ordered";
}

function walk(
  left: JsonValue,
  right: JsonValue,
  pointer: string,
  path: string,
  out: DiffEntry[],
  options: DiffOptions,
): void {
  const ta = typeOf(left);
  const tb = typeOf(right);

  if (ta !== tb) {
    out.push({
      kind: "type",
      pointer,
      path,
      left,
      right,
      typeChange: [ta, tb],
    });
    return;
  }

  if (ta === "array") {
    diffArray(left as JsonValue[], right as JsonValue[], pointer, path, out, options);
    return;
  }

  if (ta === "object") {
    diffObject(
      left as Record<string, JsonValue>,
      right as Record<string, JsonValue>,
      pointer,
      path,
      out,
      options,
    );
    return;
  }

  // Primitive — compare directly. NaN safe enough because JSON.parse can't
  // produce NaN.
  if (!Object.is(left, right) && left !== right) {
    out.push({ kind: "changed", pointer, path, left, right });
  }
}

function diffObject(
  left: Record<string, JsonValue>,
  right: Record<string, JsonValue>,
  pointer: string,
  path: string,
  out: DiffEntry[],
  options: DiffOptions,
): void {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const k of keys) {
    const inL = k in left;
    const inR = k in right;
    const p = joinPointer(pointer, k);
    const f = joinPath(path, k);
    if (inL && !inR) {
      out.push({ kind: "removed", pointer: p, path: f, left: left[k] });
    } else if (!inL && inR) {
      out.push({ kind: "added", pointer: p, path: f, right: right[k] });
    } else {
      walk(left[k], right[k], p, f, out, options);
    }
  }
}

// ── Array strategies ─────────────────────────────────────────────────────────

function diffArray(
  left: JsonValue[],
  right: JsonValue[],
  pointer: string,
  path: string,
  out: DiffEntry[],
  options: DiffOptions,
): void {
  const strategy = pickArrayStrategy(left, right, options);
  switch (strategy) {
    case "set":
      diffArraySet(left, right, pointer, path, out, options);
      return;
    case "identity":
      diffArrayIdentity(left, right, pointer, path, out, options);
      return;
    case "ordered":
      diffArrayOrdered(left, right, pointer, path, out, options);
      return;
  }
}

/**
 * Treat both arrays as sets of values: any item present in left and not
 * right is "removed"; any item present in right and not left is "added".
 * No moves, no position-based change reports — set semantics by definition
 * don't care about position. Items reported by position-of-first-occurrence
 * for path generation.
 */
function diffArraySet(
  left: JsonValue[],
  right: JsonValue[],
  pointer: string,
  path: string,
  out: DiffEntry[],
  _options: DiffOptions,
): void {
  const rightMatched = new Set<number>();
  for (let i = 0; i < left.length; i++) {
    let foundAt = -1;
    for (let j = 0; j < right.length; j++) {
      if (rightMatched.has(j)) continue;
      if (deepEqual(left[i], right[j])) {
        foundAt = j;
        break;
      }
    }
    if (foundAt === -1) {
      out.push({
        kind: "removed",
        pointer: joinPointer(pointer, i),
        path: joinPath(path, i),
        left: left[i],
      });
    } else {
      rightMatched.add(foundAt);
    }
  }
  for (let j = 0; j < right.length; j++) {
    if (rightMatched.has(j)) continue;
    out.push({
      kind: "added",
      pointer: joinPointer(pointer, j),
      path: joinPath(path, j),
      right: right[j],
    });
  }
}

/**
 * Match objects across arrays by `options.identityKey`. Items with the same
 * key recurse for nested diffs; unmatched items become added/removed. The
 * positional pointer/path reflects the LEFT array's index for removed and
 * changed, and the RIGHT array's index for added — matches what a downstream
 * JSON Patch consumer expects.
 */
function diffArrayIdentity(
  left: JsonValue[],
  right: JsonValue[],
  pointer: string,
  path: string,
  out: DiffEntry[],
  options: DiffOptions,
): void {
  // pickArrayStrategy guarantees identityKey is set when this is reached;
  // a defensive empty-string fallback keeps the type system happy.
  const key = options.identityKey ?? "";
  if (!key) return;
  const leftByKey = new Map<unknown, { item: JsonValue; index: number }>();
  const rightByKey = new Map<unknown, { item: JsonValue; index: number }>();
  for (let i = 0; i < left.length; i++) {
    const it = left[i] as Record<string, JsonValue>;
    leftByKey.set(it[key], { item: it, index: i });
  }
  for (let j = 0; j < right.length; j++) {
    const it = right[j] as Record<string, JsonValue>;
    rightByKey.set(it[key], { item: it, index: j });
  }

  // Walk left first so removed/changed appear in left order.
  for (const [k, { item: l, index: li }] of leftByKey) {
    const r = rightByKey.get(k);
    if (!r) {
      out.push({
        kind: "removed",
        pointer: joinPointer(pointer, li),
        path: joinPath(path, li),
        left: l,
      });
    } else {
      walk(
        l,
        r.item,
        joinPointer(pointer, li),
        joinPath(path, li),
        out,
        options,
      );
    }
  }
  // Then added items from right that weren't in left.
  for (const [k, { item: r, index: ri }] of rightByKey) {
    if (!leftByKey.has(k)) {
      out.push({
        kind: "added",
        pointer: joinPointer(pointer, ri),
        path: joinPath(path, ri),
        right: r,
      });
    }
  }
}

/**
 * Ordered array compare with LCS-based move detection. For large arrays
 * (over `lcsThreshold`, default 1000) falls back to positional pairing —
 * LCS is O(N²) time and would freeze the tab on huge inputs.
 */
function diffArrayOrdered(
  left: JsonValue[],
  right: JsonValue[],
  pointer: string,
  path: string,
  out: DiffEntry[],
  options: DiffOptions,
): void {
  const limit = options.lcsThreshold ?? 1000;
  const useLcs = !options.noMoves && Math.max(left.length, right.length) <= limit;

  if (!useLcs) {
    diffArrayPositional(left, right, pointer, path, out, options);
    return;
  }

  // Standard LCS dp table — dp[i][j] = length of LCS of left[0..i] / right[0..j].
  const n = left.length;
  const m = right.length;
  const dp: number[][] = [];
  for (let i = 0; i <= n; i++) dp.push(new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (deepEqual(left[i - 1], right[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Traceback. Build operation stream in reverse, then reverse.
  type Op =
    | { kind: "equal"; li: number; ri: number }
    | { kind: "delete"; li: number }
    | { kind: "insert"; ri: number };
  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (deepEqual(left[i - 1], right[j - 1])) {
      ops.push({ kind: "equal", li: i - 1, ri: j - 1 });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      ops.push({ kind: "delete", li: i - 1 });
      i--;
    } else {
      ops.push({ kind: "insert", ri: j - 1 });
      j--;
    }
  }
  while (i > 0) {
    ops.push({ kind: "delete", li: i - 1 });
    i--;
  }
  while (j > 0) {
    ops.push({ kind: "insert", ri: j - 1 });
    j--;
  }
  ops.reverse();

  // Move detection: pair deletes with inserts whose values deepEqual.
  // Simple value-bucket; first matching insert wins. After this pass, any
  // remaining delete/insert pairs are value-level differences, not moves.
  const deletes = ops.filter((o): o is Extract<Op, { kind: "delete" }> => o.kind === "delete");
  const inserts = ops.filter((o): o is Extract<Op, { kind: "insert" }> => o.kind === "insert");
  const insertPaired = new Set<number>();
  const deletePaired = new Set<number>();
  const moves: { fromIdx: number; toIdx: number }[] = [];

  for (let di = 0; di < deletes.length; di++) {
    const del = deletes[di];
    for (let ii = 0; ii < inserts.length; ii++) {
      if (insertPaired.has(ii)) continue;
      if (deepEqual(left[del.li], right[inserts[ii].ri])) {
        insertPaired.add(ii);
        deletePaired.add(di);
        moves.push({ fromIdx: del.li, toIdx: inserts[ii].ri });
        break;
      }
    }
  }

  // Sequential pairing of remaining (delete, insert) → "changed" entries.
  // This is what catches the common case of `[1,2,3] → [1,9,3]`: LCS keeps
  // 1 and 3, leaves delete(2)/insert(9) — same-position value change. We
  // pair them in original index order so the reported pointer uses the
  // LEFT array's index (i.e., the position you'd PATCH).
  const remainingDeletes = deletes
    .map((d, idx) => ({ d, idx }))
    .filter(({ idx }) => !deletePaired.has(idx));
  const remainingInserts = inserts
    .map((s, idx) => ({ s, idx }))
    .filter(({ idx }) => !insertPaired.has(idx));

  const pairCount = Math.min(remainingDeletes.length, remainingInserts.length);
  for (let p = 0; p < pairCount; p++) {
    const del = remainingDeletes[p].d;
    const ins = remainingInserts[p].s;
    // Recurse into nested structure so a complex change reports field-level
    // entries rather than one big opaque "replace whole object" diff.
    walk(
      left[del.li],
      right[ins.ri],
      joinPointer(pointer, del.li),
      joinPath(path, del.li),
      out,
      options,
    );
  }
  // Leftover deletes → removed entries.
  for (let p = pairCount; p < remainingDeletes.length; p++) {
    const del = remainingDeletes[p].d;
    out.push({
      kind: "removed",
      pointer: joinPointer(pointer, del.li),
      path: joinPath(path, del.li),
      left: left[del.li],
    });
  }
  // Leftover inserts → added entries.
  for (let p = pairCount; p < remainingInserts.length; p++) {
    const ins = remainingInserts[p].s;
    out.push({
      kind: "added",
      pointer: joinPointer(pointer, ins.ri),
      path: joinPath(path, ins.ri),
      right: right[ins.ri],
    });
  }
  // Moves last so they group together at the bottom of the array's diff
  // section in the UI tree.
  for (const mv of moves) {
    out.push({
      kind: "moved",
      pointer: joinPointer(pointer, mv.fromIdx),
      path: joinPath(path, mv.fromIdx),
      left: left[mv.fromIdx],
      right: left[mv.fromIdx],
      move: [mv.fromIdx, mv.toIdx],
    });
  }
}



/**
 * Fallback for large arrays / when noMoves is set. Compares by position
 * up to min(n, m); items beyond are flagged add/remove.
 */
function diffArrayPositional(
  left: JsonValue[],
  right: JsonValue[],
  pointer: string,
  path: string,
  out: DiffEntry[],
  options: DiffOptions,
): void {
  const common = Math.min(left.length, right.length);
  for (let i = 0; i < common; i++) {
    walk(left[i], right[i], joinPointer(pointer, i), joinPath(path, i), out, options);
  }
  for (let i = common; i < left.length; i++) {
    out.push({
      kind: "removed",
      pointer: joinPointer(pointer, i),
      path: joinPath(path, i),
      left: left[i],
    });
  }
  for (let i = common; i < right.length; i++) {
    out.push({
      kind: "added",
      pointer: joinPointer(pointer, i),
      path: joinPath(path, i),
      right: right[i],
    });
  }
}

// ── Public entry ─────────────────────────────────────────────────────────────

export function diffJson(
  left: JsonValue,
  right: JsonValue,
  options: DiffOptions = {},
): DiffResult {
  const entries: DiffEntry[] = [];
  walk(left, right, "", "", entries, options);
  const stats: DiffStats = {
    added: 0,
    removed: 0,
    changed: 0,
    typeChanges: 0,
    moves: 0,
    total: entries.length,
  };
  for (const e of entries) {
    if (e.kind === "added") stats.added++;
    else if (e.kind === "removed") stats.removed++;
    else if (e.kind === "changed") stats.changed++;
    else if (e.kind === "type") stats.typeChanges++;
    else if (e.kind === "moved") stats.moves++;
  }
  return { entries, stats };
}

// ── JSON Patch (RFC 6902) ────────────────────────────────────────────────────

export type JsonPatchOp =
  | { op: "add"; path: string; value: JsonValue }
  | { op: "remove"; path: string }
  | { op: "replace"; path: string; value: JsonValue }
  | { op: "move"; from: string; path: string };

/**
 * Convert a DiffResult into an RFC 6902 patch document. Each entry maps to
 * one operation. The result, applied to the left value, produces the right
 * value (modulo array-strategy semantics — identity-keyed and set modes
 * produce patches that operate by position).
 */
export function toJsonPatch(result: DiffResult): JsonPatchOp[] {
  const ops: JsonPatchOp[] = [];
  for (const e of result.entries) {
    switch (e.kind) {
      case "added":
        ops.push({ op: "add", path: e.pointer, value: e.right as JsonValue });
        break;
      case "removed":
        ops.push({ op: "remove", path: e.pointer });
        break;
      case "changed":
      case "type":
        ops.push({ op: "replace", path: e.pointer, value: e.right as JsonValue });
        break;
      case "moved": {
        if (!e.move) break;
        // Pointer's parent + the destination index.
        const lastSlash = e.pointer.lastIndexOf("/");
        const parent = e.pointer.slice(0, lastSlash);
        const fromPointer = e.pointer;
        const toPointer = `${parent}/${e.move[1]}`;
        ops.push({ op: "move", from: fromPointer, path: toPointer });
        break;
      }
    }
  }
  return ops;
}

// ── Pretty-printing helpers (used by UI) ─────────────────────────────────────

/**
 * Stringify a JsonValue for display. Indents at 2 spaces; primitive values
 * render compactly. Used everywhere the UI shows a left/right value.
 */
export function display(value: JsonValue | undefined): string {
  if (value === undefined) return "";
  return JSON.stringify(value, null, 2);
}

/** Inline (single-line) variant for compact value previews in tree rows. */
export function inlineDisplay(value: JsonValue | undefined, maxLen = 64): string {
  if (value === undefined) return "";
  const s = JSON.stringify(value);
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}
