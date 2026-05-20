"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { rgbToOklch } from "../color.lib";
import { getTextOnColor } from "../color-converter.lib";
import type { ShadeEntry } from "../color-converter.types";

interface Props {
  shades: ShadeEntry[];
}

export function ShadesPanel({ shades }: Props) {
  const copyRamp = async () => {
    const css = shades.map((s) => `--color-${s.stop}: ${s.hex};`).join("\n");
    await navigator.clipboard.writeText(css);
    toast.success("Copied ramp as CSS vars");
  };

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border-subtle px-4 py-2.5">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <span className="text-sm font-bold uppercase tracking-eyebrow text-text-faint shrink-0">
            Color ramp
          </span>
          <span className="text-[11px] text-text-muted truncate">
            Auto-generated 50–900 scale · click a stop to copy
          </span>
        </div>
        <button
          type="button"
          onClick={copyRamp}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border-subtle bg-surface-soft px-2 text-[11px] font-medium text-text-muted hover:text-text hover:bg-bg transition-colors cursor-pointer"
        >
          <Copy size={11} aria-hidden />
          Copy ramp
        </button>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 p-2">
        {shades.map(({ stop, rgb, hex }) => {
          const textColor = getTextOnColor(rgb);
          const lPct = Math.round(rgbToOklch(rgb).l * 100);
          return (
            <button
              key={stop}
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(hex);
                toast.success(`Copied ${hex.toUpperCase()}`);
              }}
              className="relative flex aspect-[3/4] flex-col justify-between rounded-md p-2 text-left transition-opacity hover:opacity-95 cursor-pointer"
              style={{ background: hex }}
              aria-label={`Shade ${stop}: ${hex}`}
              title={`${hex.toUpperCase()} · ${lPct}% L`}
            >
              <span
                className="text-sm font-bold leading-none"
                style={{ color: textColor }}
              >
                {stop}
              </span>
              <div className="flex flex-col gap-0.5" style={{ color: textColor }}>
                <span className="font-mono text-[10px] font-medium leading-none opacity-90">
                  {hex.toUpperCase()}
                </span>
                <span className="font-mono text-[10px] leading-none opacity-70">
                  {lPct}% L
                </span>
              </div>
            </button>
          );
        })}

      </div>
    </div>
  );
}
