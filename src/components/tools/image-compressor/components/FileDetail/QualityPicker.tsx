"use client";

import { cn } from "@/lib/cn";
import { QUALITY_MODE_DEFS } from "../../image-compressor.modes";
import type { QualityMode } from "../../image-compressor.types";

const SIMPLE_MODES = ["maximum", "high", "small"] as const;

// ── Quality pills (spaced, individually bordered) ──────────────
export function QualityPicker({
  value,
  onChange,
}: {
  value: QualityMode;
  onChange: (m: QualityMode) => void;
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-1.5">
      {SIMPLE_MODES.map((m) => {
        const active = value === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={(e) => {
              e.stopPropagation();
              onChange(m);
            }}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-[color,background-color,border-color,transform] duration-150 ease-out-strong active:scale-[0.97] cursor-pointer",
              active
                ? "border-brand bg-brand/15 text-text"
                : "border-border-subtle bg-surface text-text-muted hover:border-border-strong/60 hover:text-text"
            )}
          >
            {QUALITY_MODE_DEFS[m].label}
          </button>
        );
      })}
    </div>
  );
}
