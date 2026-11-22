"use client";

import { useEffect, useRef } from "react";
import { trimToInk, type SigAsset } from "../sign-pdf.canvas";

/** Drawing surface in device pixels; shown at whatever width the modal gives it. */
const W = 1400;
const H = 620;

/**
 * Draw-your-signature pad. Smooth quadratic strokes in the chosen ink; each
 * finished stroke publishes the whole drawing, cropped to the ink. Re-opened
 * with an existing signature, it starts from that drawing.
 */
export function SignPad({
  ink,
  stroke,
  value,
  onChange,
}: {
  ink: string;
  /** Pen width in CSS pixels. */
  stroke: number;
  value: SigAsset | null;
  onChange: (a: SigAsset | null) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  /** The asset this canvas last produced — so our own output isn't re-drawn. */
  const mine = useRef<string | null>(null);

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    if (!value) {
      ctx.clearRect(0, 0, W, H);
      mine.current = null;
      return;
    }
    if (value.url === mine.current) return;
    // Start from the saved signature: centred, ~70% of the pad's height.
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, W, H);
      const h = Math.min(H * 0.7, (W * 0.8) * value.aspect);
      const w = h / value.aspect;
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2 - H * 0.04, w, h);
      mine.current = value.url;
    };
    img.src = value.url;
  }, [value]);

  return (
    <div className="relative">
      <canvas
        ref={ref}
        width={W}
        height={H}
        aria-label="Signature drawing pad — draw with your mouse, trackpad, pen or finger"
        className="block aspect-[1400/620] w-full cursor-crosshair touch-none rounded-xl bg-[#f6f2ea]"
        onPointerDown={(e) => {
          const c = e.currentTarget;
          const ctx = c.getContext("2d");
          if (!ctx) return;
          e.preventDefault();
          c.setPointerCapture(e.pointerId);
          const r = c.getBoundingClientRect();
          const sx = c.width / r.width;
          const sy = c.height / r.height;
          const pt = (ev: { clientX: number; clientY: number }): [number, number] => [(ev.clientX - r.left) * sx, (ev.clientY - r.top) * sy];
          let last = pt(e);
          let mid = last;
          ctx.strokeStyle = ink;
          ctx.fillStyle = ink;
          // The chosen width in CSS px, whatever the pad's displayed size.
          ctx.lineWidth = stroke * sx;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.arc(last[0], last[1], ctx.lineWidth / 2, 0, Math.PI * 2);
          ctx.fill();
          const onMove = (ev: PointerEvent) => {
            for (const p of ev.getCoalescedEvents?.() ?? [ev]) {
              const q = pt(p);
              const m: [number, number] = [(last[0] + q[0]) / 2, (last[1] + q[1]) / 2];
              ctx.beginPath();
              ctx.moveTo(mid[0], mid[1]);
              ctx.quadraticCurveTo(last[0], last[1], m[0], m[1]);
              ctx.stroke();
              last = q;
              mid = m;
            }
          };
          const onUp = () => {
            c.removeEventListener("pointermove", onMove);
            c.removeEventListener("pointerup", onUp);
            c.removeEventListener("pointercancel", onUp);
            const a = trimToInk(c);
            mine.current = a?.url ?? null;
            onChange(a);
          };
          c.addEventListener("pointermove", onMove);
          c.addEventListener("pointerup", onUp);
          c.addEventListener("pointercancel", onUp);
        }}
      />
      {/* The signing line — a guide only, never part of the signature. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-[6%] bottom-[26%] flex items-end gap-2 border-b border-dashed border-[#1a1a18]/25">
        <span className="-mb-px pb-1 text-base text-[#1a1a18]/35">✕</span>
      </span>
      {!value && (
        <span className="pointer-events-none absolute inset-x-0 bottom-[8%] text-center text-[13px] text-[#1a1a18]/45">Sign above the line</span>
      )}
    </div>
  );
}
