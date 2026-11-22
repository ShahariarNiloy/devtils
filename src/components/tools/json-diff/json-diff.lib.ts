/**
 * JSON diff — pure semantic comparison library.
 *
 * Compares two JSON values structurally (not as text) and produces a flat
 * list of `DiffEntry` records plus stats. Three array strategies:
 *
 *   - `ordered`  — position matters. Myers diff over per-item structural
 *                  hashes (after trimming the common prefix/suffix), so a
 *                  reorder reads as "moved" and an in-place edit as a
 *                  nested change, in O((N+M)·D) instead of O(N·M).
 *   - `set`      — order ignored; items matched through hash buckets, O(N).
 *   - `identity` — records matched by an identity key (`id`), O(N).
 *
 * An ignore list (key names anywhere, or `$.json.path` patterns with `[*]`
 * wildcards) keeps chosen fields out of the change list while their lines
 * stay visible, dimmed, in the row view.
 *
 * Optionally the same walk emits aligned side-by-side *rows* into a compact
 * struct-of-arrays table (typed arrays + one string pool) — cheap to build,
 * and transferable from a worker without cloning a million small objects.
 *
 * `toJsonPatch()` turns the same comparison into an RFC 6902 patch;
 * `applyPatch()` (copy-on-write) lets the UI verify it.
 *
 * No React, no DOM. Pure value algebra over `JsonValue`.
 */

// ── Value types ──────────────────────────────────────────────────────────────

export type JsonPrimitive = null | boolean | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };
export type JsonType = "null" | "boolean" | "number" | "string" | "array" | "object";
type JsonObject = { [k: string]: JsonValue };

export function typeOf(value: JsonValue): JsonType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as JsonType;
}

function isObject(v: JsonValue): v is JsonObject {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// ── Public types ─────────────────────────────────────────────────────────────

export type DiffKind = "added" | "removed" | "changed" | "type" | "moved";

export interface DiffEntry {
  kind: DiffKind;
  /** RFC 6901 JSON Pointer. Positional array indices (left index for
   *  removed / changed / moved, right index for added), so the entry stays
   *  compatible with JSON Patch operations. */
  pointer: string;
  /** Friendly dot/bracket notation: `users[3].address.city`, or
   *  `items[id=12].qty` for identity-matched arrays. Not RFC-spec'd. */
  path: string;
  /** Value on the left side (undefined for "added"). */
  left?: JsonValue;
  /** Value on the right side (undefined for "removed"). */
  right?: JsonValue;
  /** For "moved": [fromIndex, toIndex] in the array. */
  move?: [number, number];
  /** For "type": old type → new type. */
  typeChange?: [JsonType, JsonType];
  /** First row of this change in `DiffResult.rows` (when rows were built). */
  row?: number;
}

export type ArrayStrategy = "ordered" | "set" | "identity";

export interface DiffOptions {
  /** Per-array compare strategy. Default `"ordered"`. */
  arrayStrategy?: ArrayStrategy;
  /** Identity key for `arrayStrategy: "identity"`. Arrays where any item
   *  lacks the key fall back to ordered compare. */
  identityKey?: string;
  /** Skip move detection on ordered arrays (reorders read as remove + add). */
  noMoves?: boolean;
  /** Edit-distance budget for the ordered (Myers) array diff. Beyond it the
   *  differing middle is compared by position. Default 2000. */
  maxEdits?: number;
  /** Key names (ignored wherever they appear) and `$`-paths (`$.meta.id`,
   *  `$.items[*].updatedAt`) whose differences don't count. */
  ignore?: readonly string[];
}

export interface DiffStats {
  added: number;
  removed: number;
  changed: number;
  typeChanges: number;
  moves: number;
  /** Differences that fell under the ignore list (not in `entries`). */
  ignored: number;
  /** Total of all reported kinds (excludes ignored). */
  total: number;
}

export interface DiffResult {
  entries: DiffEntry[];
  stats: DiffStats;
  /** Aligned side-by-side rows — only when requested. */
  rows?: RowTable;
}

// ── Row table (struct of arrays) ─────────────────────────────────────────────

/** Row kinds. */
export const ROW_SAME = 0;
export const ROW_ADD = 1;
export const ROW_DEL = 2;
export const ROW_CHG = 3;
export const ROW_IGN = 4;
/** Line tokens (what the value part of a line is). */
export const TOK_STRING = 1;
export const TOK_NUMBER = 2;
export const TOK_TRUE = 3;
export const TOK_FALSE = 4;
export const TOK_NULL = 5;
export const TOK_OPEN_OBJ = 6;
export const TOK_CLOSE_OBJ = 7;
export const TOK_OPEN_ARR = 8;
export const TOK_CLOSE_ARR = 9;
export const TOK_EMPTY_OBJ = 10;
export const TOK_EMPTY_ARR = 11;

/**
 * One side's pretty-printed lines. Line `i`: `key[i]` indexes the shared
 * key table (-1 = no key); `meta[i]` packs indent (`>> 5`), token
 * (`>> 1 & 15`) and trailing comma (`& 1`); string / number tokens keep
 * their raw text in `pool.slice(start[i], start[i + 1])` (strings unquoted
 * — quote with `JSON.stringify` at render time, visible lines only).
 */
export interface LineTable {
  count: number;
  pool: string;
  start: Int32Array;
  key: Int32Array;
  meta: Int32Array;
}

export interface RowTable {
  count: number;
  kind: Int32Array;
  /** Index into `entries`, or -1. */
  cid: Int32Array;
  /** Line index into `left` / `right`, or -1 for a blank cell. */
  l: Int32Array;
  r: Int32Array;
  /** Quoted object keys, interned. */
  keys: string[];
  left: LineTable;
  right: LineTable;
}

export interface LineView {
  ind: number;
  /** Quoted key, or null. */
  key: string | null;
  tok: number;
  /** Display text of the value token (`"abc"`, `48.5`, `{`, `[]`…). */
  text: string;
  comma: boolean;
}

const TOK_TEXT: Record<number, string> = {
  [TOK_TRUE]: "true",
  [TOK_FALSE]: "false",
  [TOK_NULL]: "null",
  [TOK_OPEN_OBJ]: "{",
  [TOK_CLOSE_OBJ]: "}",
  [TOK_OPEN_ARR]: "[",
  [TOK_CLOSE_ARR]: "]",
  [TOK_EMPTY_OBJ]: "{}",
  [TOK_EMPTY_ARR]: "[]",
};

/** Decode line `i` of a side for rendering. */
export function lineView(rows: RowTable, t: LineTable, i: number): LineView {
  const meta = t.meta[i];
  const tok = (meta >> 1) & 15;
  const k = t.key[i];
  let text: string;
  if (tok === TOK_STRING) text = JSON.stringify(t.pool.slice(t.start[i], t.start[i + 1]));
  else if (tok === TOK_NUMBER) text = t.pool.slice(t.start[i], t.start[i + 1]);
  else text = TOK_TEXT[tok] ?? "";
  return { ind: meta >> 5, key: k >= 0 ? rows.keys[k] : null, tok, text, comma: (meta & 1) === 1 };
}

/** Growable Int32 buffer (monomorphic on purpose — this is the hot path). */
class Grow {
  buf = new Int32Array(4096);
  len = 0;
  push(v: number): void {
    if (this.len === this.buf.length) {
      const next = new Int32Array(this.buf.length * 2);
      next.set(this.buf);
      this.buf = next;
    }
    this.buf[this.len++] = v;
  }
  /** View of the filled part (no copy; the buffer is transferable). */
  done(): Int32Array {
    return this.buf.subarray(0, this.len);
  }
}

class LineBuilder {
  private parts: string[] = [];
  private offset = 0;
  private start = new Grow();
  private key = new Grow();
  private meta = new Grow();
  count = 0;

  add(ind: number, key: number, tok: number, text: string | null, comma: boolean): number {
    this.start.push(this.offset);
    if (text !== null) {
      this.parts.push(text);
      this.offset += text.length;
    }
    this.key.push(key);
    this.meta.push((ind << 5) | (tok << 1) | (comma ? 1 : 0));
    return this.count++;
  }

  /** A primitive or empty-container line for `v`. */
  value(ind: number, key: number, v: JsonValue, comma: boolean): number {
    if (v === null) return this.add(ind, key, TOK_NULL, null, comma);
    switch (typeof v) {
      case "string":
        return this.add(ind, key, TOK_STRING, v, comma);
      case "number":
        return this.add(ind, key, TOK_NUMBER, String(v), comma);
      case "boolean":
        return this.add(ind, key, v ? TOK_TRUE : TOK_FALSE, null, comma);
      default:
        return this.add(ind, key, Array.isArray(v) ? TOK_EMPTY_ARR : TOK_EMPTY_OBJ, null, comma);
    }
  }

  done(): LineTable {
    this.start.push(this.offset);
    return { count: this.count, pool: this.parts.join(""), start: this.start.done(), key: this.key.done(), meta: this.meta.done() };
  }
}

class RowBuilder {
  readonly left = new LineBuilder();
  readonly right = new LineBuilder();
  private keyIds = new Map<string, number>();
  private keys: string[] = [];
  private kind = new Grow();
  private cid = new Grow();
  private l = new Grow();
  private r = new Grow();
  count = 0;

  keyId(k: string): number {
    let id = this.keyIds.get(k);
    if (id === undefined) {
      id = this.keys.length;
      this.keys.push(JSON.stringify(k));
      this.keyIds.set(k, id);
    }
    return id;
  }

  push(kind: number, l: number, r: number, cid: number): number {
    this.kind.push(kind);
    this.cid.push(cid);
    this.l.push(l);
    this.r.push(r);
    return this.count++;
  }

  done(): RowTable {
    return {
      count: this.count,
      kind: this.kind.done(),
      cid: this.cid.done(),
      l: this.l.done(),
      r: this.r.done(),
      keys: this.keys,
      left: this.left.done(),
      right: this.right.done(),
    };
  }
}

function isEmptyContainer(v: JsonValue): boolean {
  if (Array.isArray(v)) return v.length === 0;
  if (isObject(v)) {
    for (const _ in v) return false;
    return true;
  }
  return false;
}

/** Pretty-print `v` into one side's lines. Returns the first line index. */
function prettyLines(rows: RowBuilder, t: LineBuilder, v: JsonValue, key: number, depth: number, last: boolean): number {
  if (v !== null && typeof v === "object" && !isEmptyContainer(v)) {
    if (Array.isArray(v)) {
      const first = t.add(depth, key, TOK_OPEN_ARR, null, false);
      for (let i = 0; i < v.length; i++) prettyLines(rows, t, v[i], -1, depth + 1, i === v.length - 1);
      t.add(depth, -1, TOK_CLOSE_ARR, null, !last);
      return first;
    }
    const first = t.add(depth, key, TOK_OPEN_OBJ, null, false);
    const ks = Object.keys(v);
    for (let i = 0; i < ks.length; i++) prettyLines(rows, t, v[ks[i]], rows.keyId(ks[i]), depth + 1, i === ks.length - 1);
    t.add(depth, -1, TOK_CLOSE_OBJ, null, !last);
    return first;
  }
  return t.value(depth, key, v, !last);
}

// ── Depth guard ──────────────────────────────────────────────────────────────

/**
 * Deepest nesting the diff will walk. The walk, `deepEqual`, hashing and
 * the patch builder are recursive, so absurdly nested input would otherwise
 * blow the call stack. 500 is far beyond any real document.
 */
export const MAX_DIFF_DEPTH = 500;

/** Thrown by `diffJson` / `toJsonPatch` when an input exceeds `MAX_DIFF_DEPTH`. */
export class DiffTooDeepError extends Error {
  readonly limit: number;
  constructor(limit: number) {
    super(`Too deeply nested to diff (>${limit} levels)`);
    this.name = "DiffTooDeepError";
    this.limit = limit;
  }
}

/**
 * Nesting depth of a value (`1` → 0, `[1]` → 1, `{"a":[1]}` → 2). Iterative,
 * so it is safe on input of any depth. Stops early once `stopAt` is passed.
 */
export function nestingDepth(value: JsonValue, stopAt = Infinity): number {
  let max = 0;
  const vals: JsonValue[] = [value];
  const depths: number[] = [0];
  while (vals.length) {
    const v = vals.pop() as JsonValue;
    const d = depths.pop() as number;
    if (v === null || typeof v !== "object") continue;
    const nd = d + 1;
    if (nd > max) {
      max = nd;
      if (max > stopAt) return max;
    }
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const c = v[i];
        if (c !== null && typeof c === "object") {
          vals.push(c);
          depths.push(nd);
        }
      }
    } else {
      for (const k in v) {
        const c = v[k];
        if (c !== null && typeof c === "object") {
          vals.push(c);
          depths.push(nd);
        }
      }
    }
  }
  return max;
}

/** Throw `DiffTooDeepError` if `value` is nested deeper than `MAX_DIFF_DEPTH`. */
export function assertDiffableDepth(value: JsonValue): void {
  if (nestingDepth(value, MAX_DIFF_DEPTH) > MAX_DIFF_DEPTH) {
    throw new DiffTooDeepError(MAX_DIFF_DEPTH);
  }
}

// ── Deep equality + structural hash ──────────────────────────────────────────

/**
 * Structural equality on `JsonValue`. Object key order is ignored (JSON
 * spec semantics); `0` equals `-0`.
 */
export function deepEqual(a: JsonValue, b: JsonValue): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  const aa = Array.isArray(a);
  if (aa !== Array.isArray(b)) return false;
  if (aa) {
    const x = a as JsonValue[];
    const y = b as JsonValue[];
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (!deepEqual(x[i], y[i])) return false;
    return true;
  }
  const ao = a as JsonObject;
  const bo = b as JsonObject;
  const aKeys = Object.keys(ao);
  if (aKeys.length !== Object.keys(bo).length) return false;
  for (const k of aKeys) {
    // Own keys only — `"constructor" in {}` is true via the prototype.
    if (!Object.hasOwn(bo, k)) return false;
    if (!deepEqual(ao[k], bo[k])) return false;
  }
  return true;
}

const f64 = new Float64Array(1);
const u32 = new Uint32Array(f64.buffer);

function mix(h: number): number {
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) | 0;
}

function hashString(s: string, seed: number): number {
  let h = seed ^ 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return mix(h ^ s.length);
}

/**
 * 32-bit structural hash consistent with `deepEqual`: equal values hash
 * equal (object key order doesn't matter). Used to make array matching
 * linear-time; every hash hit is confirmed with `deepEqual`.
 */
export function hashValue(v: JsonValue): number {
  if (v === null) return 0x2545f491;
  switch (typeof v) {
    case "string":
      return hashString(v, 0x9e3779b9);
    case "number":
      f64[0] = v === 0 ? 0 : v;
      return mix(Math.imul(u32[0], 0x27d4eb2d) ^ u32[1] ^ 0x165667b1);
    case "boolean":
      return v ? 0x61c88647 : 0x3c6ef372;
  }
  if (Array.isArray(v)) {
    let h = 0x7f4a7c15 ^ v.length;
    for (let i = 0; i < v.length; i++) h = mix(Math.imul(h, 31) + hashValue(v[i]));
    return h;
  }
  // Order-insensitive: sum of per-entry hashes.
  let h = 0;
  let n = 0;
  for (const k in v) {
    if (!Object.hasOwn(v, k)) continue;
    h = (h + mix(hashString(k, 0x1b873593) ^ Math.imul(hashValue(v[k]), 0x5bd1e995))) | 0;
    n++;
  }
  return mix(h ^ Math.imul(n, 0x68e31da4) ^ 0x2f2f2f2f);
}

// ── Path helpers ─────────────────────────────────────────────────────────────

/** Escape a single path component per RFC 6901 (`~` → `~0`, `/` → `~1`). */
function escapePointer(token: string): string {
  if (token.indexOf("~") === -1 && token.indexOf("/") === -1) return token;
  return token.replace(/~/g, "~0").replace(/\//g, "~1");
}

function joinPointer(parent: string, token: string | number): string {
  return `${parent}/${typeof token === "number" ? token : escapePointer(token)}`;
}

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** Friendly path extension — dot-notation for keys, brackets for indices. */
function joinPath(parent: string, token: string | number): string {
  if (typeof token === "number") return `${parent}[${token}]`;
  if (IDENT.test(token)) return parent ? `${parent}.${token}` : token;
  return `${parent}[${JSON.stringify(token)}]`;
}

/** `[id=12]` label for an identity-matched array item. */
function identityLabel(parent: string, key: string, item: JsonValue): string {
  const raw = isObject(item) ? JSON.stringify(item[key]) : "";
  const label = raw.length > 1 && raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
  return `${parent}[${key}=${label}]`;
}

/**
 * JSONPath-style label for a friendly path: `$`, `$.name`, `$[0]`,
 * `$.users[3].city`.
 */
export function dollarPath(path: string): string {
  if (!path) return "$";
  return path.startsWith("[") ? `$${path}` : `$.${path}`;
}

// ── Ignore list ──────────────────────────────────────────────────────────────

interface IgnoreMatcher {
  keys: Set<string>;
  paths: RegExp | null;
}

/**
 * Compile an ignore list. Entries starting with `$` are paths — exact, with
 * `[*]` matching any index / `[id=…]` and `.*` any key; anything else is a
 * key name ignored wherever it appears. Ignoring a node ignores its subtree.
 */
export function compileIgnore(list: readonly string[] | undefined): IgnoreMatcher | null {
  if (!list || list.length === 0) return null;
  const keys = new Set<string>();
  const sources: string[] = [];
  for (const raw of list) {
    const item = raw.trim();
    if (!item) continue;
    if (item.startsWith("$")) {
      const body = item === "$" ? "" : item.slice(1);
      const src = body
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\\\[\\\*\\\]/g, "\\[[^\\]]*\\]")
        .replace(/\\\.\\\*/g, "\\.[^.\\[]+");
      sources.push(src);
    } else {
      keys.add(item);
    }
  }
  if (keys.size === 0 && sources.length === 0) return null;
  return { keys, paths: sources.length ? new RegExp(`^\\$(?:${sources.join("|")})$`) : null };
}

function isIgnored(m: IgnoreMatcher, key: string | null, path: string): boolean {
  if (key !== null && m.keys.has(key)) return true;
  return m.paths !== null && m.paths.test(dollarPath(path));
}

// ── Canonicalize (sort keys, recursively) ────────────────────────────────────

/**
 * Recursively sort object keys. The semantic diff is already key-order
 * insensitive; this only changes the order lines are shown in.
 */
export function canonicalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    // `fromEntries` defines own properties, so a `"__proto__"` key survives.
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonicalize(value[k])]),
    );
  }
  return value;
}

// ── Array matching ───────────────────────────────────────────────────────────

export const STEP_SAME = 0;
export const STEP_PAIR = 1;
export const STEP_DEL = 2;
export const STEP_INS = 3;
export const STEP_MOVE_FROM = 4;
export const STEP_MOVE_TO = 5;

/**
 * How the items of two arrays correspond, as an ordered script. `a` / `b`
 * are left / right indices (-1 when absent). `m` pairs MOVE_FROM with its
 * MOVE_TO (the move's ordinal). Shared by the diff (entries + rows) and the
 * patch builder, so the patch describes the same pairing the UI shows.
 */
interface ArrayMatch {
  strategy: ArrayStrategy;
  t: number[];
  a: number[];
  b: number[];
  m: number[];
}

interface MatchCtx {
  strategy: ArrayStrategy;
  identityKey: string;
  noMoves: boolean;
  maxEdits: number;
}

function matchCtx(options: DiffOptions): MatchCtx {
  return {
    strategy: options.arrayStrategy ?? "ordered",
    identityKey: (options.identityKey ?? "").trim(),
    noMoves: options.noMoves === true,
    maxEdits: options.maxEdits ?? 2000,
  };
}

function newMatch(strategy: ArrayStrategy): ArrayMatch {
  return { strategy, t: [], a: [], b: [], m: [] };
}

function step(mt: ArrayMatch, t: number, a: number, b: number, m = -1): void {
  mt.t.push(t);
  mt.a.push(a);
  mt.b.push(b);
  mt.m.push(m);
}

function matchArray(left: JsonValue[], right: JsonValue[], c: MatchCtx): ArrayMatch {
  if (c.strategy === "set") return matchSet(left, right);
  if (c.strategy === "identity" && c.identityKey) {
    const key = c.identityKey;
    const hasKey = (x: JsonValue) => isObject(x) && Object.hasOwn(x, key);
    if ((left.length || right.length) && left.every(hasKey) && right.every(hasKey)) {
      return matchIdentity(left, right, key);
    }
  }
  return matchOrdered(left, right, c);
}

/** Order-independent: hash buckets, first deep-equal unused hit wins. */
function matchSet(left: JsonValue[], right: JsonValue[]): ArrayMatch {
  const mt = newMatch("set");
  const buckets = new Map<number, number[]>();
  for (let j = 0; j < right.length; j++) {
    const h = hashValue(right[j]);
    const list = buckets.get(h);
    if (list) list.push(j);
    else buckets.set(h, [j]);
  }
  const used = new Uint8Array(right.length);
  for (let i = 0; i < left.length; i++) {
    const list = buckets.get(hashValue(left[i]));
    let hit = -1;
    if (list) {
      for (let q = 0; q < list.length; q++) {
        const j = list[q];
        if (!used[j] && deepEqual(left[i], right[j])) {
          hit = j;
          break;
        }
      }
    }
    if (hit === -1) step(mt, STEP_DEL, i, -1);
    else {
      used[hit] = 1;
      step(mt, STEP_SAME, i, hit);
    }
  }
  for (let j = 0; j < right.length; j++) if (!used[j]) step(mt, STEP_INS, -1, j);
  return mt;
}

/**
 * Match records by identity key. Duplicate ids pair up in order of
 * appearance; extras count as added / removed. Script: left order (paired
 * or removed), then unmatched right items.
 */
function matchIdentity(left: JsonValue[], right: JsonValue[], key: string): ArrayMatch {
  const mt = newMatch("identity");
  // matchArray guarantees every item is an object owning `key`.
  const idOf = (item: JsonValue): string => JSON.stringify((item as JsonObject)[key]);
  const byId = new Map<string, number[]>();
  for (let j = 0; j < right.length; j++) {
    const id = idOf(right[j]);
    const list = byId.get(id);
    if (list) list.push(j);
    else byId.set(id, [j]);
  }
  const used = new Uint8Array(right.length);
  for (let i = 0; i < left.length; i++) {
    const j = byId.get(idOf(left[i]))?.shift();
    if (j === undefined) step(mt, STEP_DEL, i, -1);
    else {
      used[j] = 1;
      step(mt, STEP_PAIR, i, j);
    }
  }
  for (let j = 0; j < right.length; j++) if (!used[j]) step(mt, STEP_INS, -1, j);
  return mt;
}

/**
 * Myers' O((N+M)·D) shortest edit script over `[0,n) × [0,m)`. Returns the
 * forward script as parallel arrays, or null when D exceeds `maxD`.
 */
function myers(
  n: number,
  m: number,
  eq: (i: number, j: number) => boolean,
  maxD: number,
): { t: number[]; a: number[]; b: number[] } | null {
  const limit = Math.min(maxD, n + m);
  const off = limit + 1;
  const v = new Int32Array(2 * limit + 3);
  const trace: Int32Array[] = [];
  let found = -1;
  for (let d = 0; d <= limit; d++) {
    // Snapshot of v for k ∈ [-d-1, d+1] — what this round reads.
    trace.push(v.slice(off - d - 1, off + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && eq(x, y)) {
        x++;
        y++;
      }
      v[off + k] = x;
      if (x >= n && y >= m) {
        found = d;
        break;
      }
    }
    if (found !== -1) break;
  }
  if (found === -1) return null;

  // Backtrack into a reversed script.
  const t: number[] = [];
  const a: number[] = [];
  const b: number[] = [];
  let x = n;
  let y = m;
  for (let d = found; d >= 0; d--) {
    const snap = trace[d];
    const at = (k: number) => snap[k + d + 1];
    const k = x - y;
    const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
    const prevX = d === 0 ? 0 : at(prevK);
    const prevY = d === 0 ? 0 : prevX - prevK;
    while (x > prevX && y > prevY) {
      x--;
      y--;
      t.push(STEP_SAME);
      a.push(x);
      b.push(y);
    }
    if (d > 0) {
      if (x === prevX) {
        t.push(STEP_INS);
        a.push(-1);
        b.push(prevY);
      } else {
        t.push(STEP_DEL);
        a.push(prevX);
        b.push(-1);
      }
    }
    x = prevX;
    y = prevY;
  }
  t.reverse();
  a.reverse();
  b.reverse();
  return { t, a, b };
}

/**
 * Ordered compare: trim the deep-equal prefix / suffix, Myers over item
 * hashes for the middle, then detect moves (a removed item deep-equal to
 * an added one) and pair the remaining removals / additions inside each
 * gap as in-place changes — `[1,2,3] → [1,9,3]` reads as `[1]` changed.
 * Over the edit budget, the middle is compared by position.
 */
function matchOrdered(left: JsonValue[], right: JsonValue[], c: MatchCtx): ArrayMatch {
  const mt = newMatch("ordered");
  const n = left.length;
  const m = right.length;
  let pre = 0;
  while (pre < n && pre < m && deepEqual(left[pre], right[pre])) pre++;
  let suf = 0;
  while (suf < n - pre && suf < m - pre && deepEqual(left[n - 1 - suf], right[m - 1 - suf])) suf++;
  for (let i = 0; i < pre; i++) step(mt, STEP_SAME, i, i);

  const mn = n - pre - suf;
  const mm = m - pre - suf;
  if (mn > 0 || mm > 0) {
    const ha = new Int32Array(mn);
    const hb = new Int32Array(mm);
    for (let i = 0; i < mn; i++) ha[i] = hashValue(left[pre + i]);
    for (let j = 0; j < mm; j++) hb[j] = hashValue(right[pre + j]);
    const script = myers(mn, mm, (i, j) => ha[i] === hb[j] && deepEqual(left[pre + i], right[pre + j]), c.maxEdits);
    if (script) emitGaps(mt, script, pre, left, right, ha, hb, c.noMoves);
    else {
      // Over budget — positional.
      const common = Math.min(mn, mm);
      for (let i = 0; i < common; i++) step(mt, STEP_PAIR, pre + i, pre + i);
      for (let i = common; i < mn; i++) step(mt, STEP_DEL, pre + i, -1);
      for (let j = common; j < mm; j++) step(mt, STEP_INS, -1, pre + j);
    }
  }
  for (let s = suf; s > 0; s--) step(mt, STEP_SAME, n - s, m - s);
  return mt;
}

function emitGaps(
  mt: ArrayMatch,
  script: { t: number[]; a: number[]; b: number[] },
  base: number,
  left: JsonValue[],
  right: JsonValue[],
  ha: Int32Array,
  hb: Int32Array,
  noMoves: boolean,
): void {
  const len = script.t.length;
  // Moves: each removed item takes the first unused deep-equal added item.
  const moveOfDel = new Map<number, number>(); // script index → move ordinal
  const moveOfIns = new Map<number, number>();
  if (!noMoves) {
    const insByHash = new Map<number, number[]>();
    for (let s = 0; s < len; s++) {
      if (script.t[s] !== STEP_INS) continue;
      const h = hb[script.b[s]];
      const list = insByHash.get(h);
      if (list) list.push(s);
      else insByHash.set(h, [s]);
    }
    let ordinal = 0;
    for (let s = 0; s < len && insByHash.size; s++) {
      if (script.t[s] !== STEP_DEL) continue;
      const li = script.a[s];
      const list = insByHash.get(ha[li]);
      if (!list) continue;
      for (let q = 0; q < list.length; q++) {
        const si = list[q];
        if (deepEqual(left[base + li], right[base + script.b[si]])) {
          list.splice(q, 1);
          moveOfDel.set(s, ordinal);
          moveOfIns.set(si, ordinal);
          ordinal++;
          break;
        }
      }
    }
  }

  let s = 0;
  while (s < len) {
    if (script.t[s] === STEP_SAME) {
      step(mt, STEP_SAME, base + script.a[s], base + script.b[s]);
      s++;
      continue;
    }
    // A gap: pair its non-moved removals and additions in order.
    const end = (() => {
      let e = s;
      while (e < len && script.t[e] !== STEP_SAME) e++;
      return e;
    })();
    const dels: number[] = [];
    const ins: number[] = [];
    for (let g = s; g < end; g++) {
      if (script.t[g] === STEP_DEL && !moveOfDel.has(g)) dels.push(g);
      else if (script.t[g] === STEP_INS && !moveOfIns.has(g)) ins.push(g);
    }
    const pairs = Math.min(dels.length, ins.length);
    const partner = new Map<number, number>();
    const pairedIns = new Set<number>();
    for (let p = 0; p < pairs; p++) {
      partner.set(dels[p], ins[p]);
      pairedIns.add(ins[p]);
    }
    for (let g = s; g < end; g++) {
      const kind = script.t[g];
      if (kind === STEP_DEL) {
        const li = base + script.a[g];
        const mv = moveOfDel.get(g);
        const pi = partner.get(g);
        if (mv !== undefined) step(mt, STEP_MOVE_FROM, li, -1, mv);
        else if (pi !== undefined) step(mt, STEP_PAIR, li, base + script.b[pi]);
        else step(mt, STEP_DEL, li, -1);
      } else {
        if (pairedIns.has(g)) continue;
        const ri = base + script.b[g];
        const mv = moveOfIns.get(g);
        if (mv !== undefined) step(mt, STEP_MOVE_TO, -1, ri, mv);
        else step(mt, STEP_INS, -1, ri);
      }
    }
    s = end;
  }
  // Fill MOVE_FROM's partner right index and MOVE_TO's left index.
  const fromLeft = new Map<number, number>();
  const toRight = new Map<number, number>();
  for (let k = 0; k < mt.t.length; k++) {
    if (mt.t[k] === STEP_MOVE_FROM) fromLeft.set(mt.m[k], mt.a[k]);
    else if (mt.t[k] === STEP_MOVE_TO) toRight.set(mt.m[k], mt.b[k]);
  }
  for (let k = 0; k < mt.t.length; k++) {
    if (mt.t[k] === STEP_MOVE_FROM) mt.b[k] = toRight.get(mt.m[k]) ?? -1;
    else if (mt.t[k] === STEP_MOVE_TO) mt.a[k] = fromLeft.get(mt.m[k]) ?? -1;
  }
}

// ── Core walk ────────────────────────────────────────────────────────────────

const MISSING: unique symbol = Symbol("missing");
type Slot = JsonValue | typeof MISSING;

interface WalkCtx {
  match: MatchCtx;
  ign: IgnoreMatcher | null;
  entries: DiffEntry[];
  ignored: number;
  rows: RowBuilder | null;
}

function push(ctx: WalkCtx, e: DiffEntry): number {
  if (ctx.rows) e.row = ctx.rows.count;
  ctx.entries.push(e);
  return ctx.entries.length - 1;
}

/** Rows for a subtree present on one side only. */
function oneSided(rows: RowBuilder, left: boolean, v: JsonValue, key: number, depth: number, last: boolean, kind: number, cid: number): void {
  const t = left ? rows.left : rows.right;
  const first = prettyLines(rows, t, v, key, depth, last);
  const end = t.count;
  for (let i = first; i < end; i++) {
    if (left) rows.push(kind, i, -1, cid);
    else rows.push(kind, -1, i, cid);
  }
}

/** Ignored subtree: both sides' lines, zipped, dimmed. */
function ignoredRows(rows: RowBuilder, a: Slot, b: Slot, key: number, depth: number, lastA: boolean, lastB: boolean): void {
  const la = rows.left.count;
  if (a !== MISSING) prettyLines(rows, rows.left, a, key, depth, lastA);
  const lb = rows.right.count;
  if (b !== MISSING) prettyLines(rows, rows.right, b, key, depth, lastB);
  const na = rows.left.count - la;
  const nb = rows.right.count - lb;
  for (let i = 0; i < Math.max(na, nb); i++) rows.push(ROW_IGN, i < na ? la + i : -1, i < nb ? lb + i : -1, -1);
}

function valueRow(rows: RowBuilder, kind: number, key: number, depth: number, a: JsonValue, b: JsonValue, lastA: boolean, lastB: boolean, cid: number): void {
  rows.push(kind, rows.left.value(depth, key, a, !lastA), rows.right.value(depth, key, b, !lastB), cid);
}

function visit(
  ctx: WalkCtx,
  a: Slot,
  b: Slot,
  key: string | null,
  pointer: string,
  path: string,
  depth: number,
  lastA: boolean,
  lastB: boolean,
): void {
  const rows = ctx.rows;
  const kid = rows && key !== null ? rows.keyId(key) : -1;
  if (depth > 0 && ctx.ign && isIgnored(ctx.ign, key, path)) {
    if (a === MISSING || b === MISSING || !deepEqual(a, b)) ctx.ignored++;
    if (rows) ignoredRows(rows, a, b, kid, depth, lastA, lastB);
    return;
  }
  if (a === MISSING) {
    if (b === MISSING) return;
    const cid = push(ctx, { kind: "added", pointer, path, right: b });
    if (rows) oneSided(rows, false, b, kid, depth, lastB, ROW_ADD, cid);
    return;
  }
  if (b === MISSING) {
    const cid = push(ctx, { kind: "removed", pointer, path, left: a });
    if (rows) oneSided(rows, true, a, kid, depth, lastA, ROW_DEL, cid);
    return;
  }

  // Fast path: identical primitives (the bulk of any real document).
  if (a === b) {
    if (rows) valueRow(rows, ROW_SAME, kid, depth, a, b, lastA, lastB, -1);
    return;
  }

  const ta = typeOf(a);
  const tb = typeOf(b);
  if (ta !== tb) {
    const cid = push(ctx, { kind: "type", pointer, path, left: a, right: b, typeChange: [ta, tb] });
    if (rows) {
      const primA = ta !== "object" && ta !== "array";
      const primB = tb !== "object" && tb !== "array";
      if (primA && primB) valueRow(rows, ROW_CHG, kid, depth, a, b, lastA, lastB, cid);
      else {
        oneSided(rows, true, a, kid, depth, lastA, ROW_DEL, cid);
        oneSided(rows, false, b, kid, depth, lastB, ROW_ADD, cid);
      }
    }
    return;
  }

  if (ta === "object") {
    diffObject(ctx, a as JsonObject, b as JsonObject, kid, pointer, path, depth, lastA, lastB);
    return;
  }
  if (ta === "array") {
    diffArray(ctx, a as JsonValue[], b as JsonValue[], kid, pointer, path, depth, lastA, lastB);
    return;
  }

  // Distinct primitives of the same type (0 === -0 was caught above).
  const cid = push(ctx, { kind: "changed", pointer, path, left: a, right: b });
  if (rows) valueRow(rows, ROW_CHG, kid, depth, a, b, lastA, lastB, cid);
}

function diffObject(
  ctx: WalkCtx,
  a: JsonObject,
  b: JsonObject,
  kid: number,
  pointer: string,
  path: string,
  depth: number,
  lastA: boolean,
  lastB: boolean,
): void {
  const ak = Object.keys(a);
  const keys = ak.slice();
  for (const k of Object.keys(b)) if (!Object.hasOwn(a, k)) keys.push(k);
  const rows = ctx.rows;
  if (rows && keys.length === 0) {
    valueRow(rows, ROW_SAME, kid, depth, a, b, lastA, lastB, -1);
    return;
  }
  let lastKeyA = "";
  let lastKeyB = "";
  if (rows) {
    rows.push(ROW_SAME, rows.left.add(depth, kid, TOK_OPEN_OBJ, null, false), rows.right.add(depth, kid, TOK_OPEN_OBJ, null, false), -1);
    lastKeyA = ak.length ? ak[ak.length - 1] : "";
    for (let i = keys.length - 1; i >= 0; i--) {
      if (Object.hasOwn(b, keys[i])) {
        lastKeyB = keys[i];
        break;
      }
    }
  }
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    // Own keys only — `k in obj` would see `constructor` on the prototype.
    const inA = i < ak.length;
    const inB = Object.hasOwn(b, k);
    visit(
      ctx,
      inA ? a[k] : MISSING,
      inB ? b[k] : MISSING,
      k,
      joinPointer(pointer, k),
      joinPath(path, k),
      depth + 1,
      inA && k === lastKeyA,
      inB && k === lastKeyB,
    );
  }
  if (rows) rows.push(ROW_SAME, rows.left.add(depth, -1, TOK_CLOSE_OBJ, null, !lastA), rows.right.add(depth, -1, TOK_CLOSE_OBJ, null, !lastB), -1);
}

function diffArray(
  ctx: WalkCtx,
  a: JsonValue[],
  b: JsonValue[],
  kid: number,
  pointer: string,
  path: string,
  depth: number,
  lastA: boolean,
  lastB: boolean,
): void {
  const rows = ctx.rows;
  if (a.length === 0 && b.length === 0) {
    if (rows) valueRow(rows, ROW_SAME, kid, depth, a, b, lastA, lastB, -1);
    return;
  }
  const mt = matchArray(a, b, ctx.match);
  const n = mt.t.length;
  const idKey = mt.strategy === "identity" ? ctx.match.identityKey : "";
  const label = (li: number, ri: number): string =>
    idKey ? identityLabel(path, idKey, li >= 0 ? a[li] : b[ri]) : joinPath(path, li >= 0 ? li : ri);

  // Last script step carrying a left / right item (for trailing commas).
  let lastStepA = -1;
  let lastStepB = -1;
  if (rows) {
    rows.push(ROW_SAME, rows.left.add(depth, kid, TOK_OPEN_ARR, null, false), rows.right.add(depth, kid, TOK_OPEN_ARR, null, false), -1);
    for (let s = n - 1; s >= 0 && (lastStepA === -1 || lastStepB === -1); s--) {
      const t = mt.t[s];
      if (lastStepA === -1 && t !== STEP_INS && t !== STEP_MOVE_TO) lastStepA = s;
      if (lastStepB === -1 && t !== STEP_DEL && t !== STEP_MOVE_FROM) lastStepB = s;
    }
  }

  const moveCid = new Map<number, number>();
  for (let s = 0; s < n; s++) {
    const t = mt.t[s];
    const li = mt.a[s];
    const ri = mt.b[s];
    const la = s === lastStepA;
    const lb = s === lastStepB;
    switch (t) {
      case STEP_SAME:
        // Deep-equal: nothing to report; rows still need the lines.
        if (rows) visit(ctx, a[li], b[ri], null, joinPointer(pointer, li), label(li, ri), depth + 1, la, lb);
        break;
      case STEP_PAIR:
        visit(ctx, a[li], b[ri], null, joinPointer(pointer, li), label(li, ri), depth + 1, la, lb);
        break;
      case STEP_DEL:
        visit(ctx, a[li], MISSING, null, joinPointer(pointer, li), label(li, -1), depth + 1, la, lb);
        break;
      case STEP_INS:
        visit(ctx, MISSING, b[ri], null, joinPointer(pointer, ri), label(-1, ri), depth + 1, la, lb);
        break;
      case STEP_MOVE_FROM:
      case STEP_MOVE_TO: {
        const from = t === STEP_MOVE_FROM ? li : mt.a[s];
        const fromPath = joinPath(path, from);
        if (ctx.ign && isIgnored(ctx.ign, null, fromPath)) {
          if (t === STEP_MOVE_FROM) ctx.ignored++;
          if (rows) ignoredRows(rows, t === STEP_MOVE_FROM ? a[li] : MISSING, t === STEP_MOVE_TO ? b[ri] : MISSING, -1, depth + 1, la, lb);
          break;
        }
        let cid = moveCid.get(mt.m[s]);
        if (cid === undefined) {
          const to = t === STEP_MOVE_TO ? ri : mt.b[s];
          cid = push(ctx, { kind: "moved", pointer: joinPointer(pointer, from), path: fromPath, left: a[from], right: a[from], move: [from, to] });
          moveCid.set(mt.m[s], cid);
        }
        if (rows) {
          if (t === STEP_MOVE_FROM) oneSided(rows, true, a[li], -1, depth + 1, la, ROW_DEL, cid);
          else oneSided(rows, false, b[ri], -1, depth + 1, lb, ROW_ADD, cid);
        }
        break;
      }
    }
  }
  if (rows) rows.push(ROW_SAME, rows.left.add(depth, -1, TOK_CLOSE_ARR, null, !lastA), rows.right.add(depth, -1, TOK_CLOSE_ARR, null, !lastB), -1);
}

// ── Public entry ─────────────────────────────────────────────────────────────

/**
 * Semantic diff of two JSON values. Pass `{ rows: true }` to also build the
 * aligned side-by-side row table. Throws `DiffTooDeepError` when either
 * side is nested deeper than `MAX_DIFF_DEPTH`.
 */
export function diffJson(
  left: JsonValue,
  right: JsonValue,
  options: DiffOptions = {},
  build: { rows?: boolean } = {},
): DiffResult {
  assertDiffableDepth(left);
  assertDiffableDepth(right);
  const ctx: WalkCtx = {
    match: matchCtx(options),
    ign: compileIgnore(options.ignore),
    entries: [],
    ignored: 0,
    rows: build.rows ? new RowBuilder() : null,
  };
  visit(ctx, left, right, null, "", "", 0, true, true);
  const stats: DiffStats = {
    added: 0,
    removed: 0,
    changed: 0,
    typeChanges: 0,
    moves: 0,
    ignored: ctx.ignored,
    total: ctx.entries.length,
  };
  for (const e of ctx.entries) {
    if (e.kind === "added") stats.added++;
    else if (e.kind === "removed") stats.removed++;
    else if (e.kind === "changed") stats.changed++;
    else if (e.kind === "type") stats.typeChanges++;
    else stats.moves++;
  }
  const result: DiffResult = { entries: ctx.entries, stats };
  if (ctx.rows) result.rows = ctx.rows.done();
  return result;
}

// ── JSON Patch (RFC 6902) ────────────────────────────────────────────────────

export type JsonPatchOp =
  | { op: "add"; path: string; value: JsonValue }
  | { op: "remove"; path: string }
  | { op: "replace"; path: string; value: JsonValue }
  | { op: "move"; from: string; path: string };

/**
 * Beyond this many (moves × array length) steps, reordering an array op by
 * op gets quadratic; a single `replace` of the array is emitted instead.
 */
const MAX_REORDER_WORK = 2_000_000;

interface PatchCtx {
  match: MatchCtx;
  ign: IgnoreMatcher | null;
  ops: JsonPatchOp[];
}

/**
 * Build an RFC 6902 patch that turns `left` into `right`, using the same
 * item pairing as `diffJson`. Per array: removals (descending), moves into
 * final order, additions (ascending), then nested edits at final indices —
 * so every op is valid against the document as earlier ones left it.
 * Without an ignore list, applying it to `left` yields a value deep-equal
 * to `right` (order included). Ignored keys / paths get no ops.
 */
export function toJsonPatch(left: JsonValue, right: JsonValue, options: DiffOptions = {}): JsonPatchOp[] {
  assertDiffableDepth(left);
  assertDiffableDepth(right);
  const ctx: PatchCtx = { match: matchCtx(options), ign: compileIgnore(options.ignore), ops: [] };
  patchWalk(ctx, left, right, "", "");
  return ctx.ops;
}

function patchWalk(ctx: PatchCtx, left: JsonValue, right: JsonValue, pointer: string, path: string): void {
  if (left === right) return;
  const ta = typeOf(left);
  if (ta !== typeOf(right)) {
    ctx.ops.push({ op: "replace", path: pointer, value: right });
    return;
  }
  if (ta === "array") {
    patchArray(ctx, left as JsonValue[], right as JsonValue[], pointer, path);
    return;
  }
  if (ta === "object") {
    const lo = left as JsonObject;
    const ro = right as JsonObject;
    const skip = (k: string) => ctx.ign !== null && isIgnored(ctx.ign, k, joinPath(path, k));
    for (const k of Object.keys(lo)) {
      if (!Object.hasOwn(ro, k) && !skip(k)) ctx.ops.push({ op: "remove", path: joinPointer(pointer, k) });
    }
    for (const k of Object.keys(ro)) {
      if (skip(k)) continue;
      const p = joinPointer(pointer, k);
      if (!Object.hasOwn(lo, k)) ctx.ops.push({ op: "add", path: p, value: ro[k] });
      else patchWalk(ctx, lo[k], ro[k], p, joinPath(path, k));
    }
    return;
  }
  if (left !== right) ctx.ops.push({ op: "replace", path: pointer, value: right });
}

function patchArray(ctx: PatchCtx, left: JsonValue[], right: JsonValue[], pointer: string, path: string): void {
  const mt = matchArray(left, right, ctx.match);
  const at = (i: number) => joinPointer(pointer, i);
  const idKey = mt.strategy === "identity" ? ctx.match.identityKey : "";

  // Every surviving left item, in left order, tagged with its right index.
  const kept: Array<[number, number]> = [];
  const removed: number[] = [];
  const added: number[] = [];
  const pairs: Array<[number, number]> = [];
  for (let s = 0; s < mt.t.length; s++) {
    const t = mt.t[s];
    if (t === STEP_SAME || t === STEP_PAIR || t === STEP_MOVE_FROM) kept.push([mt.a[s], mt.b[s]]);
    if (t === STEP_PAIR) pairs.push([mt.a[s], mt.b[s]]);
    else if (t === STEP_DEL) removed.push(mt.a[s]);
    else if (t === STEP_INS) added.push(mt.b[s]);
  }
  kept.sort((x, y) => x[0] - y[0]);
  removed.sort((x, y) => x - y);
  added.sort((x, y) => x - y);
  const order = kept.map(([, ri]) => ri);
  const stay = longestIncreasingRun(order);
  const toMove: number[] = [];
  for (let k = 0; k < order.length; k++) if (!stay[k]) toMove.push(order[k]);

  if (toMove.length * order.length > MAX_REORDER_WORK) {
    ctx.ops.push({ op: "replace", path: pointer, value: right });
    return;
  }

  // 1. Removals, highest index first so earlier indices stay valid.
  for (let k = removed.length - 1; k >= 0; k--) ctx.ops.push({ op: "remove", path: at(removed[k]) });

  // 2. Reorder survivors into right's relative order. Items on the longest
  //    increasing run stay put; each other item (by ascending right index)
  //    moves to just after the last already-placed item that precedes it.
  if (toMove.length) {
    const cur = order.slice();
    const placed = new Set<number>();
    for (let k = 0; k < order.length; k++) if (stay[k]) placed.add(order[k]);
    toMove.sort((x, y) => x - y);
    for (const ri of toMove) {
      const from = cur.indexOf(ri);
      cur.splice(from, 1);
      let to = 0;
      for (let k = 0; k < cur.length; k++) if (cur[k] < ri && placed.has(cur[k])) to = k + 1;
      cur.splice(to, 0, ri);
      placed.add(ri);
      if (from !== to) ctx.ops.push({ op: "move", from: at(from), path: at(to) });
    }
  }

  // 3. Additions, lowest index first.
  for (const ri of added) ctx.ops.push({ op: "add", path: at(ri), value: right[ri] });

  // 4. Nested edits, now that every item sits at its final index.
  for (const [li, ri] of pairs) {
    const childPath = idKey ? identityLabel(path, idKey, left[li]) : joinPath(path, li);
    if (ctx.ign && isIgnored(ctx.ign, null, childPath)) continue;
    patchWalk(ctx, left[li], right[ri], at(ri), childPath);
  }
}

/** Members of one longest strictly-increasing subsequence (O(n log n)). */
function longestIncreasingRun(values: number[]): boolean[] {
  const tails: number[] = [];
  const prev = new Array<number>(values.length).fill(-1);
  for (let i = 0; i < values.length; i++) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (values[tails[mid]] < values[i]) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[i] = tails[lo - 1];
    tails[lo] = i;
  }
  const marks = new Array<boolean>(values.length).fill(false);
  for (let i = tails.length ? tails[tails.length - 1] : -1; i !== -1; i = prev[i]) marks[i] = true;
  return marks;
}

// ── Applying a patch (for verification) ──────────────────────────────────────

function unescapePointer(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

function parsePointer(p: string): string[] {
  if (p === "") return [];
  if (!p.startsWith("/")) throw new Error(`Bad JSON Pointer: ${p}`);
  return p.slice(1).split("/").map(unescapePointer);
}

function arrayIndex(token: string, length: number, allowEnd: boolean): number {
  if (allowEnd && token === "-") return length;
  if (!/^(0|[1-9][0-9]*)$/.test(token)) throw new Error(`Bad array index: ${token}`);
  const i = Number(token);
  if (i > length || (!allowEnd && i === length)) throw new Error(`Index out of range: ${token}`);
  return i;
}

/**
 * Apply an RFC 6902 patch (add / remove / replace / move) without mutating
 * `doc`: containers along each op's path are shallow-copied once, untouched
 * subtrees are shared. Throws on an op that doesn't apply.
 */
export function applyPatch(doc: JsonValue, ops: readonly JsonPatchOp[]): JsonValue {
  const owned = new Set<object>();
  const own = <T extends JsonValue[] | JsonObject>(c: T): T => {
    if (owned.has(c)) return c;
    const copy = (Array.isArray(c) ? c.slice() : Object.assign(Object.create(null) as JsonObject, c)) as T;
    owned.add(copy);
    return copy;
  };
  let root = doc;

  /** Owned parent container of the pointer's last token. */
  const parentOf = (tokens: string[]): JsonValue[] | JsonObject => {
    if (root === null || typeof root !== "object") throw new Error("Path into a primitive");
    root = own(root);
    let cur: JsonValue[] | JsonObject = root;
    for (let i = 0; i < tokens.length - 1; i++) {
      const t = tokens[i];
      let child: JsonValue;
      if (Array.isArray(cur)) {
        const idx = arrayIndex(t, cur.length, false);
        child = cur[idx];
        if (child === null || typeof child !== "object") throw new Error("Path into a primitive");
        const next: JsonValue[] | JsonObject = own(child);
        cur[idx] = next;
        cur = next;
      } else {
        if (!Object.hasOwn(cur, t)) throw new Error(`Missing key: ${t}`);
        child = cur[t];
        if (child === null || typeof child !== "object") throw new Error("Path into a primitive");
        const next: JsonValue[] | JsonObject = own(child);
        cur[t] = next;
        cur = next;
      }
    }
    return cur;
  };

  const get = (tokens: string[]): JsonValue => {
    let cur: JsonValue = root;
    for (const t of tokens) {
      if (Array.isArray(cur)) cur = cur[arrayIndex(t, cur.length, false)];
      else if (cur !== null && typeof cur === "object" && Object.hasOwn(cur, t)) cur = cur[t];
      else throw new Error(`Missing path: ${t}`);
    }
    return cur;
  };

  const remove = (tokens: string[]): void => {
    if (tokens.length === 0) throw new Error("Can't remove the root");
    const parent = parentOf(tokens);
    const last = tokens[tokens.length - 1];
    if (Array.isArray(parent)) parent.splice(arrayIndex(last, parent.length, false), 1);
    else {
      if (!Object.hasOwn(parent, last)) throw new Error(`Missing key: ${last}`);
      delete parent[last];
    }
  };

  const add = (tokens: string[], value: JsonValue): void => {
    if (tokens.length === 0) {
      root = value;
      return;
    }
    const parent = parentOf(tokens);
    const last = tokens[tokens.length - 1];
    if (Array.isArray(parent)) parent.splice(arrayIndex(last, parent.length, true), 0, value);
    else parent[last] = value;
  };

  for (const op of ops) {
    const tokens = parsePointer(op.path);
    if (op.op === "add") add(tokens, op.value);
    else if (op.op === "remove") remove(tokens);
    else if (op.op === "replace") {
      if (tokens.length === 0) root = op.value;
      else {
        const parent = parentOf(tokens);
        const last = tokens[tokens.length - 1];
        if (Array.isArray(parent)) parent[arrayIndex(last, parent.length, false)] = op.value;
        else {
          if (!Object.hasOwn(parent, last)) throw new Error(`Missing key: ${last}`);
          parent[last] = op.value;
        }
      }
    } else {
      const from = parsePointer(op.from);
      const value = get(from);
      remove(from);
      add(tokens, value);
    }
  }
  return root;
}

/**
 * Apply `ops` to `left` and check the result against `right`: exact deep
 * equality without an ignore list, otherwise "no non-ignored differences
 * remain" under the same options.
 */
export function verifyPatch(left: JsonValue, right: JsonValue, ops: readonly JsonPatchOp[], options: DiffOptions = {}): boolean {
  try {
    const out = applyPatch(left, ops);
    if (!options.ignore?.length) return deepEqual(out, right);
    return diffJson(out, right, options).entries.length === 0;
  } catch {
    return false;
  }
}

// ── Pretty-printing helpers (used by UI) ─────────────────────────────────────

/** Stringify a JsonValue for display (2-space indent). */
export function display(value: JsonValue | undefined): string {
  if (value === undefined) return "";
  return JSON.stringify(value, null, 2);
}

/**
 * Inline (single-line) preview, truncated to `maxLen`. Bails out of huge
 * containers early instead of stringifying them in full.
 */
export function inlineDisplay(value: JsonValue | undefined, maxLen = 64): string {
  if (value === undefined) return "";
  let s: string;
  if (value !== null && typeof value === "object") {
    let budget = maxLen;
    const parts: string[] = [];
    const walk = (v: JsonValue): void => {
      if (budget <= 0) return;
      if (v === null || typeof v !== "object") {
        const x = JSON.stringify(v);
        parts.push(x);
        budget -= x.length;
        return;
      }
      if (Array.isArray(v)) {
        parts.push("[");
        budget--;
        for (let i = 0; i < v.length && budget > 0; i++) {
          if (i) {
            parts.push(",");
            budget--;
          }
          walk(v[i]);
        }
        parts.push("]");
        budget--;
        return;
      }
      parts.push("{");
      budget--;
      let first = true;
      for (const k in v) {
        if (budget <= 0) break;
        if (!Object.hasOwn(v, k)) continue;
        const kk = `${first ? "" : ","}${JSON.stringify(k)}:`;
        parts.push(kk);
        budget -= kk.length;
        first = false;
        walk(v[k]);
      }
      parts.push("}");
      budget--;
    };
    walk(value);
    s = parts.join("");
    if (budget <= 0) return `${s.slice(0, maxLen - 1)}…`;
  } else {
    s = JSON.stringify(value);
  }
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}

// ── Share-link body encoding ─────────────────────────────────────────────────

/**
 * UTF-8-safe base64 for share-link bodies. Plain `btoa` throws on any
 * character outside Latin-1; ASCII output is identical to `btoa`, so older
 * links still decode.
 */
export function encodeShareBody(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Inverse of `encodeShareBody`; null when the token isn't valid base64. */
export function decodeShareBody(token: string): string | null {
  let bin: string;
  try {
    bin = atob(token);
  } catch {
    return null;
  }
  try {
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Legacy links were plain `btoa` of Latin-1 text.
    return bin;
  }
}
