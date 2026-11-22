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
  MoreHorizontal,
  Search,
  TriangleAlert,
  UnfoldVertical,
  WrapText,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/components/primitives/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { CodeView } from "../views/code-view";
import { LazyJsonEditor } from "../views/json-editor-lazy";
import { DeferredMount } from "../views/deferred-mount";
import { TreeView } from "../views/tree-view";
import { FlatTableView, TableView } from "../views/table-view";
import { PathView } from "../views/path-view";
import type { ViewMode } from "../json-formatter.types";
import type { JsonFormatterState } from "../use-json-formatter";
import type { HistoryEntry } from "../hooks/use-history";
import { OutputSearchBar } from "./output-search-bar";
import { EmptyState, InvalidState } from "./empty-state";
import { applySearchHighlight, highlight, langForOutput } from "../json-highlighter";
import { formatJson, formatJsonText } from "../json-formatter.lib";
import { WORKER_THRESHOLD } from "../json-worker-client";
import { useWorkerFormat } from "../hooks/use-worker-format";

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
  onLoadBroken: () => void;
  /** Mobile: 4-column view pills instead of the tab header (no Graph). */
  isMobile?: boolean;
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
  onLoadBroken,
  isMobile = false,
  onLoadFile,
  onOpenFetchUrl,
  recent,
  onRestoreRecent,
  onRemoveRecent,
  onClearRecent,
}: OutputPanelProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await state.copyOutput();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const deferredSearch = useDeferredValue(searchTerm);

  // Code view content: prefer the explicit `output` (formatted / minified /
  // converted), then a pretty-printed `parsedValue` so that switching from
  // Tree → Code always shows something useful (the user didn't have to
  // click Format first to populate output), and finally the raw input.
  //
  // The pretty-print only runs for the Code view and only when there's no
  // output to show (Copy/Download read `output || input` directly). It
  // formats the source text so big integers / long decimals keep their
  // exact digits. A large document is formatted in the JSON worker — the
  // whole-document pass took > 1 s on the main thread at 50 MB.
  const needsPretty =
    state.viewMode === "code" && !state.output && state.parsedValue !== null && state.parsedValue !== undefined;
  const largePretty = needsPretty && state.parsedSource.length > WORKER_THRESHOLD;
  const formattedSync = useMemo(() => {
    if (!needsPretty || largePretty) return "";
    try {
      return formatJsonText(state.parsedSource, state.indent, "none", state.parsedValue);
    } catch {
      // The text is mid-edit (the parse lags): format the last good value.
      try { return formatJson(state.parsedValue, state.indent); } catch { return ""; }
    }
  }, [needsPretty, largePretty, state.parsedValue, state.parsedSource, state.indent]);
  const formattedAsync = useWorkerFormat(largePretty ? state.parsedSource : "", state.indent);
  const formattedFromParsed = largePretty ? formattedAsync.text : formattedSync;
  // While the first worker result is on its way, show nothing rather than
  // mounting the editor on the raw text only to replace it a moment later.
  const prettyPending = largePretty && formattedAsync.pending && !formattedAsync.text;
  const displayedCode = state.output || formattedFromParsed || (prettyPending ? "" : state.input);
  const hasText = Boolean(displayedCode || state.input);
  const deferredCode = useDeferredValue(displayedCode);

  const outputLang = langForOutput(state.conversionResult?.format);
  // JSON output renders in CodeMirror (virtualized, incremental highlight),
  // so the whole-document HTML highlight below is only built for converted
  // output (TypeScript, YAML, Go…), which is small.
  const isJsonOutput = outputLang === "json";
  const highlightedOutput = useMemo(
    () => (isJsonOutput || state.viewMode !== "code" ? "" : highlight(deferredCode, outputLang)),
    [deferredCode, outputLang, isJsonOutput, state.viewMode],
  );
  const highlightedWithSearch = useMemo(
    () =>
      deferredSearch && highlightedOutput
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
  const showInvalid = state.validation.status === "invalid" && !state.output;

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
        "flex h-full flex-col overflow-hidden bg-canvas",
        fullscreen && "fixed inset-0 z-50 bg-canvas",
      )}
    >
      {/* View tabs + output actions */}
      {isMobile ? (
        !showEmptyState && (
          <div role="tablist" aria-label="Output view" className="grid shrink-0 grid-cols-4 gap-1.5 border-b border-border-subtle p-2.5">
            {VIEW_LABELS.filter((v) => v.mode !== "graph").map(({ mode, label }) => {
              const disabled = false;
              const on = state.viewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  disabled={disabled}
                  onClick={() => switchView(mode)}
                  className={cn(
                    "min-h-10 min-w-0 rounded-full border px-1.5 text-[13px] font-semibold disabled:opacity-40",
                    on ? "border-brand bg-brand text-on-brand" : "border-white/12 text-text-tertiary",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )
      ) : (
        <div className="flex min-h-[46px] shrink-0 items-center gap-1 border-b border-border-subtle px-2">
          <div role="tablist" aria-label="Output view" className="flex gap-0.5">
            {VIEW_LABELS.filter((v) => v.mode !== "graph" || state.viewMode === "graph").map(({ mode, label }) => {
              const isDisabled = false;
              const isActive = state.viewMode === mode;
              const btn = (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && switchView(mode)}
                  className={cn(
                    "min-h-[34px] rounded-lg px-3 text-[13px] font-semibold transition-colors select-none",
                    isActive ? "bg-white/[.07] text-text" : "text-text-tertiary hover:text-text",
                    isDisabled && "cursor-not-allowed opacity-40 hover:text-text-tertiary",
                  )}
                >
                  {label}
                </button>
              );
              return isDisabled ? (
                <Tooltip key={mode} content="Needs an array of objects" side="bottom">
                  {btn}
                </Tooltip>
              ) : (
                btn
              );
            })}
          </div>
          <span className="grow" />
          <IconBtn label="Search output" onClick={handleToggleSearch} pressed={showSearch} disabled={!hasText}>
            <Search size={15} />
          </IconBtn>
          <IconBtn label="Download" shortcut="⌘⇧D" onClick={() => state.downloadOutput("json")} disabled={!hasText}>
            <Download size={15} />
          </IconBtn>
          {/* View extras the mockup doesn't show: graph, tree controls, fullscreen. */}
          <DropdownMenu>
            <Tooltip content="More views" side="bottom">
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More views"
                  className="flex size-[34px] items-center justify-center rounded-lg text-text-faint transition-colors hover:bg-white/6 hover:text-text"
                >
                  <MoreHorizontal size={15} aria-hidden />
                </button>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem onClick={() => switchView("graph")}>Graph view</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={state.viewMode !== "tree"} onClick={() => state.setTreeExpandAll((n) => n + 1)}>
                <UnfoldVertical size={14} className="mr-2 text-text-faint" aria-hidden />
                Expand all
              </DropdownMenuItem>
              <DropdownMenuItem disabled={state.viewMode !== "tree"} onClick={() => state.setTreeCollapseAll((n) => n + 1)}>
                <FoldVertical size={14} className="mr-2 text-text-faint" aria-hidden />
                Collapse all
              </DropdownMenuItem>
              <DropdownMenuItem disabled={state.viewMode !== "tree"} onClick={() => state.setWrapText(!state.wrapText)}>
                <WrapText size={14} className="mr-2 text-text-faint" aria-hidden />
                {state.wrapText ? "Don't wrap long values" : "Wrap long values"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFullscreen((f) => !f)}>
                {fullscreen ? <Minimize2 size={14} className="mr-2 text-text-faint" aria-hidden /> : <Maximize2 size={14} className="mr-2 text-text-faint" aria-hidden />}
                {fullscreen ? "Exit fullscreen" : "Fullscreen"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip content="Copy output" shortcut="⌘⇧C" side="bottom">
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!hasText}
              className="ml-1 inline-flex min-h-[34px] items-center gap-[7px] rounded-lg border border-white/12 bg-white/[.04] px-3 text-[13px] font-semibold text-text transition-colors hover:bg-white/[.07] disabled:opacity-40"
            >
              <Copy size={14} aria-hidden />
              {copied ? "Copied" : "Copy"}
            </button>
          </Tooltip>
        </div>
      )}

      {showSearch && (
        <OutputSearchBar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onClose={() => { setSearchTerm(""); setShowSearch(false); }}
          matchCount={matchCount}
          deferredSearch={deferredSearch}
        />
      )}

      {!showEmptyState && state.viewMode !== "code" && state.impreciseNumbers > 0 && (
        <PrecisionNotice count={state.impreciseNumbers} onShowCode={() => switchView("code")} />
      )}

      {/* Body */}
      <div className="relative flex-1 overflow-hidden">
        {state.isConverting && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/70 backdrop-blur-[1px] text-sm text-text-faint">
            <span className="animate-pulse">Converting…</span>
          </div>
        )}
        {showEmptyState && (
          <EmptyState
            onLoadBroken={onLoadBroken}
            onLoadSample={onLoadSample}
            onLoadFile={onLoadFile}
            onOpenFetchUrl={onOpenFetchUrl}
            recent={recent}
            onRestoreRecent={onRestoreRecent}
            onRemoveRecent={onRemoveRecent}
            onClearRecent={onClearRecent}
          />
        )}
        {!showEmptyState && showInvalid && <InvalidState />}
        {!showEmptyState && !showInvalid && state.viewMode === "code" && prettyPending && (
          <div aria-busy={formattedAsync.busy || undefined} className="flex h-full items-center justify-center text-sm text-text-faint">
            {formattedAsync.busy && <span className="animate-pulse">Formatting…</span>}
          </div>
        )}
        {!showEmptyState && !showInvalid && !(state.viewMode === "code" && prettyPending) && (
          <DeferredMount token={state.viewMode}>
            {state.viewMode === "code" && isJsonOutput && (
              <LazyJsonEditor
                value={deferredCode}
                indent={state.indent}
                search={deferredSearch}
                onCursorChange={state.setOutputCursor}
                wrap={state.wrapText}
              />
            )}
            {state.viewMode === "code" && !isJsonOutput && (
              <CodeView
                variant="v2"
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
              <FlatTableView value={state.parsedOutput ?? state.parsedValue} />
            )}
          </DeferredMount>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  label,
  shortcut,
  onClick,
  pressed,
  disabled,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={label} shortcut={shortcut} side="bottom">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={pressed}
        className={cn(
          "flex size-[34px] items-center justify-center rounded-lg transition-colors disabled:opacity-40",
          pressed ? "bg-white/6 text-text" : "text-text-faint enabled:hover:bg-white/6 enabled:hover:text-text",
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

/**
 * Honest-metrics notice: JS numbers are IEEE-754 doubles, so the value-based
 * views can't show digits beyond ~17 significant figures. Say so instead of
 * letting the user copy a silently rounded ID out of the tree.
 */
function PrecisionNotice({ count, onShowCode }: { count: number; onShowCode: () => void }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-warning-border bg-warning-bg px-3 py-1.5 text-[12.5px] text-warning-text"
    >
      <TriangleAlert size={13} className="shrink-0" aria-hidden />
      <span className="flex-1">
        {count} number{count !== 1 ? "s" : ""} exceed{count === 1 ? "s" : ""} JavaScript precision and
        {count !== 1 ? " are" : " is"} shown rounded here. Code view, Copy and Download keep the exact digits.
      </span>
      <button
        type="button"
        onClick={onShowCode}
        className="shrink-0 rounded-md px-2 py-0.5 font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand"
      >
        Show exact in Code
      </button>
    </div>
  );
}

// Memoized: a panel resize re-renders the ResizablePanel subtree every drag
// frame. Props are stable during a drag, so this bails out instead of
// re-rendering the heavy output views mid-resize.
export const OutputPanel = memo(OutputPanelImpl);
