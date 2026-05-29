"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/cn";

export type ViewMode = "grid" | "list";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
}

/**
 * Compact 2-button toggle for grid vs list rendering of the sectioned tool
 * index. Persisted by the parent into localStorage so a returning visitor
 * lands in their preferred layout.
 */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex h-10 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-pressed={value === "grid"}
        aria-label="Grid view"
        className={cn(
          "inline-flex h-full w-10 items-center justify-center transition-colors",
          value === "grid"
            ? "bg-surface-soft text-text"
            : "text-text-faint hover:bg-surface-soft hover:text-text",
        )}
      >
        <LayoutGrid size={15} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={value === "list"}
        aria-label="List view"
        className={cn(
          "inline-flex h-full w-10 items-center justify-center border-l border-border transition-colors",
          value === "list"
            ? "bg-surface-soft text-text"
            : "text-text-faint hover:bg-surface-soft hover:text-text",
        )}
      >
        <List size={15} aria-hidden />
      </button>
    </div>
  );
}
