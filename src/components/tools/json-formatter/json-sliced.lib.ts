/**
 * Whole-document passes written as generators, so a scheduler
 * (`run-sliced.ts`) can spread them over many short tasks instead of one
 * long one. Each `yield` is a safe pause point; the generator's return value
 * is exactly what the one-shot lib function computes. Pure — no React, no
 * DOM beyond TextEncoder.
 */

import type { JsonStats } from "./json-formatter.types";
import { sharedEncoder } from "./json-formatter.lib";

/** Chars per step for the string passes (~1–2 ms each). */
const CHARS_PER_STEP = 1 << 18;
/** Nodes visited per step of the tree walk. */
const NODES_PER_STEP = 20_000;

/** End of the chunk starting at `i`, never splitting a surrogate pair. */
function chunkEnd(s: string, i: number): number {
  let end = Math.min(i + CHARS_PER_STEP, s.length);
  const last = s.charCodeAt(end - 1);
  if (end < s.length && last >= 0xd800 && last <= 0xdbff && (s.charCodeAt(end) & 0xfc00) === 0xdc00) end++;
  return end;
}

let byteBuf: Uint8Array | null = null;

/** UTF-8 byte length — same count as `byteLength`. */
export function* byteLengthSteps(s: string): Generator<void, number> {
  byteBuf ??= new Uint8Array(CHARS_PER_STEP * 3 + 4);
  let n = 0;
  for (let i = 0; i < s.length; ) {
    const end = chunkEnd(s, i);
    n += sharedEncoder.encodeInto(s.slice(i, end), byteBuf).written;
    i = end;
    yield;
  }
  return n;
}

/** UTF-8 encoding in parts — the same bytes as encoding `s` in one go. */
export function* encodeUtf8Steps(s: string): Generator<void, Uint8Array<ArrayBuffer>[]> {
  const parts: Uint8Array<ArrayBuffer>[] = [];
  for (let i = 0; i < s.length; ) {
    const end = chunkEnd(s, i);
    parts.push(sharedEncoder.encode(s.slice(i, end)));
    i = end;
    yield;
  }
  return parts;
}

/** `s.split("\n").length` (0 for ""), without allocating the pieces. */
export function* lineCountSteps(s: string): Generator<void, number> {
  if (!s) return 0;
  let n = 1;
  let stepEnd = CHARS_PER_STEP;
  for (let i = s.indexOf("\n"); i !== -1; i = s.indexOf("\n", i + 1)) {
    n++;
    if (i >= stepEnd) {
      stepEnd = i + CHARS_PER_STEP;
      yield;
    }
  }
  return n;
}

/**
 * `computeStats(value)` as an iterative walk (also safe for very deep
 * documents). `size` / `lines` stay 0, as there.
 */
export function* computeStatsSteps(value: unknown): Generator<void, JsonStats> {
  const stats: JsonStats = {
    size: 0, lines: 0, depth: 0, keys: 0, strings: 0, numbers: 0,
    booleans: 0, nulls: 0, arrays: 0, objects: 0,
  };
  const values: unknown[] = [value];
  const depths: number[] = [1];
  let visited = 0;
  while (values.length > 0) {
    const v = values.pop();
    const d = depths.pop() ?? 1;
    if (d > stats.depth) stats.depth = d;
    if (v === null) stats.nulls += 1;
    else if (typeof v === "string") stats.strings += 1;
    else if (typeof v === "number") stats.numbers += 1;
    else if (typeof v === "boolean") stats.booleans += 1;
    else if (Array.isArray(v)) {
      stats.arrays += 1;
      for (let i = v.length - 1; i >= 0; i--) {
        values.push(v[i]);
        depths.push(d + 1);
      }
    } else if (typeof v === "object") {
      stats.objects += 1;
      const o = v as Record<string, unknown>;
      for (const k of Object.keys(o)) {
        stats.keys += 1;
        values.push(o[k]);
        depths.push(d + 1);
      }
    }
    if (++visited % NODES_PER_STEP === 0) yield;
  }
  return stats;
}
