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

/**
 * Compact pill: small swatch + monospace hex on one line. The label
 * stays accessible via title/aria so the visual stays uncluttered.
 */
export function SwatchChip({ label, hex, editable, onChange }: SwatchChipProps) {
  const inner = (
    <>
      <span
        aria-hidden
        className="h-4 w-4 shrink-0 rounded-sm border border-black/10"
        style={{ background: hex }}
      />
      <span className="font-mono text-[12.5px] text-text">{hex.toUpperCase()}</span>
      {editable && (
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange?.(e.target.value)}
          className="sr-only"
          aria-label={`Pick ${label} color`}
        />
      )}
    </>
  );

  const className = cn(
    "flex flex-1 items-center gap-2 rounded-lg border border-border-subtle bg-surface-soft px-2.5 py-1.5 min-w-0",
    editable && "cursor-pointer hover:border-border-strong transition-colors",
  );

  return editable ? (
    <label className={className} aria-label={label} title={label}>
      {inner}
    </label>
  ) : (
    <div className={className} aria-label={label} title={label}>
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

/**
 * Compact inline badge: `[× | ✓] AA 4.5:1 body` on a single line.
 */
export function WcagBadge({ standard, desc, min, passes }: WcagBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[12px] leading-none",
        passes
          ? "border-success/25 bg-success/10"
          : "border-border-subtle bg-surface-soft",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
          passes ? "bg-success text-white" : "bg-text-faint/30 text-text-faint",
        )}
      >
        {passes ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
      </span>
      <span className={cn("font-bold", passes ? "text-success" : "text-text-faint")}>
        {standard}
      </span>
      <span className="text-text-muted">{min}</span>
      <span className="text-text-muted">{desc}</span>
    </div>
  );
}
