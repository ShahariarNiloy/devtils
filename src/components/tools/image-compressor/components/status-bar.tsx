"use client";

import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { formatBytes } from "../image-compressor.lib";
import { summarize } from "../image-compressor.selectors";
import { useCompressorStore } from "../image-compressor.store";

/** Status bar: ● state · sizes … Processed on this device. */
export const StatusBar = memo(function StatusBar() {
  const { fileCount, doneCount, compressingCount, queuedCount, errorCount, processedOriginalBytes, totalCompressedBytes } = useCompressorStore(
    useShallow((s) => {
      const t = summarize(s.files);
      return {
        fileCount: t.fileCount,
        doneCount: t.doneCount,
        compressingCount: t.compressingCount,
        queuedCount: t.queuedCount,
        errorCount: t.errorCount,
        processedOriginalBytes: t.processedOriginalBytes,
        totalCompressedBytes: t.totalCompressedBytes,
      };
    }),
  );
  let status: { text: string; tone: string };
  if (fileCount === 0) status = { text: "Waiting for images", tone: "text-text-faint" };
  else if (compressingCount > 0 || queuedCount > 0) {
    const parts = [compressingCount > 0 && `${compressingCount} compressing`, queuedCount > 0 && `${queuedCount} queued`];
    status = { text: parts.filter(Boolean).join(" · "), tone: "text-[#f0c9a0]" };
  } else if (doneCount === 0) status = { text: `${errorCount} failed`, tone: "text-error-text" };
  else
    status = {
      text: `Real sizes, encoded by your browser${errorCount > 0 ? ` · ${errorCount} failed` : ""}`,
      tone: errorCount > 0 ? "text-warning-text" : "text-success-text",
    };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-3.5 py-[9px] font-mono text-[11.5px] text-text-faint">
      <span className={status.tone} role="status" aria-live="polite">
        ● {status.text}
      </span>
      {doneCount > 0 ? (
        <span>
          {formatBytes(processedOriginalBytes)} → {formatBytes(totalCompressedBytes)}
        </span>
      ) : null}
      <span className="grow" />
      <span>Processed on this device</span>
    </div>
  );
});
