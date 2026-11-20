"use client";

import { ToolShell } from "@/components/layout/tool-shell";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { useEffect, useMemo, useState } from "react";
import { DropZone } from "./components/drop-zone";
import { PreviewPanel } from "./components/file-detail/preview-panel";
import { FileQueue } from "./components/file-queue/file-queue";
import { SettingsDrawer } from "./components/settings/settings-drawer";
import { StatusBar } from "./components/status-bar";
import { Toolbar } from "./components/toolbar";
import { ImageCompressorContent, seoData } from "./content";
import { pickFocusedFile } from "./image-compressor.view";
import { useImageCompressor } from "./useImageCompressor";

export function ImageCompressor({ tool }: { tool: Tool }) {
  const s = useImageCompressor();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useShortcut({ key: "d", meta: true, shift: true, ignoreInEditable: true, label: "Download all" }, (e) => {
    e.preventDefault();
    void s.downloadAll();
  });

  // Settings changes apply live, like the toolbar promises: any finished
  // image whose settings no longer match its result is re-queued. Files
  // still running are left alone — they're picked up here once they land
  // (setResult marks a result stale when settings moved mid-flight).
  const { files, recompressOne } = s;
  useEffect(() => {
    for (const f of files) {
      if (f.settingsDirty && f.status === "done") recompressOne(f.id);
    }
  }, [files, recompressOne]);

  const focused = useMemo(() => pickFocusedFile(s.files, s.expandedFileId), [s.files, s.expandedFileId]);
  const errorCount = useMemo(() => s.files.filter((f) => f.status === "error").length, [s.files]);
  const hasFiles = s.files.length > 0;

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px] md:flex md:h-[max(var(--ws-min,600px),calc(100dvh-var(--chrome-top,165px)-24px))] md:flex-col">
        <Toolbar
          settings={s.globalSettings}
          onChange={s.updateGlobalSettings}
          hasFiles={hasFiles}
          sortMode={s.sortMode}
          onSetSortMode={s.setSortMode}
          onSetAllQuality={s.setAllQuality}
          onAddFiles={s.addFiles}
          onOpenSettings={() => setSettingsOpen(true)}
          onClearAll={s.clearAll}
        />

        {hasFiles ? (
          <div className="flex min-h-[460px] md:min-h-0 md:flex-1 md:[&>*]:min-h-0 md:[&>*]:overflow-auto flex-col md:flex-row">
            <PreviewPanel
              file={focused}
              onFiles={s.addFiles}
              onUpdateSettings={s.updateFileSettings}
              onResetToGlobal={s.resetFileSettings}
              onDownload={s.downloadOne}
            />
            <FileQueue
              files={s.files}
              selectedId={focused?.id ?? null}
              processedOriginalBytes={s.processedOriginalBytes}
              totalCompressedBytes={s.totalCompressedBytes}
              totalSavedPct={s.totalSavedPct}
              doneCount={s.doneCount}
              onSelect={s.setExpanded}
              onRemove={s.removeFile}
              onDownload={s.downloadOne}
              onCancelOne={s.cancelOne}
              onSetDisplayName={s.setDisplayName}
              onDownloadAll={s.downloadAll}
            />
          </div>
        ) : (
          <div className="flex min-h-[460px] p-3.5 md:min-h-0 md:flex-1">
            <DropZone onFiles={s.addFiles} />
          </div>
        )}

        <StatusBar
          fileCount={s.files.length}
          doneCount={s.doneCount}
          compressingCount={s.compressingCount}
          queuedCount={s.queuedCount}
          errorCount={errorCount}
          processedOriginalBytes={s.processedOriginalBytes}
          totalCompressedBytes={s.totalCompressedBytes}
          settings={s.globalSettings}
        />
      </div>

      <ImageCompressorContent />

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
