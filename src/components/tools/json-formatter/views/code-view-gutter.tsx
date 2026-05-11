"use client";

import { memo, useMemo } from "react";

/**
 * Line-number gutter. Previously built a React element per line; for a
 * 5000-line file that's 5000 elements re-rendered every time a newline is
 * typed. We now compose the gutter content as a single text node — the
 * browser handles 5000 lines in a `<pre>` faster than React can reconcile
 * 5000 child components.
 *
 * The error-line tint that the old implementation supported was redundant
 * with the inline validation banner shown above the editor, so the prop
 * is accepted but no longer used. Keeping it in the API so callers don't
 * need to change.
 */

interface GutterLinesProps {
  numLines: number;
  errorLine?: number;
}

export const GutterLines = memo(function GutterLines({ numLines }: GutterLinesProps) {
  const content = useMemo(() => {
    if (numLines <= 0) return "1";
    const out: string[] = new Array(numLines);
    for (let i = 0; i < numLines; i++) out[i] = String(i + 1);
    return out.join("\n");
  }, [numLines]);
  return <>{content}</>;
});
