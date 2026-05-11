"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { byteLength, computeStats } from "../json-formatter.lib";
import { formatStatsRows } from "../json-stats";

interface StatsPanelProps {
  /** Parsed value to compute structural stats from. */
  value: unknown;
  /** Raw text to derive byte size + line count from. */
  text: string;
  onClose: () => void;
}

/**
 * Stats are derived lazily here, inside the panel — when the panel is
 * unmounted (showStats === false) we don't walk the tree at all. Walking on
 * every validate cycle was wasted work for users who never opened the
 * panel. Now the heavy traversal only runs when the user actually asks for
 * the data, and is memoized on (value, text) so toggling the panel
 * repeatedly costs nothing if nothing changed.
 */
export function StatsPanel({ value, text, onClose }: StatsPanelProps) {
  const stats = useMemo(() => {
    if (value === null || value === undefined) return null;
    try {
      const s = computeStats(value);
      s.size = byteLength(text);
      s.lines = text ? text.split("\n").length : 0;
      return s;
    } catch { return null; }
  }, [value, text]);

  if (!stats) {
    return (
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-card">
        <div className="flex h-11 items-center justify-between border-b border-border-subtle px-4">
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
        <div className="px-4 py-6 text-sm text-text-faint">
          Load some JSON to see structural stats.
        </div>
      </div>
    );
  }

  const rows = formatStatsRows(stats);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-card">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-px bg-border-subtle p-px">
        {rows.map((row) => (
          <div key={row.label} className="bg-surface px-4 py-3 flex flex-col gap-0.5">
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
