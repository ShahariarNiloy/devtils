"use client";

import { useRef, useCallback } from "react";

/**
 * Encapsulates the ref + scroll-sync logic for the editor overlay.
 * The `<pre>` element that renders highlight marks must track the
 * `<textarea>`'s scrollTop so both layers stay in sync.
 */
export function useEditorView() {
  const marksPreRef = useRef<HTMLPreElement>(null);

  const syncScroll = useCallback((scrollTop: number) => {
    if (marksPreRef.current) {
      marksPreRef.current.scrollTop = scrollTop;
    }
  }, []);

  return { marksPreRef, syncScroll };
}
