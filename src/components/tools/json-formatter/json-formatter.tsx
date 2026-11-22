"use client";

import { ClipboardPaste, Copy, Download, Search, Trash2, Upload } from "lucide-react";
import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { flushPendingEdits } from "@/components/primitives/code-editor";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/primitives/resizable";
import { cn } from "@/lib/cn";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { useIsMobile } from "@/lib/use-is-mobile";
import { JsonFormatterContent, seoData } from "./content";
import { useDraftAutosave } from "./hooks/use-draft-autosave";
import { useHistory, type HistoryEntry } from "./hooks/use-history";
import { SAMPLE_DATA } from "./json-formatter.lib";
import { findProblems, PROBLEM_SCAN_LIMIT } from "./json-problems";
import { MobileMoreSheet } from "./mobile/mobile-more-sheet";
import { ConvertStrip } from "./panels/convert-strip";
import { BROKEN_SAMPLE } from "./panels/empty-state";
import { ErrorBanner } from "./panels/error-banner";
import { FetchUrlDialog } from "./panels/fetch-url-dialog";
import { InputPanel } from "./panels/input-panel";
import { OutputPanel } from "./panels/output-panel";
import { RepairPreviewDialog } from "./panels/repair-preview-dialog";
import { StatsPanel } from "./panels/stats-panel";
import { StatusBar } from "./panels/status-bar";
import { useSchemaCheck } from "./hooks/use-schema-check";
import { Dialog, DialogContent, DialogSideSheetContent, DialogTitle } from "@/components/primitives/dialog";
import { WorkspaceToolbar } from "./panels/workspace-toolbar";
import type { ConvertTarget } from "./json-formatter.types";
import {
  buildShareUrl,
  clearShareTokenFromUrl,
  decodeShareToken,
  encodeShareToken,
  readShareToken,
} from "./share-link";
import { useJsonFormatter } from "./use-json-formatter";

// Find (fuzzy + JSONPath) and the Schema editor load the first time they open.
const FindDialog = lazy(() => import("./panels/find-dialog").then((m) => ({ default: m.FindDialog })));
const SchemaPanel = lazy(() => import("./panels/schema-panel").then((m) => ({ default: m.SchemaPanel })));

type Pane = "input" | "output";

const CONVERT_TARGETS: ReadonlySet<string> = new Set<ConvertTarget>([
  "csv", "yaml", "typescript", "xml", "zod", "schema", "go", "python", "rust",
]);
const isConvertTarget = (k: string): k is ConvertTarget => CONVERT_TARGETS.has(k);

export function JsonFormatter({ tool }: { tool: Tool }) {
  const state = useJsonFormatter();
  const history = useHistory();
  const isMobile = useIsMobile();
  const [fetchUrlOpen, setFetchUrlOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  // Runs only once a schema has been entered (Ajv loads then).
  const schemaResult = useSchemaCheck(state.parsedValue, state.isValid, state.schemaText);
  const [pane, setPane] = useState<Pane>("input");
  const mobileFileRef = useRef<HTMLInputElement>(null);

  // Mobile: after a Format / Convert / Repair, flip to Output so the result
  // is visible (derived-state idiom — no effect needed).
  const [lastOutput, setLastOutput] = useState(state.output);
  if (state.output !== lastOutput) {
    setLastOutput(state.output);
    if (state.output && pane === "input") setPane("output");
  }

  // Persist & restore the live draft on-device. Skip restore when a share
  // token is present so we never override an explicit `#d=` link.
  const [skipDraftRestore] = useState(() => typeof window !== "undefined" && Boolean(readShareToken()));
  useDraftAutosave(state.input, state.setInput, skipDraftRestore);

  // ── Share link: auto-load on mount if URL has `#d=…` ─────────────────────
  const hydratedFromShareRef = useRef(false);
  useEffect(() => {
    if (hydratedFromShareRef.current) return;
    hydratedFromShareRef.current = true;
    const token = readShareToken();
    if (!token) return;
    void (async () => {
      const decoded = await decodeShareToken(token);
      if (decoded) {
        state.setInput(decoded);
        toast.success("Loaded from shared link");
        clearShareTokenFromUrl();
      } else {
        toast.error("Couldn't decode shared link");
      }
    })();
  }, [state]);

  // "⌘V anywhere": a paste outside any text field loads it as the input.
  const { setInput } = state;
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLElement && t.closest("input, textarea, select, [contenteditable='true']")) return;
      const text = e.clipboardData?.getData("text/plain");
      if (!text?.trim()) return;
      e.preventDefault();
      setInput(text);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [setInput]);

  const handleShare = useCallback(async () => {
    if (!state.input.trim()) return;
    setSharing(true);
    try {
      const token = await encodeShareToken(state.input);
      if (!token) {
        toast.error("Content too large to share via link");
        return;
      }
      const url = buildShareUrl(token);
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied to clipboard");
      } catch {
        window.history.replaceState(null, "", url);
        toast.message("Couldn't access clipboard", { description: "Copy the link from your address bar." });
      }
    } finally {
      setSharing(false);
    }
  }, [state.input]);

  const loadSampleAndRemember = useCallback(
    (key: string) => {
      const sample = SAMPLE_DATA[key];
      if (!sample) return;
      state.loadSample(key);
      history.push(sample.json, sample.label);
    },
    [state, history],
  );
  const loadBroken = useCallback(() => {
    state.clear();
    state.setInput(BROKEN_SAMPLE);
    setPane("input");
  }, [state]);
  const loadFileAndRemember = useCallback(
    (file: File) => {
      state.loadFile(file);
      const reader = new FileReader();
      reader.onload = () => history.push(String(reader.result ?? ""), file.name);
      reader.readAsText(file);
    },
    [state, history],
  );
  const handleUrlLoaded = useCallback(
    (text: string, name: string) => {
      state.setInput(text);
      history.push(text, name);
    },
    [state, history],
  );
  const restoreRecent = useCallback(
    async (entry: HistoryEntry) => {
      const body = await history.getBody(entry.id);
      if (body !== null) state.setInput(body);
    },
    [state, history],
  );
  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) state.setInput(text);
      else toast.message("Clipboard is empty");
    } catch {
      toast.error("Clipboard access was blocked", { description: "Long-press in the editor and choose Paste." });
    }
  }, [state]);

  // Problems for the banner: a dry run of the repair engine on invalid input.
  const invalid = state.validation.status === "invalid";
  const deferredInput = useDeferredValue(state.input);
  const report = useMemo(
    () => (invalid && deferredInput.length <= PROBLEM_SCAN_LIMIT ? findProblems(deferredInput) : null),
    [invalid, deferredInput],
  );
  const problemCount = report?.problems.length ?? 0;
  const problemLines = useMemo(() => report?.problems.map((p) => p.line) ?? [], [report]);

  useShortcut({ key: "Enter", meta: true, label: "Format" }, (e) => {
    e.preventDefault();
    // Focus stays in the editor, which debounces big docs: deliver the
    // pending edit so the action sees the text on screen.
    flushPendingEdits();
    state.formatWith("none");
  });
  useShortcut({ key: "m", meta: true, shift: true, label: "Minify" }, (e) => {
    e.preventDefault();
    flushPendingEdits();
    state.minify();
  });
  useShortcut({ key: "v", meta: true, shift: true, label: "Validate" }, (e) => {
    e.preventDefault();
    flushPendingEdits();
    state.validate();
  });
  useShortcut({ key: "c", meta: true, shift: true, label: "Copy output" }, (e) => {
    e.preventDefault();
    flushPendingEdits();
    void state.copyOutput();
  });
  useShortcut({ key: "r", meta: true, shift: true, label: "Repair" }, (e) => {
    e.preventDefault();
    flushPendingEdits();
    state.repair();
  });
  useShortcut({ key: "s", meta: true, shift: true, label: "Sort keys A → Z" }, (e) => {
    e.preventDefault();
    flushPendingEdits();
    state.formatWith("asc");
  });
  useShortcut({ key: "d", meta: true, shift: true, label: "Download output" }, (e) => {
    e.preventDefault();
    flushPendingEdits();
    state.downloadOutput("json");
  });
  useShortcut({ key: "/", meta: true, label: "Toggle search" }, (e) => {
    e.preventDefault();
    setSearchOpen((v) => !v);
  });

  const hasInput = state.input.trim().length > 0;
  const hasOutput = Boolean(state.output || (state.parsedValue !== null && state.parsedValue !== undefined));

  const outputPanel = (
    <OutputPanel
      state={state}
      isMobile={isMobile}
      onLoadSample={loadSampleAndRemember}
      onLoadBroken={loadBroken}
      onLoadFile={loadFileAndRemember}
      onOpenFetchUrl={() => setFetchUrlOpen(true)}
      recent={history.items}
      onRestoreRecent={restoreRecent}
      onRemoveRecent={history.remove}
      onClearRecent={() => void history.clear()}
    />
  );
  const inputPanel = (
    <InputPanel
      state={state}
      isMobile={isMobile}
      problemCount={problemCount}
      problemLines={problemLines}
      fileInputRef={mobileFileRef}
      onLoadFile={loadFileAndRemember}
      onOpenFetchUrl={() => setFetchUrlOpen(true)}
    />
  );

  return (
    <ToolShell tool={tool} titleStyle="inline" wide relatedSlugs={seoData.relatedSlugs}>
      {/* Find, Schema and Stats float over the workspace (dialog / side
          sheet / popover) — opening one never pushes the page down. */}
      {searchOpen && (
        <Suspense fallback={null}>
          <FindDialog open={searchOpen} onOpenChange={setSearchOpen} value={state.parsedOutput ?? state.parsedValue} />
        </Suspense>
      )}
      <Dialog open={state.showSchema} onOpenChange={state.setShowSchema} modal={false}>
        {state.showSchema && (
          <DialogSideSheetContent aria-describedby={undefined}>
            <div className="flex min-h-14 shrink-0 items-center border-b border-border-subtle pr-16 pl-5">
              <DialogTitle className="font-sans text-[15px] font-semibold text-text">Validate against JSON Schema</DialogTitle>
            </div>
            <Suspense fallback={<p className="px-5 py-4 text-sm text-text-faint">Loading…</p>}>
              <SchemaPanel
                value={state.parsedValue}
                isValid={state.isValid}
                schemaText={state.schemaText}
                onSchemaTextChange={state.setSchemaText}
                result={schemaResult}
              />
            </Suspense>
          </DialogSideSheetContent>
        )}
      </Dialog>
      {isMobile && (
        <Dialog open={state.showStats} onOpenChange={state.setShowStats}>
          <DialogContent aria-describedby={undefined} className="px-5 pt-5 pb-5">
            <DialogTitle className="mb-3 font-sans text-[15px] font-semibold text-text">Document stats</DialogTitle>
            {state.showStats && <StatsPanel value={state.parsedOutput ?? state.parsedValue} text={state.output || state.input} />}
          </DialogContent>
        </Dialog>
      )}

      {/* WORKSPACE */}
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
        <WorkspaceToolbar
          state={state}
          isMobile={isMobile}
          onShare={() => void handleShare()}
          sharing={sharing}
          onToggleSearch={() => setSearchOpen((v) => !v)}
          searchActive={searchOpen}
          onOpenSchema={() => state.setShowSchema(!state.showSchema)}
          schemaActive={state.showSchema}
          schemaResult={state.schemaText.trim() ? schemaResult : undefined}
          onOpenMore={() => setMoreOpen(true)}
        />

        {state.validation.status === "invalid" && (
          <ErrorBanner validation={state.validation} report={report} onRepair={state.repair} hideRepair={Boolean(state.jsConversion)} />
        )}

        {isMobile ? (
          <>
            <div role="tablist" aria-label="Pane" className="flex gap-1 border-b border-border-subtle bg-surface p-2">
              {(
                [
                  ["input", invalid && problemCount > 0 ? `Input · ${problemCount} issue${problemCount === 1 ? "" : "s"}` : "Input"],
                  ["output", "Output"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={pane === id}
                  onClick={() => setPane(id)}
                  className={cn(
                    "min-h-10 flex-1 basis-0 rounded-[9px] text-sm font-semibold",
                    pane === id ? "bg-selected text-text" : "text-text-tertiary",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="h-[max(360px,62dvh)]">{pane === "input" ? inputPanel : outputPanel}</div>
            <div className="flex gap-2 border-t border-border-subtle bg-toolbar p-2.5">
              {pane === "input" ? (
                <>
                  <BarPrimary onClick={() => void pasteFromClipboard()} icon={<ClipboardPaste size={16} aria-hidden />}>
                    Paste from clipboard
                  </BarPrimary>
                  <BarIcon label="Upload file" onClick={() => mobileFileRef.current?.click()}>
                    <Upload size={17} aria-hidden />
                  </BarIcon>
                  <BarIcon label="Clear input" onClick={state.clear} disabled={!hasInput}>
                    <Trash2 size={17} aria-hidden />
                  </BarIcon>
                </>
              ) : (
                <>
                  <BarPrimary onClick={() => void state.copyOutput()} disabled={!hasOutput} icon={<Copy size={16} aria-hidden />}>
                    Copy formatted JSON
                  </BarPrimary>
                  <BarIcon label="Download" onClick={() => state.downloadOutput("json")} disabled={!hasOutput}>
                    <Download size={17} aria-hidden />
                  </BarIcon>
                  <BarIcon label="Search output" onClick={() => setSearchOpen(true)} disabled={!hasOutput}>
                    <Search size={17} aria-hidden />
                  </BarIcon>
                </>
              )}
            </div>
          </>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-[max(var(--ws-min,520px),calc(100dvh-var(--chrome-top,165px)-125px))]">
            <ResizablePanel defaultSize={50} minSize={20}>
              {inputPanel}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              {outputPanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        <StatusBar state={state} isMobile={isMobile} />
      </div>

      <ConvertStrip state={state} />

      <FetchUrlDialog open={fetchUrlOpen} onOpenChange={setFetchUrlOpen} onLoaded={handleUrlLoaded} />

      {isMobile && (
          <MobileMoreSheet
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            hasInput={hasInput}
            hasOutput={hasOutput}
            canFormat={hasInput && !invalid}
            isStatsOpen={state.showStats}
            isSchemaOpen={state.showSchema}
            sharing={sharing}
            recentCount={history.items.length}
            onFormat={() => state.formatWith("none")}
            onMinify={state.minify}
            onSortAsc={() => state.formatWith("asc")}
            onSortDesc={() => state.formatWith("desc")}
            onRepair={state.repair}
            onConvert={(kind) => {
              if (isConvertTarget(kind)) state.convert(kind);
            }}
            onToggleStats={() => state.setShowStats(!state.showStats)}
            onToggleSchema={() => state.setShowSchema(!state.showSchema)}
            onShare={() => void handleShare()}
            onDownload={() => state.downloadOutput("json")}
            onOpenFind={() => setSearchOpen(true)}
          />
      )}

      <RepairPreviewDialog preview={state.repairPreview} onApply={state.applyRepair} onCancel={state.cancelRepair} />

      <JsonFormatterContent />
    </ToolShell>
  );
}

function BarPrimary({ onClick, disabled, icon, children }: { onClick: () => void; disabled?: boolean; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-action inline-flex min-h-12 flex-1 basis-0 items-center justify-center gap-2 rounded-xl text-[15px] font-bold disabled:opacity-50"
    >
      {icon}
      {children}
    </button>
  );
}

function BarIcon({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-text-key disabled:opacity-40"
    >
      {children}
    </button>
  );
}
