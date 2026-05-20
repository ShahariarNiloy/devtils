"use client";

import type { HistoryEntry } from "../color-converter.types";

interface Props {
  history: HistoryEntry[];
  onSelect: (hex: string) => void;
  onClear: () => void;
}

const VISIBLE = 5;

export function HistoryStrip({ history, onSelect, onClear }: Props) {
  const shown = history.slice(0, VISIBLE);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-2.5">
        <span className="text-sm font-bold uppercase tracking-eyebrow text-text-faint">
          Recents
        </span>
        {history.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-medium text-text-muted transition-colors hover:text-text cursor-pointer"
            aria-label="Clear recents"
          >
            Clear
          </button>
        )}
      </div>
      <div className="p-3 flex flex-col gap-2">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: VISIBLE }, (_, i) => `slot-${i}`).map((slotKey, i) => {
            const entry = shown[i];
            if (!entry) {
              return (
                <div
                  key={slotKey}
                  aria-hidden
                  className="aspect-square rounded-md border border-dashed border-border-subtle"
                />
              );
            }
            return (
              <button
                key={entry.ts}
                type="button"
                onClick={() => onSelect(entry.hex)}
                className="aspect-square rounded-md border border-border-subtle shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 cursor-pointer"
                style={{ background: entry.hex }}
                aria-label={`Restore ${entry.hex}`}
                title={entry.hex.toUpperCase()}
              />
            );
          })}
        </div>
        <p className="text-[11px] text-text-muted">
          Last {VISIBLE} this session · click to restore
        </p>
      </div>
    </div>
  );
}
