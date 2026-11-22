"use client";

import { useCallback, useRef, useState } from "react";
import { flushPendingEdits } from "@/components/primitives/code-editor";

/**
 * Input text for an editor-backed formatter. Big documents reach React
 * debounced (see the shared code editor), so:
 *
 *   - `set`     — the editor's `onChange` (and plain state updates).
 *   - `read`    — flush pending edits and return the text as it is now
 *                 (never a stale closure) — for share, language switch…
 *   - `replace` — flush, then set: Load sample, Clear, a dropped file, so
 *                 a late debounced edit can't overwrite the new text.
 */
export function useLiveText(initial: string) {
  const [text, setText] = useState(initial);
  const latest = useRef(initial);
  const set = useCallback((v: string) => {
    latest.current = v;
    setText(v);
  }, []);
  const read = useCallback(() => {
    flushPendingEdits();
    return latest.current;
  }, []);
  const replace = useCallback(
    (v: string) => {
      flushPendingEdits();
      set(v);
    },
    [set],
  );
  return { text, set, read, replace };
}
