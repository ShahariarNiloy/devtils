"use client";

import { useCallback, useMemo, useState } from "react";
import type { Tool } from "@/lib/tools-registry";
import { byteLength, countKeys, formatBytes } from "../json-formatter.lib";
import type { ConvertTarget, ViewMode } from "../json-formatter.types";
import type { JsonFormatterState } from "../use-json-formatter";
import type { HistoryEntry } from "../hooks/use-history";
import { QueryPanel } from "../panels/query-panel";
import { StatsPanel } from "../panels/stats-panel";
import { MobileAppBar } from "./mobile-app-bar";
import { MobileModeSwitch, type MobileMode } from "./mobile-mode-switch";
import { MobileViewTabs } from "./mobile-view-tabs";
import { MobileStatusStrip } from "./mobile-status-strip";
import { MobileActionSheet } from "./mobile-action-sheet";
import { MobileMoreSheet } from "./mobile-more-sheet";
import { MobileInputView } from "./mobile-input-view";
import { MobileOutputView } from "./mobile-output-view";

interface MobileJsonFormatterProps {
  tool: Tool;
  state: JsonFormatterState;
  sharing: boolean;
  onShare: () => void;
  onOpenFind: () => void;
  onLoadFile: (file: File) => void;
  onLoadSample: (key: string) => void;
  onOpenFetchUrl: () => void;
  recent: HistoryEntry[];
  onRestoreRecent: (entry: HistoryEntry) => void;
  onRemoveRecent: (id: string) => void;
  onClearRecent: () => void;
}

/**
 * Mobile shell for the JSON formatter. Single-pane (Input or Output), with a
 * bottom action sheet and a slide-up "more" sheet for secondary actions. The
 * top app bar replaces the desktop ToolShell header on small viewports.
 */
export function MobileJsonFormatter({
  tool,
  state,
  sharing,
  onShare,
  onOpenFind,
  onLoadFile,
  onLoadSample,
  onOpenFetchUrl,
  recent,
  onRestoreRecent,
  onRemoveRecent,
  onClearRecent,
}: MobileJsonFormatterProps) {
  const [mode, setMode] = useState<MobileMode>("input");
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // After a successful Format / Convert / Repair-apply, surface the result
  // by flipping to Output mode. We use the "derived state from props" idiom
  // (sync-during-render) so this stays a single render path — no extra
  // useEffect tick, and it doesn't fight the `react-hooks/set-state-in-effect`
  // rule, which forbids setState inside an effect body.
  const [lastOutput, setLastOutput] = useState(state.output);
  if (state.output !== lastOutput) {
    setLastOutput(state.output);
    if (state.output && mode === "input") setMode("output");
  }

  const hasInput = state.input.trim().length > 0;
  const invalid = state.validation.status === "invalid";
  const canFormat = hasInput && !invalid;
  const hasOutput = Boolean(
    state.output || (state.parsedValue !== null && state.parsedValue !== undefined),
  );

  // ── App bar status ─────────────────────────────────────────────────────────
  const appBarStatus = useMemo(() => {
    const v = state.validation;
    if (v.status === "valid") return { text: "Valid", tone: "valid" as const };
    if (v.status === "invalid")
      return { text: `Ln ${v.line}, col ${v.col}`, tone: "invalid" as const };
    return null;
  }, [state.validation]);

  // ── Mode-switch counts + status strip ─────────────────────────────────────
  // byteLength runs TextEncoder.encode → O(n) plus a Uint8Array allocation.
  // We need this twice per render (status strip raw, mode-switch chip
  // formatted), so we compute once and share. Without sharing, fast typing
  // on large pastes pays the encode cost twice every keystroke.
  const bytes = useMemo(() => byteLength(state.input), [state.input]);
  const inputBytes = useMemo(
    () => (bytes > 0 ? formatBytes(bytes) : undefined),
    [bytes],
  );
  const outputKeyCount = useMemo(() => {
    const parsed = state.parsedOutput ?? state.parsedValue;
    if (parsed === null || parsed === undefined) return undefined;
    try {
      return String(countKeys(parsed));
    } catch {
      return undefined;
    }
  }, [state.parsedOutput, state.parsedValue]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleFormat = useCallback(() => {
    state.format();
    setMode("output");
  }, [state]);

  const handleConvert = useCallback(
    (kind: string) => {
      state.convert(kind as ConvertTarget);
      setMode("output");
    },
    [state],
  );

  const handleToggleQuery = useCallback(() => {
    state.setShowQuery(!state.showQuery);
  }, [state]);

  const handleToggleStats = useCallback(() => {
    state.setShowStats(!state.showStats);
  }, [state]);

  const handleCopyOutput = useCallback(() => {
    void state.copyOutput();
  }, [state]);

  const handleDownload = useCallback(() => {
    state.downloadOutput("json");
  }, [state]);

  const handleViewModeChange = useCallback(
    (m: ViewMode) => {
      state.setViewMode(m);
    },
    [state],
  );

  const handleModeChange = useCallback((m: MobileMode) => {
    setMode(m);
    setSearchTerm("");
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  // Fill the viewport below the sticky global header. Using dvh so iOS
  // address-bar collapse doesn't desync the action sheet from the bottom edge.
  return (
    <div
      className="flex flex-col bg-canvas"
      style={{ height: "calc(100dvh - var(--spacing-header))" }}
    >
      <MobileAppBar
        title={tool.name}
        tier={tool.tier}
        status={appBarStatus}
        onOpenMore={() => setMoreOpen(true)}
      />

      <MobileModeSwitch
        mode={mode}
        onModeChange={handleModeChange}
        inputLabel={inputBytes}
        outputLabel={outputKeyCount}
      />

      {/* Side panels (Query / Stats) — appear inline above the editor when
          toggled. They take vertical space rather than opening as modal
          sheets, so the user can keep editing while glancing at them. */}
      {state.showQuery && (
        <div className="shrink-0 px-3 pt-2">
          <QueryPanel state={state} onClose={() => state.setShowQuery(false)} />
        </div>
      )}
      {state.showStats && (
        <div className="max-h-[40vh] shrink-0 overflow-auto px-3 pt-2">
          <StatsPanel
            value={state.parsedOutput ?? state.parsedValue}
            text={state.output || state.input}
            onClose={() => state.setShowStats(false)}
          />
        </div>
      )}

      {mode === "output" && hasOutput && (
        <MobileViewTabs
          viewMode={state.viewMode}
          onViewModeChange={handleViewModeChange}
          canUseTable={state.canUseTableView}
        />
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {mode === "input" ? (
          <MobileInputView state={state} onLoadFile={onLoadFile} />
        ) : (
          <MobileOutputView
            state={state}
            searchTerm={searchTerm}
            onLoadSample={onLoadSample}
            onLoadFile={onLoadFile}
            onOpenFetchUrl={onOpenFetchUrl}
            recent={recent}
            onRestoreRecent={onRestoreRecent}
            onRemoveRecent={onRemoveRecent}
            onClearRecent={onClearRecent}
          />
        )}
      </div>

      <MobileStatusStrip
        validation={state.validation}
        bytes={bytes}
        fileName={state.fileName}
      />

      <MobileActionSheet
        mode={mode}
        hasInput={hasInput}
        hasOutput={hasOutput}
        canFormat={canFormat}
        onFormat={handleFormat}
        onMinify={state.minify}
        onCopyOutput={handleCopyOutput}
        onOpenFind={onOpenFind}
        onOpenMore={() => setMoreOpen(true)}
      />

      <MobileMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        hasInput={hasInput}
        hasOutput={hasOutput}
        canFormat={canFormat}
        isQueryOpen={state.showQuery}
        isStatsOpen={state.showStats}
        sharing={sharing}
        recentCount={recent.length}
        onFormat={handleFormat}
        onMinify={state.minify}
        onSortAsc={() => state.sortKeys("asc")}
        onSortDesc={() => state.sortKeys("desc")}
        onRepair={state.repair}
        onConvert={handleConvert}
        onToggleQuery={handleToggleQuery}
        onToggleStats={handleToggleStats}
        onShare={onShare}
        onDownload={handleDownload}
        onOpenFind={onOpenFind}
      />
    </div>
  );
}
