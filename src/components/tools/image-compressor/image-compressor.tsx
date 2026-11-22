"use client";

import { ToolShell } from "@/components/layout/tool-shell";
import { cn } from "@/lib/cn";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { memo, useCallback, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ImageCompressorContent } from "./components/content-section";
import {
  FilePicker,
  useImageDrop,
  usePasteImages,
} from "./components/drop-zone";
import { EmptyStart } from "./components/empty-start";
import { Stage } from "./components/file-detail/stage";
import { QueueColumn } from "./components/queue/queue-column";
import { SettingsColumn } from "./components/settings/settings-column";
import { StatusBar } from "./components/status-bar";
import { seoData } from "./content";
import { makeExampleFiles } from "./image-compressor.examples";
import type { StartingPoint } from "./image-compressor.starts";
import { useCompressorStore } from "./image-compressor.store";
import { useImageCompressor } from "./useImageCompressor";

/**
 * The workspace frame. It subscribes to nothing in the store — each column
 * reads its own slice — so per-file updates during a batch never re-render
 * this component, the ToolShell, or the content below.
 */
export function ImageCompressor({ tool }: { tool: Tool }) {
  const s = useImageCompressor();
  const inputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  useShortcut(
    {
      key: "d",
      meta: true,
      shift: true,
      ignoreInEditable: true,
      label: "Download all",
    },
    (e) => {
      e.preventDefault();
      void s.downloadAll();
    },
  );

  const { addFiles } = s;
  const onFiles = useCallback((list: File[]) => addFiles(list), [addFiles]);
  const drop = useImageDrop(onFiles);
  usePasteImages(onFiles);

  const choose = useCallback(() => inputRef.current?.click(), []);
  const loadExamples = useCallback(async () => {
    const examples = await makeExampleFiles();
    if (examples.length === 0) {
      toast.error(
        "This browser can't draw the examples — drop your own images instead",
      );
      return;
    }
    addFiles(examples, { sample: true });
  }, [addFiles]);

  const { editSettings } = s;
  const applyStart = useCallback(
    (p: StartingPoint) => {
      editSettings(p.patch);
      toast.success(`Using “${p.title}” — ${p.chip}`);
      const el = workspaceRef.current;
      if (el && el.getBoundingClientRect().top < 0) {
        const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)")
          .matches;
        el.scrollIntoView({
          behavior: smooth ? "smooth" : "auto",
          block: "start",
        });
      }
    },
    [editSettings],
  );

  return (
    <ToolShell
      tool={tool}
      relatedSlugs={seoData.relatedSlugs}
      titleStyle="inline"
      wide={false}
    >
      <div
        id="tool"
        ref={workspaceRef}
        {...drop.handlers}
        className={cn(
          "scroll-mt-4 overflow-hidden rounded-[14px] bg-canvas shadow-window-tool transition-shadow sm:rounded-[18px]",
          drop.hover && "ring-2 ring-clay-light/50",
        )}
      >
        <FilePicker inputRef={inputRef} onFiles={onFiles} />
        <WorkspaceSwitch
          dropHover={drop.hover}
          onChoose={choose}
          onExamples={loadExamples}
          settings={
            <SettingsColumn
              onEdit={s.editSettings}
              onApply={s.applyDraft}
              onResetOverrides={s.clearFormatOverrides}
              onAutoUpdate={s.setAutoUpdate}
            />
          }
        >
          <div className="grid grid-cols-1 items-stretch [grid-template-areas:'queue'_'stage'_'settings'] motion-safe:animate-[queue-row-in_0.28s_cubic-bezier(0.23,1,0.32,1)] lg:grid-cols-[300px_minmax(0,1fr)_296px] lg:[grid-template-areas:'queue_stage_settings']">
            <QueueColumn
              dropHover={drop.hover}
              dragCount={drop.dragCount}
              onChoose={choose}
              onSelect={s.setExpanded}
              onRemove={s.removeFile}
              onDownload={s.downloadOne}
              onCancelOne={s.cancelOne}
              onRetryOne={s.recompressOne}
              onSetDisplayName={s.setDisplayName}
              onDownloadAll={s.downloadAll}
              onClearAll={s.clearAll}
            />
            <Stage
              onEnsureDiff={s.ensureDiff}
              onEnsureProbes={s.ensureProbes}
              onEditSettings={s.editSettings}
              onPickFormat={s.pickFormat}
              onConvertAll={s.setConvertAll}
              onFollowGlobal={s.followGlobalFormat}
              onDownload={s.downloadOne}
              onChooseFiles={choose}
              onExamples={loadExamples}
            />
            <SettingsColumn
              onEdit={s.editSettings}
              onApply={s.applyDraft}
              onResetOverrides={s.clearFormatOverrides}
              onAutoUpdate={s.setAutoUpdate}
            />
          </div>
          <StatusBar />
        </WorkspaceSwitch>
      </div>

      <ImageCompressorContent onApply={applyStart} />
    </ToolShell>
  );
}

/**
 * Empty → a simple start screen; first image → the full workspace. Reads
 * only "are there any images?", which flips rarely, so per-file updates
 * still never re-render the frame.
 */
const WorkspaceSwitch = memo(function WorkspaceSwitch({
  dropHover,
  onChoose,
  onExamples,
  settings,
  children,
}: {
  dropHover: boolean;
  onChoose: () => void;
  onExamples: () => void;
  settings: ReactNode;
  children: ReactNode;
}) {
  const hasFiles = useCompressorStore((st) => st.files.length > 0);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const toggleOptions = useCallback(() => setOptionsOpen((o) => !o), []);
  if (hasFiles) return <>{children}</>;
  return (
    // Named areas: the settings column places itself in the "settings" area.
    <div
      className={cn(
        "grid grid-cols-1 [grid-template-areas:'start'_'settings']",
        optionsOpen &&
          "lg:grid-cols-[minmax(0,1fr)_296px] lg:[grid-template-areas:'start_settings']",
      )}
    >
      <div className="[grid-area:start]">
        <EmptyStart
          dropHover={dropHover}
          optionsOpen={optionsOpen}
          onChoose={onChoose}
          onExamples={onExamples}
          onToggleOptions={toggleOptions}
        />
      </div>
      {optionsOpen ? settings : null}
    </div>
  );
});
