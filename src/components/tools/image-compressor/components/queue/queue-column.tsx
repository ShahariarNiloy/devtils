"use client";

import { cn } from "@/lib/cn";
import { memo, useCallback, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { STAGGER_CAP, STAGGER_STEP } from "../../image-compressor.constants";
import { formatBytes } from "../../image-compressor.lib";
import { selectFocusedId, selectIds, summarize } from "../../image-compressor.selectors";
import { useCompressorStore } from "../../image-compressor.store";
import { QueueDropZone } from "../drop-zone";
import { QueueRow } from "./queue-row";

interface RowActions {
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onCancelOne: (id: string) => void;
  onRetryOne: (id: string) => void;
  onSetDisplayName: (id: string, displayName: string | null) => void;
}

interface Props extends RowActions {
  dropHover: boolean;
  dragCount: number;
  onChoose: () => void;
  onDownloadAll: () => void;
  onClearAll: () => void;
}

/**
 * Left column: drop target, the image cards, Download all. Subscribes to
 * the batch totals only; the list below re-renders on add / remove /
 * selection, and each row on its own file's updates.
 */
export const QueueColumn = memo(function QueueColumn({ dropHover, dragCount, onChoose, onDownloadAll, onClearAll, ...rowActions }: Props) {
  const { fileCount, hasResults, examplesOnly, totalSavedPct, totalCompressedBytes, processedOriginalBytes, totalOriginalBytes } = useCompressorStore(
    useShallow((s) => {
      const t = summarize(s.files);
      return {
        fileCount: t.fileCount,
        hasResults: t.hasResults,
        examplesOnly: t.examplesOnly,
        totalSavedPct: t.totalSavedPct,
        totalCompressedBytes: t.totalCompressedBytes,
        processedOriginalBytes: t.processedOriginalBytes,
        totalOriginalBytes: t.totalOriginalBytes,
      };
    }),
  );

  return (
    <section aria-label="Images" className="flex min-w-0 flex-col gap-2.5 bg-[#0e0e0d] p-3 [grid-area:queue] sm:p-3.5 lg:border-r lg:border-border-subtle">
      <QueueDropZone hover={dropHover} dragCount={dragCount} onChoose={onChoose} />

      {fileCount > 0 ? (
        <>
          <div className="flex items-baseline gap-2 px-0.5 pt-1">
            <h2 className="m-0 font-sans text-[13px] font-bold tracking-normal text-text">
              {fileCount} image{fileCount === 1 ? "" : "s"}
            </h2>
            {examplesOnly ? <span className="rounded-full bg-white/6 px-[7px] py-px text-[11px] text-text-tertiary">examples</span> : null}
            <span className="grow" />
            {hasResults ? (
              <span className={cn("text-xs font-semibold", totalSavedPct < 0 ? "text-warning-text" : "text-success-text")}>
                {totalSavedPct < 0 ? `Grew ${Math.abs(totalSavedPct)}%` : `Saved ${totalSavedPct}%`}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClearAll}
              className="cursor-pointer rounded px-1 text-xs text-text-faint transition-colors hover:text-text max-sm:min-h-11 max-sm:px-2"
            >
              Clear all
            </button>
          </div>

          <QueueList {...rowActions} />
        </>
      ) : (
        <p className="m-0 px-0.5 pt-1 text-xs text-text-faint">No images yet. They stay on this device.</p>
      )}

      <span className="grow" />
      {fileCount > 0 ? (
        <div className="flex flex-col gap-1.5 pt-1.5">
          <button
            type="button"
            onClick={onDownloadAll}
            disabled={!hasResults}
            aria-keyshortcuts="Meta+Shift+D Control+Shift+D"
            title="Downloads every finished image as one .zip"
            className="btn-action min-h-11 cursor-pointer rounded-[11px] text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Download all · {formatBytes(totalCompressedBytes)} <span className="font-medium opacity-60">.zip</span>
          </button>
          <span className="text-center font-mono text-[11px] text-text-faint tabular-nums">
            {formatBytes(hasResults ? processedOriginalBytes : totalOriginalBytes)} → {hasResults ? formatBytes(totalCompressedBytes) : "…"}
          </span>
        </div>
      ) : null}
    </section>
  );
});

interface Leaving {
  id: string;
  /** Position in the list it left, so it fades out where it was. */
  index: number;
}

/**
 * The cards. Rows added after the list first appears fade / rise in
 * (CSS, staggered); removed rows stay in place while they fade out, then
 * drop. The list mounts with the first batch, which shows without an
 * entrance — same as before.
 */
const QueueList = memo(function QueueList({ onSelect, onRemove, onDownload, onCancelOne, onRetryOne, onSetDisplayName }: RowActions) {
  const ids = useCompressorStore(useShallow(selectIds));
  const selectedId = useCompressorStore(selectFocusedId);
  const [initialIds] = useState(() => new Set(ids));

  // Track removals during render (no extra commit, so a removed row never
  // unmounts between the store update and its exit animation).
  const [prevIds, setPrevIds] = useState(ids);
  const [leaving, setLeaving] = useState<readonly Leaving[]>([]);
  if (ids !== prevIds) {
    const live = new Set(ids);
    const dropped = prevIds.flatMap((id, index) => (live.has(id) ? [] : [{ id, index }]));
    setPrevIds(ids);
    setLeaving((l) => [...l.filter((x) => !live.has(x.id)), ...dropped]);
  }
  const onLeft = useCallback((id: string) => setLeaving((l) => l.filter((x) => x.id !== id)), []);

  const entries: { id: string; leaving: boolean }[] = ids.map((id) => ({ id, leaving: false }));
  for (const l of [...leaving].sort((a, b) => a.index - b.index)) {
    if (!ids.includes(l.id)) entries.splice(Math.min(l.index, entries.length), 0, { id: l.id, leaving: true });
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0 lg:max-h-[min(760px,calc(100dvh-260px))] lg:overflow-y-auto">
      {entries.map(({ id, leaving: isLeaving }, i) => (
        <QueueRow
          key={id}
          id={id}
          selected={!isLeaving && id === selectedId}
          leaving={isLeaving}
          onLeft={onLeft}
          onSelect={onSelect}
          onRemove={onRemove}
          onDownload={onDownload}
          onCancel={onCancelOne}
          onRetry={onRetryOne}
          onSetDisplayName={onSetDisplayName}
          enterDelay={initialIds.has(id) ? null : Math.min(i * STAGGER_STEP, STAGGER_CAP)}
        />
      ))}
    </ul>
  );
});
