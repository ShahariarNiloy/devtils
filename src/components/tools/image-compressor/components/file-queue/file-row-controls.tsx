"use client";

import { AlertTriangle } from "lucide-react";

/**
 * Renders the per-file size delta. Honest about regressions: positive
 * (file shrank) shows in success green with a minus prefix; negative
 * (file grew) shows in warning/clay with a plus prefix and an alert
 * icon so the user can't miss it.
 */
export function SavingsBadge({ savedPct }: { savedPct: number }) {
  if (savedPct > 0) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[13px] font-bold tabular-nums text-success-text"
        title={`Saved ${savedPct}%`}
      >
        −{savedPct}%
      </span>
    );
  }
  if (savedPct < 0) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[13px] font-bold tabular-nums text-warning-text"
        title={`Output is ${Math.abs(savedPct)}% larger than the source`}
      >
        <AlertTriangle size={12} strokeWidth={2.5} aria-hidden />
        +{Math.abs(savedPct)}%
      </span>
    );
  }
  return (
    <span className="text-[13px] font-bold tabular-nums text-text-faint" title="Same size as the source">±0%</span>
  );
}
