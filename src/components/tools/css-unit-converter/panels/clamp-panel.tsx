"use client";

import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/primitives/input";
import { cn } from "@/lib/cn";
import {
  buildClamp,
  evaluateClampAt,
  format,
} from "../css-unit-converter.lib";

/**
 * Clamp() builder panel. Hero is the generated CSS expression; the ramp
 * SVG and live sample show what that expression actually does at any
 * viewport width.
 */
export function ClampPanel({
  baseFontSize,
  precision,
}: {
  baseFontSize: number;
  precision: number;
}) {
  const [minPx, setMinPx] = useState(16);
  const [maxPx, setMaxPx] = useState(24);
  const [minViewportPx, setMinViewportPx] = useState(320);
  const [maxViewportPx, setMaxViewportPx] = useState(1440);
  const [outputUnit, setOutputUnit] = useState<"rem" | "px">("rem");
  const [previewViewportPx, setPreviewViewportPx] = useState(880);

  const spec = useMemo(
    () => ({
      minPx, maxPx, minViewportPx, maxViewportPx, baseFontSize, outputUnit, precision,
    }),
    [minPx, maxPx, minViewportPx, maxViewportPx, baseFontSize, outputUnit, precision],
  );

  const result = useMemo(() => buildClamp(spec), [spec]);
  const previewPx = evaluateClampAt(spec, previewViewportPx);

  const copy = () => {
    void navigator.clipboard.writeText(result.expression);
    toast.success("clamp() copied");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* HERO — generated expression */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-text">Generated CSS</span>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5">
              {(["rem", "px"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setOutputUnit(u)}
                  className={cn(
                    "h-6 w-10 rounded-sm text-xs font-mono transition-colors",
                    outputUnit === u
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text",
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-xs-plus font-medium text-bg transition-opacity hover:opacity-90"
            >
              <Copy size={12} /> Copy
            </button>
          </div>
        </div>
        <pre className="mt-3 overflow-auto rounded-xl bg-surface-2/60 p-4 font-mono text-[15px] leading-[1.65] text-text">
          font-size: {result.expression};
        </pre>
        <p className="mt-2 font-mono text-xs text-text-faint">
          slope {format(result.slopeVw, 4)}vw · intercept{" "}
          {format(outputUnit === "rem" ? result.interceptRem : result.interceptPx, 4)}
          {outputUnit}
        </p>
      </div>

      {/* RAMP + PREVIEW */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-text">Ramp shape</h3>
            <span className="font-mono text-xs text-text-muted">
              {format(previewPx, precision)}px @ {previewViewportPx}px
            </span>
          </div>
          <div className="mt-4">
            <ClampRampSvg
              minPx={minPx}
              maxPx={maxPx}
              minViewportPx={minViewportPx}
              maxViewportPx={maxViewportPx}
              currentViewportPx={previewViewportPx}
            />
          </div>
          <div className="mt-4">
            <input
              type="range"
              min={Math.min(minViewportPx, 200)}
              max={Math.max(maxViewportPx, 1920)}
              value={previewViewportPx}
              onChange={(e) => setPreviewViewportPx(parseFloat(e.target.value))}
              className="block w-full accent-brand"
              aria-label="Preview viewport width"
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-text-faint">
              <span>{Math.min(minViewportPx, 200)}px</span>
              <span>drag to scrub</span>
              <span>{Math.max(maxViewportPx, 1920)}px</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold text-text">Live sample</h3>
          <div className="mt-4 rounded-xl border border-border-subtle bg-surface-2/40 p-4">
            <p
              style={{ fontSize: `${previewPx}px`, lineHeight: 1.2 }}
              className="font-medium text-text"
            >
              The quick brown fox
            </p>
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Below {minViewportPx}px viewport you see{" "}
            <code className="font-mono">{minPx}px</code>; above{" "}
            {maxViewportPx}px you see <code className="font-mono">{maxPx}px</code>.
            In between it interpolates linearly.
          </p>
        </div>
      </div>

      {/* SPEC */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-4 text-sm font-semibold text-text">Specification</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SpecRow
            label="Minimum"
            sizeValue={minPx}
            onSize={setMinPx}
            viewportValue={minViewportPx}
            onViewport={setMinViewportPx}
          />
          <SpecRow
            label="Maximum"
            sizeValue={maxPx}
            onSize={setMaxPx}
            viewportValue={maxViewportPx}
            onViewport={setMaxViewportPx}
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SpecRow({
  label,
  sizeValue,
  onSize,
  viewportValue,
  onViewport,
}: {
  label: string;
  sizeValue: number;
  onSize: (n: number) => void;
  viewportValue: number;
  onViewport: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-2/40 p-3">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
        {label}
      </span>
      <div className="flex items-center gap-2 text-xs-plus text-text-muted">
        <Input
          type="number"
          min={1}
          max={200}
          value={sizeValue}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onSize(n);
          }}
          className="h-9 w-20 font-mono text-sm"
        />
        <span>px at viewport</span>
        <Input
          type="number"
          min={100}
          max={4000}
          value={viewportValue}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onViewport(n);
          }}
          className="h-9 w-24 font-mono text-sm"
        />
        <span>px</span>
      </div>
    </div>
  );
}

/**
 * Visualises the clamp() ramp: two plateaus (min and max) connected by a
 * brand-coloured fluid segment. The current-viewport marker tracks the
 * preview slider so the user can see exactly which point of the curve the
 * sample text is rendered at.
 */
function ClampRampSvg({
  minPx,
  maxPx,
  minViewportPx,
  maxViewportPx,
  currentViewportPx,
}: {
  minPx: number;
  maxPx: number;
  minViewportPx: number;
  maxViewportPx: number;
  currentViewportPx: number;
}) {
  const w = 600;
  const h = 200;
  const padX = 36;
  const padY = 28;
  const x0 = Math.min(minViewportPx, 200);
  const x1 = Math.max(maxViewportPx, 1920);
  const xPx = (vp: number) => padX + ((vp - x0) / (x1 - x0)) * (w - 2 * padX);
  const sMin = Math.min(minPx, maxPx);
  const sMax = Math.max(minPx, maxPx);
  const sRange = sMax - sMin || 1;
  const yPx = (size: number) =>
    padY + (1 - (size - (sMin - sRange * 0.2)) / (sRange * 1.4)) * (h - 2 * padY);

  const leftX = xPx(minViewportPx);
  const rightX = xPx(maxViewportPx);
  const curX = xPx(currentViewportPx);
  const curSize = currentSizeAt(
    currentViewportPx,
    minPx,
    maxPx,
    minViewportPx,
    maxViewportPx,
  );

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      className="text-text-faint"
      role="img"
      aria-label="Fluid-type ramp visualisation"
    >
      <text x={4} y={yPx(minPx) + 4} fontSize="10" fill="currentColor" className="font-mono">
        {minPx}px
      </text>
      <text x={4} y={yPx(maxPx) + 4} fontSize="10" fill="currentColor" className="font-mono">
        {maxPx}px
      </text>

      <line
        x1={padX}
        x2={w - padX}
        y1={yPx(minPx)}
        y2={yPx(minPx)}
        stroke="currentColor"
        strokeDasharray="2 4"
        strokeWidth={0.5}
        opacity={0.4}
      />
      <line
        x1={padX}
        x2={w - padX}
        y1={yPx(maxPx)}
        y2={yPx(maxPx)}
        stroke="currentColor"
        strokeDasharray="2 4"
        strokeWidth={0.5}
        opacity={0.4}
      />

      <line
        x1={padX}
        x2={leftX}
        y1={yPx(minPx)}
        y2={yPx(minPx)}
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <line
        x1={leftX}
        x2={rightX}
        y1={yPx(minPx)}
        y2={yPx(maxPx)}
        stroke="var(--color-brand)"
        strokeWidth={2.5}
      />
      <line
        x1={rightX}
        x2={w - padX}
        y1={yPx(maxPx)}
        y2={yPx(maxPx)}
        stroke="currentColor"
        strokeWidth={1.5}
      />

      <circle cx={leftX} cy={yPx(minPx)} r={3} fill="currentColor" />
      <circle cx={rightX} cy={yPx(maxPx)} r={3} fill="currentColor" />

      <line
        x1={curX}
        x2={curX}
        y1={padY}
        y2={h - padY}
        stroke="var(--color-brand)"
        strokeDasharray="3 3"
        strokeWidth={1.5}
        opacity={0.7}
      />
      <circle
        cx={curX}
        cy={yPx(curSize)}
        r={5}
        fill="var(--color-brand)"
        stroke="var(--color-bg)"
        strokeWidth={2}
      />

      <text x={padX} y={h - 8} fontSize="10" fill="currentColor" className="font-mono">
        {x0}
      </text>
      <text
        x={leftX}
        y={h - 8}
        fontSize="10"
        fill="currentColor"
        className="font-mono"
        textAnchor="middle"
      >
        {minViewportPx}
      </text>
      <text
        x={rightX}
        y={h - 8}
        fontSize="10"
        fill="currentColor"
        className="font-mono"
        textAnchor="middle"
      >
        {maxViewportPx}
      </text>
      <text
        x={w - padX}
        y={h - 8}
        fontSize="10"
        fill="currentColor"
        className="font-mono"
        textAnchor="end"
      >
        {x1}
      </text>
    </svg>
  );
}

/** Computed font-size at a specific viewport, clamped to the plateaus. */
function currentSizeAt(
  vp: number,
  minPx: number,
  maxPx: number,
  minVp: number,
  maxVp: number,
): number {
  if (vp <= minVp) return minPx;
  if (vp >= maxVp) return maxPx;
  return minPx + ((vp - minVp) / (maxVp - minVp)) * (maxPx - minPx);
}
