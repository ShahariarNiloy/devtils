"use client";

import { useMemo } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { rgbToHex } from "../color.lib";
import { getTextOnColor } from "../color-converter.lib";
import type { ShadeEntry, TailwindMatch } from "../color-converter.types";

interface Props {
  shades: ShadeEntry[];
  tailwind: TailwindMatch;
}

const STOPS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export function ShadesPanel({ shades, tailwind }: Props) {
  const twStop = useMemo(() => {
    const m = tailwind.name.match(/-(\d+)$/);
    if (!m) return null;
    const n = parseInt(m[1]);
    return STOPS.reduce((best, s) => Math.abs(s - n) < Math.abs(best - n) ? s : best);
  }, [tailwind.name]);

  const copyTailwind = async () => {
    await navigator.clipboard.writeText(tailwind.name);
    toast.success("Copied Tailwind class");
  };

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border-subtle flex items-center justify-between gap-3">
        <span className="text-sm font-bold uppercase tracking-eyebrow text-text-faint shrink-0">
          Shades
        </span>
        <button
          type="button"
          onClick={copyTailwind}
          className="group flex items-center gap-2 rounded-md border border-accent/30 bg-accent-soft/60 px-2.5 py-1.5 hover:bg-accent-soft hover:border-accent/50 transition-colors cursor-pointer"
          title={`Copy ${tailwind.name}`}
        >
          <span className="text-sm font-semibold text-accent leading-none shrink-0">
            Tailwind Nearest
          </span>
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10"
            style={{ background: rgbToHex(tailwind.swatch) }}
            aria-hidden
          />
          <span className="font-mono text-sm text-text-muted leading-none">{tailwind.name}</span>
          <Copy size={12} className="text-text-faint shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      <div className="flex">
        {shades.map(({ stop, rgb, hex }) => {
          const textColor = getTextOnColor(rgb);
          const isTw = twStop !== null && stop === twStop;
          return (
            <div
              key={stop}
              className="flex-1 flex flex-col items-center justify-end gap-1 py-3"
              style={{ background: hex }}
              aria-label={`Shade ${stop}: ${hex}`}
            >
              <span
                className="text-sm font-bold leading-none"
                style={{ color: textColor, opacity: isTw ? 1 : 0.75 }}
              >
                {stop}
              </span>
              {isTw && (
                <span className="text-sm leading-none opacity-70" style={{ color: textColor }}>
                  ★
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
