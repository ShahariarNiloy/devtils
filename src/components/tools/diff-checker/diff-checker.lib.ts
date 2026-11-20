/**
 * Diff checker — pure view helpers layered on top of `@/lib/diff`.
 *
 * The line/word diff itself lives in `@/lib/diff` (shared with the MCP
 * `diff_text` tool). This file only shapes that output for the v2 listing:
 * where each change block starts (for n / p navigation) and which long
 * unchanged runs fold into a "Show N unchanged lines" row.
 *
 * No React, no DOM.
 */

/** One rendered item of a listing: a real row, or a folded run of equal rows. */
export type ListingItem =
  | { type: "row"; index: number }
  | { type: "gap"; start: number; end: number };

/** Unchanged lines kept visible around each change. */
export const CONTEXT_LINES = 3;
/** A run folds only when at least this many lines would be hidden. */
export const MIN_FOLD = 4;

/**
 * Indices where a contiguous run of non-equal rows begins. Each run is one
 * "change" for keyboard navigation.
 */
export function changeStarts(isEqual: readonly boolean[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < isEqual.length; i++) {
    if (!isEqual[i] && (i === 0 || isEqual[i - 1])) out.push(i);
  }
  return out;
}

/**
 * Fold long runs of equal rows, keeping `context` rows next to each change.
 * A run at the very start or end only keeps context on its changed side.
 * Inputs with no change at all are returned unfolded — the whole text is
 * the answer to "are these the same?". Runs whose start index is in
 * `expanded` stay open.
 */
export function foldEqualRuns(
  isEqual: readonly boolean[],
  expanded: ReadonlySet<number> = new Set(),
  context = CONTEXT_LINES,
  minFold = MIN_FOLD,
): ListingItem[] {
  const out: ListingItem[] = [];
  const hasChange = isEqual.some((e) => !e);
  let i = 0;
  while (i < isEqual.length) {
    if (!isEqual[i]) {
      out.push({ type: "row", index: i });
      i++;
      continue;
    }
    const start = i;
    while (i < isEqual.length && isEqual[i]) i++;
    const end = i; // exclusive
    const head = start === 0 ? 0 : context;
    const tail = end === isEqual.length ? 0 : context;
    const hidden = end - start - head - tail;
    if (!hasChange || hidden < minFold || expanded.has(start + head)) {
      for (let k = start; k < end; k++) out.push({ type: "row", index: k });
      continue;
    }
    for (let k = start; k < start + head; k++) out.push({ type: "row", index: k });
    out.push({ type: "gap", start: start + head, end: end - tail });
    for (let k = end - tail; k < end; k++) out.push({ type: "row", index: k });
  }
  return out;
}

/** "1 difference" / "3 differences" / "Identical". */
export function differenceLabel(total: number): string {
  if (total === 0) return "Identical";
  return `${total.toLocaleString()} ${total === 1 ? "difference" : "differences"}`;
}
