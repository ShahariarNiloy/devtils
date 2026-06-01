"use client";

import { ChevronDown } from "lucide-react";
import { Input } from "@/components/primitives/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/primitives/popover";
import { cn } from "@/lib/cn";

const BASE_PRESETS = [10, 12, 14, 16, 18, 20] as const;

/** Common named bases — labels make the dropdown self-documenting. */
const BASE_PRESET_DETAILS: Record<number, string> = {
  10: "10px shortcut (62.5%)",
  12: "Small",
  14: "Compact",
  16: "Browser default",
  18: "Large",
  20: "Extra large",
};

/**
 * Dedicated picker for the root font-size — the single most impactful
 * setting in the tool. Surfaced as its own chip in the header so the
 * current base is always visible. The visual ruler underneath shows the
 * literal pixel extent of 1rem at the current base, which is the
 * conversion factor everything else hangs on.
 */
export function BasePopover({
  baseFontSize,
  onBaseFontSize,
}: {
  baseFontSize: number;
  onBaseFontSize: (n: number) => void;
}) {
  const detail = BASE_PRESET_DETAILS[baseFontSize];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs-plus text-text transition-colors hover:bg-surface-2"
          aria-label="Root font-size"
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-brand" aria-hidden />
          <span className="font-medium">1rem</span>
          <span className="text-text-faint">=</span>
          <span className="font-mono">{baseFontSize}px</span>
          <ChevronDown
            size={12}
            className="text-text-faint transition-colors group-hover:text-text-muted"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px]">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
                Root font-size
              </span>
              {detail && (
                <span className="text-xs text-text-faint">{detail}</span>
              )}
            </div>
            <div className="mt-2 grid grid-cols-6 gap-1 rounded-lg border border-border bg-surface p-0.5">
              {BASE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onBaseFontSize(p)}
                  className={cn(
                    "h-8 rounded-md text-sm font-medium font-mono transition-colors",
                    baseFontSize === p
                      ? "bg-brand text-bg shadow-sm"
                      : "text-text-muted hover:bg-surface-2 hover:text-text",
                  )}
                  aria-label={`Set base ${p}px`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  min={1}
                  max={200}
                  step={0.5}
                  value={baseFontSize}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    if (Number.isFinite(n) && n > 0 && n <= 200) onBaseFontSize(n);
                  }}
                  className="h-9 pr-8 font-mono text-sm"
                  aria-label="Custom base font-size"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-faint">
                  px
                </span>
              </div>
              <button
                type="button"
                onClick={() => onBaseFontSize(16)}
                className="inline-flex h-9 items-center rounded-md px-2.5 text-xs text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
                disabled={baseFontSize === 16}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Visual ruler — literal pixel extent of 1rem at this base */}
          <div className="rounded-lg border border-border-subtle bg-surface-2/40 px-3 py-3">
            <div className="flex items-end justify-between">
              <span className="text-xs text-text-muted">1rem in pixels</span>
              <span className="font-mono text-xs text-text-faint">
                {baseFontSize}px wide
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-[10px] text-text-faint">0</span>
              <div
                className="h-1.5 rounded-full bg-brand"
                style={{ width: `${Math.min(baseFontSize, 280)}px` }}
                aria-hidden
              />
              <span className="font-mono text-[10px] text-text-faint">
                {baseFontSize}px
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-text-faint">
              Set this to match{" "}
              <code className="font-mono text-text-muted">:root</code> or{" "}
              <code className="font-mono text-text-muted">html</code> in your
              stylesheet.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
