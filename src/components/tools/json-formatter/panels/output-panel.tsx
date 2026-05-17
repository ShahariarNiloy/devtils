"use client";

import {
  lazy,
  memo,
  startTransition,
  Suspense,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import {
  Copy,
  Download,
  FoldVertical,
  Maximize2,
  Minimize2,
  Search,
  UnfoldVertical,
  WrapText,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/components/primitives/tooltip";
import { CodeView } from "../views/code-view";
import { DeferredMount } from "../views/deferred-mount";
import { TreeView } from "../views/tree-view";
import { TableView } from "../views/table-view";
import { PathView } from "../views/path-view";
import type { ViewMode } from "../json-formatter.types";
import type { JsonFormatterState } from "../use-json-formatter";
import type { HistoryEntry } from "../hooks/use-history";
import { OutputSearchBar } from "./output-search-bar";
import { EmptyState } from "./empty-state";
import { applySearchHighlight, highlightJson } from "../json-highlighter";
import { formatJson } from "../json-formatter.lib";

// Graph is a heavier SVG view — only its chunk loads when the tab opens.
const GraphView = lazy(() => import("../views/graph/graph-view"));

const VIEW_LABELS: { mode: ViewMode; label: string }[] = [
  { mode: "code", label: "Code" },
  { mode: "tree", label: "Tree" },
  { mode: "table", label: "Table" },
  { mode: "graph", label: "Graph" },
  { mode: "path", label: "Path" },
];

interface OutputPanelProps {
  state: JsonFormatterState;
  onLoadSample: (key: string) => void;
  onLoadFile: (file: File) => void;
  onOpenFetchUrl: () => void;
  recent: HistoryEntry[];
  onRestoreRecent: (entry: HistoryEntry) => void;
  onRemoveRecent: (id: string) => void;
  onClearRecent: () => void;
}

function OutputPanelImpl({
  state,
  onLoadSample,
  onLoadFile,
  onOpenFetchUrl,
  recent,
  onRestoreRecent,
  onRemoveRecent,
  onClearRecent,
}: OutputPanelProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const deferredSearch = useDeferredValue(searchTerm);

  // Code view content: prefer the explicit `output` (formatted / minified /
  // converted), then a pretty-printed `parsedValue` so that switching from
  // Tree → Code always shows something useful (the user didn't have to
  // click Format first to populate output), and finally the raw input.
  //
  // The expensive call — `formatJson(parsedValue, indent)` — is split into
  // its own memo so it ONLY re-runs when the parsed tree or indent changes,
  // not on every input keystroke. The composite memo just picks among
  // pre-computed strings.
  // Only stringify for the Code view. Copy/Download read `output || input`
  // directly, so Tree/Graph/Path never pay this pass on a large document.
  const formattedFromParsed = useMemo(() => {
    if (state.viewMode !== "code") return "";
    if (state.parsedValue === null || state.parsedValue === undefined) return "";
    try { return formatJson(state.parsedValue, state.indent); } catch { return ""; }
  }, [state.viewMode, state.parsedValue, state.indent]);
  const displayedCode = state.output || formattedFromParsed || state.input;
  const deferredCode = useDeferredValue(displayedCode);

  const highlightedOutput = useMemo(() => highlightJson(deferredCode), [deferredCode]);
  const highlightedWithSearch = useMemo(
    () =>
      deferredSearch
        ? applySearchHighlight(highlightedOutput, deferredSearch)
        : highlightedOutput,
    [highlightedOutput, deferredSearch],
  );

  const matchCount = useMemo(() => {
    if (!deferredSearch || !displayedCode) return 0;
    try {
      const re = new RegExp(deferredSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      return (displayedCode.match(re) ?? []).length;
    } catch { return 0; }
  }, [deferredSearch, displayedCode]);

  const tableValue = useMemo(() => {
    if (!state.canUseTableView) return [];
    return (state.parsedOutput ?? state.parsedValue) as Record<string, unknown>[];
  }, [state.canUseTableView, state.parsedOutput, state.parsedValue]);

  const showEmptyState =
    !state.output && !state.parsedValue && state.input.trim().length === 0;

  const handleToggleSearch = () => {
    if (showSearch && searchTerm) setSearchTerm("");
    else setShowSearch((s) => !s);
  };

  // Swapping views remounts a tree of components. Mark the swap as a
  // non-urgent transition so the click feedback (button highlight) is
  // immediate while the heavy render is allowed to interleave.
  const switchView = useCallback(
    (mode: typeof state.viewMode) => {
      startTransition(() => state.setViewMode(mode));
    },
    [state],
  );

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden bg-surface",
        fullscreen && "fixed inset-0 z-50 bg-surface",
      )}
    >
      {/* Tab bar */}
      <div className="flex h-11 shrink-0 items-center gap-0.5 border-b border-border-subtle px-2">
        <div className="flex items-center gap-0.5 flex-1">
          {VIEW_LABELS.map(({ mode, label }) => {
            const requiresArray = mode === "table";
            const isDisabled = requiresArray && !state.canUseTableView;
            const isActive = state.viewMode === mode;

            const btn = (
              <button
                key={mode}
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && switchView(mode)}
                className={cn(
                  "relative inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors select-none",
                  isActive
                    ? "bg-surface-soft text-text"
                    : "text-text-faint hover:bg-surface-soft hover:text-text",
                  isDisabled &&
                    "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-text-faint",
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

        <div className="ml-auto flex items-center gap-0.5">
          {state.viewMode === "tree" && (
            <>
              <Tooltip content="Expand all" side="bottom">
                <button
                  type="button"
                  onClick={() => state.setTreeExpandAll((n) => n + 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
                  aria-label="Expand all"
                >
                  <UnfoldVertical size={15} />
                </button>
              </Tooltip>
              <Tooltip content="Collapse all" side="bottom">
                <button
                  type="button"
                  onClick={() => state.setTreeCollapseAll((n) => n + 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
                  aria-label="Collapse all"
                >
                  <FoldVertical size={15} />
                </button>
              </Tooltip>
              <Tooltip content="Wrap long values" side="bottom">
                <button
                  type="button"
                  onClick={() => state.setWrapText(!state.wrapText)}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                    state.wrapText
                      ? "bg-surface-soft text-text"
                      : "text-text-faint hover:bg-surface-soft hover:text-text",
                  )}
                  aria-label="Wrap long values"
                  aria-pressed={state.wrapText}
                >
                  <WrapText size={15} />
                </button>
              </Tooltip>
            </>
          )}

          <Tooltip content="Search output" side="bottom">
            <button
              type="button"
              onClick={handleToggleSearch}
              disabled={!displayedCode}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                showSearch
                  ? "bg-surface-soft text-text"
                  : "text-text-faint hover:bg-surface-soft hover:text-text",
                "disabled:opacity-40 disabled:hover:bg-transparent",
              )}
              aria-label="Search output"
            >
              <Search size={15} />
            </button>
          </Tooltip>

          <Tooltip content="Copy output" shortcut="⌘⇧C" side="bottom">
            <button
              type="button"
              onClick={() => void state.copyOutput()}
              disabled={!displayedCode}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Copy output"
            >
              <Copy size={15} />
            </button>
          </Tooltip>

          <Tooltip content="Download .json" shortcut="⌘⇧D" side="bottom">
            <button
              type="button"
              onClick={() => state.downloadOutput("json")}
              disabled={!displayedCode}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Download output"
            >
              <Download size={15} />
            </button>
          </Tooltip>

          <Tooltip content={fullscreen ? "Exit fullscreen" : "Fullscreen"} side="bottom">
            <button
              type="button"
              onClick={() => setFullscreen((f) => !f)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
              aria-label="Toggle fullscreen"
            >
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </Tooltip>
        </div>
      </div>

      {showSearch && (
        <OutputSearchBar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onClose={() => { setSearchTerm(""); setShowSearch(false); }}
          matchCount={matchCount}
          deferredSearch={deferredSearch}
        />
      )}

      {/* Body */}
      <div className="relative flex-1 overflow-hidden">
        {state.isConverting && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/70 backdrop-blur-[1px] text-sm text-text-faint">
            <span className="animate-pulse">Converting…</span>
          </div>
        )}
        {showEmptyState ? (
          <EmptyState
            onLoadSample={onLoadSample}
            onLoadFile={onLoadFile}
            onOpenFetchUrl={onOpenFetchUrl}
            recent={recent}
            onRestoreRecent={onRestoreRecent}
            onRemoveRecent={onRemoveRecent}
            onClearRecent={onClearRecent}
          />
        ) : (
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
                wrap={state.wrapText}
              />
            )}
            {state.viewMode === "table" && state.canUseTableView && (
              <TableView value={tableValue} />
            )}
            {state.viewMode === "graph" && (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-sm text-text-faint">
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
              <div className="flex h-full items-center justify-center text-sm text-text-faint">
                Requires an array of objects — format your JSON first.
              </div>
            )}
          </DeferredMount>
        )}
      </div>
    </div>
  );
}

// Memoized: a panel resize re-renders the ResizablePanel subtree every drag
// frame. Props are stable during a drag, so this bails out instead of
// re-rendering the heavy output views mid-resize.
export const OutputPanel = memo(OutputPanelImpl);
