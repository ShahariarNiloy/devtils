"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface VirtualWindow {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  /** Total scrollable height — the spacer that holds the scrollbar. */
  totalHeight: number;
  /** Pixel offset of the first rendered row from the top. */
  offsetY: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Fixed-row windowing. Only the rows intersecting the viewport (plus a small
 * overscan) are rendered, so a list of 100k items costs the same as 30.
 *
 * Scroll is read in a rAF so a fast wheel doesn't fire a setState per event.
 * The viewport height seeds large and is corrected by a ResizeObserver — that
 * avoids a one-frame blank without a synchronous setState in an effect.
 */
export function useVirtualList(
  itemCount: number,
  rowHeight: number,
  overscan = 8,
): VirtualWindow {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  const rafRef = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = scrollRef.current;
      if (el) setScrollTop(el.scrollTop);
    });
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    itemCount,
    Math.ceil((scrollTop + viewportH) / rowHeight) + overscan,
  );

  return {
    scrollRef,
    onScroll,
    totalHeight: itemCount * rowHeight,
    offsetY: startIndex * rowHeight,
    startIndex,
    endIndex,
  };
}
