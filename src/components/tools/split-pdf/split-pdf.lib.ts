/**
 * Split PDF: how pages become output files. Pure — no React, no PDF library.
 * Pages are 0-based here; everything people type or read is 1-based.
 */

export type SplitMode = "pick" | "every" | "ranges" | "chunks";

export interface RangeResult {
  /** One array of 0-based page indices per output file. */
  groups: number[][];
  error: string;
}

/**
 * "1-3, 5, 8-" → [[0,1,2],[4],[7,8,…]]. Accepts en dashes, spaces, an open
 * end ("8-" = to the last page), "last", and descending ranges ("5-3").
 */
export function parseRanges(text: string, pageCount: number): RangeResult {
  const parts = text
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return { groups: [], error: "" };
  const groups: number[][] = [];
  const page = (s: string): number | null => {
    if (/^(last|end)$/i.test(s)) return pageCount;
    if (!/^\d+$/.test(s)) return null;
    return Number(s);
  };
  for (const part of parts) {
    const m = /^(\S+?)\s*[-–—]\s*(\S*)$/.exec(part);
    const a = page(m ? m[1] : part);
    let b = a;
    if (m) b = m[2] ? page(m[2]) : pageCount;
    if (a === null || b === null) return { groups, error: `“${part}” isn't a page or a range. Use numbers like 1-3, 5.` };
    if (a < 1 || b < 1 || a > pageCount || b > pageCount) {
      return { groups, error: `“${part}” is outside this PDF — it has ${pageCount} page${pageCount === 1 ? "" : "s"}.` };
    }
    const step = a <= b ? 1 : -1;
    const g: number[] = [];
    for (let p = a; p !== b + step; p += step) g.push(p - 1);
    groups.push(g);
  }
  return { groups, error: "" };
}

/** Every `n` pages, the last file taking what's left. */
export function chunks(pageCount: number, n: number): number[][] {
  const size = Math.max(1, Math.floor(n));
  const out: number[][] = [];
  for (let i = 0; i < pageCount; i += size) out.push(Array.from({ length: Math.min(size, pageCount - i) }, (_, k) => i + k));
  return out;
}

export interface SplitInput {
  mode: SplitMode;
  pageCount: number;
  /** "pick": the selected pages, in page order. */
  picked: ReadonlySet<number>;
  ranges: string;
  every: number;
}

export function groupsFor(s: SplitInput): RangeResult {
  switch (s.mode) {
    case "pick": {
      const g = [...s.picked].filter((i) => i >= 0 && i < s.pageCount).sort((a, b) => a - b);
      return { groups: g.length ? [g] : [], error: "" };
    }
    case "every":
      return { groups: chunks(s.pageCount, 1), error: "" };
    case "chunks":
      return { groups: chunks(s.pageCount, s.every), error: "" };
    case "ranges":
      return parseRanges(s.ranges, s.pageCount);
  }
}

/** Which output file each page lands in (first wins if ranges overlap), or -1. */
export function groupOfPage(groups: readonly number[][], pageCount: number): number[] {
  const of = Array.from({ length: pageCount }, () => -1);
  groups.forEach((g, gi) => {
    for (const p of g) if (of[p] === -1) of[p] = gi;
  });
  return of;
}

/** "1–3" / "5" / "1, 3, 7" — a group's pages as people read them. */
export function describePages(g: readonly number[]): string {
  if (!g.length) return "";
  const runs: string[] = [];
  let start = g[0];
  let prev = g[0];
  for (const p of [...g.slice(1), Number.NaN]) {
    if (p === prev + 1) {
      prev = p;
      continue;
    }
    runs.push(start === prev ? `${start + 1}` : `${start + 1}–${prev + 1}`);
    start = p;
    prev = p;
  }
  return runs.join(", ");
}

/** report.pdf + pages 1–3 → "report-p1-3.pdf". */
export function outputName(base: string, g: readonly number[]): string {
  const stem = base.replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "-") || "document";
  return `${stem}-p${describePages(g).replace(/–/g, "-").replace(/, /g, "_")}.pdf`;
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
