"use client";

import { formatBytes } from "../image-compressor.lib";
import type { CompressionSettings } from "../image-compressor.types";
import { settingsSummary } from "../image-compressor.view";

interface Props {
  fileCount: number;
  doneCount: number;
  compressingCount: number;
  queuedCount: number;
  errorCount: number;
  processedOriginalBytes: number;
  totalCompressedBytes: number;
  settings: CompressionSettings;
}

/** v2 status bar: state · sizes · settings … Local-only. */
export function StatusBar({
  fileCount,
  doneCount,
  compressingCount,
  queuedCount,
  errorCount,
  processedOriginalBytes,
  totalCompressedBytes,
  settings,
}: Props) {
  let status: { text: string; tone: string };
  if (fileCount === 0) status = { text: "Waiting for images", tone: "text-text-faint" };
  else if (compressingCount > 0 || queuedCount > 0) {
    const parts = [compressingCount > 0 && `${compressingCount} compressing`, queuedCount > 0 && `${queuedCount} queued`];
    status = { text: parts.filter(Boolean).join(" · "), tone: "text-clay-light" };
  } else if (doneCount === 0) status = { text: `${errorCount} failed`, tone: "text-error" };
  else
    status = {
      text: `${doneCount} ${doneCount === 1 ? "image" : "images"} ready${errorCount > 0 ? ` · ${errorCount} failed` : ""}`,
      tone: errorCount > 0 ? "text-warning" : "text-success",
    };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
      <span className={status.tone} role="status">
        ● {status.text}
      </span>
      {doneCount > 0 ? (
        <span>
          {formatBytes(processedOriginalBytes)} → {formatBytes(totalCompressedBytes)}
        </span>
      ) : null}
      <span className="max-sm:hidden">{settingsSummary(settings)}</span>
      <span className="grow" />
      <span className="text-success-text">Local-only</span>
    </div>
  );
}
