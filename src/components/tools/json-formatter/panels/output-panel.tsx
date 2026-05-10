"use client";

import { useState, useDeferredValue, useMemo } from "react";
import { cn } from "@/lib/cn";
import { CodeView } from '../views/code-view';
import { TreeView } from '../views/tree-view';
import { TableView } from '../views/table-view';
import { GridView } from '../views/grid-view';
import { PathView } from '../views/path-view';
import type { JsonFormatterState } from "../use-json-formatter";
import { OutputSearchBar } from "./output-search-bar";
import { CodeViewToolbar } from '../views/code-view-toolbar';
import { highlightJson, lineCount, applySearchHighlight } from "../json-highlighter";
import { formatBytes } from "../json-formatter.lib";

interface OutputPanelProps {
  state: JsonFormatterState;
}

export function OutputPanel({ state }: OutputPanelProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const deferredSearch = useDeferredValue(searchTerm);
  const deferredOutput = useDeferredValue(state.output);

  const highlightedOutput = useMemo(() => highlightJson(deferredOutput), [deferredOutput]);
  const highlightedWithSearch = useMemo(
    () => deferredSearch ? applySearchHighlight(highlightedOutput, deferredSearch) : highlightedOutput,
    [highlightedOutput, deferredSearch],
  );

  const matchCount = useMemo(() => {
    if (!deferredSearch || !state.output) return 0;
    try {
      const re = new RegExp(deferredSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      return (state.output.match(re) ?? []).length;
    } catch { return 0; }
  }, [deferredSearch, state.output]);

  const numLines = lineCount(state.output);

  const tableValue = useMemo(() => {
    if (!state.canUseTableView) return [];
    return (state.parsedOutput ?? state.parsedValue) as Record<string, unknown>[];
  }, [state.canUseTableView, state.parsedOutput, state.parsedValue]);

  const handleToggleSearch = () => {
    if (showSearch && searchTerm) setSearchTerm("");
    else setShowSearch((s) => !s);
  };

  return (
    <div
      className={cn(
        "flex flex-1 flex-col overflow-hidden bg-surface",
        fullscreen && "fixed inset-0 z-50 bg-surface",
      )}
    >
      <CodeViewToolbar
        viewMode={state.viewMode}
        canUseTableView={state.canUseTableView}
        showSearch={showSearch}
        fullscreen={fullscreen}
        onViewModeChange={state.setViewMode}
        onToggleSearch={handleToggleSearch}
        onCopyOutput={() => void state.copyOutput()}
        onDownloadOutput={() => state.downloadOutput("json")}
        onToggleFullscreen={() => setFullscreen((f) => !f)}
      />

      {showSearch && (
        <OutputSearchBar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onClose={() => { setSearchTerm(""); setShowSearch(false); }}
          matchCount={matchCount}
          deferredSearch={deferredSearch}
        />
      )}

      <div className="flex-1 overflow-hidden">
        {state.viewMode === "code" && (
          <CodeView
            value={state.output}
            highlighted={highlightedWithSearch}
            indent={state.indent}
            onCursorChange={state.setOutputCursor}
          />
        )}
        {state.viewMode === "tree" && (
          <TreeView
            value={state.parsedOutput ?? state.parsedValue}
            search={deferredSearch}
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
        {(state.viewMode === "table" || state.viewMode === "grid") && !state.canUseTableView && (
          <div className="flex h-full items-center justify-center text-sm text-text-faint">
            Requires an array of objects — format your JSON first.
          </div>
        )}
      </div>

      <div className="h-8 shrink-0 border-t border-border-subtle bg-surface px-3 flex items-center justify-between text-sm font-mono text-text-faint">
        <span>Ln {state.outputCursor.ln} · Col {state.outputCursor.col}</span>
        <span>{numLines} lines · {formatBytes(state.output.length)}</span>
      </div>
    </div>
  );
}
