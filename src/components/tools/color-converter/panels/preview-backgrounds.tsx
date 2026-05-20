"use client";

import { cn } from "@/lib/cn";
import { rgbToHex, type RGB } from "../color.lib";

interface Props {
  fgRgb: RGB;
  bgRgb: RGB;
  onBgChange: (rgb: RGB) => void;
}

const CHECKER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Crect width='5' height='5' fill='%23d4cebd'/%3E%3Crect x='5' y='5' width='5' height='5' fill='%23d4cebd'/%3E%3Crect x='5' width='5' height='5' fill='%23efe9d6'/%3E%3Crect y='5' width='5' height='5' fill='%23efe9d6'/%3E%3C/svg%3E\")";

const SWATCHES: Array<{
  key: string;
  label: string;
  rgb: RGB;
  checker?: boolean;
}> = [
  { key: "white", label: "White", rgb: { r: 255, g: 255, b: 255, a: 1 } },
  { key: "cream", label: "Cream", rgb: { r: 251, g: 250, b: 245, a: 1 } },
  { key: "dark",  label: "Dark",  rgb: { r: 26,  g: 26,  b: 24,  a: 1 } },
  // Trans uses a mid-warm-gray for the actual WCAG bg, while the visual
  // shows a checker pattern. Honest about the tradeoff: the contrast
  // number is computed against the gray, not real transparency.
  { key: "trans", label: "Trans", rgb: { r: 211, g: 204, b: 188, a: 1 }, checker: true },
];

export function PreviewBackgrounds({ fgRgb, bgRgb, onBgChange }: Props) {
  const fgHex = rgbToHex(fgRgb);
  const bgHex = rgbToHex(bgRgb).slice(0, 7);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border-subtle">
        <span className="text-sm font-bold uppercase tracking-eyebrow text-text-faint">
          Preview on backgrounds
        </span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-2">
          {SWATCHES.map((s) => {
            const sHex = rgbToHex(s.rgb).slice(0, 7);
            const isActive = sHex.toLowerCase() === bgHex.toLowerCase();
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => onBgChange(s.rgb)}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-lg border transition-all cursor-pointer",
                  isActive
                    ? "border-brand ring-2 ring-brand/30"
                    : "border-border-subtle hover:border-border-strong",
                )}
                style={
                  s.checker
                    ? { backgroundImage: CHECKER, backgroundSize: "10px 10px" }
                    : { background: sHex }
                }
                aria-label={`Preview on ${s.label}`}
                title={s.label}
              >
                <span
                  className="absolute inset-0 flex items-center justify-center text-base font-bold"
                  style={{ color: fgHex }}
                >
                  Aa
                </span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {SWATCHES.map((s) => (
            <span
              key={s.key}
              className="text-center text-[10px] font-medium uppercase tracking-wider text-text-muted"
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
