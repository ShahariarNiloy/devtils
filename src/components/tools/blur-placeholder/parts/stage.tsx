"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { useIsMobile } from "@/lib/use-is-mobile";
import { kb, valueOf, type FormatInfo, type Result } from "../blur-placeholder.lib";
import type { Loaded } from "../use-blur-placeholder";
import { CHECKER, PlaceholderLayer } from "./ui";

const DURATION = 1900;
const HOLD = 700;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * Placeholder vs original, drag-to-reveal (left of the divider is the
 * placeholder, right is the real image), plus a "slow load" playback that
 * fades the original in over the placeholder the way a page would.
 */
export function Stage({ item, result, format }: { item: Loaded | null; result: Result | null; format: FormatInfo }) {
  const isMobile = useIsMobile();
  const [split, setSplit] = useState(50);
  const [playing, setPlaying] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const origRef = useRef<HTMLImageElement>(null);
  const raf = useRef<number | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  // A new image starts centred.
  const itemId = item?.id;
  const [lastId, setLastId] = useState(itemId);
  if (itemId !== lastId) {
    setLastId(itemId);
    setSplit(50);
  }

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      if (hold.current) clearTimeout(hold.current);
    },
    [],
  );

  const play = () => {
    if (playing) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPlaying(true);
    const img = origRef.current;
    if (img) img.style.opacity = "0";
    let t0: number | null = null;
    const step = (ts: number) => {
      t0 ??= ts;
      const t = Math.min(1, (ts - t0) / DURATION);
      if (img) {
        const k = Math.max(0, Math.min(1, (t - 0.35) / 0.65));
        // Reduced motion: no fade, the image just appears when it "arrives".
        const hardCut = t >= 0.6 ? 1 : 0;
        img.style.opacity = String(reduce ? hardCut : ease(k));
      }
      if (t < 1) raf.current = requestAnimationFrame(step);
      else {
        raf.current = null;
        hold.current = setTimeout(() => {
          if (img) img.style.opacity = "";
          setPlaying(false);
        }, HOLD);
      }
    };
    raf.current = requestAnimationFrame(step);
  };

  const fromPointer = (e: PointerEvent) => {
    const box = boxRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    setSplit(Math.round(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))));
  };
  const onKey = (e: KeyboardEvent) => {
    const big = e.shiftKey ? 10 : 2;
    const moves: Record<string, number> = {
      ArrowLeft: split - big,
      ArrowDown: split - big,
      ArrowRight: split + big,
      ArrowUp: split + big,
      Home: 0,
      End: 100,
      PageDown: split - 10,
      PageUp: split + 10,
    };
    const next = moves[e.key] ?? null;
    if (next === null) return;
    e.preventDefault();
    setSplit(Math.max(0, Math.min(100, next)));
  };

  const ar = item ? item.w / item.h : 16 / 10;
  const size = result ? valueOf(format.id, result).length : 0;
  const tag = "pointer-events-none absolute top-3 rounded-full bg-[rgba(11,11,10,0.75)] px-[9px] py-1 font-mono text-[11px]";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-[14px] border border-white/7 bg-bg [grid-area:stage]",
        "h-[240px] [--stage-h:240px] sm:h-[380px] sm:[--stage-h:380px] lg:h-auto lg:min-h-[560px] lg:[--stage-h:600px]",
      )}
    >
      <div
        ref={boxRef}
        className="relative max-h-full touch-none overflow-hidden select-none"
        style={{
          width: `min(100%, calc(var(--stage-h) * ${ar.toFixed(4)}))`,
          aspectRatio: `${item?.w ?? 16} / ${item?.h ?? 10}`,
          background: result?.hasAlpha ? CHECKER : "#121211",
          cursor: playing ? "default" : "ew-resize",
        }}
        onPointerDown={(e) => {
          if (playing) return;
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => dragging.current && fromPointer(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        {result && <PlaceholderLayer id={format.id} r={result} blur={isMobile ? 14 : 22} />}
        {item && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={origRef}
            src={item.srcUrl}
            alt="Original image"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: playing ? "inset(0 0 0 0)" : `inset(0 0 0 ${split}%)` }}
          />
        )}
        {!playing && item && (
          <div
            role="slider"
            tabIndex={0}
            aria-label="Compare placeholder and original"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={split}
            aria-valuetext={`Placeholder on the left ${split}%, original on the right`}
            aria-orientation="horizontal"
            onKeyDown={onKey}
            className="group absolute top-0 bottom-0 -ml-px w-0.5 bg-text shadow-[0_0_12px_rgba(0,0,0,0.5)] outline-none"
            style={{ left: `${split}%` }}
          >
            <span className="absolute top-1/2 left-1/2 -mt-[15px] -ml-[15px] flex size-[30px] items-center justify-center rounded-full bg-text text-xs font-bold text-charcoal shadow-[0_4px_14px_rgba(0,0,0,0.4)] group-focus-visible:ring-4 group-focus-visible:ring-[rgba(246,242,234,0.35)] max-sm:-mt-[22px] max-sm:-ml-[22px] max-sm:size-11">
              ⇆
            </span>
          </div>
        )}
      </div>
      <span className={cn(tag, "left-3 text-tier-pro-text")}>
        {format.short} · {kb(size)}
      </span>
      <span className={cn(tag, "right-3 text-text-strong")}>Original · {item ? kb(item.bytes) : "—"}</span>
      <button
        type="button"
        onClick={play}
        disabled={!item || playing}
        className="absolute right-3 bottom-3 inline-flex min-h-8 cursor-pointer items-center gap-[7px] rounded-[9px] border border-border-strong bg-[rgba(11,11,10,0.8)] px-3 text-xs font-semibold text-text hover:border-white/30 disabled:cursor-default max-sm:min-h-11"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 1l7 4-7 4z" fill="currentColor" />
        </svg>
        {playing ? "Loading…" : "Simulate a slow load"}
      </button>
    </div>
  );
}
