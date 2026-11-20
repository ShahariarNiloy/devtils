"use client";

import { memo, useMemo } from "react";

/**
 * Line-number gutter. Previously built a React element per line; for a
 * 5000-line file that's 5000 elements re-rendered every time a newline is
 * typed. We now compose the gutter content as a single text node — the
 * browser handles 5000 lines in a `<pre>` faster than React can reconcile
 * 5000 child components.
 *
 * Error lines (v2) are the exception: each becomes its own small element so
 * it can be tinted, while everything else stays a plain text run.
 */

interface GutterLinesProps {
  numLines: number;
  /** Lines to mark as problems (red number, tinted cell). */
  errorLines?: readonly number[];
}

/**
 * Line numbers as one text node — cheap even for 100k-line documents. Error
 * lines split the text into a few runs so only they become elements.
 */
export const GutterLines = memo(function GutterLines({ numLines, errorLines }: GutterLinesProps) {
  const runs = useMemo(() => {
    const n = Math.max(1, numLines);
    const errs = [...new Set(errorLines ?? [])].filter((l) => l >= 1 && l <= n).sort((a, b) => a - b);
    const range = (from: number, to: number) => {
      const out: string[] = [];
      for (let i = from; i <= to; i++) out.push(String(i));
      return out.join("\n");
    };
    const parts: { text: string; error: boolean }[] = [];
    let next = 1;
    for (const e of errs) {
      if (e > next) parts.push({ text: range(next, e - 1) + "\n", error: false });
      parts.push({ text: String(e), error: true });
      if (e < n) parts.push({ text: "\n", error: false });
      next = e + 1;
    }
    if (next <= n) parts.push({ text: range(next, n), error: false });
    return parts;
  }, [numLines, errorLines]);
  return (
    <>
      {runs.map((r, i) =>
        r.error ? (
          // Runs are positional; index is their identity.
          // eslint-disable-next-line react/no-array-index-key
          <span key={i} className="-mr-3 inline-block w-[calc(100%+0.75rem)] bg-[rgba(224,121,95,.08)] pr-3 text-error">
            {r.text}
          </span>
        ) : (
          // eslint-disable-next-line react/no-array-index-key
          <span key={i}>{r.text}</span>
        ),
      )}
    </>
  );
});
