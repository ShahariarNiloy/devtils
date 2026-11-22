"use client";

import type { Dispatch, SetStateAction } from "react";
import { Switch } from "@/components/primitives/switch";
import { cn } from "@/lib/cn";
import { DEFAULT_ADJUST, type Adjustments, type FlattenBg, type Fmt, type Result, type Settings } from "../blur-placeholder.lib";
import { Chip, Seg } from "./ui";

const PRESETS: { label: string; size: number; saturation: number }[] = [
  { label: "Next.js · 8px", size: 8, saturation: 1.2 },
  { label: "Tiny · 4px", size: 4, saturation: 1.2 },
  { label: "Detailed · 24px", size: 24, saturation: 1 },
];

const FMTS: { id: Fmt; label: string }[] = [
  { id: "png", label: "PNG" },
  { id: "webp", label: "WebP" },
  { id: "jpeg", label: "JPEG" },
];

const ADJ: {
  key: keyof Adjustments;
  label: string;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
}[] = [
  { key: "brightness", label: "Brightness", min: 0.5, max: 1.5, step: 0.05, fmt: (v) => `${v.toFixed(2)}×` },
  { key: "saturation", label: "Saturation", min: 0, max: 2, step: 0.05, fmt: (v) => `${v.toFixed(2)}×` },
  { key: "hue", label: "Hue", min: -180, max: 180, step: 1, fmt: (v) => `${v > 0 ? "+" : ""}${v}°` },
  { key: "lightness", label: "Lightness", min: -30, max: 30, step: 1, fmt: (v) => `${v > 0 ? "+" : ""}${v}` },
];

const range = "w-full cursor-pointer accent-cat-clay max-sm:h-11";
const section = "flex flex-col border-t border-border-subtle px-3.5 py-3";
const stepBtn =
  "flex size-6 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-transparent text-text-tertiary hover:text-text max-sm:size-11";

function formatNote(fmt: Fmt, r: Result | null): { text: string; warn: boolean } {
  const len = r?.fmtLengths;
  const png = len?.png ?? 0;
  if (fmt === "png") return { text: "Exact colours. Works everywhere.", warn: false };
  const name = fmt === "webp" ? "WebP" : "JPEG";
  const mine = len?.[fmt];
  if (r && mine == null) return { text: `This browser can't make ${name} images, so you're getting PNG.`, warn: true };
  if (fmt === "webp") {
    if (mine != null && mine >= png) return { text: `At this size WebP is bigger than PNG (${mine} vs ${png} chars).`, warn: true };
    return { text: `Smallest${mine != null ? ` (${mine} chars)` : ""}, small colour shift.`, warn: false };
  }
  return {
    text: `${r?.alpha ? "No transparency, so it's filled. " : ""}Its headers make it the biggest at this size${mine != null ? ` (${mine} chars)` : ""}.`,
    warn: true,
  };
}

export function SettingsPanel({
  settings: s,
  setSettings,
  result,
}: {
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  result: Result | null;
}) {
  const set = (patch: Partial<Settings>) => setSettings((o) => ({ ...o, ...patch }));
  const anyChanged = ADJ.some((a) => s[a.key] !== DEFAULT_ADJUST[a.key]);
  const hasAlpha = result?.hasAlpha ?? false;
  const note = formatNote(s.fmt, result);
  const swatches: { id: FlattenBg; c: string; label: string }[] = [
    { id: "dark", c: "#0b0b0a", label: "Page" },
    { id: "white", c: "#ffffff", label: "White" },
    { id: "avg", c: result?.color ?? "#808080", label: "Average" },
  ];

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-white/7 [grid-area:set]">
      <div className="flex flex-col gap-2.5 p-3.5">
        <div className="flex items-baseline gap-2.5">
          <label htmlFor="bp-size" className="grow text-[13px] font-bold">
            Size
          </label>
          <span className="font-mono text-xs text-tier-pro-text">{s.size}px</span>
          <span className="font-mono text-xs text-text-faint">{result ? `${result.w} × ${result.h} px` : "—"}</span>
        </div>
        <input
          id="bp-size"
          type="range"
          min={4}
          max={64}
          step={1}
          value={s.size}
          onChange={(e) => set({ size: parseInt(e.target.value, 10) })}
          aria-label="Placeholder width in pixels"
          aria-valuetext={`${s.size} pixels wide`}
          className={range}
        />
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Chip
              key={p.label}
              filled={false}
              on={s.size === p.size && s.saturation === p.saturation}
              onClick={() => set({ size: p.size, saturation: p.saturation })}
            >
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className={cn(section, "gap-2")}>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="grow text-[13px] font-bold">Base64 format</span>
          <div role="group" aria-label="Image format" className="flex gap-0.5 rounded-lg bg-[#0d0d0c] p-0.5">
            {FMTS.map((f) => (
              <Seg key={f.id} on={s.fmt === f.id} onClick={() => set({ fmt: f.id })} className="min-h-7 rounded-md px-2.5 text-xs">
                {f.label}
                {result?.fmtLengths[f.id] != null && (
                  <>
                    <span aria-hidden className="ml-1.5 font-mono text-[10.5px] font-normal opacity-70">
                      {result.fmtLengths[f.id]}
                    </span>
                    <span className="sr-only">, {result.fmtLengths[f.id]} characters</span>
                  </>
                )}
              </Seg>
            ))}
          </div>
        </div>
        <span className={cn("text-xs", note.warn ? "text-warning-text" : "text-text-faint")}>{note.text}</span>
      </div>

      <div className={cn(section, "gap-2.5")}>
        <div className="flex items-center gap-2.5">
          <div className="flex grow flex-col">
            <span id="bp-flatten-label" className="text-[13px] font-bold">
              Fill transparent areas
            </span>
            <span className="text-xs text-text-faint">
              {hasAlpha ? "Off keeps the alpha channel." : "This image has no transparency."}
            </span>
          </div>
          <Switch
            checked={s.flatten}
            onCheckedChange={(v) => set({ flatten: v })}
            aria-labelledby="bp-flatten-label"
            className="before:absolute before:-inset-3 before:content-[''] data-[state=checked]:border-cat-clay data-[state=checked]:bg-cat-clay"
          />
        </div>
        {hasAlpha && s.flatten && (
          <div role="group" aria-label="Fill colour" className="flex gap-3">
            {swatches.map((w) => (
              <button
                key={w.id}
                type="button"
                aria-pressed={s.bg === w.id}
                onClick={() => set({ bg: w.id, flatten: true })}
                className="inline-flex min-h-7 cursor-pointer items-center gap-[7px] border-0 bg-transparent p-0 text-xs text-text-tertiary hover:text-text max-sm:min-h-11"
              >
                <span
                  className="size-4 rounded-[5px]"
                  style={{ background: w.c, boxShadow: `0 0 0 1.5px ${s.bg === w.id ? "#e0a072" : "rgba(255,255,255,.18)"}` }}
                />
                {w.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={cn(section, "gap-2.5")}>
        <div className="flex min-h-[26px] items-center">
          <span className="grow text-[13px] font-bold">Adjust</span>
          {anyChanged && (
            <button
              type="button"
              onClick={() => set(DEFAULT_ADJUST)}
              className="min-h-[26px] cursor-pointer rounded-md border-0 bg-transparent px-2 text-xs text-text-tertiary hover:text-text max-sm:min-h-11"
            >
              Reset all
            </button>
          )}
        </div>
        {ADJ.map((a) => {
          const v = s[a.key];
          const changed = v !== DEFAULT_ADJUST[a.key];
          return (
            <div key={a.key} className="grid grid-cols-[84px_minmax(0,1fr)_58px_22px] items-center gap-2 max-sm:grid-cols-[76px_minmax(0,1fr)_52px_44px]">
              <label htmlFor={`bp-${a.key}`} className="text-xs text-text-strong">
                {a.label}
              </label>
              <input
                id={`bp-${a.key}`}
                type="range"
                min={a.min}
                max={a.max}
                step={a.step}
                value={v}
                onChange={(e) => set({ [a.key]: parseFloat(e.target.value) })}
                aria-valuetext={a.fmt(v)}
                className={range}
              />
              <span className={cn("text-right font-mono text-[11px]", changed ? "text-tier-pro-text" : "text-text-faint")}>
                {a.fmt(v)}
              </span>
              {changed ? (
                <button
                  type="button"
                  onClick={() => set({ [a.key]: DEFAULT_ADJUST[a.key] })}
                  aria-label={`Reset ${a.label}`}
                  className="flex size-[22px] cursor-pointer items-center justify-center rounded-md border-0 bg-transparent p-0 text-[13px] text-text-faint hover:text-text max-sm:size-11"
                >
                  ↺
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-border-subtle bg-surface px-3.5 py-3">
        <div className="flex min-w-[180px] grow basis-0 flex-col">
          <span className="text-[13px] font-bold">BlurHash detail</span>
          <span className="text-xs text-text-faint">More components = more detail, longer hash</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-xs" role="group" aria-label="BlurHash components">
          <button type="button" onClick={() => set({ bx: Math.max(1, s.bx - 1) })} disabled={s.bx <= 1} aria-label="Fewer horizontal components" className={stepBtn}>
            −
          </button>
          <span className="min-w-3.5 text-center" aria-live="polite" aria-label={`${s.bx} horizontal`}>
            {s.bx}
          </span>
          <button type="button" onClick={() => set({ bx: Math.min(9, s.bx + 1) })} disabled={s.bx >= 9} aria-label="More horizontal components" className={stepBtn}>
            +
          </button>
          <span className="px-1 text-text-ghost" aria-hidden>
            ×
          </span>
          <button type="button" onClick={() => set({ by: Math.max(1, s.by - 1) })} disabled={s.by <= 1} aria-label="Fewer vertical components" className={stepBtn}>
            −
          </button>
          <span className="min-w-3.5 text-center" aria-live="polite" aria-label={`${s.by} vertical`}>
            {s.by}
          </span>
          <button type="button" onClick={() => set({ by: Math.min(9, s.by + 1) })} disabled={s.by >= 9} aria-label="More vertical components" className={stepBtn}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}
