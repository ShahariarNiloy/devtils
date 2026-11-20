"use client";

import { cn } from "@/lib/cn";
import { Maximize2, Minimize2, MoveHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatBytes } from "../../image-compressor.lib";

// ── Compare canvas — drag-to-reveal slider ─────────────────────
//
// Inline visualization in the expanded row: a single canvas with both
// images stacked and a draggable vertical divider. Differences pop the
// instant the divider crosses a region where compression introduced
// artifacts.
//
// The inline canvas is intentionally compact (`aspect-[3/2]`, capped
// max-height) so it doesn't dominate the row. For pixel-level
// inspection — 1:1 zoom with pan — the user clicks "Expand" to open
// the same canvas in a dialog where it gets full viewport room.

interface CompareCanvasProps {
  originalUrl: string;
  compressedUrl: string;
  originalSize: number;
  compressedSize: number;
  /** "inline" = compact + Expand button; "panel" = fixed 260px workspace
   *  preview + Expand button; "modal" = large + zoom toggle. */
  variant: "inline" | "panel" | "modal";
  onExpand?: () => void;
  /** Controlled divider position (0–100). Uncontrolled when omitted. */
  position?: number;
  onPositionChange?: (pct: number) => void;
  /** Corner labels; default to "Original · size" / "Compressed · size". */
  originalLabel?: string;
  compressedLabel?: string;
}

export function CompareCanvas({
  originalUrl,
  compressedUrl,
  originalSize,
  compressedSize,
  variant,
  onExpand,
  position,
  onPositionChange,
  originalLabel,
  compressedLabel,
}: CompareCanvasProps) {
  const [ownPos, setOwnPos] = useState(50);
  const dividerPos = position ?? ownPos;
  const setDividerPos = useCallback(
    (next: number | ((p: number) => number)) => {
      const value = typeof next === "function" ? next(position ?? ownPos) : next;
      if (onPositionChange) onPositionChange(value);
      else setOwnPos(value);
    },
    [onPositionChange, position, ownPos],
  );
  const [zoomed, setZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom only exists in the modal variant. Recenter the pan on every
  // toggle (handled in the button below) so each zoom entry starts
  // centered — no effect needed, which keeps render side-effect-free.
  const toggleZoom = useCallback(() => {
    setZoomed((z) => !z);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (variant !== "modal" || !zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant, zoomed]);

  // ── Divider drag (always available when not zoomed) ──
  // Pointer capture routes every move/up to the divider itself, so the
  // drag keeps tracking past the canvas edge and releases cleanly when
  // the pointer is lifted anywhere — no window-level listeners that could
  // outlive the element or leak across remounts.
  const onDividerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      const el = e.currentTarget;
      const pointerId = e.pointerId;
      el.setPointerCapture(pointerId);
      const onMove = (ev: PointerEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const pct = ((ev.clientX - rect.left) / rect.width) * 100;
        setDividerPos(Math.max(0, Math.min(100, pct)));
      };
      const onUp = () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        if (el.hasPointerCapture(pointerId))
          el.releasePointerCapture(pointerId);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    },
    [setDividerPos]
  );

  // ── Pan drag (modal + zoomed only) ──
  const onPanPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (variant !== "modal" || !zoomed) return;
      e.preventDefault();
      const el = e.currentTarget;
      const pointerId = e.pointerId;
      const startX = e.clientX - pan.x;
      const startY = e.clientY - pan.y;
      el.setPointerCapture(pointerId);
      const onMove = (ev: PointerEvent) => {
        setPan({ x: ev.clientX - startX, y: ev.clientY - startY });
      };
      const onUp = () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        if (el.hasPointerCapture(pointerId))
          el.releasePointerCapture(pointerId);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    },
    [variant, zoomed, pan.x, pan.y]
  );

  const imgClass = zoomed
    ? "absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 cursor-grab select-none active:cursor-grabbing"
    : "absolute inset-0 m-auto max-h-full max-w-full object-contain select-none";
  const imgStyle = zoomed
    ? {
        transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
      }
    : undefined;

  const sizeClass =
    variant === "modal"
      ? "h-[min(75vh,720px)] w-full"
      : variant === "panel"
        ? "h-[260px] w-full"
        : "aspect-[16/9] max-h-[440px] w-full";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-[#0d0d0c]",
        sizeClass
      )}
      onPointerDown={onPanPointerDown}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={originalUrl}
        alt="Original"
        className={imgClass}
        style={imgStyle}
        draggable={false}
      />
      {!zoomed ? (
        <div
          className="absolute inset-0 overflow-hidden"
          // Clip the compressed image from the LEFT by `dividerPos%`. So the
          // compressed view is visible from the divider rightwards — matching
          // the "Compressed" label that sits at the top-right corner. With
          // the previous `inset(0 ${100 - dividerPos}% 0 0)` (clip from the
          // RIGHT), the compressed half landed on the left of the canvas,
          // inverted from the label.
          style={{ clipPath: `inset(0 0 0 ${dividerPos}%)` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={compressedUrl}
            alt="Compressed"
            className={imgClass}
            draggable={false}
          />
        </div>
      ) : null}

      {!zoomed ? (
        <div
          data-divider
          role="slider"
          aria-label="Compare position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(dividerPos)}
          tabIndex={0}
          onPointerDown={onDividerPointerDown}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setDividerPos((p) => Math.max(0, p - 2));
            if (e.key === "ArrowRight")
              setDividerPos((p) => Math.min(100, p + 2));
          }}
          className="group/divider absolute top-0 bottom-0 w-0.5 cursor-ew-resize bg-text shadow-[0_0_0_1px_rgba(0,0,0,0.3)] outline-none focus-visible:ring-2 focus-visible:ring-brand"
          style={{ left: `${dividerPos}%`, transform: "translateX(-50%)" }}
        >
          <span
            aria-hidden
            className="surface-key absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-text-key transition-transform duration-150 ease-out-strong group-hover/divider:scale-105 group-active/divider:scale-110"
          >
            <MoveHorizontal size={16} strokeWidth={1.8} />
          </span>
        </div>
      ) : null}

      <span className="pointer-events-none absolute rounded-md bg-black/50 px-2 py-[3px] text-[11px] font-bold text-text tabular-nums top-2.5 left-2.5">
        {originalLabel ?? `Original · ${formatBytes(originalSize)}`}
      </span>
      {!zoomed ? (
        <span className="pointer-events-none absolute rounded-md bg-black/50 px-2 py-[3px] text-[11px] font-bold text-text tabular-nums top-2.5 right-2.5">
          {compressedLabel ?? `Compressed · ${formatBytes(compressedSize)}`}
        </span>
      ) : (
        <span className="pointer-events-none absolute rounded-md bg-black/50 px-2 py-[3px] text-[11px] font-bold text-text tabular-nums top-2.5 right-2.5">
          1:1 · drag to pan
        </span>
      )}

      {/* Bottom-right control: Expand (inline) or Zoom toggle (modal). */}
      {variant !== "modal" ? (
        <button
          type="button"
          aria-label="Expand comparison for closer inspection"
          title="Expand"
          onClick={(e) => {
            e.stopPropagation();
            onExpand?.();
          }}
          className="absolute right-2.5 bottom-2.5 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-black/50 px-2.5 text-xs font-semibold text-text backdrop-blur-sm transition-[opacity,transform] duration-150 ease-out-strong hover:bg-black/70 active:scale-[0.96]"
        >
          <Maximize2 size={12} strokeWidth={2} aria-hidden />
          Inspect
        </button>
      ) : (
        <button
          type="button"
          aria-label={zoomed ? "Fit to view" : "View at 1:1"}
          title={zoomed ? "Fit to view (Esc)" : "View at 1:1"}
          onClick={(e) => {
            e.stopPropagation();
            toggleZoom();
          }}
          className="absolute right-2.5 bottom-2.5 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-black/50 px-2.5 text-xs font-semibold text-text backdrop-blur-sm transition-[opacity,transform] duration-150 ease-out-strong hover:bg-black/70 active:scale-[0.96]"
        >
          {zoomed ? (
            <>
              <Minimize2 size={12} strokeWidth={2} aria-hidden />
              Fit
            </>
          ) : (
            <>
              <Maximize2 size={12} strokeWidth={2} aria-hidden />
              1:1
            </>
          )}
        </button>
      )}
    </div>
  );
}
