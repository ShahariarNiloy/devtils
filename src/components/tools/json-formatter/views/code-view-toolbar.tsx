"use client";

import { Copy, Download, Maximize2, Minimize2, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/components/primitives/tooltip";
import type { ViewMode } from "../json-formatter.types";

const VIEW_LABELS: { mode: ViewMode; label: string }[] = [
  { mode: "code", label: "Code" },
  { mode: "tree", label: "Tree" },
  { mode: "table", label: "Table" },
  { mode: "grid", label: "Grid" },
  { mode: "path", label: "Path" },
];

interface CodeViewToolbarProps {
  viewMode: ViewMode;
  canUseTableView: boolean;
  showSearch: boolean;
  fullscreen: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleSearch: () => void;
  onCopyOutput: () => void;
  onDownloadOutput: () => void;
  onToggleFullscreen: () => void;
}

export function CodeViewToolbar({
  viewMode,
  canUseTableView,
  showSearch,
  fullscreen,
  onViewModeChange,
  onToggleSearch,
  onCopyOutput,
  onDownloadOutput,
  onToggleFullscreen,
}: CodeViewToolbarProps) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-0.5 border-b border-border-subtle px-2">
      <div className="flex items-center gap-0.5 flex-1">
        {VIEW_LABELS.map(({ mode, label }) => {
          const requiresArray = mode === "table" || mode === "grid";
          const isDisabled = requiresArray && !canUseTableView;
          const isActive = viewMode === mode;

          const btn = (
            <button
              key={mode}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onViewModeChange(mode)}
              className={cn(
                "inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors select-none",
                isActive
                  ? "bg-surface-soft text-text"
                  : "text-text-faint hover:text-text hover:bg-surface-soft",
                isDisabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-text-faint",
              )}
            >
              {label}
            </button>
          );

          if (isDisabled) {
            return (
              <Tooltip key={mode} content="Requires array of objects" side="bottom">
                {btn}
              </Tooltip>
            );
          }

          return btn;
        })}
      </div>

      <div className="flex items-center gap-0.5 ml-auto">
        <Tooltip content="Search output" side="bottom">
          <button
            type="button"
            onClick={onToggleSearch}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              showSearch
                ? "bg-surface-soft text-text"
                : "text-text-faint hover:bg-surface-soft hover:text-text",
            )}
          >
            <Search size={16} />
          </button>
        </Tooltip>

        <Tooltip content="Copy output" shortcut="⌘⇧C" side="bottom">
          <button
            type="button"
            onClick={onCopyOutput}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
          >
            <Copy size={16} />
          </button>
        </Tooltip>

        <Tooltip content="Download .json" shortcut="⌘⇧D" side="bottom">
          <button
            type="button"
            onClick={onDownloadOutput}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
          >
            <Download size={16} />
          </button>
        </Tooltip>

        <Tooltip content={fullscreen ? "Exit fullscreen" : "Fullscreen"} side="bottom">
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
