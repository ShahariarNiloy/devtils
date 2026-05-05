"use client";

import { useState, useDeferredValue, useMemo } from "react";
import {
  Copy,
  Download,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/components/primitives/Tooltip";
import { CodeView } from "../views/CodeView";
import { TreeView } from "../views/TreeView";
import { TableView } from "../views/TableView";
import { GridView } from "../views/GridView";
import { PathView } from "../views/PathView";
import type { JsonFormatterState } from "../useJsonFormatter";
import type { ViewMode } from "../json-formatter.types";
import { highlightJson, lineCount } from "../json-highlighter";
import { formatBytes } from "../json-formatter.lib";

const VIEW_LABELS: { mode: ViewMode; label: string }[] = [
  { mode: "code", label: "Code" },
  { mode: "tree", label: "Tree" },
  { mode: "table", label: "Table" },
  { mode: "grid", label: "Grid" },
  { mode: "path", label: "Path" },
];

interface OutputPanelProps {
  state: JsonFormatterState;
}

export function OutputPanel({ state }: OutputPanelProps) {
  const [fullscreen, setFullscreen] = useState(false);

  const deferredOutput = useDeferredValue(state.output);
  const highlightedOutput = useMemo(
    () => highlightJson(deferredOutput),
    [deferredOutput],
  );

  const numLines = lineCount(state.output);

  const tableValue = useMemo(() => {
    if (!state.canUseTableView) return [];
    return (state.parsedOutput ?? state.parsedValue) as Record<string, unknown>[];
  }, [state.canUseTableView, state.parsedOutput, state.parsedValue]);

  return (
    <div
      className={cn(
        "flex flex-1 flex-col overflow-hidden bg-surface",
        fullscreen && "fixed inset-0 z-50 bg-surface",
      )}
    >
      {/* Toolbar */}
      <div className="flex h-11 shrink-0 items-center gap-0.5 border-b border-border-subtle px-2">
        {/* View mode tabs */}
        <div className="flex items-center gap-0.5 flex-1">
          {VIEW_LABELS.map(({ mode, label }) => {
            const requiresArray = mode === "table" || mode === "grid";
            const isDisabled = requiresArray && !state.canUseTableView;
            const isActive = state.viewMode === mode;

            const btn = (
              <button
                key={mode}
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && state.setViewMode(mode)}
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

        {/* Right actions */}
        <div className="flex items-center gap-0.5 ml-auto">
          <Tooltip content="Copy output" shortcut="⌘⇧C" side="bottom">
            <button
              type="button"
              onClick={() => void state.copyOutput()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
            >
              <Copy size={16} />
            </button>
          </Tooltip>

          <Tooltip content="Download .json" shortcut="⌘⇧D" side="bottom">
            <button
              type="button"
              onClick={() => state.downloadOutput("json")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
            >
              <Download size={16} />
            </button>
          </Tooltip>

          <Tooltip content={fullscreen ? "Exit fullscreen" : "Fullscreen"} side="bottom">
            <button
              type="button"
              onClick={() => setFullscreen((f) => !f)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
            >
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Main view area */}
      <div className="flex-1 overflow-hidden">
        {state.viewMode === "code" && (
          <CodeView
            value={state.output}
            highlighted={highlightedOutput}
            indent={state.indent}
            onCursorChange={state.setOutputCursor}
          />
        )}

        {state.viewMode === "tree" && (
          <TreeView
            value={state.parsedOutput ?? state.parsedValue}
            search={state.treeSearch}
            expandAll={state.treeExpandAll}
            collapseAll={state.treeCollapseAll}
          />
        )}

        {state.viewMode === "table" && state.canUseTableView && (
          <TableView value={tableValue} />
        )}

        {state.viewMode === "grid" && state.canUseTableView && (
          <GridView value={tableValue} />
        )}

        {state.viewMode === "path" && (
          <PathView value={state.parsedOutput ?? state.parsedValue} />
        )}

        {(state.viewMode === "table" || state.viewMode === "grid") &&
          !state.canUseTableView && (
            <div className="flex h-full items-center justify-center text-sm text-text-faint">
              Requires an array of objects — format your JSON first.
            </div>
          )}
      </div>

      {/* Status bar */}
      <div className="h-8 shrink-0 border-t border-border-subtle bg-surface px-3 flex items-center justify-between text-sm font-mono text-text-faint">
        <span>
          Ln {state.outputCursor.ln} · Col {state.outputCursor.col}
        </span>
        <span>
          {numLines} lines · {formatBytes(state.output.length)}
        </span>
      </div>
    </div>
  );
}
