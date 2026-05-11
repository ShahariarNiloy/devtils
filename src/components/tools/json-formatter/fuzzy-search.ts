/**
 * Fuzzy search index + scorer for the JSON document tree. Walks the value
 * once into a flat array of (path, key, value-as-string) tuples; queries
 * run against that index in linear time.
 *
 * Design choices:
 *  - Hand-rolled subsequence scorer — Fuse.js would add ~20 KB gzipped for
 *    behaviour we don't need (multi-key weights, distance tuning…).
 *  - Index entry cap at 50,000 — bigger than any reasonable JSON document
 *    a human is going to fuzzy-search. Above the cap we sample the head.
 *  - Per-field weights are baked into `scoreEntry`: a key match counts
 *    more than a value match, which counts more than a path match. This
 *    matches user intent — when you type "email" you want fields named
 *    email, not strings happening to contain the substring.
 *  - Returns up to `limit` results; we sort the index after filtering, not
 *    before, so the common case (most entries score 0) is O(n).
 */

import { appendPath } from "./path-utils";

/** Maximum entries we'll index. */
export const FUZZY_MAX_ENTRIES = 50_000;

export interface FuzzyEntry {
  /** JSONPath from the document root, e.g. `$.users[0].email`. */
  path: string;
  /** Just the trailing key/index, for display and high-weight matching. */
  key: string;
  /** Primitive value as a string, or empty for containers. */
  value: string;
  /** Lower-case caches so the scorer doesn't re-lowercase per query. */
  pathLc: string;
  keyLc: string;
  valueLc: string;
}

export interface FuzzyResult {
  entry: FuzzyEntry;
  score: number;
  /** Which field produced the best score — drives the UI highlight choice. */
  matchedField: "key" | "value" | "path";
}

// ── Index build ──────────────────────────────────────────────────────────────

function valueAsString(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return ""; // containers — no inline string
}

/**
 * Walk the parsed JSON document into a flat searchable index. Containers
 * still get an entry (so you can search for `users` and land on the array
 * itself) but their `value` field is empty.
 */
export function buildFuzzyIndex(root: unknown): FuzzyEntry[] {
  const out: FuzzyEntry[] = [];
  let count = 0;

  function push(path: string, key: string, v: unknown) {
    if (count >= FUZZY_MAX_ENTRIES) return false;
    count += 1;
    const value = valueAsString(v);
    out.push({
      path,
      key,
      value,
      pathLc: path.toLowerCase(),
      keyLc: key.toLowerCase(),
      valueLc: value.toLowerCase(),
    });
    return true;
  }

  function walk(v: unknown, path: string, key: string): boolean {
    if (!push(path, key, v)) return false;
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i += 1) {
        if (!walk(v[i], `${path}[${i}]`, String(i))) return false;
      }
    } else if (v !== null && typeof v === "object") {
      for (const [k, sub] of Object.entries(v as Record<string, unknown>)) {
        if (!walk(sub, appendPath(path, k, false), k)) return false;
      }
    }
    return true;
  }

  walk(root, "$", "");
  return out;
}

// ── Scorer ───────────────────────────────────────────────────────────────────

/**
 * Score how well `target` matches `query` (both already lower-cased).
 * Returns 0 for no match, positive for matches; higher = better.
 *
 * Tiers:
 *  - 1000: exact equality
 *  - 800–900: prefix
 *  - 500–700: substring (earlier = higher)
 *  - 100–300: subsequence (fewer gaps = higher)
 *  - 0: query characters absent or out of order
 */
function scoreString(query: string, target: string): number {
  if (!target || !query) return 0;
  if (target === query) return 1000;
  if (target.startsWith(query)) return 900 - Math.min(target.length - query.length, 100);

  const sub = target.indexOf(query);
  if (sub !== -1) return 700 - Math.min(sub, 200);

  // Subsequence: every query char must appear in order.
  let qi = 0;
  let lastIdx = -1;
  let gaps = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti += 1) {
    if (target.charCodeAt(ti) === query.charCodeAt(qi)) {
      if (lastIdx >= 0) gaps += ti - lastIdx - 1;
      lastIdx = ti;
      qi += 1;
    }
  }
  if (qi !== query.length) return 0;
  return Math.max(0, 300 - gaps * 2);
}

// Per-field multipliers — matches on the leaf key matter most.
const W_KEY = 1.0;
const W_VALUE = 0.7;
const W_PATH = 0.5;

function scoreEntry(query: string, entry: FuzzyEntry): FuzzyResult | null {
  const k = scoreString(query, entry.keyLc) * W_KEY;
  const v = scoreString(query, entry.valueLc) * W_VALUE;
  const p = scoreString(query, entry.pathLc) * W_PATH;
  const best = Math.max(k, v, p);
  if (best === 0) return null;
  const matchedField = best === k ? "key" : best === v ? "value" : "path";
  return { entry, score: best, matchedField };
}

// ── Public search ───────────────────────────────────────────────────────────

export interface SearchOptions {
  /** Maximum number of results to return. */
  limit?: number;
}

/**
 * Run a query against a pre-built index. The query is lowercased once;
 * each entry's score is computed in O(query+target). Total cost ≈
 * O(index × (query + target_avg)).
 */
export function searchFuzzy(
  index: FuzzyEntry[],
  query: string,
  opts: SearchOptions = {},
): FuzzyResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const limit = opts.limit ?? 50;

  // Single pass: filter + capture top scores. We could heapify for huge
  // result counts but `limit` is small (≤100) so plain sort is faster.
  const matches: FuzzyResult[] = [];
  for (const entry of index) {
    const r = scoreEntry(q, entry);
    if (r) matches.push(r);
  }
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit);
}
