"use client";

import { ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { parseHex, rgbToHex, type RGB } from "../color.lib";
import { cn } from "@/lib/cn";
import type { WcagResult } from "../color-converter.types";
import { SwatchChip, WcagBadge } from "./wcag-rating";

interface Props {
  rgb: RGB;
  bgRgb: RGB;
  wcag: WcagResult;
  onBgChange: (rgb: RGB) => void;
  onSwap: () => void;
}

const MAX_RATIO = 21;
const THRESHOLDS = [1, 3, 4.5, 7, 21];

function meterPct(r: number) {
  return Math.min(100, Math.max(0, ((r - 1) / (MAX_RATIO - 1)) * 100));
}

function ratioLevel(r: number): "fail" | "large" | "aa" | "aaa" {
  if (r >= 7)   return "aaa";
  if (r >= 4.5) return "aa";
  if (r >= 3)   return "large";
  return "fail";
}

const LEVEL_FILL: Record<string, string> = {
  fail:  "bg-danger",
  large: "bg-warning",
  aa:    "bg-success",
  aaa:   "bg-success",
};
const LEVEL_TEXT: Record<string, string> = {
  fail:  "text-danger",
  large: "text-warning",
  aa:    "text-success",
  aaa:   "text-success",
};
const LEVEL_PILL: Record<string, string> = {
  fail:  "bg-danger/15 text-danger",
  large: "bg-warning/15 text-warning",
  aa:    "bg-success/15 text-success",
  aaa:   "bg-success/15 text-success",
};

export function WcagPanel({ rgb, bgRgb, wcag, onBgChange, onSwap }: Props) {
  const fgHex = rgbToHex(rgb);
  const bgHex = rgbToHex(bgRgb);
  const shortFg = fgHex.length === 9 ? fgHex.slice(0, 7) : fgHex;
  const shortBg = bgHex.length === 9 ? bgHex.slice(0, 7) : bgHex;
  const level = ratioLevel(wcag.ratio);
  const pillLabel =
    level === "fail" ? "FAIL"
      : level === "large" ? "AA LARGE"
      : level === "aa" ? "AA PASS"
      : "AAA PASS";

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-2">
        <span className="text-sm font-bold uppercase tracking-eyebrow text-text-faint">
          Contrast check
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 text-[11px] font-medium text-text-muted transition-colors hover:text-text cursor-pointer"
          aria-label="Expand contrast view"
        >
          <ArrowUpRight size={11} aria-hidden />
          Expand
        </button>
      </div>

      <div className="p-3 flex flex-col gap-3">

        {/* ── FG / BG chips + swap ──────────────────────── */}
        <div className="flex items-stretch gap-1.5">
          <SwatchChip label="Foreground" hex={shortFg} />
          <button
            type="button"
            onClick={onSwap}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-md border border-border-subtle text-text-muted hover:bg-surface-soft hover:text-text transition-colors cursor-pointer"
            aria-label="Swap foreground and background"
          >
            <ArrowLeftRight size={13} />
          </button>
          <SwatchChip
            label="Background"
            hex={shortBg}
            editable
            onChange={(hex) => { const p = parseHex(hex); if (p) onBgChange({ ...p, a: 1 }); }}
          />
        </div>

        {/* ── Live text preview ────────────────────────── */}
        <div
          className="rounded-md overflow-hidden border border-black/5 px-3 py-2.5"
          style={{ background: bgHex, color: fgHex }}
        >
          <p className="text-2xl font-bold leading-none">Aa</p>
          <p className="text-[12.5px] font-medium mt-1.5 leading-tight">The quick brown fox</p>
          <p className="text-[11px] mt-0.5 leading-tight opacity-75">Small body text · 12px</p>
        </div>

        {/* ── Ratio + pill ─────────────────────────────── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1">
            <span className={cn("text-2xl font-bold font-mono tabular-nums leading-none", LEVEL_TEXT[level])}>
              {wcag.ratio.toFixed(2)}
            </span>
            <span className="text-[11px] text-text-muted">:1</span>
          </div>
          <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", LEVEL_PILL[level])}>
            {pillLabel}
          </span>
        </div>

        {/* ── Meter rail + scale ───────────────────────── */}
        <div className="flex flex-col gap-1">
          <div className="relative h-1.5 rounded-full bg-surface-soft border border-border-subtle/60 overflow-visible">
            <div
              className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-300", LEVEL_FILL[level])}
              style={{ width: `${meterPct(wcag.ratio)}%`, opacity: 0.85 }}
            />
            {THRESHOLDS.slice(1, -1).map((r) => (
              <div
                key={r}
                className="absolute top-0 bottom-0 w-px bg-border-strong/50"
                style={{ left: `${meterPct(r)}%` }}
              />
            ))}
          </div>
          <div className="relative h-3">
            {THRESHOLDS.map((r, i) => (
              <span
                key={r}
                className={cn(
                  "absolute text-[10px] text-text-muted",
                  i === 0 && "left-0",
                  i === THRESHOLDS.length - 1 && "right-0",
                )}
                style={
                  i === 0 || i === THRESHOLDS.length - 1
                    ? undefined
                    : { left: `${meterPct(r)}%`, transform: "translateX(-50%)" }
                }
              >
                {r === 1 ? "1:1" : r === 21 ? "21:1" : r}
              </span>
            ))}
          </div>
        </div>

        {/* ── Pass / fail grid ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-1.5">
          <WcagBadge standard="AA"  desc="body"  min="4.5:1" passes={wcag.aa} />
          <WcagBadge standard="AA"  desc="large" min="3:1"   passes={wcag.aaLarge} />
          <WcagBadge standard="AAA" desc="body"  min="7:1"   passes={wcag.aaa} />
          <WcagBadge standard="AAA" desc="large" min="4.5:1" passes={wcag.aaaLarge} />
        </div>

      </div>
    </div>
  );
}
