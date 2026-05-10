"use client";

import { useCallback, useEffect, useRef } from "react";
import { Copy, Pipette } from "lucide-react";
import { toast } from "sonner";
import { parseHex, type RGB } from "../color.lib";

const CHECKER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='4' height='4' fill='%23c8c0b0'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23c8c0b0'/%3E%3Crect x='4' width='4' height='4' fill='%23ece6d4'/%3E%3Crect y='4' width='4' height='4' fill='%23ece6d4'/%3E%3C/svg%3E\")";

interface Props {
  hue: number;
  sat: number;
  bri: number;
  alpha: number;
  previewHex: string;
  pureHex: string;
  onSatBriChange: (sat: number, bri: number) => void;
  onHueChange: (hue: number) => void;
  onAlphaChange: (alpha: number) => void;
  onPickerRelease: () => void;
  setFromRgb: (rgb: RGB) => void;
}

export function PickerPanel({
  hue, sat, bri, alpha, previewHex, pureHex,
  onSatBriChange, onHueChange, onAlphaChange, onPickerRelease, setFromRgb,
}: Props) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updateSatBri = useCallback((clientX: number, clientY: number) => {
    const el = pickerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    onSatBriChange(
      Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)),
      Math.max(0, Math.min(100, (1 - (clientY - r.top) / r.height) * 100)),
    );
  }, [onSatBriChange]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDragging.current) updateSatBri(e.clientX, e.clientY);
    };
    const onUp = () => {
      if (isDragging.current) { isDragging.current = false; onPickerRelease(); }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging.current && e.touches[0])
        updateSatBri(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => {
      if (isDragging.current) { isDragging.current = false; onPickerRelease(); }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [updateSatBri, onPickerRelease]);

  const copyHex = async () => {
    await navigator.clipboard.writeText(previewHex);
    toast.success("Copied HEX");
  };

  const shortHex = previewHex.length === 9 ? previewHex.slice(0, 7) : previewHex;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden p-4 flex flex-col gap-3">
      {/* SB gradient square */}
      <div
        ref={pickerRef}
        className="relative w-full rounded-lg cursor-crosshair select-none overflow-hidden"
        style={{
          aspectRatio: "1",
          background: `
            linear-gradient(to bottom, transparent 0%, #000 100%),
            linear-gradient(to right, #fff 0%, hsl(${Math.round(hue)},100%,50%) 100%)
          `,
        }}
        onMouseDown={(e) => { isDragging.current = true; updateSatBri(e.clientX, e.clientY); }}
        onTouchStart={(e) => {
          isDragging.current = true;
          if (e.touches[0]) updateSatBri(e.touches[0].clientX, e.touches[0].clientY);
        }}
      >
        <div
          className="absolute w-[18px] h-[18px] rounded-full border-2 border-white pointer-events-none"
          style={{
            left: `${sat}%`,
            top: `${100 - bri}%`,
            transform: "translate(-50%, -50%)",
            background: previewHex,
            boxShadow: "0 0 0 1.5px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.35)",
          }}
        />
      </div>

      {/* Hue slider */}
      <ColorSlider
        value={hue} min={0} max={360}
        onChange={onHueChange}
        pct={(hue / 360) * 100}
        railStyle={{ background: "linear-gradient(to right,#f00 0%,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00 100%)" }}
        thumbColor={pureHex}
      />

      {/* Alpha slider */}
      <ColorSlider
        value={Math.round(alpha * 100)} min={0} max={100}
        onChange={(v) => onAlphaChange(v / 100)}
        pct={alpha * 100}
        railStyle={{ backgroundImage: CHECKER }}
        railOverlay={`linear-gradient(to right, transparent, ${shortHex})`}
        thumbColor={previewHex}
      />

      {/* Swatch row */}
      <div className="flex items-center gap-3 pt-1">
        <div
          className="h-11 w-11 shrink-0 rounded-lg border border-border-subtle"
          style={{ background: previewHex }}
        />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-semibold text-text leading-none">
            {previewHex.toUpperCase()}
          </p>
          <p className="text-sm text-text-faint mt-1">α {Math.round(alpha * 100)}%</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copyHex}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
            aria-label="Copy hex"
          >
            <Copy size={15} />
          </button>
          <label className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-faint hover:bg-surface-soft hover:text-text transition-colors cursor-pointer" aria-label="Pick color">
            <Pipette size={15} />
            <input
              type="color"
              value={shortHex}
              onChange={(e) => {
                const p = parseHex(e.target.value);
                if (p) setFromRgb({ ...p, a: alpha });
              }}
              className="sr-only"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

interface SliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  pct: number;
  railStyle: React.CSSProperties;
  railOverlay?: string;
  thumbColor: string;
}

function ColorSlider({ value, min, max, onChange, pct, railStyle, railOverlay, thumbColor }: SliderProps) {
  return (
    <div className="relative h-5 flex items-center">
      <div className="absolute inset-x-0 h-3 top-1/2 -translate-y-1/2 rounded-full overflow-hidden">
        <div className="absolute inset-0" style={railStyle} />
        {railOverlay && <div className="absolute inset-0" style={{ background: railOverlay }} />}
      </div>
      <div
        className="absolute w-4 h-4 rounded-full border-2 border-white pointer-events-none"
        style={{
          left: `${pct}%`,
          transform: "translateX(-50%)",
          background: thumbColor,
          boxShadow: "0 0 0 1.5px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.2)",
        }}
      />
      <input
        type="range" min={min} max={max} step={1}
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="slider"
      />
    </div>
  );
}
