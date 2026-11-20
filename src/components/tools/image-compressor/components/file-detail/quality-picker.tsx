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
    <div role="radiogroup" className="flex flex-wrap gap-0.5 rounded-[11px] border border-border-subtle bg-[#0d0d0c] p-[3px]">
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
              "min-h-9 flex-1 rounded-lg px-3 text-[13px] font-semibold transition-[color,background-color,transform] duration-150 ease-out-strong active:scale-[0.97] cursor-pointer",
              active
                ? "bg-selected text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "text-text-tertiary hover:text-text"
            )}
          >
            {QUALITY_MODE_DEFS[m].label}
          </button>
        );
      })}
    </div>
  );
}
