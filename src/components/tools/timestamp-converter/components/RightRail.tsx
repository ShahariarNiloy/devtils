"use client";

import { useState } from "react";
import { ChevronDown, Pin, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { UseTimestampConverter } from "../useTimestampConverter";

interface Props {
  s: UseTimestampConverter;
}

/** Pinned + History side panel. Collapses to a drawer toggle on mobile. */
export function RightRail({ s }: Props) {
  const canPin = s.parseResult.ok && s.rawInput.trim().length > 0;
  const [open, setOpen] = useState(false);

  return (
    <aside className="w-full lg:w-[300px] lg:shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mb-3 flex w-full items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-muted lg:hidden cursor-pointer"
      >
        Pinned &amp; history
        <ChevronDown
          size={16}
          aria-hidden
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>
      <div
        className={cn(
          "flex-col gap-4",
          open ? "flex" : "hidden",
          "lg:flex",
        )}
      >
      <section className="rounded-xl border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
          <span className="text-sm font-semibold uppercase tracking-wider text-text-faint">
            Pinned
          </span>
          <button
            type="button"
            disabled={!canPin}
            onClick={() => s.pin(s.parseResult.detectedFormat, s.rawInput)}
            aria-label="Pin current"
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-sm text-text-muted transition-colors hover:bg-surface-soft hover:text-text disabled:opacity-30 cursor-pointer"
          >
            <Pin size={13} aria-hidden /> Pin
          </button>
        </header>
        <ul className="max-h-64 overflow-y-auto">
          {s.pinned.length === 0 && (
            <li className="px-3 py-3 text-sm text-text-faint">
              Nothing pinned.
            </li>
          )}
          {s.pinned.map((p) => (
            <li
              key={p.raw}
              className="flex items-center gap-2 border-b border-border-subtle px-3 py-2 last:border-0"
            >
              <button
                type="button"
                onClick={() => s.setRawInput(p.raw)}
                className="min-w-0 flex-1 truncate text-left font-mono text-sm text-text hover:text-brand cursor-pointer"
              >
                {p.raw}
              </button>
              <button
                type="button"
                onClick={() => s.unpin(p.raw)}
                aria-label="Unpin"
                className="shrink-0 text-text-faint hover:text-danger cursor-pointer"
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
          <span className="text-sm font-semibold uppercase tracking-wider text-text-faint">
            History
          </span>
          <button
            type="button"
            disabled={s.history.length === 0}
            onClick={s.clearHistory}
            aria-label="Clear history"
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-sm text-text-muted transition-colors hover:bg-surface-soft hover:text-danger disabled:opacity-30 cursor-pointer"
          >
            <Trash2 size={13} aria-hidden />
          </button>
        </header>
        <ul className="max-h-72 overflow-y-auto">
          {s.history.length === 0 && (
            <li className="px-3 py-3 text-sm text-text-faint">
              No history yet.
            </li>
          )}
          {s.history.map((h) => (
            <li
              key={`${h.raw}#${h.at}`}
              className="border-b border-border-subtle last:border-0"
            >
              <button
                type="button"
                onClick={() => s.setRawInput(h.raw)}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-surface-soft cursor-pointer"
              >
                <span className="truncate font-mono text-sm text-text">
                  {h.raw}
                </span>
                <span className="text-[11px] text-text-faint">{h.format}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      </div>
    </aside>
  );
}
