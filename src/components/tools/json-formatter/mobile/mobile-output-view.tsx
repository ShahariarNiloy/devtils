"use client";

import { lazy, Suspense, useDeferredValue, useMemo } from "react";
import { CodeView } from "../views/code-view";
import { DeferredMount } from "../views/deferred-mount";
import { TreeView } from "../views/tree-view";
import { TableView } from "../views/table-view";
import { PathView } from "../views/path-view";
import { EmptyState } from "../panels/empty-state";
import { applySearchHighlight, highlightJson } from "../json-highlighter";
import { formatJson } from "../json-formatter.lib";
import type { JsonFormatterState } from "../use-json-formatter";

const GraphView = lazy(() => import("../views/graph/graph-view"));
import type { HistoryEntry } from "../hooks/use-history";

interface MobileOutputViewProps {
  state: JsonFormatterState;
  searchTerm: string;
  onLoadSample: (key: string) => void;
  onLoadFile: (file: File) => void;
  onOpenFetchUrl: () => void;
  recent: HistoryEntry[];
  onRestoreRecent: (entry: HistoryEntry) => void;
  onRemoveRecent: (id: string) => void;
  onClearRecent: () => void;
}

/**
 * Mobile output renderer. Identical logic to the desktop OutputPanel body
 * but stripped of its own tab bar / icon-button chrome — those live in the
 * mobile shell above (view tabs, action sheet).
 */
export function MobileOutputView({
  state,
  searchTerm,
  onLoadSample,
  onLoadFile,
  onOpenFetchUrl,
  recent,
  onRestoreRecent,
  onRemoveRecent,
  onClearRecent,
}: MobileOutputViewProps) {
  const deferredSearch = useDeferredValue(searchTerm);

  // Same content-picking + highlight pipeline as the desktop panel.
  // Only stringify for the Code view (copy/download use output||input).
  const formattedFromParsed = useMemo(() => {
    if (state.viewMode !== "code") return "";
    if (state.parsedValue === null || state.parsedValue === undefined) return "";
    try {
      return formatJson(state.parsedValue, state.indent);
    } catch {
      return "";
    }
  }, [state.viewMode, state.parsedValue, state.indent]);
  const displayedCode = state.output || formattedFromParsed || state.input;
  const deferredCode = useDeferredValue(displayedCode);

  const highlightedOutput = useMemo(
    () => highlightJson(deferredCode),
    [deferredCode],
  );
  const highlightedWithSearch = useMemo(
    () =>
      deferredSearch
        ? applySearchHighlight(highlightedOutput, deferredSearch)
        : highlightedOutput,
    [highlightedOutput, deferredSearch],
  );

  const tableValue = useMemo(() => {
    if (!state.canUseTableView) return [];
    return (state.parsedOutput ?? state.parsedValue) as Record<string, unknown>[];
  }, [state.canUseTableView, state.parsedOutput, state.parsedValue]);

  const showEmptyState =
    !state.output && !state.parsedValue && state.input.trim().length === 0;

  if (showEmptyState) {
    return (
      <div className="h-full overflow-auto bg-canvas">
        <EmptyState
          onLoadSample={onLoadSample}
          onLoadFile={onLoadFile}
          onOpenFetchUrl={onOpenFetchUrl}
          recent={recent}
          onRestoreRecent={onRestoreRecent}
          onRemoveRecent={onRemoveRecent}
          onClearRecent={onClearRecent}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden bg-surface">
      {state.isConverting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/70 backdrop-blur-[1px] text-sm text-text-faint">
          <span className="animate-pulse">Converting…</span>
        </div>
      )}
      <DeferredMount token={state.viewMode}>
      {state.viewMode === "code" && (
        <CodeView
          value={displayedCode}
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
      {state.viewMode === "graph" && (
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-faint">
              Loading graph…
            </div>
          }
        >
          <GraphView
            value={state.parsedOutput ?? state.parsedValue}
            onUseTree={() => state.setViewMode("tree")}
          />
        </Suspense>
      )}
      {state.viewMode === "path" && (
        <PathView value={state.parsedOutput ?? state.parsedValue} />
      )}
      {state.viewMode === "table" && !state.canUseTableView && (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-faint">
          Requires an array of objects — format your JSON first.
        </div>
      )}
      </DeferredMount>
    </div>
  );
}
