"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatBytes } from "../image-compressor.lib";

interface Props {
  fileCount: number;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  totalSavedPct: number;
  doneCount: number;
  compressingCount: number;
  queuedCount: number;
  onDownloadAll: () => void;
}

export function StatusBar({
  fileCount,
  totalOriginalBytes,
  totalCompressedBytes,
  totalSavedPct,
  doneCount,
  compressingCount,
  queuedCount,
  onDownloadAll,
}: Props) {
  const hasResults = doneCount > 0;
  const stillWorking = compressingCount > 0 || queuedCount > 0;

  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border-subtle bg-surface px-4 py-3 text-text-muted shadow-[0_1px_2px_rgba(26,26,24,0.03)]">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-sm tabular-nums">
        <span className="flex items-baseline gap-1.5">
          <span className="uppercase tracking-eyebrow text-text-faint">
            files
          </span>
          <span className="font-semibold text-text">{fileCount}</span>
        </span>
        <span className="text-text-faint/60">·</span>
        <span className="flex items-baseline gap-1.5">
          <span className="uppercase tracking-eyebrow text-text-faint">
            size
          </span>
          <span>
            {formatBytes(totalOriginalBytes)}
            <span className="mx-1 text-text-faint">→</span>
            {formatBytes(totalCompressedBytes)}
          </span>
        </span>
        <span className="text-text-faint/60">·</span>
        <span className="flex items-baseline gap-1.5">
          <span className="uppercase tracking-eyebrow text-text-faint">
            {totalSavedPct >= 0 ? "saved" : "grew"}
          </span>
          <span
            className={cn(
              "font-semibold",
              totalSavedPct > 0 && "text-success",
              totalSavedPct < 0 && "text-warning",
              totalSavedPct === 0 && "text-text-muted",
            )}
          >
            {totalSavedPct < 0 ? Math.abs(totalSavedPct) : totalSavedPct}%
          </span>
        </span>
        {stillWorking ? (
          <span className="ml-2 flex items-center gap-2 text-text-faint">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-clay"
            />
            <span>
              {compressingCount > 0
                ? `${compressingCount} compressing`
                : ""}
              {compressingCount > 0 && queuedCount > 0 ? " · " : ""}
              {queuedCount > 0 ? `${queuedCount} queued` : ""}
            </span>
          </span>
        ) : doneCount > 0 ? (
          <span className="ml-2 uppercase tracking-eyebrow text-text-faint">
            all done
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onDownloadAll}
        disabled={!hasResults}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-lg bg-clay px-4 text-sm font-bold text-text-on-sage transition-[opacity,transform] duration-150 ease-out-strong",
          hasResults
            ? "hover:opacity-95 active:scale-[0.97] cursor-pointer"
            : "opacity-40 cursor-not-allowed",
        )}
      >
        <Download size={14} strokeWidth={2.2} aria-hidden />
        Download all (.zip)
      </button>
    </footer>
  );
}
