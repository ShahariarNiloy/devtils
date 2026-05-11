"use client";

import { useDeferredValue, useMemo } from "react";
import { CodeView } from "../views/code-view";
import { TreeView } from "../views/tree-view";
import { TableView } from "../views/table-view";
import { GridView } from "../views/grid-view";
import { PathView } from "../views/path-view";
import { EmptyState } from "../panels/empty-state";
import { applySearchHighlight, highlightJson } from "../json-highlighter";
import { formatJson } from "../json-formatter.lib";
import type { JsonFormatterState } from "../use-json-formatter";
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
  const formattedFromParsed = useMemo(() => {
    if (state.parsedValue === null || state.parsedValue === undefined) return "";
    try {
      return formatJson(state.parsedValue, state.indent);
    } catch {
      return "";
    }
  }, [state.parsedValue, state.indent]);
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
      <div className="h-full overflow-auto bg-bg">
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
    <div className="h-full overflow-hidden bg-surface">
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
      {state.viewMode === "grid" && state.canUseTableView && (
        <GridView value={tableValue} />
      )}
      {state.viewMode === "path" && (
        <PathView value={state.parsedOutput ?? state.parsedValue} />
      )}
      {(state.viewMode === "table" || state.viewMode === "grid") &&
        !state.canUseTableView && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-faint">
            Requires an array of objects — format your JSON first.
          </div>
        )}
    </div>
  );
}
