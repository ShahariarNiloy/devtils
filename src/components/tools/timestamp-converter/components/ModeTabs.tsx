"use client";

import { cn } from "@/lib/cn";
import type { ToolMode } from "../timestamp-converter.types";

const TABS: { id: ToolMode; label: string }[] = [
  { id: "single", label: "Single" },
  { id: "compare", label: "Compare" },
  { id: "arithmetic", label: "Arithmetic" },
  { id: "batch", label: "Batch" },
];

interface Props {
  mode: ToolMode;
  onMode: (m: ToolMode) => void;
}

export function ModeTabs({ mode, onMode }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Tool mode"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-1"
    >
      {TABS.map((t, i) => {
        const active = mode === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onMode(t.id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors cursor-pointer",
              active
                ? "bg-surface-soft text-text"
                : "text-text-muted hover:text-text",
            )}
          >
            <span className="font-mono text-[11px] text-text-faint">
              ⌘{i + 1}
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
