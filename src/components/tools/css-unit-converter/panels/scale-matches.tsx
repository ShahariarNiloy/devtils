"use client";

import { Check } from "lucide-react";
import {
  ALL_SCALES,
  format,
  fromPx,
  gridAlignment,
  snapToScale,
  TAILWIND_SPACING,
  type ConversionContext,
  type LengthUnit,
  type ScaleMatch,
} from "../css-unit-converter.lib";

interface Props {
  value: number;
  from: LengthUnit;
  /** The unit the math line converts to (alias target, else rem / px). */
  to: LengthUnit;
  valuePx: number;
  ctx: ConversionContext;
  onCopy: (text: string) => void;
}

/**
 * Design-scale matches (⋯ menu): the honest math line, 4/8/16 grid fit,
 * nearest Tailwind / Bootstrap / MUI tokens and Tailwind utilities.
 */
export function ScaleMatches({ value, from, to, valuePx, ctx, onCopy }: Props) {
  const valid = Number.isFinite(valuePx);
  const grid = valid ? gridAlignment(valuePx) : 0;
  const tailwind = valid ? snapToScale(valuePx, TAILWIND_SPACING) : null;
  const target = valid ? fromPx(valuePx, to, ctx) : NaN;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-xs text-text-faint">Design-scale matches</div>
      {/* The factor is only meaningful when exactly one side is px. */}
      {valid && (from === "px") !== (to === "px") && (
        <p className="m-0 font-mono text-xs text-text-faint">
          {format(value, ctx.precision)}{from}
          <span className="mx-1.5 text-text-ghost">{from === "px" ? "÷" : "×"}</span>
          {conversionFactor(from === "px" ? to : from, ctx)}
          <span className="mx-1.5 text-text-ghost">=</span>
          <span className="text-text-muted">{format(target, ctx.precision)}{to}</span>
        </p>
      )}
      <div className="surface-panel flex flex-col divide-y divide-border-subtle overflow-hidden rounded-[11px]">
        <Row label="Grid">
          {grid > 0 ? <Badge>{grid}px grid</Badge> : <span className="text-xs text-text-faint">off grid</span>}
        </Row>
        {ALL_SCALES.map((scale) => {
          const m = valid ? snapToScale(valuePx, scale) : null;
          const token = scale.id === "tailwind" ? `space-${m?.token.name ?? ""}` : (m?.token.name ?? "");
          return (
            <Row key={scale.id} label={scale.label}>
              <ScaleCell match={m} token={token} />
            </Row>
          );
        })}
      </div>
      {tailwind?.exact && (
        <div className="flex flex-wrap gap-1.5 font-mono">
          {["p", "m", "gap", "h", "w"].map((prefix) => {
            const cls = `${prefix}-${tailwind.token.name}`;
            return (
              <button
                key={prefix}
                type="button"
                onClick={() => onCopy(cls)}
                className="min-h-8 rounded-lg border border-border px-2 text-xs text-text-tertiary transition-colors hover:bg-white/6 hover:text-text"
              >
                {cls}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 px-3 py-2">
      <span className="text-xs text-text-faint">{label}</span>
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-success-bg px-2 py-0.5 text-xs font-medium text-success-text">
      <Check size={11} aria-hidden />
      {children}
    </span>
  );
}

function ScaleCell({ match, token }: { match: ScaleMatch | null; token: string }) {
  if (!match) return <span className="text-xs text-text-faint">—</span>;
  if (match.exact) return <Badge>{token}</Badge>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
      <span className="font-mono">{token}</span>
      <span className="text-text-faint">~{format(match.token.px, 0)}px</span>
    </span>
  );
}

/** The factor between px and `unit`, as shown in the math line. */
function conversionFactor(unit: LengthUnit, ctx: ConversionContext): string {
  switch (unit) {
    case "rem":
    case "em":
      return `${ctx.baseFontSize}`;
    case "%":
      return `${ctx.baseFontSize}/100`;
    case "pt":
      return "96/72";
    case "pc":
      return "16";
    case "in":
      return "96";
    case "cm":
      return "96/2.54";
    case "mm":
      return "96/25.4";
    case "vw":
      return `${ctx.viewportWidth}/100`;
    case "vh":
      return `${ctx.viewportHeight}/100`;
    case "px":
      return "1";
  }
}
