"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { downloadZip } from "client-zip";
import {
  AUTO_CANDIDATES,
  OUTPUT_FORMAT_LABEL,
  MAX_FILES_IN_BATCH,
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_INPUT_MIME_TYPES,
  WORKER_POOL_SIZE,
  type OutputMime,
} from "./image-compressor.constants";
import { mergeCandidates } from "./image-compressor.auto";
import { readExifSummary } from "./image-compressor.exif";
import { detectMetadata, formatBytes, resolveInputMime } from "./image-compressor.lib";
import {
  CompressionFailure,
  toCompressionError,
} from "./image-compressor.errors";
import { extractIcc, supportsIcc } from "./image-compressor.icc";
import { barPick, collectOverrides } from "./image-compressor.overrides";
import { useCompressorStore } from "./image-compressor.store";
import { makeThumbnail } from "./image-compressor.thumb";
import { createWorkerPool, type WorkerPool } from "./worker-pool";
import type {
  CompressionResult,
  CompressionSettings,
  ImageFile,
  MetadataSummary,
  OutputFormat,
} from "./image-compressor.types";
import { outputFileName, probeKey, uniqueNames } from "./image-compressor.view";

/** Formats the "every format" comparison bars show. */
const COMPARE_FORMATS: readonly OutputMime[] = ["image/avif", "image/webp", "image/jpeg", "image/png"];

// ── Hook ──────────────────────────────────────────────────────────

/** Release a row's object URLs (full preview + queue thumbnail). */
function revokeUrls(f: ImageFile) {
  URL.revokeObjectURL(f.previewUrl);
  if (f.thumbUrl) URL.revokeObjectURL(f.thumbUrl);
}

/** Make the row's small queue thumbnail in the background (see image-compressor.thumb). */
function attachThumbnail(id: string, source: Blob) {
  void makeThumbnail(source).then((url) => {
    if (!url) return;
    const row = useCompressorStore.getState().files.find((f) => f.id === id);
    if (!row) {
      URL.revokeObjectURL(url); // removed meanwhile
      return;
    }
    if (row.thumbUrl) URL.revokeObjectURL(row.thumbUrl);
    useCompressorStore.getState().setThumbUrl(id, url);
  });
}

/**
 * Workspace actions + the queue engine. Holds no reactive state on purpose:
 * the columns, rows and stage each subscribe to their own store slice
 * (image-compressor.selectors), so a per-file update never re-renders the
 * whole tool. Every returned action is stable for the component's life.
 */
export function useImageCompressor() {
  const queueRunningRef = useRef(false);
  // Map of fileId → in-flight worker pool jobIds (several when Auto's
  // formats are split across the pool). Used so cancelOne() can look up
  // the right workers to terminate.
  const jobIdMapRef = useRef<Map<string, string[]>>(new Map());
  // Low-priority comparison probes / diff renders, per file.
  const probeJobRef = useRef<Map<string, string>>(new Map());
  const diffJobRef = useRef<Map<string, string>>(new Map());

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

  // ── Queue ──

  /** Stop background probes so user-visible work gets the workers. */
  const cancelProbes = useCallback(() => {
    for (const jobId of probeJobRef.current.values()) poolRef.current?.cancel(jobId);
    probeJobRef.current.clear();
  }, []);

  const compressOneInternal = useCallback(
    async (id: string) => {
      const store = useCompressorStore.getState();
      const target = store.files.find((f) => f.id === id);
      if (!target) return;
      // Snapshot the settings reference at start so setResult can detect
      // if the user changed settings during compression (H2).
      const settingsAtStart = target.settings;
      store.setStatus(id, "compressing");
      cancelProbes();
      try {
        const pool = getPool();
        const t0 = performance.now();
        // Auto on a lone image: one job per format so AVIF, WebP and JPEG
        // encode in parallel (the pool is otherwise idle). In a batch the
        // pool is already saturated by other images, so one job decodes
        // once and encodes the formats back to back.
        const active = useCompressorStore
          .getState()
          .files.filter((f) => f.status === "compressing" || f.status === "idle").length;
        const split = settingsAtStart.outputFormat === "auto" && active === 1 && WORKER_POOL_SIZE > 1;
        let result: CompressionResult;
        if (split) {
          // Read the file fresh for each job — buffers are transferred into
          // the worker. File objects keep their backing storage, so it's cheap.
          const jobs = await Promise.all(
            AUTO_CANDIDATES.map(async (fmt) =>
              pool.compress(await target.file.arrayBuffer(), target.inputMimeType, settingsAtStart, {
                formats: [fmt],
                partial: true,
                // HEIC display preview from the AVIF job — the one format
                // every image gets (JPEG is skipped for transparency).
                preview: fmt === "image/avif",
                sample: fmt === "image/avif",
              }),
            ),
          );
          jobIdMapRef.current.set(id, jobs.map((j) => j.id));
          const settled = await Promise.allSettled(jobs.map((j) => j.promise));
          const parts = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
          const failed = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
          // A cancel (or a crash) on any part cancels the image.
          if (failed && (parts.length === 0 || (failed.reason instanceof CompressionFailure && failed.reason.detail.kind === "cancelled"))) {
            throw failed.reason;
          }
          if (parts.length === 0) throw new CompressionFailure({ kind: "encode-failed", targetMime: "image/avif" });
          result = mergeCandidates(parts, { buffer: await target.file.arrayBuffer(), mime: target.inputMimeType }, settingsAtStart, {
            encodingTimeMs: Math.round(performance.now() - t0),
          });
        } else {
          const job = pool.compress(await target.file.arrayBuffer(), target.inputMimeType, settingsAtStart);
          // Track the job ID so a user-initiated cancel can find the
          // right worker. Cleared in `finally` so a stale entry never
          // points at a completed job.
          jobIdMapRef.current.set(id, [job.id]);
          [result] = await job.promise;
        }
        // Bail if removed while we were running. Worker response is
        // silently dropped — the result buffer was transferred back
        // but the file row no longer exists to display it.
        if (!useCompressorStore.getState().files.some((f) => f.id === id))
          return;
        if (result.sourcePreview) {
          // HEIC: replace the undisplayable object URL with the rendered one.
          const url = URL.createObjectURL(new Blob([result.sourcePreview.buffer], { type: result.sourcePreview.mimeType }));
          const prev = useCompressorStore.getState().files.find((f) => f.id === id)?.previewUrl;
          useCompressorStore.getState().setPreviewUrl(id, url);
          if (prev) URL.revokeObjectURL(prev);
          const row = useCompressorStore.getState().files.find((f) => f.id === id);
          if (row && !row.thumbUrl) attachThumbnail(id, new Blob([result.sourcePreview.buffer], { type: result.sourcePreview.mimeType }));
        }
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
    [getPool, cancelProbes],
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
  const addFiles = useCallback((incoming: File[] | FileList, opts: { sample?: boolean } = {}) => {
    const arr = Array.from(incoming);
    const supported = SUPPORTED_INPUT_MIME_TYPES as readonly string[];
    const sample = opts.sample === true;

    // Real images replace the examples (like the design's sample set).
    const existing = useCompressorStore.getState().files;
    if (!sample && existing.length > 0 && existing.every((f) => f.sample)) {
      for (const f of existing) {
        for (const jobId of jobIdMapRef.current.get(f.id) ?? []) poolRef.current?.cancel(jobId);
        revokeUrls(f);
      }
      useCompressorStore.getState().clearAll();
    }

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
        formatOverride: null,
        status: "idle",
        result: null,
        error: null,
        settingsDirty: false,
        settingsTouched: false,
        displayName: null,
        hasIcc: null,
        meta: null,
        sample,
        probes: null,
      });
    }

    if (accepted.length > 0) {
      useCompressorStore.getState().appendFiles(accepted);
      for (const f of accepted) attachThumbnail(f.id, f.file);
      // Cheap byte scans per file, off the critical path: ICC profile
      // presence (warns before a format swap would drop a wide-gamut
      // profile) and EXIF camera / GPS facts for the Metadata row. Both
      // read only the head of the file.
      for (const f of accepted) {
        void (async () => {
          try {
            const head = await f.file.slice(0, 1_048_576).arrayBuffer();
            const icc = supportsIcc(f.inputMimeType) ? extractIcc(head, f.inputMimeType) : null;
            const exif = readExifSummary(head.slice(0, 262_144), f.inputMimeType);
            const meta: MetadataSummary = exif.exif ? exif : { exif: detectMetadata(head, f.inputMimeType), gps: false, camera: null };
            useCompressorStore.getState().setSourceFacts(f.id, !!icc, meta);
          } catch {
            useCompressorStore.getState().setHasIcc(f.id, false);
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

  /** Stop a file's in-flight worker job, if any (frees the worker now). */
  const cancelJobFor = useCallback((fileId: string) => {
    for (const jobId of jobIdMapRef.current.get(fileId) ?? []) poolRef.current?.cancel(jobId);
    for (const ref of [probeJobRef, diffJobRef]) {
      const jobId = ref.current.get(fileId);
      if (jobId) poolRef.current?.cancel(jobId);
      ref.current.delete(fileId);
    }
  }, []);

  const removeFile = useCallback((id: string | null) => {
    if (!id) return;
    cancelJobFor(id);
    const file = useCompressorStore.getState().files.find((f) => f.id === id);
    if (file) revokeUrls(file);
    useCompressorStore.getState().removeFile(id);
  }, [cancelJobFor]);

  const clearAll = useCallback(() => {
    const snapshot = useCompressorStore.getState().files;
    if (snapshot.length === 0) return;
    // Cancel running jobs so a huge image doesn't keep a worker busy (and
    // memory pinned) for files that no longer exist.
    for (const f of snapshot) cancelJobFor(f.id);
    for (const f of snapshot) revokeUrls(f);
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
            // Files that were mid-compression lost their job when cleared;
            // put them back in the queue instead of "Compressing" forever.
            const restored = snapshot.map((f) => ({
              ...f,
              previewUrl: URL.createObjectURL(f.file),
              thumbUrl: null,
              status: f.status === "compressing" ? ("idle" as const) : f.status,
            }));
            useCompressorStore.getState().appendFiles(restored);
            for (const f of restored) attachThumbnail(f.id, f.file);
          },
        },
        duration: 8000,
      },
    );
  }, [cancelJobFor]);

  const setExpanded = useCallback((id: string | null) => {
    useCompressorStore.getState().setExpanded(id);
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

  const cancelOne = useCallback((fileId: string) => {
    // Pool rejects the job's promise with a "cancelled" failure; the
    // compressOneInternal catch turns that into a muted Cancelled state.
    for (const jobId of jobIdMapRef.current.get(fileId) ?? []) poolRef.current?.cancel(jobId);
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

  // ── Settings column ──

  /** Run a store change; if it cleared per-image formats, say so with Undo. */
  const withOverrideUndo = useCallback((change: () => void) => {
    const before = collectOverrides(useCompressorStore.getState().files);
    change();
    const st = useCompressorStore.getState();
    const cleared = new Map([...before].filter(([id]) => st.files.find((f) => f.id === id)?.formatOverride === null));
    if (cleared.size === 0) return;
    const fmt = OUTPUT_FORMAT_LABEL[st.globalSettings.outputFormat];
    const n = cleared.size;
    toast(`${n} image${n === 1 ? "" : "s"} had ${n === 1 ? "its" : "their"} own format; now all use ${fmt}`, {
      action: { label: "Undo", onClick: () => useCompressorStore.getState().restoreFormatOverrides(cleared) },
      duration: 8000,
    });
  }, []);

  const editSettings = useCallback(
    (patch: Partial<CompressionSettings>) => withOverrideUndo(() => useCompressorStore.getState().editSettings(patch)),
    [withOverrideUndo],
  );
  const applyDraft = useCallback(() => withOverrideUndo(() => useCompressorStore.getState().applyDraft()), [withOverrideUndo]);
  const clearFormatOverrides = useCallback(
    () => withOverrideUndo(() => useCompressorStore.getState().clearFormatOverrides()),
    [withOverrideUndo],
  );
  const followGlobalFormat = useCallback((id: string) => useCompressorStore.getState().setFormatOverride(id, null), []);
  const setConvertAll = useCallback((on: boolean) => useCompressorStore.getState().setConvertAll(on), []);

  /** A format bar (or a notice's format action) for one image: its own
   *  format, or — with "Apply to all images" on — the global Format. */
  const pickFormat = useCallback(
    (id: string, picked: OutputFormat) => {
      const st = useCompressorStore.getState();
      const action = barPick(picked, st.convertAll, st.globalSettings);
      if (action.kind === "global") editSettings(action.patch);
      else st.setFormatOverride(id, action.override);
    },
    [editSettings],
  );
  const setAutoUpdate = useCallback(
    (on: boolean) => withOverrideUndo(() => useCompressorStore.getState().setAutoUpdate(on)),
    [withOverrideUndo],
  );

  // ── Comparison estimates ("every format" bars) ──

  /**
   * Approximate the formats the focused image's result didn't encode, from
   * the downscaled sample the real job left behind — a fraction of a
   * second, never a full encode. Low priority, only once the queue has
   * drained; any new compression cancels it (cancelProbes). Choosing a
   * format (or clicking its bar) is what runs the real encode.
   */
  const ensureProbes = useCallback(
    (fileId: string) => {
      const st = useCompressorStore.getState();
      const f = st.files.find((x) => x.id === fileId);
      const sample = f?.result?.sample;
      if (!f || !f.result || f.status !== "done" || f.settingsDirty) return;
      if (st.files.some((x) => x.status === "idle" || x.status === "compressing")) return;
      const key = probeKey(f.settings);
      if (f.probes?.key === key || probeJobRef.current.has(fileId)) return;
      const have = new Set(f.result.candidates.map((c) => c.mimeType));
      const missing = COMPARE_FORMATS.filter((m) => !have.has(m) && !(m === "image/jpeg" && f.result?.hasAlpha));
      if (missing.length === 0 || !sample) {
        st.setProbes(fileId, { key, candidates: [] });
        return;
      }
      const settings = f.settings;
      // The sample stays on the result; the worker gets a copy.
      const job = getPool().estimate({ ...sample, buffer: sample.buffer.slice(0) }, settings, missing);
      probeJobRef.current.set(fileId, job.id);
      void (async () => {
        try {
          const estimates = await job.promise;
          const live = useCompressorStore.getState().files.find((x) => x.id === fileId);
          if (live && live.settings === settings) {
            useCompressorStore.getState().setProbes(fileId, { key, candidates: estimates });
          }
        } catch (err) {
          // Cancelled (a new compression took the workers): asked again once
          // the queue drains. Failed: the bars show "—" for those formats.
          const cancelled = err instanceof CompressionFailure && err.detail.kind === "cancelled";
          const live = useCompressorStore.getState().files.find((x) => x.id === fileId);
          if (!cancelled && live && live.settings === settings) {
            useCompressorStore.getState().setProbes(fileId, { key, candidates: [] });
          }
        } finally {
          if (probeJobRef.current.get(fileId) === job.id) probeJobRef.current.delete(fileId);
        }
      })();
    },
    [getPool],
  );

  // ── "Show what changed" ──

  /** Render (once per result) the amplified difference map in a worker. */
  const ensureDiff = useCallback(
    (fileId: string) => {
      const st = useCompressorStore.getState();
      const f = st.files.find((x) => x.id === fileId);
      const result = f?.result;
      if (!f || !result || result.keptOriginal) return;
      const existing = st.diffs[fileId];
      if (existing && existing.result === result) return;
      if (diffJobRef.current.has(fileId)) poolRef.current?.cancel(diffJobRef.current.get(fileId) ?? "");
      st.setDiff(fileId, { status: "loading", result });
      const settings = f.settings;
      void (async () => {
        // The result buffer stays in the store; the worker gets a copy.
        const job = getPool().diff(await f.file.arrayBuffer(), f.inputMimeType, settings, {
          buffer: result.buffer.slice(0),
          mimeType: result.mimeType,
        });
        diffJobRef.current.set(fileId, job.id);
        try {
          const d = await job.promise;
          const cur = useCompressorStore.getState().diffs[fileId];
          if (cur?.result === result) {
            useCompressorStore.getState().setDiff(fileId, {
              status: "ready",
              result,
              url: URL.createObjectURL(d.blob),
              width: d.width,
              height: d.height,
              mean: d.mean,
              changedShare: d.changedShare,
            });
          }
        } catch {
          const cur = useCompressorStore.getState().diffs[fileId];
          if (cur?.result === result) useCompressorStore.getState().setDiff(fileId, { status: "error", result });
        } finally {
          if (diffJobRef.current.get(fileId) === job.id) diffJobRef.current.delete(fileId);
        }
      })();
    },
    [getPool],
  );

  // ── Downloads ──

  const downloadOne = useCallback((id: string) => {
    const target = useCompressorStore.getState().files.find((f) => f.id === id);
    if (!target || !target.result) return;
    const blob = new Blob([target.result.buffer], {
      type: target.result.mimeType,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // User-renamed display name wins; otherwise fall back to source basename.
    a.download = outputFileName(target, target.result);
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
    const completed = all.flatMap((f) => (f.result ? [{ f, result: f.result }] : []));
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
    // Progress toast for every download — even single-file.
    const toastId = toast.loading(
      completed.length === 1
        ? "Packaging download…"
        : `Packaging ${completed.length} files…`,
    );
    try {
      // Unique names inside the ZIP: two "image.png" pastes, or anim.gif +
      // anim.png both becoming PNG, would otherwise overwrite each other
      // on extract.
      const names = uniqueNames(completed.map(({ f, result }) => outputFileName(f, result)));
      const entries = completed.map(({ result }, i) => ({
        name: names[i],
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

  // React to file-list changes outside render: kick the queue when there
  // are idle files and nothing is running, and re-run finished images
  // whose result no longer matches the applied settings (files still
  // running are picked up once they land — setResult marks a result stale
  // when settings moved mid-flight; with "Update automatically" off,
  // applied settings only move on Compress). A store subscription instead
  // of an effect on `files`, so the tool doesn't re-render per update; the
  // check is coalesced into one microtask per burst of store updates.
  // The running flag is claimed synchronously in the check so two queues
  // can never be scheduled.
  useEffect(() => {
    let scheduled = false;
    let alive = true;
    const check = () => {
      scheduled = false;
      if (!alive) return;
      const { files } = useCompressorStore.getState();
      const rerun = files.filter((f) => f.settingsDirty && (f.status === "done" || f.status === "error"));
      if (rerun.length > 0) useCompressorStore.getState().markPending(rerun.map((f) => f.id));
      if (queueRunningRef.current) return;
      if (!useCompressorStore.getState().files.some((f) => f.status === "idle")) return;
      queueRunningRef.current = true;
      void runQueue();
    };
    const unsubscribe = useCompressorStore.subscribe((st, prev) => {
      if (st.files === prev.files || scheduled) return;
      scheduled = true;
      queueMicrotask(check);
    });
    check();
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [runQueue]);


  // ── Cleanup preview URLs + worker pool on unmount ──
  // The store is a module singleton, so reset() here matches the old
  // per-mount reducer behaviour: leaving the tool discards all state.
  useEffect(() => {
    return () => {
      for (const f of useCompressorStore.getState().files) revokeUrls(f);
      poolRef.current?.terminate();
      poolRef.current = null;
      useCompressorStore.getState().reset();
    };
  }, []);

  return {
    // actions
    addFiles,
    removeFile,
    clearAll,
    setExpanded,
    editSettings,
    applyDraft,
    setAutoUpdate,
    setConvertAll,
    pickFormat,
    followGlobalFormat,
    clearFormatOverrides,
    setDisplayName,
    recompressOne,
    recompressDirty,
    cancelOne,
    ensureProbes,
    ensureDiff,
    downloadOne,
    downloadAll,
  };
}
