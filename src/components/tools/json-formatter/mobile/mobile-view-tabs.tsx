"use client";

import { cn } from "@/lib/cn";
import type { ViewMode } from "../json-formatter.types";

interface MobileViewTabsProps {
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  canUseTable: boolean;
}

const TABS: { mode: ViewMode; label: string; requiresArray?: boolean }[] = [
  { mode: "code", label: "Code" },
  { mode: "tree", label: "Tree" },
  { mode: "graph", label: "Graph" },
  { mode: "path", label: "Path" },
  { mode: "table", label: "Table", requiresArray: true },
];

export function MobileViewTabs({ viewMode, onViewModeChange, canUseTable }: MobileViewTabsProps) {
  return (
    <div className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto border-b border-border bg-surface px-3 py-2">
      {TABS.map(({ mode, label, requiresArray }) => {
        const disabled = requiresArray && !canUseTable;
        const active = viewMode === mode;
        return (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => onViewModeChange(mode)}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              active
                ? "border-surface-sage bg-surface-sage text-text"
                : "border-border-subtle bg-transparent text-text-faint hover:bg-surface-soft hover:text-text-muted",
              disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-text-faint",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
