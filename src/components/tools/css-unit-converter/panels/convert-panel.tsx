"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import {
  ALL_SCALES,
  convert,
  format,
  formatWithUnit,
  fromPx,
  gridAlignment,
  isClean,
  LENGTH_UNITS,
  REFERENCE_PX_VALUES,
  snapToScale,
  TAILWIND_SPACING,
  type ConversionContext,
  type LengthUnit,
  type ScaleMatch,
} from "../css-unit-converter.lib";
import type { AliasPair } from "../use-css-unit-converter";

/**
 * Convert tab — the canonical "type a value, see everything" surface. Owns
 * its own input state (value + unit); the shared base/viewport/precision
 * come in via `ctx` from the parent hook. When the page was reached via an
 * alias slug like `px-to-rem-converter`, the `alias` prop seeds the input
 * so the answer is on-screen the moment the page loads.
 */
export function ConvertPanel({
  ctx,
  alias,
}: {
  ctx: ConversionContext;
  alias: AliasPair | null;
}) {
  // When landed via an alias slug, pre-select the input unit so the page
  // resolves immediately to the search query. Sample value: 16 for px (the
  // most canonical fixture), 1 for rem/em — values that look natural in
  // the hero and produce clean primary results.
  const initialUnit = alias?.from ?? "px";
  const initialValue = initialUnit === "px" ? "16" : "1";
  const [inputValue, setInputValue] = useState(initialValue);
  const [inputUnit, setInputUnit] = useState<LengthUnit>(initialUnit);
  const value = parseFloat(inputValue);
  const valid = Number.isFinite(value);
  const valuePx = valid ? convert(value, inputUnit, "px", ctx) : NaN;

  // Primary translation defaults to alias.to when set, otherwise the
  // sensible fallback (rem when input is px, px otherwise).
  const primaryUnit: LengthUnit =
    alias?.to ?? (inputUnit === "px" ? "rem" : "px");
  const primaryValue = valid ? fromPx(valuePx, primaryUnit, ctx) : NaN;

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!valid) return;
    const factor = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setInputValue(format(value + factor, ctx.precision));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setInputValue(format(value - factor, ctx.precision));
    }
  };

  const copy = (text: string, label?: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(label ? `Copied ${label}` : `Copied ${text}`);
  };

  const grid = valid ? gridAlignment(valuePx) : 0;
  const tailwindMatch = valid ? snapToScale(valuePx, TAILWIND_SPACING) : null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* MAIN — hero + conversions */}
      <div className="flex min-w-0 flex-col gap-8">
        {/* Hero */}
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <input
              id="css-value"
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={onInputKey}
              autoFocus
              className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-[56px] font-light tracking-tight text-text caret-brand outline-none focus:ring-0"
              aria-label="Value to convert"
              style={{ width: `${Math.max(2, inputValue.length)}ch` }}
            />
            <UnitSelector value={inputUnit} onChange={setInputUnit} />
          </div>

          <div className="h-px w-full bg-border-subtle" />

          {/* Primary result */}
          <button
            type="button"
            onClick={() =>
              valid &&
              copy(formatWithUnit(primaryValue, primaryUnit, ctx.precision))
            }
            disabled={!valid}
            className={cn(
              "group flex items-baseline justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-5 text-left transition-colors",
              "hover:border-brand/40 hover:bg-surface-2",
              "disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-surface",
            )}
          >
            <span className="font-mono text-[40px] font-light leading-none text-text">
              {valid ? format(primaryValue, ctx.precision) : "—"}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-[15px] uppercase tracking-[0.14em] text-text-muted">
                {primaryUnit}
              </span>
              <Copy
                size={14}
                className="text-text-faint opacity-0 transition-opacity group-hover:opacity-100"
              />
            </span>
          </button>

          {/* Honest math line */}
          {valid && (
            <p className="text-xs-plus font-mono text-text-faint">
              <span>{format(value, ctx.precision)}{inputUnit}</span>
              <span className="mx-2 text-text-muted">
                {inputUnit === "px" ? "÷" : "×"}
              </span>
              <span>{conversionFactor(inputUnit, primaryUnit, ctx)}</span>
              <span className="mx-2 text-text-muted">=</span>
              <span className="text-text-muted">
                {format(primaryValue, ctx.precision)}{primaryUnit}
              </span>
            </p>
          )}
        </div>

        {/* Dense conversion grid */}
        <section>
          <div className="mb-2.5 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-text">
              Also expressed as
            </h3>
            <span className="font-mono text-xs text-text-faint">
              base {ctx.baseFontSize}px
            </span>
          </div>
          <SecondaryUnitsGrid
            valuePx={valuePx}
            valid={valid}
            inputUnit={inputUnit}
            primaryUnit={primaryUnit}
            ctx={ctx}
            onCopy={copy}
          />
        </section>

        {/* Reference */}
        <section>
          <h3 className="mb-2.5 text-sm font-semibold text-text">
            Quick reference
          </h3>
          <div className="grid grid-cols-4 gap-1 rounded-xl border border-border bg-surface p-1.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9">
            {REFERENCE_PX_VALUES.map((px) => (
              <button
                key={px}
                type="button"
                onClick={() => {
                  setInputUnit("px");
                  setInputValue(String(px));
                }}
                className={cn(
                  "flex flex-col items-start rounded-md px-2 py-1.5 text-left transition-colors",
                  "hover:bg-surface-2",
                  inputUnit === "px" && value === px && "bg-surface-2 ring-1 ring-brand/40",
                )}
              >
                <span className="font-mono text-xs-plus text-text">{px}px</span>
                <span className="font-mono text-[10px] text-text-faint">
                  {format(fromPx(px, "rem", ctx), 2)}r
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* SIDE — scale insights */}
      <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[calc(var(--spacing-header)+1rem)] lg:self-start">
        <section>
          <h3 className="mb-2.5 text-sm font-semibold text-text">On scale</h3>
          <div className="flex flex-col divide-y divide-border-subtle overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs uppercase tracking-[0.14em] text-text-muted">
                Grid
              </span>
              {grid > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-success-bg px-2 py-0.5 text-xs font-medium text-success-text">
                  <Check size={11} />
                  {grid}px
                </span>
              ) : (
                <span className="text-xs text-text-faint">off grid</span>
              )}
            </div>

            {ALL_SCALES.map((scale) => {
              const m = valid ? snapToScale(valuePx, scale) : null;
              const showToken =
                scale.id === "tailwind"
                  ? `space-${m?.token.name}`
                  : m?.token.name;
              return (
                <div
                  key={scale.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-xs uppercase tracking-[0.14em] text-text-muted">
                    {scale.label}
                  </span>
                  <ScaleCell match={m} showToken={showToken ?? ""} valid={valid} />
                </div>
              );
            })}
          </div>
        </section>

        {valid && tailwindMatch?.exact && (
          <div className="rounded-xl border border-info-border bg-info-bg p-3">
            <div className="flex items-start gap-2.5">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-info" />
              <div className="text-xs leading-relaxed text-info-text">
                <span className="font-medium">Tailwind utility</span>
                <span className="ml-1 text-info-text/80">
                  — pick the matching family:
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono">
                  {["p", "m", "gap", "h", "w"].map((prefix) => (
                    <button
                      key={prefix}
                      type="button"
                      onClick={() =>
                        copy(
                          `${prefix}-${tailwindMatch.token.name}`,
                          `${prefix}-${tailwindMatch.token.name}`,
                        )
                      }
                      className="rounded-md border border-info-border/60 bg-info/10 px-1.5 py-0.5 text-xs-plus text-info-text transition-colors hover:bg-info/20"
                    >
                      {prefix}-{tailwindMatch.token.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs leading-relaxed text-text-faint">
          Press{" "}
          <kbd className="rounded border border-border bg-surface px-1 font-mono text-[10px]">↑</kbd>/
          <kbd className="rounded border border-border bg-surface px-1 font-mono text-[10px]">↓</kbd>{" "}
          to nudge,{" "}
          <kbd className="rounded border border-border bg-surface px-1 font-mono text-[10px]">⇧</kbd>
          +arrow for ×10.{" "}
          <kbd className="rounded border border-border bg-surface px-1 font-mono text-[10px]">⌘K</kbd>{" "}
          focuses the value.
        </p>
      </aside>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

/**
 * Dense responsive grid of secondary unit values. 2 columns on phone, 3 on
 * tablet, 4 on desktop. Each cell shows unit label + value tightly packed;
 * click copies the value.
 */
function SecondaryUnitsGrid({
  valuePx,
  valid,
  inputUnit,
  primaryUnit,
  ctx,
  onCopy,
}: {
  valuePx: number;
  valid: boolean;
  inputUnit: LengthUnit;
  primaryUnit: LengthUnit;
  ctx: ConversionContext;
  onCopy: (text: string, label?: string) => void;
}) {
  const cells = LENGTH_UNITS.filter((u) => u !== inputUnit && u !== primaryUnit);
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
      {cells.map((unit) => {
        const v = valid ? fromPx(valuePx, unit, ctx) : NaN;
        const clean = valid && isClean(v, ctx.precision);
        let meta: string | null = null;
        if (unit === "vw") meta = `@ ${ctx.viewportWidth}`;
        else if (unit === "vh") meta = `@ ${ctx.viewportHeight}`;
        return (
          <button
            key={unit}
            type="button"
            onClick={() =>
              valid && onCopy(formatWithUnit(v, unit, ctx.precision))
            }
            disabled={!valid}
            className={cn(
              "group flex flex-col items-start gap-0.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-left transition-colors",
              "hover:border-border-strong hover:bg-surface-2",
              "disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-surface",
            )}
            title={`Copy ${formatWithUnit(v, unit, ctx.precision)}`}
          >
            <div className="flex w-full items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
                {unit}
              </span>
              <div className="flex items-center gap-1">
                {valid && !clean && (
                  <span className="text-[10px] text-warning" title="Doesn't round cleanly">
                    ≈
                  </span>
                )}
                <Copy
                  size={11}
                  className="text-text-faint opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>
            </div>
            <span className="font-mono text-[15px] text-text tabular-nums">
              {valid ? format(v, ctx.precision) : "—"}
            </span>
            {meta && (
              <span className="font-mono text-[10px] text-text-faint">
                {meta}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Right-aligned scale-match badge for the "On scale" sidebar rows. */
function ScaleCell({
  match,
  showToken,
  valid,
}: {
  match: ScaleMatch | null;
  showToken: string;
  valid: boolean;
}) {
  if (!valid || !match) {
    return <span className="text-xs text-text-faint">—</span>;
  }
  if (match.exact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-success-bg px-2 py-0.5 text-xs font-medium text-success-text">
        <Check size={11} />
        {showToken}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
      <span className="font-mono">{showToken}</span>
      <span className="text-text-faint">~{format(match.token.px, 0)}px</span>
    </span>
  );
}

/** Quiet dropdown for selecting the input unit. */
function UnitSelector({
  value,
  onChange,
}: {
  value: LengthUnit;
  onChange: (u: LengthUnit) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 font-mono text-base text-text transition-colors hover:bg-surface-2"
          aria-label={`Unit (current: ${value})`}
        >
          {value}
          <ChevronDown size={12} className="text-text-faint" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Input unit</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LENGTH_UNITS.map((u) => (
          <DropdownMenuItem key={u} onClick={() => onChange(u)}>
            {value === u ? <Check size={12} /> : <span className="w-3" />}
            <span className="ml-1.5 font-mono">{u}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Display the conversion factor for the honest-math line. Direction-aware:
 * px → other shows the divisor; other → px shows the multiplier. Pure
 * display helper — never imported by the lib.
 */
function conversionFactor(
  from: LengthUnit,
  to: LengthUnit,
  ctx: ConversionContext,
): string {
  if (from === "px") {
    switch (to) {
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
  switch (from) {
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
  }
}
