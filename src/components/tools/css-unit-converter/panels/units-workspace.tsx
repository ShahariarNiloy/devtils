"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import {
  format,
  fromPx,
  isClean,
  REM_TABLE_PX,
  UNIT_NOTES,
  type ConversionContext,
  type LengthUnit,
} from "../css-unit-converter.lib";
import type { ContextField, TabKey } from "../use-css-unit-converter";

/** Copy + a short-lived "Copied" flag keyed by whatever was clicked. */
export function useCopied() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = useCallback((key: string, text: string) => {
    void navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(key);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 1400);
  }, []);
  return { copied, copy };
}

// ── Toolbar: value + from-unit segments ────────────────────────────

interface ValueToolbarProps {
  valueText: string;
  onValueText: (s: string) => void;
  invalid: boolean;
  units: readonly LengthUnit[];
  from: LengthUnit;
  onFrom: (u: LengthUnit) => void;
  onNudge: (delta: number) => void;
  menu: React.ReactNode;
}

export const ValueToolbar = forwardRef<HTMLInputElement, ValueToolbarProps>(function ValueToolbar(
  { valueText, onValueText, invalid, units, from, onFrom, onNudge, menu },
  ref,
) {
  return (
    <div className="flex flex-wrap items-end gap-2.5 border-b border-border-subtle bg-toolbar p-3.5">
      <label
        className={cn(
          "flex min-w-0 flex-[1_1_180px] flex-col gap-1 rounded-[11px] border bg-[#0d0d0c] px-3 py-2 transition-colors focus-within:border-clay-light/50",
          invalid ? "border-error-border" : "border-white/10",
        )}
      >
        <span className="text-[11px] font-bold text-text-faint">Value</span>
        <input
          ref={ref}
          id="css-value"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={valueText}
          aria-invalid={invalid}
          onChange={(e) => onValueText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            onNudge(e.key === "ArrowUp" ? step : -step);
          }}
          className="min-h-[34px] min-w-0 border-0 bg-transparent font-mono text-[22px] font-medium text-text outline-none"
        />
      </label>
      {/* Phone: ⋯ sits beside the value so the unit row gets full width. */}
      <div className="flex sm:order-last">{menu}</div>
      <div
        role="group"
        aria-label="From unit"
        className="grid min-w-0 flex-[2_1_320px] grid-cols-7 gap-1 rounded-[11px] border border-border-subtle bg-[#0d0d0c] p-[3px]"
      >
        {units.map((u) => {
          const on = u === from;
          return (
            <button
              key={u}
              type="button"
              aria-pressed={on}
              onClick={() => onFrom(u)}
              className={cn(
                "min-h-11 min-w-0 rounded-lg font-mono text-[13px] font-medium transition-colors",
                on
                  ? "bg-selected text-text shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
                  : "text-text-tertiary hover:bg-white/6 hover:text-text",
              )}
            >
              {u}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ── Context row: root font, viewport W/H ───────────────────────────

export function ContextRow({ fields }: { fields: { label: string; field: ContextField }[] }) {
  return (
    <div className="flex flex-wrap gap-2.5 border-b border-border-subtle px-3.5 py-3">
      {fields.map(({ label, field }) => (
        <label
          key={label}
          className={cn(
            "flex min-h-11 min-w-0 flex-[1_1_140px] items-center gap-2 rounded-[10px] border px-3 text-xs text-text-faint transition-colors focus-within:border-clay-light/50",
            field.invalid ? "border-error-border" : "border-border",
          )}
        >
          {label}
          <input
            type="text"
            inputMode="decimal"
            value={field.text}
            aria-invalid={field.invalid}
            onChange={(e) => field.setText(e.target.value)}
            className="min-w-0 grow border-0 bg-transparent text-right font-mono text-sm text-text outline-none"
          />
          <span className="font-mono text-text-faint">px</span>
        </label>
      ))}
    </div>
  );
}

// ── Results grid ───────────────────────────────────────────────────

interface ResultsGridProps {
  units: readonly LengthUnit[];
  valuePx: number;
  highlight: LengthUnit;
  ctx: ConversionContext;
}

export function ResultsGrid({ units, valuePx, highlight, ctx }: ResultsGridProps) {
  const { copied, copy } = useCopied();
  const valid = Number.isFinite(valuePx);
  return (
    <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] content-start gap-2 border-b border-border-subtle p-3 md:flex-[1.4_1_380px] md:border-r md:border-b-0">
      {units.map((u) => {
        const v = valid ? fromPx(valuePx, u, ctx) : NaN;
        const css = valid ? `${format(v, ctx.precision)}${u}` : "—";
        const on = u === highlight;
        const isCopied = copied === u;
        // Honest rounding: say so when the shown value isn't exact.
        const note = isCopied ? "Copied" : `${UNIT_NOTES[u]}${valid && !isClean(v, ctx.precision) ? " · rounded" : ""}`;
        return (
          <button
            key={u}
            type="button"
            disabled={!valid}
            onClick={() => copy(u, css)}
            aria-label={`Copy ${css}`}
            className={cn(
              "flex min-w-0 flex-col items-start gap-1 rounded-xl border p-3.5 text-left text-text transition-colors disabled:cursor-not-allowed",
              on ? "border-clay-light/40 bg-clay-light/8" : "border-white/7 bg-surface enabled:hover:border-border-strong",
            )}
          >
            <span className="text-[11px] font-bold text-text-faint">{u.toUpperCase()}</span>
            <span className="font-mono text-[20px] font-medium break-all">{css}</span>
            <span className={cn("text-[11px]", isCopied ? "text-success-text" : "text-text-faint")}>{note}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── px → rem quick table ───────────────────────────────────────────

interface RemTableProps {
  ctx: ConversionContext;
  activePx: number | null;
  onPick: (px: number) => void;
  children?: React.ReactNode;
}

export function RemTable({ ctx, activePx, onPick, children }: RemTableProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4 p-3.5 md:flex-[1_1_260px]">
      <div>
        <div className="mb-2 text-xs text-text-faint">px → rem at {format(ctx.baseFontSize, 4)}px</div>
        <div className="grid grid-cols-2 gap-1">
          {REM_TABLE_PX.map((px) => (
            <button
              key={px}
              type="button"
              onClick={() => onPick(px)}
              aria-pressed={activePx === px}
              className={cn(
                "flex min-h-10 items-center justify-between rounded-[9px] border bg-white/2 px-3 font-mono text-[13px] text-text-key transition-colors hover:bg-white/5",
                activePx === px ? "border-clay-light/40" : "border-border-subtle",
              )}
            >
              <span>{px}px</span>
              <span className="text-clay-light">{format(fromPx(px, "rem", ctx), 4)}rem</span>
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── ⋯ menu ─────────────────────────────────────────────────────────

const MODES: { id: TabKey; label: string }[] = [
  { id: "convert", label: "Convert a value" },
  { id: "bulk", label: "Bulk-convert a stylesheet" },
  { id: "clamp", label: "Build a fluid clamp()" },
];

const BASE_PRESETS: { px: number; label: string }[] = [
  { px: 10, label: "10px · 62.5% shortcut" },
  { px: 12, label: "12px" },
  { px: 14, label: "14px" },
  { px: 16, label: "16px · browser default" },
  { px: 18, label: "18px" },
  { px: 20, label: "20px" },
];

interface MoreMenuProps {
  tab: TabKey;
  onTab: (t: TabKey) => void;
  showPrint: boolean;
  onShowPrint: (v: boolean) => void;
  showScales: boolean;
  onShowScales: (v: boolean) => void;
  baseFontSize: number;
  onBase: (n: number) => void;
  precision: number;
  onPrecision: (n: number) => void;
  onShare: () => void;
  className?: string;
}

export function MoreMenu(p: MoreMenuProps) {
  const keep = (e: Event) => e.preventDefault();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More unit tools"
          className={cn(
            "flex shrink-0 items-center justify-center rounded-[11px] border border-white/10 text-text-tertiary transition-colors hover:bg-white/6 hover:text-text",
            p.className,
          )}
        >
          <MoreHorizontal size={16} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] min-w-60 overflow-y-auto">
        <DropdownMenuLabel>Mode</DropdownMenuLabel>
        {MODES.map((m) => (
          <DropdownMenuCheckboxItem key={m.id} checked={p.tab === m.id} onCheckedChange={() => p.onTab(m.id)}>
            {m.label}
          </DropdownMenuCheckboxItem>
        ))}
        {p.tab === "convert" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Show</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={p.showPrint} onCheckedChange={(v) => p.onShowPrint(v === true)} onSelect={keep}>
              Print units (pc, in, cm, mm)
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={p.showScales} onCheckedChange={(v) => p.onShowScales(v === true)} onSelect={keep}>
              Design-scale matches
            </DropdownMenuCheckboxItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Root font</DropdownMenuLabel>
        {BASE_PRESETS.map((b) => (
          <DropdownMenuCheckboxItem key={b.px} checked={p.baseFontSize === b.px} onCheckedChange={() => p.onBase(b.px)}>
            {b.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Decimals</DropdownMenuLabel>
        {[2, 3, 4, 5, 6].map((n) => (
          <DropdownMenuCheckboxItem key={n} checked={p.precision === n} onCheckedChange={() => p.onPrecision(n)} onSelect={keep}>
            Up to {n}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={p.onShare}>Copy share link</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
