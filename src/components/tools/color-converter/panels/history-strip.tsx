"use client";

import { Trash2 } from "lucide-react";
import type { HistoryEntry } from "../color-converter.types";

interface Props {
  history: HistoryEntry[];
  onSelect: (hex: string) => void;
  onClear: () => void;
}

export function HistoryStrip({ history, onSelect, onClear }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold uppercase tracking-eyebrow text-text-faint">
          Recent
        </span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-text-faint hover:text-danger transition-colors cursor-pointer"
          aria-label="Clear history"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {history.map((entry) => (
          <button
            key={entry.ts}
            type="button"
            onClick={() => onSelect(entry.hex)}
            className="group relative h-7 w-7 rounded-lg border border-border-subtle shadow-sm transition-transform hover:scale-110 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong cursor-pointer"
            style={{ background: entry.hex }}
            aria-label={`Restore ${entry.hex}`}
            title={entry.hex.toUpperCase()}
          />
        ))}
      </div>
    </div>
  );
}
