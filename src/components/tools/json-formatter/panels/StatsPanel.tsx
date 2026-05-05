"use client";

import { X } from "lucide-react";
import { formatStatsRows } from "../json-stats";
import type { JsonStats } from "../json-formatter.types";

interface StatsPanelProps {
  stats: JsonStats;
  onClose: () => void;
}

export function StatsPanel({ stats, onClose }: StatsPanelProps) {
  const rows = formatStatsRows(stats);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-card">
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border-subtle px-4">
        <span className="text-sm font-semibold text-text">JSON Statistics</span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
          aria-label="Close stats panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-px bg-border-subtle p-px">
        {rows.map((row, i) => (
          <div key={i} className="bg-surface px-4 py-3 flex flex-col gap-0.5">
            <span className="text-sm text-text-faint">{row.label}</span>
            <span
              className={
                row.highlight
                  ? "font-mono text-base font-semibold text-text"
                  : "font-mono text-base text-text-muted"
              }
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
