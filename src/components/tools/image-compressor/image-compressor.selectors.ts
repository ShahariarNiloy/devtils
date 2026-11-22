/**
 * Store selectors. Each part of the workspace subscribes to the slice it
 * draws — a row to its own file, the stage to the focused file, the
 * columns to a few counts — so a per-file update (status, result, probes,
 * thumbnail) re-renders only what shows that file. Pure: no React.
 */

import type { ImageFile } from "./image-compressor.types";
import { pickFocusedFile } from "./image-compressor.view";

interface FilesSlice {
  files: ImageFile[];
  expandedFileId: string | null;
}

/** Batch-wide counts and totals, derived from the file list. */
export interface QueueSummary {
  fileCount: number;
  totalOriginalBytes: number;
  /** Original bytes of the files that have a result (pairs with totalCompressedBytes). */
  processedOriginalBytes: number;
  totalCompressedBytes: number;
  /** Signed: negative when the batch grew. */
  totalSavedPct: number;
  doneCount: number;
  compressingCount: number;
  queuedCount: number;
  errorCount: number;
  /** Images with their own format. */
  overrideCount: number;
  /** Any image has a result (fresh or stale). */
  hasResults: boolean;
  /** Only the example images are loaded. */
  examplesOnly: boolean;
}

// One pass per file list, however many components read it.
const summaries = new WeakMap<readonly ImageFile[], QueueSummary>();

export function summarize(files: readonly ImageFile[]): QueueSummary {
  const hit = summaries.get(files);
  if (hit) return hit;
  let orig = 0;
  let processedOrig = 0;
  let comp = 0;
  let done = 0;
  let compressing = 0;
  let queued = 0;
  let errors = 0;
  let overrides = 0;
  let samples = 0;
  let results = 0;
  for (const f of files) {
    orig += f.originalSize;
    if (f.result) {
      results += 1;
      processedOrig += f.originalSize;
      comp += f.result.newSize;
    }
    if (f.status === "done") done += 1;
    else if (f.status === "compressing") compressing += 1;
    else if (f.status === "idle") queued += 1;
    else if (f.status === "error") errors += 1;
    if (f.formatOverride !== null) overrides += 1;
    if (f.sample) samples += 1;
  }
  const summary: QueueSummary = {
    fileCount: files.length,
    totalOriginalBytes: orig,
    processedOriginalBytes: processedOrig,
    totalCompressedBytes: comp,
    // Matches the per-file convention in image-compressor.lib so the totals
    // can honestly show a regression instead of clamping to 0.
    totalSavedPct: processedOrig === 0 ? 0 : Math.round(((processedOrig - comp) / processedOrig) * 100),
    doneCount: done,
    compressingCount: compressing,
    queuedCount: queued,
    errorCount: errors,
    overrideCount: overrides,
    hasResults: done > 0 || results > 0,
    examplesOnly: files.length > 0 && samples === files.length,
  };
  summaries.set(files, summary);
  return summary;
}

/** Row ids in queue order — pair with `useShallow` so it only changes on add / remove / reorder. */
export const selectIds = (s: FilesSlice): string[] => s.files.map((f) => f.id);

export const selectFocused = (s: FilesSlice): ImageFile | null => pickFocusedFile(s.files, s.expandedFileId);

export const selectFocusedId = (s: FilesSlice): string | null => selectFocused(s)?.id ?? null;

/**
 * One row's file that outlives its removal: returns the last file seen for
 * `id`, so a row can play its exit animation after the store drops it.
 * Create one per row (the memory is the closure).
 */
export function rememberFile(id: string): (s: FilesSlice) => ImageFile | undefined {
  let last: ImageFile | undefined;
  return (s) => {
    last = s.files.find((f) => f.id === id) ?? last;
    return last;
  };
}
