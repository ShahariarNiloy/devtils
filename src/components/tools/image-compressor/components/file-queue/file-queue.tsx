"use client";

import { cn } from "@/lib/cn";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { Download } from "lucide-react";
import { STAGGER_CAP, STAGGER_STEP } from "../../image-compressor.constants";
import { formatBytes } from "../../image-compressor.lib";
import type { ImageFile } from "../../image-compressor.types";
import { totalSavedText } from "../../image-compressor.view";
import { FileRow } from "./file-row";

interface Props {
  files: ImageFile[];
  selectedId: string | null;
  processedOriginalBytes: number;
  totalCompressedBytes: number;
  totalSavedPct: number;
  doneCount: number;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onCancelOne: (id: string) => void;
  onSetDisplayName: (id: string, displayName: string | null) => void;
  onDownloadAll: () => void;
}

/** Right column of the v2 workspace: per-image cards + Download all. */
export function FileQueue({
  files,
  selectedId,
  processedOriginalBytes,
  totalCompressedBytes,
  totalSavedPct,
  doneCount,
  onSelect,
  onRemove,
  onDownload,
  onCancelOne,
  onSetDisplayName,
  onDownloadAll,
}: Props) {
  const reduceMotion = !!useReducedMotion();
  const hasResults = doneCount > 0;

  return (
    <section aria-label="Images" className="flex min-w-0 flex-col gap-2 p-3.5 md:flex-[1_1_340px]">
      <div className="flex items-baseline gap-2">
        <h2 className="m-0 grow text-[13px] font-bold text-text">
          {files.length} {files.length === 1 ? "image" : "images"}
        </h2>
        {hasResults ? (
          <span className={cn("text-[13px] font-bold", totalSavedPct < 0 ? "text-warning-text" : "text-success-text")}>
            {totalSavedText(processedOriginalBytes, totalCompressedBytes, totalSavedPct)}
          </span>
        ) : (
          <span className="text-[13px] text-text-faint">Compressing…</span>
        )}
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        <AnimatePresence initial={false}>
          {files.map((f, i) => (
            <FileRow
              key={f.id}
              file={f}
              selected={f.id === selectedId}
              onSelect={() => onSelect(f.id)}
              onRemove={() => onRemove(f.id)}
              onDownload={() => onDownload(f.id)}
              onCancel={() => onCancelOne(f.id)}
              onSetDisplayName={(name) => onSetDisplayName(f.id, name)}
              reduceMotion={reduceMotion}
              entryDelay={Math.min(i * STAGGER_STEP, STAGGER_CAP)}
            />
          ))}
        </AnimatePresence>
      </ul>

      <button
        type="button"
        onClick={onDownloadAll}
        disabled={!hasResults}
        aria-keyshortcuts="Meta+Shift+D Control+Shift+D"
        title="Downloads every finished image as one .zip"
        className="btn-action mt-auto inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Download size={16} strokeWidth={2.2} aria-hidden />
        Download all · {formatBytes(totalCompressedBytes)}
      </button>
    </section>
  );
}
