"use client";

import { ToolShell } from "@/components/layout/tool-shell";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { DropZone } from "./components/DropZone";
import { FileQueue } from "./components/FileQueue/FileQueue";
import { SettingsDrawer } from "./components/Settings/SettingsDrawer";
import { ImageCompressorContent } from "./content";
import { StatusBar } from "./components/StatusBar";
import { useImageCompressor } from "./useImageCompressor";

export function ImageCompressor({ tool }: { tool: Tool }) {
  const s = useImageCompressor();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useShortcut(
    { key: "d", meta: true, shift: true, ignoreInEditable: true },
    (e) => {
      e.preventDefault();
      void s.downloadAll();
    }
  );

  const hasFiles = s.files.length > 0;

  return (
    <ToolShell tool={tool}>
      <div className="mx-auto w-full max-w-8xl px-4 sm:px-6">
        {/* ── Workspace hero band ──────────────────────────────── */}
        <header className="mb-8 flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-[28px] font-medium leading-none tracking-tight text-text">
              Image compressor
            </h2>
            <p className="max-w-[52ch] text-sm text-text-muted">
              Shrink JPG, PNG, WebP, AVIF and GIF without leaving the browser.
              Files never reach a server.
            </p>
          </div>
          {/* Promoted local-only signal — privacy is the headline feature
              for this tool, so it gets visual weight on par with the title. */}
          <div className="inline-flex h-9 w-fit shrink-0 items-center gap-2 rounded-full border border-success/30 bg-success/10 pl-2.5 pr-3.5 font-mono text-sm font-medium tracking-eyebrow text-success">
            <ShieldCheck size={14} strokeWidth={2.2} aria-hidden />
            <span className="uppercase">Stays on your device</span>
          </div>
        </header>

        {/* ── Workspace ────────────────────────────────────────── */}
        {hasFiles ? (
          <div className="flex flex-col gap-4">
            {/* Slim dropzone on top of the list — keeps add-more / paste
                reachable without the big empty-state hero. */}
            <DropZone variant="compact" onFiles={s.addFiles} />
            <FileQueue
              files={s.files}
              expandedFileId={s.expandedFileId}
              totalOriginalBytes={s.totalOriginalBytes}
              totalCompressedBytes={s.totalCompressedBytes}
              totalSavedPct={s.totalSavedPct}
              sortMode={s.sortMode}
              onToggleExpanded={s.toggleExpanded}
              onRemove={s.removeFile}
              onCancelOne={s.cancelOne}
              onDownload={s.downloadOne}
              onAddFiles={s.addFiles}
              onClearAll={s.clearAll}
              onOpenSettings={() => setSettingsOpen(true)}
              onUpdateFileSettings={s.updateFileSettings}
              onResetFileSettings={s.resetFileSettings}
              onRecompressOne={s.recompressOne}
              onSetAllQuality={s.setAllQuality}
              onSetDisplayName={s.setDisplayName}
              onSetSortMode={s.setSortMode}
            />
            <StatusBar
              fileCount={s.files.length}
              totalOriginalBytes={s.totalOriginalBytes}
              totalCompressedBytes={s.totalCompressedBytes}
              totalSavedPct={s.totalSavedPct}
              doneCount={s.doneCount}
              compressingCount={s.compressingCount}
              queuedCount={s.queuedCount}
              onDownloadAll={s.downloadAll}
            />
          </div>
        ) : (
          <DropZone onFiles={s.addFiles} />
        )}

        <ImageCompressorContent />

        {/* Trailing breathing room so the status bar isn't kissing the page bottom. */}
        <div className="h-12" />
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={s.globalSettings}
        onChange={s.updateGlobalSettings}
        dirtyCount={s.dirtyCount}
        onRecompressDirty={s.recompressDirty}
      />
    </ToolShell>
  );
}
