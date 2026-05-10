"use client";

import { ArrowLeftRight } from "lucide-react";
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
const THRESHOLDS = [
  { r: 3,   label: "3" },
  { r: 4.5, label: "4.5" },
  { r: 7,   label: "7" },
];

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

export function WcagPanel({ rgb, bgRgb, wcag, onBgChange, onSwap }: Props) {
  const fgHex = rgbToHex(rgb);
  const bgHex = rgbToHex(bgRgb);
  const shortFg = fgHex.length === 9 ? fgHex.slice(0, 7) : fgHex;
  const shortBg = bgHex.length === 9 ? bgHex.slice(0, 7) : bgHex;
  const level = ratioLevel(wcag.ratio);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border-subtle">
        <span className="text-sm font-bold uppercase tracking-eyebrow text-text-faint">
          WCAG Contrast
        </span>
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* ── FG / BG chips + swap ──────────────────────── */}
        <div className="flex items-stretch gap-2">
          <SwatchChip label="Foreground" hex={shortFg} />
          <button
            type="button"
            onClick={onSwap}
            className="flex h-auto w-8 shrink-0 items-center justify-center self-stretch rounded-lg border border-border text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
            aria-label="Swap foreground and background"
          >
            <ArrowLeftRight size={15} />
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
          className="rounded-lg overflow-hidden select-none"
          style={{ background: bgHex, color: fgHex }}
        >
          <div className="px-4 py-3 border border-black/5 rounded-lg">
            <p className="text-xl font-bold leading-tight">Aa</p>
            <p className="text-sm font-medium mt-0.5">The quick brown fox jumps</p>
            <p className="text-sm mt-0.5 opacity-75">Small body text · 12px</p>
          </div>
        </div>

        {/* ── Ratio + meter ────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className={cn("text-3xl font-bold font-mono tabular-nums leading-none", LEVEL_TEXT[level])}>
              {wcag.ratio.toFixed(2)}
            </span>
            <span className="text-sm text-text-faint">:1</span>
            <span className={cn("ml-auto text-sm font-semibold uppercase tracking-wide", LEVEL_TEXT[level])}>
              {level === "fail" ? "Fail" : level === "large" ? "AA Large" : level === "aa" ? "AA Pass" : "AAA Pass"}
            </span>
          </div>

          {/* Meter rail */}
          <div className="relative h-2 rounded-full bg-surface-soft border border-border-subtle overflow-visible">
            {/* Fill */}
            <div
              className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-300", LEVEL_FILL[level])}
              style={{ width: `${meterPct(wcag.ratio)}%`, opacity: 0.8 }}
            />
            {/* Threshold ticks */}
            {THRESHOLDS.map(({ r }) => (
              <div
                key={r}
                className="absolute top-0 bottom-0 w-px bg-border-strong/60"
                style={{ left: `${meterPct(r)}%` }}
              />
            ))}
          </div>

          {/* Scale labels */}
          <div className="relative h-4">
            <span className="absolute left-0 text-sm text-text-faint">1:1</span>
            {THRESHOLDS.map(({ r, label }) => (
              <span
                key={r}
                className="absolute text-sm text-text-faint -translate-x-1/2"
                style={{ left: `${meterPct(r)}%` }}
              >
                {label}
              </span>
            ))}
            <span className="absolute right-0 text-sm text-text-faint">21:1</span>
          </div>
        </div>

        {/* ── Pass / fail grid ─────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <WcagBadge standard="AA"  desc="Normal text"  min="4.5:1" passes={wcag.aa} />
          <WcagBadge standard="AA"  desc="Large / UI"   min="3:1"   passes={wcag.aaLarge} />
          <WcagBadge standard="AAA" desc="Normal text"  min="7:1"   passes={wcag.aaa} />
          <WcagBadge standard="AAA" desc="Large / UI"   min="4.5:1" passes={wcag.aaaLarge} />
        </div>

      </div>
    </div>
  );
}

