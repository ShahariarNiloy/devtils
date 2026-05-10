"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";

// ── SwatchChip ──────────────────────────────────────────────────────

interface SwatchChipProps {
  label: string;
  hex: string;
  editable?: boolean;
  onChange?: (hex: string) => void;
}

export function SwatchChip({ label, hex, editable, onChange }: SwatchChipProps) {
  const inner = (
    <>
      {/* Large swatch */}
      <div className="h-10 w-full rounded-md border border-black/8 mb-2" style={{ background: hex }} />
      <span className="text-sm text-text-faint font-medium block mb-0.5">{label}</span>
      <span className="font-mono text-sm text-text-muted block">{hex.toUpperCase()}</span>
      {editable && <input type="color" value={hex} onChange={(e) => onChange?.(e.target.value)} className="sr-only" />}
    </>
  );

  return editable ? (
    <label className="flex-1 min-w-0 rounded-lg border border-border bg-surface-soft p-2.5 cursor-pointer hover:border-border-strong transition-colors">
      {inner}
    </label>
  ) : (
    <div className="flex-1 min-w-0 rounded-lg border border-border bg-surface-soft p-2.5">
      {inner}
    </div>
  );
}

// ── WcagBadge ──────────────────────────────────────────────────────

interface WcagBadgeProps {
  standard: string;
  desc: string;
  min: string;
  passes: boolean;
}

export function WcagBadge({ standard, desc, min, passes }: WcagBadgeProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 flex items-center gap-2.5",
        passes
          ? "border-success/25 bg-success/10"
          : "border-border bg-surface-soft",
      )}
    >
      {/* Icon circle */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          passes ? "bg-success text-white" : "bg-border-subtle text-text-faint",
        )}
      >
        {passes ? <Check size={15} strokeWidth={2.5} /> : <X size={15} strokeWidth={2} />}
      </div>
      {/* Text */}
      <div className="min-w-0">
        <div className="flex items-baseline gap-1">
          <span className={cn("text-sm font-bold leading-none", passes ? "text-success" : "text-text-faint")}>
            {standard}
          </span>
          <span className="text-sm text-text-faint leading-none">{min}</span>
        </div>
        <p className="text-sm text-text-faint mt-0.5 leading-none">{desc}</p>
      </div>
    </div>
  );
}
