"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { InputPanel } from "./panels/input-panel";
import { OutputPanel } from "./panels/output-panel";
import { QueryPanel } from "./panels/query-panel";
import { StatsPanel } from "./panels/stats-panel";
import { StatusBar } from "./panels/status-bar";
import { TopActionBar } from "./panels/top-action-bar";
import { FetchUrlDialog } from "./panels/fetch-url-dialog";
import { FuzzyFindDialog } from "./panels/fuzzy-find-dialog";
import { JsonFormatterGuide } from "./panels/json-formatter-guide";
import { RepairPreviewDialog } from "./panels/repair-preview-dialog";
import { MobileJsonFormatter } from "./mobile/mobile-json-formatter";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/primitives/resizable";
import { useJsonFormatter } from "./use-json-formatter";
import { useHistory, type HistoryEntry } from "./hooks/use-history";
import { SAMPLE_DATA } from "./json-formatter.lib";
import {
  buildShareUrl,
  clearShareTokenFromUrl,
  decodeShareToken,
  encodeShareToken,
  readShareToken,
} from "./share-link";

export function JsonFormatter({ tool }: { tool: Tool }) {
  const state = useJsonFormatter();
  const history = useHistory();
  const isMobile = useIsMobile();
  const [fetchUrlOpen, setFetchUrlOpen] = useState(false);
  const [fuzzyOpen, setFuzzyOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  // ── Share link: auto-load on mount if URL has `#d=…` ─────────────────────
  // Run once, never block render. Decompression is async (CompressionStream)
  // so this fires after first paint — the user sees the empty state for a
  // few frames at worst, then the input populates and auto-formats.
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
        // Wipe the hash so a re-share starts from a clean URL and we don't
        // accidentally re-load the same content on a future navigation.
        clearShareTokenFromUrl();
      } else {
        toast.error("Couldn't decode shared link");
      }
    })();
  }, [state]);

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
        // Clipboard can fail in insecure contexts — fall back to writing the
        // token into the URL bar so the user can copy it from there.
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", url);
          toast.message("Couldn't access clipboard", {
            description: "Copy the link from your address bar.",
          });
        }
      }
    } finally {
      setSharing(false);
    }
  }, [state.input]);

  // Wrapped loaders that also push the content to the History list.
  // History.push is sync (state updates immediately), IDB writes happen
  // fire-and-forget — UI never waits on disk.
  const loadSampleAndRemember = useCallback(
    (key: string) => {
      const sample = SAMPLE_DATA[key];
      if (!sample) return;
      state.loadSample(key);
      history.push(sample.json, sample.label);
    },
    [state, history],
  );

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

  // Restore is async — the body lives in IDB and is only fetched on click,
  // so we don't pull 50 × up to 2MB into memory at mount.
  const restoreRecent = useCallback(
    async (entry: HistoryEntry) => {
      const body = await history.getBody(entry.id);
      if (body !== null) state.setInput(body);
    },
    [state, history],
  );

  useShortcut({ key: "Enter", meta: true }, (e) => { e.preventDefault(); state.format(); });
  useShortcut({ key: "m", meta: true, shift: true }, (e) => { e.preventDefault(); state.minify(); });
  useShortcut({ key: "v", meta: true, shift: true }, (e) => { e.preventDefault(); state.validate(); });
  useShortcut({ key: "c", meta: true, shift: true }, (e) => { e.preventDefault(); void state.copyOutput(); });
  useShortcut({ key: "r", meta: true, shift: true }, (e) => { e.preventDefault(); state.repair(); });
  useShortcut({ key: "s", meta: true, shift: true }, (e) => { e.preventDefault(); state.sortKeys("asc"); });
  useShortcut({ key: "d", meta: true, shift: true }, (e) => { e.preventDefault(); state.downloadOutput("json"); });
  // Fuzzy find — Cmd/Ctrl + / (Cmd+F is the browser's find which most users
  // expect; / is the editor-style "global find" we want here).
  useShortcut({ key: "/", meta: true }, (e) => { e.preventDefault(); setFuzzyOpen(true); });

  return (
    <ToolShell
      tool={tool}
      classNames={{
        header: "hidden md:block",
        body: "max-md:!p-0 max-md:!max-w-none max-w-auto",
      }}
    >
      {isMobile ? (
        <MobileJsonFormatter
          tool={tool}
          state={state}
          sharing={sharing}
          onShare={() => void handleShare()}
          onOpenFind={() => setFuzzyOpen(true)}
          onLoadFile={loadFileAndRemember}
          onLoadSample={loadSampleAndRemember}
          onOpenFetchUrl={() => setFetchUrlOpen(true)}
          recent={history.items}
          onRestoreRecent={restoreRecent}
          onRemoveRecent={history.remove}
          onClearRecent={() => void history.clear()}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Detached top action bar — fit-content pill, How to use floats right */}
          <div className="flex items-center gap-3">
            <div className="overflow-hidden rounded-xl border border-border shadow-card bg-surface w-fit">
              <TopActionBar
                state={state}
                onToggleQuery={() => state.setShowQuery(!state.showQuery)}
                onShare={() => void handleShare()}
                onOpenFind={() => setFuzzyOpen(true)}
                sharing={sharing}
              />
            </div>
            <div className="ml-auto">
              <JsonFormatterGuide />
            </div>
          </div>

          {/* Side panels — render between action bar and editor */}
          {state.showQuery && (
            <QueryPanel state={state} onClose={() => state.setShowQuery(false)} />
          )}

          {state.showStats && (
            <StatsPanel
              value={state.parsedOutput ?? state.parsedValue}
              text={state.output || state.input}
              onClose={() => state.setShowStats(false)}
            />
          )}

          {/* Editor card — input + output + status */}
          <div
            className="flex flex-col overflow-hidden rounded-xl border border-border shadow-card bg-surface"
            style={{ height: "max(520px, calc(100dvh - var(--spacing-header) - 88px))" }}
          >
            <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
              <ResizablePanel defaultSize={38} minSize={20}>
                <InputPanel
                  state={state}
                  onLoadFile={loadFileAndRemember}
                  onOpenFetchUrl={() => setFetchUrlOpen(true)}
                />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={62} minSize={30}>
                <OutputPanel
                  state={state}
                  onLoadSample={loadSampleAndRemember}
                  onLoadFile={loadFileAndRemember}
                  onOpenFetchUrl={() => setFetchUrlOpen(true)}
                  recent={history.items}
                  onRestoreRecent={restoreRecent}
                  onRemoveRecent={history.remove}
                  onClearRecent={() => void history.clear()}
                />
              </ResizablePanel>
            </ResizablePanelGroup>

            <StatusBar state={state} />
          </div>
        </div>
      )}

      <FetchUrlDialog
        open={fetchUrlOpen}
        onOpenChange={setFetchUrlOpen}
        onLoaded={handleUrlLoaded}
      />

      <FuzzyFindDialog
        open={fuzzyOpen}
        onOpenChange={setFuzzyOpen}
        value={state.parsedOutput ?? state.parsedValue}
        onPick={() => { /* path is already copied by the dialog */ }}
      />

      <RepairPreviewDialog
        preview={state.repairPreview}
        onApply={state.applyRepair}
        onCancel={state.cancelRepair}
      />
    </ToolShell>
  );
}
