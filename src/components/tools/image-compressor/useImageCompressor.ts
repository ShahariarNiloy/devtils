"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { downloadZip } from "client-zip";
import {
  MAX_FILES_IN_BATCH,
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_INPUT_MIME_TYPES,
  WORKER_POOL_SIZE,
} from "./image-compressor.constants";
import {
  baseFileName,
  extensionForMime,
  formatBytes,
  resolveInputMime,
} from "./image-compressor.lib";
import {
  CompressionFailure,
  toCompressionError,
} from "./image-compressor.errors";
import { extractIcc, supportsIcc } from "./image-compressor.icc";
import {
  mergeSettings,
  useCompressorStore,
  type SortMode,
} from "./image-compressor.store";
import { createWorkerPool, type WorkerPool } from "./worker-pool";
import type {
  CompressionSettings,
  ImageFile,
  QualityMode,
} from "./image-compressor.types";

export type { SortMode };

// ── Hook ──────────────────────────────────────────────────────────

export function useImageCompressor() {
  // Reactive slices — components re-render when these change. Async code
  // (queue loop, worker callbacks, drag handlers) reads the live values
  // through `useCompressorStore.getState()` instead, so there's no
  // manually-synced ref and no render-lag race.
  const files = useCompressorStore((s) => s.files);
  const expandedFileId = useCompressorStore((s) => s.expandedFileId);
  const globalSettings = useCompressorStore((s) => s.globalSettings);
  const sortMode = useCompressorStore((s) => s.sortMode);

  const queueRunningRef = useRef(false);
  // Map of fileId → in-flight worker pool jobId. Used so cancelOne()
  // can look up the right worker to terminate.
  const jobIdMapRef = useRef<Map<string, string>>(new Map());

  // Worker pool — lazily created on first compress so an empty
  // workspace doesn't allocate codec WASMs. Guarded against SSR.
  const poolRef = useRef<WorkerPool | null>(null);
  const getPool = useCallback((): WorkerPool => {
    if (typeof window === "undefined") {
      throw new Error("Worker pool requires a browser environment");
    }
    if (!poolRef.current) {
      poolRef.current = createWorkerPool(WORKER_POOL_SIZE);
    }
    return poolRef.current;
  }, []);

  /**
   * Apply the current sort mode for display. The underlying `files`
   * array stays in upload order so re-uploads keep stable IDs and dedup
   * semantics; we only rearrange a copy for rendering.
   */
  const visibleFiles = useMemo(() => {
    if (sortMode === "upload") return files;
    const copy = [...files];
    const nameOf = (f: ImageFile) => f.displayName ?? f.file.name;
    switch (sortMode) {
      case "name":
        copy.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
        break;
      case "size-desc":
        copy.sort((a, b) => b.originalSize - a.originalSize);
        break;
      case "savings-desc":
        copy.sort(
          (a, b) => (b.result?.savedPct ?? -Infinity) - (a.result?.savedPct ?? -Infinity),
        );
        break;
    }
    return copy;
  }, [files, sortMode]);

  const stats = useMemo(() => {
    let orig = 0;
    let processedOrig = 0;
    let comp = 0;
    let done = 0;
    let compressing = 0;
    let queued = 0;
    let dirty = 0;
    for (const f of files) {
      orig += f.originalSize;
      if (f.result) {
        processedOrig += f.originalSize;
        comp += f.result.newSize;
      }
      if (f.status === "done") done += 1;
      if (f.status === "compressing") compressing += 1;
      if (f.status === "idle") queued += 1;
      if (f.settingsDirty) dirty += 1;
    }
    // Signed total reduction. Matches the per-file convention in
    // `image-compressor.lib.ts` so the status bar can honestly show
    // a regression ("+5% larger") instead of clamping to 0.
    const totalSavedPct =
      processedOrig === 0
        ? 0
        : Math.round(((processedOrig - comp) / processedOrig) * 100);
    return {
      totalOriginalBytes: orig,
      totalCompressedBytes: comp,
      totalSavedPct,
      doneCount: done,
      compressingCount: compressing,
      queuedCount: queued,
      dirtyCount: dirty,
    };
  }, [files]);

  // ── Queue ──

  const compressOneInternal = useCallback(
    async (id: string) => {
      const store = useCompressorStore.getState();
      const target = store.files.find((f) => f.id === id);
      if (!target) return;
      // Snapshot the settings reference at start so setResult can detect
      // if the user changed settings during compression (H2).
      const settingsAtStart = target.settings;
      store.setStatus(id, "compressing");
      try {
        // Read the file fresh each time — the previous buffer was
        // transferred into the worker and is no longer accessible. File
        // objects retain their backing storage so this is cheap.
        const buffer = await target.file.arrayBuffer();
        const { id: jobId, promise } = getPool().compress(
          buffer,
          target.inputMimeType,
          settingsAtStart,
        );
        // Track the job ID so a user-initiated cancel can find the
        // right worker. Cleared in `finally` so a stale entry never
        // points at a completed job.
        jobIdMapRef.current.set(id, jobId);
        const result = await promise;
        // Bail if removed while we were running. Worker response is
        // silently dropped — the result buffer was transferred back
        // but the file row no longer exists to display it.
        if (!useCompressorStore.getState().files.some((f) => f.id === id))
          return;
        useCompressorStore.getState().setResult(id, result, settingsAtStart);
      } catch (err) {
        // The pool always rejects with a CompressionFailure (cancel,
        // crash, terminate, or a worker-side failure); `toCompressionError`
        // also covers any stray Error. setError sets status="error", which
        // keeps the queue effect from auto-restarting the file. The UI maps
        // the kind to copy — "cancelled" renders as a non-scary state.
        const detail =
          err instanceof CompressionFailure ? err.detail : toCompressionError(err);
        useCompressorStore.getState().setError(id, detail);
      } finally {
        jobIdMapRef.current.delete(id);
      }
    },
    [getPool],
  );

  const runQueue = useCallback(async () => {
    // queueRunningRef is claimed by the effect below, not here. This
    // function only releases the claim when done so the effect can
    // rearm.
    //
    // Parallel pipeline: keep up to WORKER_POOL_SIZE compressions in
    // flight at any time. As each one finishes we look for the next
    // idle file. Replaces the previous serial `await compressOne`
    // loop, which left the second worker permanently idle.
    const inFlight = new Map<string, Promise<void>>();
    try {
      while (true) {
        while (inFlight.size < WORKER_POOL_SIZE) {
          const next = useCompressorStore
            .getState()
            .files.find((f) => f.status === "idle" && !inFlight.has(f.id));
          if (!next) break;
          const id = next.id;
          const p = compressOneInternal(id).finally(() => {
            inFlight.delete(id);
          });
          inFlight.set(id, p);
        }
        if (inFlight.size === 0) break;
        // Wait for any one to settle, then re-evaluate.
        await Promise.race(inFlight.values());
      }
    } finally {
      queueRunningRef.current = false;
    }
  }, [compressOneInternal]);

  // ── Actions ──
  const addFiles = useCallback((incoming: File[] | FileList) => {
    const arr = Array.from(incoming);
    const supported = SUPPORTED_INPUT_MIME_TYPES as readonly string[];

    // Dedup index built from live state + accepted files in this call.
    // `getState()` is always current (set is synchronous), so a rapid
    // second call sees the first call's committed files immediately —
    // no pending-count ref needed.
    const seen = new Set<string>(
      useCompressorStore.getState().files.map((f) => `${f.file.name}:${f.file.size}`),
    );

    const accepted: ImageFile[] = [];
    let tooBig = 0;
    let badType = 0;
    let duplicate = 0;
    let overLimit = 0;

    for (const file of arr) {
      const liveCount =
        useCompressorStore.getState().files.length + accepted.length;
      if (liveCount >= MAX_FILES_IN_BATCH) {
        overLimit += 1;
        continue;
      }
      // HEIC/HEIF often arrive with an empty File.type, so resolve the
      // effective mime from the extension before validating.
      const mime = resolveInputMime(file.name, file.type);
      if (!supported.includes(mime)) {
        badType += 1;
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        tooBig += 1;
        continue;
      }
      const key = `${file.name}:${file.size}`;
      if (seen.has(key)) {
        duplicate += 1;
        continue;
      }
      seen.add(key);
      accepted.push({
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        originalSize: file.size,
        inputMimeType: mime,
        inputDimensions: null,
        previewUrl: URL.createObjectURL(file),
        settings: useCompressorStore.getState().globalSettings,
        status: "idle",
        result: null,
        error: null,
        settingsDirty: false,
        settingsTouched: false,
        displayName: null,
        hasIcc: null,
      });
    }

    if (accepted.length > 0) {
      useCompressorStore.getState().appendFiles(accepted);
      // Probe ICC profile presence asynchronously per file. We only
      // need the boolean (yes/no) — used to warn before a format swap
      // would silently drop a wide-gamut profile.
      for (const accepted_file of accepted) {
        if (!supportsIcc(accepted_file.inputMimeType)) {
          useCompressorStore.getState().setHasIcc(accepted_file.id, false);
          continue;
        }
        void (async () => {
          try {
            const buf = await accepted_file.file.arrayBuffer();
            const icc = extractIcc(buf, accepted_file.inputMimeType);
            useCompressorStore.getState().setHasIcc(accepted_file.id, !!icc);
          } catch {
            useCompressorStore.getState().setHasIcc(accepted_file.id, false);
          }
        })();
      }
    }

    if (badType > 0)
      toast.error(
        `${badType} file${badType > 1 ? "s" : ""} skipped — unsupported format`,
      );
    if (tooBig > 0)
      toast.error(
        `${tooBig} file${tooBig > 1 ? "s" : ""} skipped — exceeds ${formatBytes(MAX_FILE_SIZE_BYTES)} limit`,
      );
    if (duplicate > 0)
      toast.error(
        `${duplicate} file${duplicate > 1 ? "s" : ""} skipped — already added`,
      );
    if (overLimit > 0)
      toast.error(
        `${overLimit} file${overLimit > 1 ? "s" : ""} skipped — over the ${MAX_FILES_IN_BATCH}-file batch limit`,
      );
  }, []);

  const removeFile = useCallback((id: string | null) => {
    if (!id) return;
    const file = useCompressorStore.getState().files.find((f) => f.id === id);
    if (file) URL.revokeObjectURL(file.previewUrl);
    useCompressorStore.getState().removeFile(id);
  }, []);

  const clearAll = useCallback(() => {
    const snapshot = useCompressorStore.getState().files;
    if (snapshot.length === 0) return;
    for (const f of snapshot) URL.revokeObjectURL(f.previewUrl);
    useCompressorStore.getState().clearAll();
    // 8-second Undo window. We can't restore the original previewUrl
    // (the object URL has been revoked), so on Undo we re-create one
    // from the still-live File object. Compression results are kept
    // intact so the user lands exactly where they were.
    toast(
      `Cleared ${snapshot.length} file${snapshot.length === 1 ? "" : "s"}`,
      {
        action: {
          label: "Undo",
          onClick: () => {
            const restored = snapshot.map((f) => ({
              ...f,
              previewUrl: URL.createObjectURL(f.file),
            }));
            useCompressorStore.getState().appendFiles(restored);
          },
        },
        duration: 8000,
      },
    );
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    const current = useCompressorStore.getState().expandedFileId;
    useCompressorStore.getState().setExpanded(current === id ? null : id);
  }, []);

  const setExpanded = useCallback((id: string | null) => {
    useCompressorStore.getState().setExpanded(id);
  }, []);

  const updateFileSettings = useCallback(
    (id: string, settings: Partial<CompressionSettings>) => {
      useCompressorStore.getState().updateSettings(id, settings);
    },
    [],
  );

  const resetFileSettings = useCallback((id: string) => {
    useCompressorStore.getState().resetSettings(id);
  }, []);

  const updateGlobalSettings = useCallback(
    (patch: Partial<CompressionSettings>) => {
      const next = mergeSettings(
        useCompressorStore.getState().globalSettings,
        patch,
      );
      useCompressorStore.getState().setGlobalSettings(next);
    },
    [],
  );

  const setAllQuality = useCallback((mode: QualityMode) => {
    useCompressorStore.getState().bulkQuality(mode);
  }, []);

  const setDisplayName = useCallback(
    (id: string, displayName: string | null) => {
      const trimmed = displayName?.trim() ?? "";
      useCompressorStore
        .getState()
        .setDisplayName(id, trimmed === "" ? null : trimmed);
    },
    [],
  );

  const setSortMode = useCallback((mode: SortMode) => {
    useCompressorStore.getState().setSortMode(mode);
  }, []);

  const cancelOne = useCallback((fileId: string) => {
    const jobId = jobIdMapRef.current.get(fileId);
    if (!jobId) return;
    // Pool resolves the job's promise with "Cancelled" rejection; the
    // existing compressOneInternal catch translates that into a
    // setError with the literal "Cancelled" message.
    poolRef.current?.cancel(jobId);
  }, []);

  const recompressOne = useCallback((id: string) => {
    useCompressorStore.getState().markPending([id]);
  }, []);

  const recompressDirty = useCallback(() => {
    const ids = useCompressorStore
      .getState()
      .files.filter((f) => f.settingsDirty)
      .map((f) => f.id);
    if (ids.length > 0) useCompressorStore.getState().markPending(ids);
  }, []);

  // ── Downloads ──

  // OS filename safety. Strip characters most filesystems reject and
  // trim length — protects users who type pasted text or accidentally
  // include path separators. Falls back to "image" so the download
  // never names a file "".
  const sanitizeFilename = (name: string): string => {
    return name.replace(/[/\\:*?"<>|]/g, "_").trim().slice(0, 200) || "image";
  };

  const downloadOne = useCallback((id: string) => {
    const target = useCompressorStore.getState().files.find((f) => f.id === id);
    if (!target || !target.result) return;
    const ext = extensionForMime(target.result.mimeType);
    const blob = new Blob([target.result.buffer], {
      type: target.result.mimeType,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // User-renamed display name wins; otherwise fall back to source basename.
    const base = sanitizeFilename(
      target.displayName ?? baseFileName(target.file.name),
    );
    a.download = `${base}.${ext}`;
    document.body.appendChild(a);
    try {
      a.click();
    } finally {
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }, []);

  const downloadAll = useCallback(async () => {
    const all = useCompressorStore.getState().files;
    const completed = all.flatMap((f) =>
      f.result
        ? [{ file: f.file, result: f.result, displayName: f.displayName }]
        : [],
    );
    if (completed.length === 0) {
      toast.error("Nothing to download yet — compression still in progress");
      return;
    }
    if (completed.length < all.length) {
      const remaining = all.length - completed.length;
      toast.warning(
        `Downloading ${completed.length} of ${all.length} — ${remaining} still compressing`,
      );
    }
    // Progress toast for every download — even single-file. Was
    // previously gated on `completed.length > 1` which silently
    // dropped success feedback for the most common case.
    const toastId = toast.loading(
      completed.length === 1
        ? "Packaging download…"
        : `Packaging ${completed.length} files…`,
    );
    try {
      const entries = completed.map(({ file, result, displayName }) => ({
        name: `${sanitizeFilename(displayName ?? baseFileName(file.name))}.${extensionForMime(result.mimeType)}`,
        input: new Blob([result.buffer], { type: result.mimeType }),
        lastModified: new Date(),
      }));
      const blob = await downloadZip(entries).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Timestamp the zip so re-downloads don't overwrite each other
      // in the browser's downloads folder.
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.download = `compressed-${stamp}.zip`;
      document.body.appendChild(a);
      try {
        a.click();
      } finally {
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
      toast.success(
        `Downloaded ${completed.length} file${completed.length === 1 ? "" : "s"}`,
        { id: toastId },
      );
    } catch (err) {
      const msg = (err as Error)?.message ?? "unknown error";
      toast.error(`Download failed: ${msg}`, { id: toastId });
    }
  }, []);

  // Kick the queue whenever there are idle files and nothing is running.
  // The running flag is claimed synchronously inside the effect (not at
  // the top of runQueue) so React's double-render in strict mode and
  // rapid state updates can't schedule two concurrent queues.
  useEffect(() => {
    if (queueRunningRef.current) return;
    if (!files.some((f) => f.status === "idle")) return;
    queueRunningRef.current = true;
    void runQueue();
  }, [files, runQueue]);

  // ── Cleanup preview URLs + worker pool on unmount ──
  // The store is a module singleton, so reset() here matches the old
  // per-mount reducer behaviour: leaving the tool discards all state.
  useEffect(() => {
    return () => {
      for (const f of useCompressorStore.getState().files)
        URL.revokeObjectURL(f.previewUrl);
      poolRef.current?.terminate();
      poolRef.current = null;
      useCompressorStore.getState().reset();
    };
  }, []);

  return {
    // state
    files: visibleFiles,
    expandedFileId,
    globalSettings,
    sortMode,
    // derived
    totalOriginalBytes: stats.totalOriginalBytes,
    totalCompressedBytes: stats.totalCompressedBytes,
    totalSavedPct: stats.totalSavedPct,
    doneCount: stats.doneCount,
    compressingCount: stats.compressingCount,
    queuedCount: stats.queuedCount,
    dirtyCount: stats.dirtyCount,
    // actions
    addFiles,
    removeFile,
    clearAll,
    toggleExpanded,
    setExpanded,
    updateFileSettings,
    resetFileSettings,
    updateGlobalSettings,
    setAllQuality,
    setDisplayName,
    setSortMode,
    recompressOne,
    recompressDirty,
    cancelOne,
    downloadOne,
    downloadAll,
  };
}
