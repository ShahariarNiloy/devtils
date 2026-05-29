/**
 * Pure diff engine for the diff-checker tool. No React, no DOM — every
 * function takes strings in and returns plain data out.
 *
 * Two levels of granularity:
 *
 *   - Line diff (Myers' O(ND) algorithm) produces an ordered list of
 *     line operations: equal, insert, delete. This is the structural
 *     layer the side-by-side and unified views render from.
 *   - Word diff runs Myers again over the token sequence of a paired
 *     delete + insert, surfacing intra-line edits. This is what makes
 *     the side-by-side view *useful* rather than just colourful — the
 *     user can see WHICH word changed, not just "this whole line is
 *     different".
 *
 * Myers is implemented inline rather than pulled from a dependency
 * because (a) it's ~80 lines, (b) returning rich per-token positions
 * needs control of the trace we keep the third-party libs don't expose,
 * and (c) zero deps fits the rest of the codebase's discipline.
 */

export type LineOp =
  | { kind: "equal"; left: number; right: number; text: string }
  | { kind: "delete"; left: number; text: string }
  | { kind: "insert"; right: number; text: string };

export type WordOp =
  | { kind: "equal"; text: string }
  | { kind: "delete"; text: string }
  | { kind: "insert"; text: string };

/** A contiguous run of non-equal line ops, plus the surrounding context
 *  the unified view uses to render `@@ … @@` headers. */
export interface Hunk {
  /** 1-based start line in the left input. */
  leftStart: number;
  /** Number of left lines spanned (including context). */
  leftLength: number;
  rightStart: number;
  rightLength: number;
  ops: LineOp[];
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
  /** Total line count of the LEFT input. */
  leftLines: number;
  rightLines: number;
}

export interface DiffOptions {
  /** Ignore trailing whitespace on each line before comparing. */
  ignoreTrailingWhitespace?: boolean;
  /** Collapse runs of internal whitespace to a single space before comparing. */
  ignoreWhitespace?: boolean;
  /** Lowercase both sides before comparing. */
  ignoreCase?: boolean;
}

/**
 * Splits text into lines, preserving empty trailing lines. A trailing
 * newline produces an extra empty line — that's intentional so the diff
 * surfaces the newline difference between `foo` and `foo\n`.
 */
export function splitLines(text: string): string[] {
  if (text === "") return [];
  // Normalise CRLF / CR to LF so paste-from-Windows doesn't show false
  // diffs against paste-from-Unix. The original line text is preserved
  // (we only compare normalised forms internally).
  const normalised = text.replace(/\r\n?/g, "\n");
  const parts = normalised.split("\n");
  return parts;
}

function normaliseForCompare(line: string, opts: DiffOptions): string {
  let s = line;
  if (opts.ignoreTrailingWhitespace) s = s.replace(/\s+$/u, "");
  if (opts.ignoreWhitespace) s = s.replace(/\s+/gu, " ").trim();
  if (opts.ignoreCase) s = s.toLowerCase();
  return s;
}

// ── Myers O(ND) diff ────────────────────────────────────────────────────

/**
 * Classic Myers SES (shortest edit script). Returns the operation list
 * matching the inputs sequentially: every output token came from `a`
 * (`delete`), `b` (`insert`), or both (`equal`).
 *
 * Generic over T so the same code drives line diff and word diff.
 *
 * Implementation notes:
 *   - `v[k]` stores the x-coord of the furthest point reached on diagonal
 *     `k`. We use an offset so negative diagonals map onto a non-negative
 *     array index.
 *   - We keep one snapshot of `v` per `d`; once we know the edit distance,
 *     we walk those snapshots backwards to reconstruct the path.
 */
function myers<T>(
  a: T[],
  b: T[],
  eq: (x: T, y: T) => boolean,
): Array<{ kind: "equal" | "delete" | "insert"; a?: T; b?: T }> {
  const N = a.length;
  const M = b.length;
  const max = N + M;
  const offset = max;
  const v: number[] = new Array(2 * max + 1).fill(0);
  const trace: number[][] = [];

  let edit = -1;
  for (let d = 0; d <= max; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset])) {
        x = v[k + 1 + offset];
      } else {
        x = v[k - 1 + offset] + 1;
      }
      let y = x - k;
      while (x < N && y < M && eq(a[x], b[y])) {
        x++;
        y++;
      }
      v[k + offset] = x;
      if (x >= N && y >= M) {
        edit = d;
        break;
      }
    }
    if (edit !== -1) break;
  }

  // Backtrack through the trace to reconstruct the path.
  const ops: Array<{ kind: "equal" | "delete" | "insert"; a?: T; b?: T }> = [];
  let x = N;
  let y = M;
  for (let d = edit; d > 0; d--) {
    const vPrev = trace[d];
    const k = x - y;
    let prevK: number;
    if (k === -d || (k !== d && vPrev[k - 1 + offset] < vPrev[k + 1 + offset])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = vPrev[prevK + offset];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push({ kind: "equal", a: a[x - 1], b: b[y - 1] });
      x--;
      y--;
    }
    if (x === prevX) {
      ops.push({ kind: "insert", b: b[y - 1] });
      y--;
    } else {
      ops.push({ kind: "delete", a: a[x - 1] });
      x--;
    }
  }
  while (x > 0 && y > 0) {
    ops.push({ kind: "equal", a: a[x - 1], b: b[y - 1] });
    x--;
    y--;
  }
  while (x > 0) {
    ops.push({ kind: "delete", a: a[x - 1] });
    x--;
  }
  while (y > 0) {
    ops.push({ kind: "insert", b: b[y - 1] });
    y--;
  }

  ops.reverse();
  return ops;
}

// ── Line diff ───────────────────────────────────────────────────────────

export function diffLines(
  left: string,
  right: string,
  options: DiffOptions = {},
): LineOp[] {
  const leftLines = splitLines(left);
  const rightLines = splitLines(right);
  const leftCmp = leftLines.map((l) => normaliseForCompare(l, options));
  const rightCmp = rightLines.map((l) => normaliseForCompare(l, options));

  const raw = myers(leftCmp, rightCmp, (x, y) => x === y);

  const result: LineOp[] = [];
  let li = 0;
  let ri = 0;
  for (const op of raw) {
    if (op.kind === "equal") {
      result.push({
        kind: "equal",
        left: li + 1,
        right: ri + 1,
        text: leftLines[li],
      });
      li++;
      ri++;
    } else if (op.kind === "delete") {
      result.push({ kind: "delete", left: li + 1, text: leftLines[li] });
      li++;
    } else {
      result.push({ kind: "insert", right: ri + 1, text: rightLines[ri] });
      ri++;
    }
  }
  return result;
}

// ── Word diff ───────────────────────────────────────────────────────────

const WORD_TOKEN = /(\s+|[A-Za-z0-9_]+|.)/gu;

export function tokenizeWords(text: string): string[] {
  return text.match(WORD_TOKEN) ?? [];
}

/**
 * Returns the intra-line edit ops between two strings, tokenised at
 * word boundaries (plus whitespace and punctuation as their own tokens).
 * Useful when the line diff produced an adjacent delete + insert pair —
 * the word diff shows which substrings actually changed.
 */
export function diffWords(left: string, right: string): WordOp[] {
  const a = tokenizeWords(left);
  const b = tokenizeWords(right);
  const raw = myers(a, b, (x, y) => x === y);
  return raw.map((op) => {
    if (op.kind === "equal") return { kind: "equal", text: op.a! };
    if (op.kind === "delete") return { kind: "delete", text: op.a! };
    return { kind: "insert", text: op.b! };
  });
}

// ── Hunks ───────────────────────────────────────────────────────────────

/**
 * Groups a line-op stream into hunks for the unified view. Equal lines
 * inside a hunk are kept as `contextLines` of surrounding context; longer
 * runs of equal lines split into separate hunks.
 */
export function buildHunks(ops: LineOp[], contextLines = 3): Hunk[] {
  const hunks: Hunk[] = [];
  let i = 0;
  while (i < ops.length) {
    // Find the next non-equal op.
    while (i < ops.length && ops[i].kind === "equal") i++;
    if (i >= ops.length) break;

    // Walk back up to `contextLines` equal ops for leading context.
    const startIdx = Math.max(0, i - contextLines);

    // Extend forward, swallowing equal runs ≤ 2 * contextLines.
    let end = i;
    while (end < ops.length) {
      if (ops[end].kind !== "equal") {
        end++;
        continue;
      }
      // Count consecutive equal ops at `end`.
      let runEnd = end;
      while (runEnd < ops.length && ops[runEnd].kind === "equal") runEnd++;
      const runLen = runEnd - end;
      if (runLen > contextLines * 2) {
        // Take only `contextLines` trailing equals and close the hunk.
        end += contextLines;
        break;
      }
      end = runEnd;
    }

    const slice = ops.slice(startIdx, end);
    let leftStart = 0;
    let rightStart = 0;
    let leftLen = 0;
    let rightLen = 0;
    for (const op of slice) {
      if (op.kind === "equal") {
        if (leftStart === 0) leftStart = op.left;
        if (rightStart === 0) rightStart = op.right;
        leftLen++;
        rightLen++;
      } else if (op.kind === "delete") {
        if (leftStart === 0) leftStart = op.left;
        leftLen++;
      } else {
        if (rightStart === 0) rightStart = op.right;
        rightLen++;
      }
    }
    hunks.push({
      leftStart: leftStart || 1,
      leftLength: leftLen,
      rightStart: rightStart || 1,
      rightLength: rightLen,
      ops: slice,
    });

    i = end;
  }
  return hunks;
}

// ── Stats ───────────────────────────────────────────────────────────────

export function computeStats(ops: LineOp[]): DiffStats {
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  for (const op of ops) {
    if (op.kind === "insert") added++;
    else if (op.kind === "delete") removed++;
    else unchanged++;
  }
  return {
    added,
    removed,
    unchanged,
    leftLines: removed + unchanged,
    rightLines: added + unchanged,
  };
}

// ── Side-by-side rows ───────────────────────────────────────────────────

/**
 * Re-shapes a flat line-op stream into paired rows suitable for a
 * side-by-side renderer. Adjacent `delete` + `insert` pairs become a
 * single `changed` row with a word-diff between them. Standalone
 * insert/delete ops become rows with one empty side.
 */
export type SideRow =
  | { kind: "equal"; leftLine: number; rightLine: number; text: string }
  | {
      kind: "changed";
      leftLine: number;
      rightLine: number;
      leftText: string;
      rightText: string;
      leftWords: WordOp[];
      rightWords: WordOp[];
    }
  | { kind: "delete"; leftLine: number; text: string }
  | { kind: "insert"; rightLine: number; text: string };

// ── Unified-diff text formatter ────────────────────────────────────────

/**
 * Renders a hunk list in the standard unified-diff text format — the
 * shape `git diff` produces and every patch-consuming tool understands.
 * Used by the MCP `diff_text` tool so agents get a familiar payload.
 *
 *   @@ -1,3 +1,4 @@
 *    unchanged
 *   -removed
 *   +added
 *   +another
 *
 * The optional file labels render the `--- a/<label>` / `+++ b/<label>`
 * preamble; without them, only the hunks are emitted (which is what most
 * inline / agent uses want).
 */
export function formatUnifiedDiff(
  hunks: Hunk[],
  labels?: { left: string; right: string },
): string {
  const out: string[] = [];
  if (labels) {
    out.push(`--- a/${labels.left}`);
    out.push(`+++ b/${labels.right}`);
  }
  for (const h of hunks) {
    out.push(`@@ -${h.leftStart},${h.leftLength} +${h.rightStart},${h.rightLength} @@`);
    for (const op of h.ops) {
      const sym = op.kind === "insert" ? "+" : op.kind === "delete" ? "-" : " ";
      out.push(`${sym}${op.text}`);
    }
  }
  return out.join("\n");
}

export function buildSideRows(ops: LineOp[]): SideRow[] {
  const rows: SideRow[] = [];
  let i = 0;
  while (i < ops.length) {
    const op = ops[i];
    if (op.kind === "equal") {
      rows.push({
        kind: "equal",
        leftLine: op.left,
        rightLine: op.right,
        text: op.text,
      });
      i++;
      continue;
    }

    // Collect the maximal run of consecutive non-equal ops. The Myers
    // output groups all deletes together followed by all inserts (or
    // vice-versa), but downstream we want them paired position-wise so
    // a "changed N lines" block produces N "changed" rows with word-
    // level diffs rather than N deletes + N inserts.
    const dels: Array<Extract<LineOp, { kind: "delete" }>> = [];
    const ins: Array<Extract<LineOp, { kind: "insert" }>> = [];
    while (i < ops.length && ops[i].kind !== "equal") {
      const o = ops[i];
      if (o.kind === "delete") dels.push(o);
      else if (o.kind === "insert") ins.push(o);
      i++;
    }

    const pairs = Math.min(dels.length, ins.length);
    for (let p = 0; p < pairs; p++) {
      const d = dels[p];
      const n = ins[p];
      const words = diffWords(d.text, n.text);
      rows.push({
        kind: "changed",
        leftLine: d.left,
        rightLine: n.right,
        leftText: d.text,
        rightText: n.text,
        leftWords: words.filter((w) => w.kind !== "insert"),
        rightWords: words.filter((w) => w.kind !== "delete"),
      });
    }
    for (let p = pairs; p < dels.length; p++) {
      rows.push({ kind: "delete", leftLine: dels[p].left, text: dels[p].text });
    }
    for (let p = pairs; p < ins.length; p++) {
      rows.push({ kind: "insert", rightLine: ins[p].right, text: ins[p].text });
    }
  }
  return rows;
}
