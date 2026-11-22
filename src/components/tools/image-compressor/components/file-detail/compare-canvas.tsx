"use client";

import { cn } from "@/lib/cn";
import { Maximize2, Minimize2, MoveHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Compare canvas — drag-to-reveal slider ─────────────────────
//
// One canvas with both images stacked and a vertical divider: the
// compressed (or "what changed") layer is clipped from the left at the
// divider, so differences pop the instant it crosses a region where
// compression introduced artifacts.
//
// Zoom is focus-based: at 100% / 200% both layers render at the
// original's natural pixel size × zoom, positioned so the focus point
// (fx, fy ∈ 0–1 of the image) sits at the centre of the view. Entering a
// zoom with focus 0.5/0.5 is centred; clicking a spot at Fit zooms there;
// dragging pans. Both layers share the exact same box, so a resized
// output and the diff map line up pixel for pixel under the divider.

export type CompareZoom = "fit" | 1 | 2;

export interface CompareFocus {
  fx: number;
  fy: number;
}

interface CompareCanvasProps {
  originalUrl: string;
  compressedUrl: string;
  /** "stage" = the workspace preview (zoom driven by the parent);
   *  "modal" = the Inspect dialog (own Fit / 1:1 toggle). */
  variant: "stage" | "modal";
  /** Controlled divider position (0–100). */
  position: number;
  onPositionChange: (pct: number) => void;
  originalLabel: React.ReactNode;
  compressedLabel: React.ReactNode;
  /** Show a checkerboard behind transparent images. */
  alpha?: boolean;
  /** Stage only: zoom + focus are controlled. */
  zoom?: CompareZoom;
  focus?: CompareFocus;
  onZoomAt?: (focus: CompareFocus) => void;
  onFocusChange?: (focus: CompareFocus) => void;
  onInspect?: () => void;
  /** Dim the compressed layer while a fresher result is on its way. */
  stale?: boolean;
  className?: string;
}

const CENTRE: CompareFocus = { fx: 0.5, fy: 0.5 };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const CHECKER = "repeating-conic-gradient(#1b1b19 0 25%, #121211 0 50%) 0 0 / 16px 16px";

export function CompareCanvas({
  originalUrl,
  compressedUrl,
  variant,
  position,
  onPositionChange,
  originalLabel,
  compressedLabel,
  alpha = false,
  zoom: zoomProp,
  focus: focusProp,
  onZoomAt,
  onFocusChange,
  onInspect,
  stale = false,
  className,
}: CompareCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Original's pixel size: at 1:1 both layers render at it, so a resized
  // output still lines up pixel-for-pixel under the divider.
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  // Modal: own zoom state (Fit ↔ 1:1), always entering centred.
  const [ownZoom, setOwnZoom] = useState<CompareZoom>("fit");
  const [ownFocus, setOwnFocus] = useState<CompareFocus>({ fx: 0.5, fy: 0.5 });
  const zoom = variant === "stage" ? (zoomProp ?? "fit") : ownZoom;
  const focus = useMemo(() => (variant === "stage" ? (focusProp ?? CENTRE) : ownFocus), [variant, focusProp, ownFocus]);
  const setFocus = useCallback(
    (f: CompareFocus) => {
      if (variant === "stage") onFocusChange?.(f);
      else setOwnFocus(f);
    },
    [variant, onFocusChange],
  );
  const zoomed = zoom !== "fit";

  useEffect(() => {
    if (variant !== "modal" || !zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOwnZoom("fit");
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [variant, zoomed]);

  // ── Divider drag ──
  // Pointer capture routes every move/up to the divider itself, so the
  // drag keeps tracking past the canvas edge and releases cleanly.
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
        onPositionChange(Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100)));
      };
      const onUp = () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
        if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
    },
    [onPositionChange],
  );

  const scale = zoom === 2 ? 2 : 1;
  const boxW = (natural?.w ?? 0) * scale;
  const boxH = (natural?.h ?? 0) * scale;

  // ── Pan drag (zoomed) / click-to-inspect (fit) ──
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-divider],button")) return;
      const el = e.currentTarget;
      const pointerId = e.pointerId;
      const sx = e.clientX;
      const sy = e.clientY;
      const f0 = focus;
      let moved = false;
      el.setPointerCapture(pointerId);
      const onMove = (ev: PointerEvent) => {
        if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 4) moved = true;
        if (zoomed && boxW > 0 && boxH > 0) {
          setFocus({ fx: clamp01(f0.fx - (ev.clientX - sx) / boxW), fy: clamp01(f0.fy - (ev.clientY - sy) / boxH) });
        }
      };
      const onUp = (ev: PointerEvent) => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
        if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
        if (moved || zoomed || ev.type === "pointercancel" || !natural) return;
        // Map the click into the image box (object-fit: contain) and zoom there.
        const rect = el.getBoundingClientRect();
        const s = Math.min(rect.width / natural.w, rect.height / natural.h);
        const ox = (rect.width - natural.w * s) / 2;
        const oy = (rect.height - natural.h * s) / 2;
        const at = {
          fx: clamp01((ev.clientX - rect.left - ox) / (natural.w * s)),
          fy: clamp01((ev.clientY - rect.top - oy) / (natural.h * s)),
        };
        if (variant === "stage") onZoomAt?.(at);
        else {
          setOwnFocus(at);
          setOwnZoom(1);
        }
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
    },
    [focus, zoomed, boxW, boxH, natural, setFocus, variant, onZoomAt],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!zoomed) return;
    const step = 0.04;
    const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    setFocus({ fx: clamp01(focus.fx + d[0]), fy: clamp01(focus.fy + d[1]) });
  };

  // Layer box. Fit: contain inside the view. Zoomed: natural × zoom with the
  // focus point at the centre (left/top 50% + translate by the focus).
  const boxStyle: React.CSSProperties =
    zoomed && natural
      ? {
          position: "absolute",
          left: "50%",
          top: "50%",
          width: boxW,
          height: boxH,
          transform: `translate(${Math.round(-focus.fx * boxW)}px, ${Math.round(-focus.fy * boxH)}px)`,
        }
      : { position: "absolute", inset: 0 };
  const imgClass = zoomed ? "block h-full w-full max-w-none select-none" : "block h-full w-full object-contain select-none";
  const imgStyle: React.CSSProperties | undefined = zoom === 2 ? { imageRendering: "pixelated" } : undefined;

  const sizeClass =
    variant === "modal" ? "h-[min(75vh,720px)] w-full" : "h-[300px] w-full sm:h-[440px] lg:h-[520px]";
  const hint = zoomed ? "Drag to look around" : "Click a spot to inspect it at 100%";

  return (
    <div
      ref={containerRef}
      tabIndex={zoomed ? 0 : -1}
      aria-label={zoomed ? "Comparison — use arrow keys to pan" : undefined}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      className={cn(
        "relative touch-none overflow-hidden rounded-[14px] border border-white/7 outline-none select-none focus-visible:ring-2 focus-visible:ring-brand",
        zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
        sizeClass,
        className,
      )}
      style={{ background: alpha ? CHECKER : "#0b0b0a" }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div style={boxStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={originalUrl}
            alt="Original"
            draggable={false}
            className={imgClass}
            style={imgStyle}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />
        </div>
      </div>
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
        <div style={boxStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={compressedUrl}
            alt="Compressed"
            draggable={false}
            className={cn(imgClass, "transition-opacity duration-200", stale && "opacity-60")}
            style={imgStyle}
          />
        </div>
      </div>

      {/* Divider: a 2px line with a wider invisible grab area. */}
      <div
        data-divider
        role="slider"
        aria-label="Compare original and compressed"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        tabIndex={0}
        onPointerDown={onDividerPointerDown}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") onPositionChange(Math.max(0, position - 2));
          if (e.key === "ArrowRight") onPositionChange(Math.min(100, position + 2));
        }}
        className="group/divider absolute top-0 bottom-0 w-4 -translate-x-1/2 cursor-ew-resize outline-none!"
        style={{ left: `${position}%` }}
      >
        <span aria-hidden className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-text shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
        {/* The knob: a visible handle (and a bigger touch target) mid-line. It
            also carries the keyboard focus ring — the global outline would
            frame the whole full-height grab strip. */}
        <span
          aria-hidden
          className="surface-key absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-text-key transition-transform duration-150 ease-out-strong group-hover/divider:scale-105 group-focus-visible/divider:outline-2! group-focus-visible/divider:outline-offset-2 group-focus-visible/divider:outline-brand group-focus-visible/divider:outline-solid group-active/divider:scale-110 max-sm:size-11"
        >
          <MoveHorizontal size={16} strokeWidth={1.8} />
        </span>
      </div>

      <span className="pointer-events-none absolute top-3 left-3 max-w-[45%] truncate rounded-full bg-[rgba(11,11,10,0.8)] px-[9px] py-1 font-mono text-[11px] text-text-strong">
        {originalLabel}
      </span>
      {/* In the modal the dialog's close button sits in this corner; keep clear of it. */}
      <span
        className={cn(
          "pointer-events-none absolute top-3 max-w-[45%] truncate rounded-full bg-[rgba(11,11,10,0.8)] px-[9px] py-1 font-mono text-[11px] text-[#f0c9a0]",
          variant === "modal" ? "right-14" : "right-3",
        )}
      >
        {compressedLabel}
      </span>
      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-[rgba(11,11,10,0.7)] px-2.5 py-1 text-[11.5px] whitespace-nowrap text-text-tertiary max-sm:hidden">
        {hint}
      </span>

      {variant === "stage" && onInspect ? (
        <button
          type="button"
          onClick={onInspect}
          aria-label="Inspect in a larger view"
          className="absolute right-3 bottom-3 inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full bg-[rgba(11,11,10,0.8)] px-3 text-xs font-semibold text-text transition-colors hover:bg-black max-sm:min-h-11"
        >
          <Maximize2 size={12} strokeWidth={2} aria-hidden />
          Inspect
        </button>
      ) : null}
      {variant === "modal" ? (
        <button
          type="button"
          aria-label={zoomed ? "Fit to view" : "View at 1:1"}
          title={zoomed ? "Fit to view (Esc)" : "View at 1:1"}
          onClick={() => {
            setOwnFocus({ fx: 0.5, fy: 0.5 });
            setOwnZoom(zoomed ? "fit" : 1);
          }}
          className="absolute right-3 bottom-3 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-[rgba(11,11,10,0.8)] px-3 text-xs font-semibold text-text transition-colors hover:bg-black"
        >
          {zoomed ? <Minimize2 size={12} strokeWidth={2} aria-hidden /> : <Maximize2 size={12} strokeWidth={2} aria-hidden />}
          {zoomed ? "Fit" : "1:1"}
        </button>
      ) : null}
    </div>
  );
}
