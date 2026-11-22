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
  /** 1-based start line in the left input (0 when the hunk spans no left lines at the top). */
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

/** Edit-script step: equal (consume one from each side), delete (left), insert (right). */
type Step = "equal" | "delete" | "insert";

/**
 * Edit-distance ceiling for one line-level Myers run. Memory for the
 * backtrack trace is ~D² int32s (16 MB at 2000) and time is
 * O((N+M)·D), so this is what keeps a paste of two unrelated large files
 * from freezing (or crashing) the tab. Regions that exceed it fall back
 * to patience anchoring, then to a whole-region replace.
 */
const LINE_MAX_EDITS = 2000;
/** Per-line-pair word diff: skip lines with more tokens than this. */
const WORD_MAX_TOKENS = 2000;
/** Per-line-pair word diff: give up (whole line marked changed) above this distance. */
const WORD_MAX_EDITS = 300;
/** Total tokens word-diffed per `buildSideRows` call; later pairs render whole-line. */
const WORD_TOTAL_TOKENS = 100_000;

/**
 * Classic Myers SES (shortest edit script) over `a[aLo..aHi)` vs
 * `b[bLo..bHi)`. Returns the step list, or `null` when the edit distance
 * exceeds `maxD` — the caller decides how to degrade.
 *
 * Generic over T so the same code drives line diff and word diff.
 *
 * Implementation notes:
 *   - `v[k]` stores the x-coord of the furthest point reached on diagonal
 *     `k`. We use an offset so negative diagonals map onto a non-negative
 *     array index.
 *   - Before each step `d` we snapshot only the live window `v[-d..d]`
 *     (2d+1 entries, not the whole array) so the trace is O(D²) rather
 *     than O((N+M)·D). Once we know the edit distance we walk those
 *     snapshots backwards to reconstruct the path.
 */
function myers<T>(
  a: readonly T[],
  b: readonly T[],
  eq: (x: T, y: T) => boolean,
  maxD: number,
  aLo = 0,
  aHi = a.length,
  bLo = 0,
  bHi = b.length,
): Step[] | null {
  const N = aHi - aLo;
  const M = bHi - bLo;
  const limit = Math.min(N + M, maxD);
  const offset = limit + 1;
  const v = new Int32Array(2 * limit + 3);
  const trace: Int32Array[] = [];

  let edit = -1;
  for (let d = 0; d <= limit; d++) {
    trace.push(v.slice(offset - d, offset + d + 1));
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset])) {
        x = v[k + 1 + offset];
      } else {
        x = v[k - 1 + offset] + 1;
      }
      let y = x - k;
      while (x < N && y < M && eq(a[aLo + x], b[bLo + y])) {
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
  if (edit === -1) return null;

  // Backtrack through the trace to reconstruct the path. `trace[d][k + d]`
  // is v[k] as it stood before step d.
  const steps: Step[] = [];
  let x = N;
  let y = M;
  for (let d = edit; d > 0; d--) {
    const vPrev = trace[d];
    const k = x - y;
    let prevK: number;
    if (k === -d || (k !== d && vPrev[k - 1 + d] < vPrev[k + 1 + d])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = vPrev[prevK + d];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      steps.push("equal");
      x--;
      y--;
    }
    if (x === prevX) {
      steps.push("insert");
      y--;
    } else {
      steps.push("delete");
      x--;
    }
  }
  while (x > 0 && y > 0) {
    steps.push("equal");
    x--;
    y--;
  }
  while (x > 0) {
    steps.push("delete");
    x--;
  }
  while (y > 0) {
    steps.push("insert");
    y--;
  }

  steps.reverse();
  return steps;
}

function pushN(out: Step[], step: Step, n: number) {
  for (let i = 0; i < n; i++) out.push(step);
}

/**
 * Fallback for line regions too far apart for bounded Myers. Works like
 * `git diff --patience`: strip the common prefix/suffix, anchor on lines
 * that occur exactly once on each side (longest increasing run of them),
 * and diff the gaps between anchors independently. A gap that still has
 * no anchors and is over budget becomes one delete-all + insert-all block
 * — always a correct diff, just not a minimal one. Iterative (explicit
 * work stack) so deep nesting can't blow the call stack.
 *
 * Returns whether any region had to be emitted as a blind replace.
 */
function diffLinesFallback(a: readonly string[], b: readonly string[], out: Step[]): boolean {
  // The caller already ran exact Myers on the whole input and it blew the
  // budget; only retry it on sub-regions.
  let first = true;
  type Task =
    | { t: "region"; aLo: number; aHi: number; bLo: number; bHi: number }
    | { t: "equal" };
  const stack: Task[] = [{ t: "region", aLo: 0, aHi: a.length, bLo: 0, bHi: b.length }];
  let replaced = false;
  const eq = (x: string, y: string) => x === y;

  while (stack.length > 0) {
    const task = stack.pop();
    if (!task) break;
    if (task.t === "equal") {
      out.push("equal");
      continue;
    }
    let { aLo, aHi, bLo, bHi } = task;

    // Common prefix.
    let pre = 0;
    while (aLo + pre < aHi && bLo + pre < bHi && a[aLo + pre] === b[bLo + pre]) pre++;
    pushN(out, "equal", pre);
    aLo += pre;
    bLo += pre;
    // Common suffix — emitted after the middle, so queue it first.
    let suf = 0;
    while (aHi - suf > aLo && bHi - suf > bLo && a[aHi - suf - 1] === b[bHi - suf - 1]) suf++;
    aHi -= suf;
    bHi -= suf;
    for (let i = 0; i < suf; i++) stack.push({ t: "equal" });

    if (aLo === aHi || bLo === bHi) {
      pushN(out, "delete", aHi - aLo);
      pushN(out, "insert", bHi - bLo);
      continue;
    }

    const wholeInput = first && pre === 0 && suf === 0;
    first = false;
    const exact = wholeInput ? null : myers(a, b, eq, LINE_MAX_EDITS, aLo, aHi, bLo, bHi);
    if (exact) {
      for (const s of exact) out.push(s);
      continue;
    }

    // Unique-on-both-sides lines → candidate anchors.
    const counts = new Map<string, { na: number; nb: number; ia: number; ib: number }>();
    for (let i = aLo; i < aHi; i++) {
      const c = counts.get(a[i]);
      if (c) c.na++;
      else counts.set(a[i], { na: 1, nb: 0, ia: i, ib: -1 });
    }
    for (let j = bLo; j < bHi; j++) {
      const c = counts.get(b[j]);
      if (c) {
        c.nb++;
        c.ib = j;
      }
    }
    const cand: Array<{ ia: number; ib: number }> = [];
    for (let i = aLo; i < aHi; i++) {
      const c = counts.get(a[i]);
      if (c && c.na === 1 && c.nb === 1) cand.push({ ia: c.ia, ib: c.ib });
    }
    const anchors = longestIncreasing(cand);
    if (anchors.length === 0) {
      pushN(out, "delete", aHi - aLo);
      pushN(out, "insert", bHi - bLo);
      replaced = true;
      continue;
    }

    // Queue gaps + anchors in reverse so they pop in document order.
    let nextA = aHi;
    let nextB = bHi;
    for (let n = anchors.length - 1; n >= 0; n--) {
      const { ia, ib } = anchors[n];
      stack.push({ t: "region", aLo: ia + 1, aHi: nextA, bLo: ib + 1, bHi: nextB });
      stack.push({ t: "equal" });
      nextA = ia;
      nextB = ib;
    }
    stack.push({ t: "region", aLo, aHi: nextA, bLo, bHi: nextB });
  }
  return replaced;
}

/** Longest subsequence of `cand` (already sorted by `ia`) with increasing `ib`. O(n log n). */
function longestIncreasing(cand: ReadonlyArray<{ ia: number; ib: number }>): Array<{ ia: number; ib: number }> {
  const tails: number[] = []; // index into cand of the smallest tail for each length
  const prev = new Int32Array(cand.length).fill(-1);
  for (let i = 0; i < cand.length; i++) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cand[tails[mid]].ib < cand[i].ib) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[i] = tails[lo - 1];
    tails[lo] = i;
  }
  const out: Array<{ ia: number; ib: number }> = [];
  for (let i = tails.length ? tails[tails.length - 1] : -1; i !== -1; i = prev[i]) out.push(cand[i]);
  return out.reverse();
}

// ── Line diff ───────────────────────────────────────────────────────────

export interface LineDiffResult {
  ops: LineOp[];
  /**
   * True when the inputs were too far apart to align exactly within the
   * engine's budget and at least one region is shown as a wholesale
   * replace (all old lines removed, all new lines added). The diff is
   * still correct — applying it yields the right side — just not minimal.
   */
  approximate: boolean;
}

/** Like `diffLines`, plus whether the result had to fall back to an approximate alignment. */
export function diffLinesDetailed(
  left: string,
  right: string,
  options: DiffOptions = {},
): LineDiffResult {
  const leftLines = splitLines(left);
  const rightLines = splitLines(right);
  const leftCmp = leftLines.map((l) => normaliseForCompare(l, options));
  const rightCmp = rightLines.map((l) => normaliseForCompare(l, options));

  // Exact Myers first — identical output to the unbounded algorithm
  // whenever the edit distance fits the budget (every normal diff).
  let approximate = false;
  let steps = myers(leftCmp, rightCmp, (x, y) => x === y, LINE_MAX_EDITS);
  if (!steps) {
    steps = [];
    approximate = diffLinesFallback(leftCmp, rightCmp, steps);
  }

  const result: LineOp[] = [];
  let li = 0;
  let ri = 0;
  for (const step of steps) {
    if (step === "equal") {
      result.push({
        kind: "equal",
        left: li + 1,
        right: ri + 1,
        text: leftLines[li],
      });
      li++;
      ri++;
    } else if (step === "delete") {
      result.push({ kind: "delete", left: li + 1, text: leftLines[li] });
      li++;
    } else {
      result.push({ kind: "insert", right: ri + 1, text: rightLines[ri] });
      ri++;
    }
  }
  return { ops: result, approximate };
}

export function diffLines(
  left: string,
  right: string,
  options: DiffOptions = {},
): LineOp[] {
  return diffLinesDetailed(left, right, options).ops;
}

// ── Word diff ───────────────────────────────────────────────────────────

// Unicode-aware: letters (any script), combining marks and digits form one
// word token, so `café` / `東京` / `привет` diff as words, not char-by-char.
const WORD_TOKEN = /(\s+|[\p{L}\p{M}\p{N}_]+|.)/gu;

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
  return diffWordTokens(tokenizeWords(left), tokenizeWords(right)) ?? [
    { kind: "delete", text: left },
    { kind: "insert", text: right },
  ];
}

/**
 * Word diff over pre-tokenised input, or `null` when the pair is over the
 * size / edit budget (caller shows the whole line as changed instead).
 */
function diffWordTokens(a: string[], b: string[]): WordOp[] | null {
  if (a.length > WORD_MAX_TOKENS || b.length > WORD_MAX_TOKENS) return null;
  const steps = myers(a, b, (x, y) => x === y, WORD_MAX_EDITS);
  if (!steps) return null;
  const out: WordOp[] = [];
  let ai = 0;
  let bi = 0;
  for (const step of steps) {
    if (step === "equal") {
      out.push({ kind: "equal", text: a[ai++] });
      bi++;
    } else if (step === "delete") {
      out.push({ kind: "delete", text: a[ai++] });
    } else {
      out.push({ kind: "insert", text: b[bi++] });
    }
  }
  return out;
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
    // A side with no lines in the hunk (pure insertion / deletion, e.g.
    // against an empty file) uses the line *before* the change as its
    // start, per the unified-diff format: `@@ -0,0 +1,2 @@`.
    if (leftLen === 0) leftStart = lineBefore(ops, startIdx, "left");
    if (rightLen === 0) rightStart = lineBefore(ops, startIdx, "right");
    hunks.push({
      leftStart,
      leftLength: leftLen,
      rightStart,
      rightLength: rightLen,
      ops: slice,
    });

    i = end;
  }
  return hunks;
}

/** Last line number on `side` among `ops[0..idx)`, or 0 if there is none. */
function lineBefore(ops: LineOp[], idx: number, side: "left" | "right"): number {
  for (let j = idx - 1; j >= 0; j--) {
    const op = ops[j];
    if (side === "left" && op.kind !== "insert") return op.left;
    if (side === "right" && op.kind !== "delete") return op.right;
  }
  return 0;
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
      /** Set when the pair was too large to word-diff; each side is one whole-line span. */
      coarse?: true;
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
  let tokenBudget = WORD_TOTAL_TOKENS;
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
      // Word diff is the expensive part — budget it per pair and per call
      // so one huge line (or thousands of changed lines) can't stall the
      // main thread. Over budget → whole line shown as changed.
      let words: WordOp[] | null = null;
      if (tokenBudget > 0) {
        const a = tokenizeWords(d.text);
        const b = tokenizeWords(n.text);
        tokenBudget -= a.length + b.length;
        words = diffWordTokens(a, b);
      }
      if (words) {
        rows.push({
          kind: "changed",
          leftLine: d.left,
          rightLine: n.right,
          leftText: d.text,
          rightText: n.text,
          leftWords: words.filter((w) => w.kind !== "insert"),
          rightWords: words.filter((w) => w.kind !== "delete"),
        });
      } else {
        rows.push({
          kind: "changed",
          leftLine: d.left,
          rightLine: n.right,
          leftText: d.text,
          rightText: n.text,
          leftWords: [{ kind: "delete", text: d.text }],
          rightWords: [{ kind: "insert", text: n.text }],
          coarse: true,
        });
      }
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
