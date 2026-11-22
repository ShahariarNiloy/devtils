"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Variable-height windowing for rows that wrap. Rows start at an estimated
 * height and are measured once rendered (ResizeObserver); heights are kept
 * by row key, so expanding/collapsing a branch keeps every other row's size.
 *
 * Per scroll frame the cost is O(log n) (binary search over prefix offsets);
 * offsets are rebuilt only when the row list or a measured height changes.
 */
export function useMeasuredVirtualList(keys: readonly string[], estimate: number, overscan = 8) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(600);
  const [heights, setHeights] = useState<ReadonlyMap<string, number>>(() => new Map());
  const scrollRaf = useRef(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  const pending = useRef(new Map<string, number>());
  const flushRaf = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(
    () => () => {
      observerRef.current?.disconnect();
      if (flushRaf.current) cancelAnimationFrame(flushRaf.current);
    },
    [],
  );

  const onScroll = useCallback(() => {
    if (scrollRaf.current) return;
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = 0;
      const el = scrollRef.current;
      if (el) setScrollTop(el.scrollTop);
    });
  }, []);

  /** Ref callback for a rendered row: `<div ref={measure} data-vkey={key}>`. */
  const measure = useCallback((el: HTMLElement | null) => {
    if (!el || typeof ResizeObserver === "undefined") return;
    if (!observerRef.current) {
      observerRef.current = new ResizeObserver((entries) => {
        for (const e of entries) {
          const key = (e.target as HTMLElement).dataset.vkey;
          const h = Math.round(e.borderBoxSize?.[0]?.blockSize ?? (e.target as HTMLElement).offsetHeight);
          if (key !== undefined && h > 0) pending.current.set(key, h);
        }
        // Batch every measurement in a frame into one state update.
        if (!flushRaf.current && pending.current.size) {
          flushRaf.current = requestAnimationFrame(() => {
            flushRaf.current = 0;
            const batch = pending.current;
            pending.current = new Map();
            setHeights((prev) => {
              let next: Map<string, number> | null = null;
              for (const [k, h] of batch) {
                if (prev.get(k) === h) continue;
                next ??= new Map(prev);
                next.set(k, h);
              }
              return next ?? prev;
            });
          });
        }
      });
    }
    observerRef.current.observe(el);
  }, []);

  // offsets[i] = top of row i; offsets[n] = total height.
  const offsets = useMemo(() => {
    const out = new Float64Array(keys.length + 1);
    for (let i = 0; i < keys.length; i++) out[i + 1] = out[i] + (heights.get(keys[i]) ?? estimate);
    return out;
  }, [keys, estimate, heights]);

  const n = keys.length;
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid + 1] <= scrollTop) lo = mid + 1;
    else hi = mid;
  }
  const startIndex = Math.max(0, lo - overscan);
  let end = lo;
  while (end < n && offsets[end] < scrollTop + viewportH) end++;
  const endIndex = Math.min(n, end + overscan);

  return { scrollRef, onScroll, measure, totalHeight: offsets[n], offsetY: offsets[startIndex], startIndex, endIndex };
}
