"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Block-virtualized list for variable-height rows (they wrap). Items are
 * grouped in blocks of `BLOCK`; only blocks near the viewport mount, each
 * block's real height is measured (ResizeObserver) and replaces its
 * estimate. 300k rows cost the same to scroll as 300.
 *
 * `scrollEl` is the scrolling ancestor; the list can sit anywhere inside
 * it (below a sticky header, say). `scrollTo` brings an item into view —
 * a new `nonce` re-requests the same index.
 */

const BLOCK = 64;
const OVERSCAN_PX = 600;

export interface ScrollRequest {
  index: number;
  nonce: number;
}

export function VirtualList({
  count,
  estimate,
  scrollEl,
  render,
  scrollTo,
  className,
}: {
  count: number;
  /** Estimated item height in px. */
  estimate: number;
  scrollEl: HTMLElement | null;
  render: (index: number) => ReactNode;
  scrollTo?: ScrollRequest | null;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const blocks = Math.ceil(count / BLOCK);
  // Measured block heights (0 = not measured yet), for the current block count.
  const [measured, setMeasured] = useState<{ blocks: number; h: Float64Array }>(() => ({ blocks, h: new Float64Array(blocks) }));
  const heights = measured.blocks === blocks ? measured.h : null;
  const blocksRef = useRef(blocks);
  useLayoutEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);
  const [view, setView] = useState({ top: 0, height: 800 });

  const blockHeight = (b: number) => {
    const h = heights ? heights[b] : 0;
    if (h > 0) return h;
    const n = b === blocks - 1 ? count - b * BLOCK : BLOCK;
    return n * estimate;
  };

  // Prefix offsets — O(blocks), a few thousand at most.
  const offsets = new Float64Array(blocks + 1);
  for (let b = 0; b < blocks; b++) offsets[b + 1] = offsets[b] + blockHeight(b);

  // Track the viewport relative to the list.
  useEffect(() => {
    const el = scrollEl;
    const list = listRef.current;
    if (!el || !list) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const top = el.scrollTop - (list.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop);
      setView((v) => (Math.abs(v.top - top) < 1 && v.height === el.clientHeight ? v : { top, height: el.clientHeight }));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollEl]);

  // Visible block range.
  const lo = Math.max(0, view.top - OVERSCAN_PX);
  const hi = view.top + view.height + OVERSCAN_PX;
  let first = 0;
  {
    let a = 0;
    let z = blocks;
    while (a < z) {
      const mid = (a + z) >> 1;
      if (offsets[mid + 1] <= lo) a = mid + 1;
      else z = mid;
    }
    first = Math.min(a, Math.max(0, blocks - 1));
  }
  let last = first;
  while (last < blocks - 1 && offsets[last + 1] < hi) last++;

  // Measure mounted blocks.
  const observer = useRef<ResizeObserver | null>(null);
  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      const n = blocksRef.current;
      setMeasured((prev) => {
        let next: Float64Array | null = null;
        for (const e of entries) {
          if (!(e.target instanceof HTMLElement)) continue;
          const b = Number(e.target.dataset.block);
          const h = e.target.offsetHeight;
          const base: Float64Array = next ?? (prev.blocks === n ? prev.h : new Float64Array(n));
          if (b < n && Math.abs(base[b] - h) > 0.5) {
            const target: Float64Array = next ?? (base === prev.h ? prev.h.slice() : base);
            target[b] = h;
            next = target;
          }
        }
        return next ? { blocks: n, h: next } : prev;
      });
    });
    observer.current = ro;
    return () => ro.disconnect();
  }, []);

  const blockRef = (el: HTMLDivElement | null) => {
    if (!el) return;
    const ro = observer.current;
    ro?.observe(el);
    return () => ro?.unobserve(el);
  };

  // Scroll requests: jump to the block, then fine-tune on the real element.
  const pendingScroll = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!scrollTo || !scrollEl || !listRef.current || scrollTo.index < 0 || scrollTo.index >= count) return;
    const el = scrollEl;
    const list = listRef.current;
    const listTop = list.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
    const node = list.querySelector<HTMLElement>(`[data-vi="${scrollTo.index}"]`);
    if (node) {
      ensureVisible(el, node);
      return;
    }
    const b = Math.floor(scrollTo.index / BLOCK);
    const within = (scrollTo.index - b * BLOCK) * estimate;
    scrollToY(el, listTop + offsets[b] + within - el.clientHeight / 3);
    pendingScroll.current = scrollTo.index;
    // `offsets` is derived each render; the request identity is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTo?.nonce, scrollTo?.index, scrollEl, count]);

  // After the target block mounts, align the real element.
  useLayoutEffect(() => {
    const idx = pendingScroll.current;
    if (idx === null || !scrollEl || !listRef.current) return;
    const node = listRef.current.querySelector<HTMLElement>(`[data-vi="${idx}"]`);
    if (node) {
      pendingScroll.current = null;
      ensureVisible(scrollEl, node);
    }
  });

  const children: ReactNode[] = [];
  for (let b = first; b <= last && b < blocks; b++) {
    const start = b * BLOCK;
    const end = Math.min(count, start + BLOCK);
    const rows: ReactNode[] = [];
    for (let i = start; i < end; i++) {
      rows.push(
        <div key={i} data-vi={i}>
          {render(i)}
        </div>,
      );
    }
    children.push(
      <div key={b} data-block={b} ref={blockRef}>
        {rows}
      </div>,
    );
  }

  return (
    <div ref={listRef} className={className} style={{ position: "relative" }}>
      <div style={{ height: blocks ? offsets[first] : 0 }} aria-hidden />
      {children}
      <div style={{ height: blocks ? offsets[blocks] - offsets[Math.min(last + 1, blocks)] : 0 }} aria-hidden />
    </div>
  );
}

function scrollToY(el: HTMLElement, y: number) {
  el.scrollTop = Math.max(0, y);
}

/** Scroll `node` into the upper third of `el` if it isn't comfortably visible. */
function ensureVisible(el: HTMLElement, node: HTMLElement) {
  const er = el.getBoundingClientRect();
  const nr = node.getBoundingClientRect();
  const margin = 24;
  if (nr.top >= er.top + margin && nr.bottom <= er.bottom - margin) return;
  scrollToY(el, el.scrollTop + nr.top - er.top - el.clientHeight / 3);
}
