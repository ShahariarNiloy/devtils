"use client";

import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_SETTINGS,
  generate,
  type FormatId,
  type OutTab,
  type Result,
  type Settings,
  type SourceImage,
} from "./blur-placeholder.lib";
import { decodeImage, encodeLossy } from "./decode";

export type Mode = "single" | "batch";

/** A decoded image plus a URL the page can show it from. */
export interface Loaded extends SourceImage {
  srcUrl: string;
}

export const SAMPLES = [
  { key: "sunset", label: "lake-sunset.jpg", url: "/samples/blur-placeholder/lake-sunset.jpg" },
  { key: "product", label: "mug-studio.jpg", url: "/samples/blur-placeholder/mug-studio.jpg" },
  { key: "logo", label: "utilyx-mark.png", url: "/samples/blur-placeholder/utilyx-mark.png" },
] as const;
export type SampleKey = (typeof SAMPLES)[number]["key"];

const NOT_IMAGE = "That isn't an image. Try a PNG, JPEG, WebP, GIF or AVIF file.";
const cantOpen = (name: string) => `This browser can't open “${name}”.`;
const IMAGE_EXT = /\.(avif|bmp|gif|heic|heif|ico|jpe?g|jxl|png|svg|tiff?|webp)$/i;

const isImageFile = (f: File) => /^image\//.test(f.type) || (!f.type && IMAGE_EXT.test(f.name));

let uid = 0;
const nextId = (prefix: string) => `${prefix}${++uid}`;

/** Sample decode, cached for the session. */
const sampleCache = new Map<SampleKey, Promise<Loaded>>();
function loadSample(s: (typeof SAMPLES)[number]): Promise<Loaded> {
  const key = s.key;
  let p = sampleCache.get(key);
  if (!p) {
    p = fetch(s.url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then(async (blob) => ({ ...(await decodeImage(blob)), id: key, label: s.label, bytes: blob.size, srcUrl: s.url }));
    p.catch(() => sampleCache.delete(key));
    sampleCache.set(key, p);
  }
  return p;
}

/** Yield to the event loop so input and paint stay responsive. */
const yieldToMain = () =>
  new Promise<void>((resolve) => {
    const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    if (s?.yield) s.yield().then(resolve);
    else setTimeout(resolve, 0);
  });

export const settingsKey = (s: Settings) =>
  [s.size, s.fmt, s.flatten, s.bg, s.brightness, s.saturation, s.hue, s.lightness, s.bx, s.by].join("|");

/**
 * Batch results, computed a few items per frame so 50 images never make a
 * long task. Cached per item + settings, so switching tabs is instant.
 */
function useBatchResults(items: readonly Loaded[], settings: Settings, active: boolean) {
  const cache = useRef(new Map<string, Result>());
  const [snapshot, setSnapshot] = useState<ReadonlyMap<string, Result>>(() => new Map());
  const key = settingsKey(settings);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      let last = performance.now();
      let dirty = false;
      for (const it of items) {
        if (cancelled) return;
        const k = `${it.id}|${key}`;
        if (cache.current.has(k)) continue;
        cache.current.set(k, generate(it, settings, encodeLossy));
        dirty = true;
        if (performance.now() - last > 16) {
          const snap = new Map(cache.current);
          startTransition(() => setSnapshot(snap));
          dirty = false;
          await yieldToMain();
          last = performance.now();
        }
      }
      if (dirty && !cancelled) {
        const snap = new Map(cache.current);
        startTransition(() => setSnapshot(snap));
      }
    })();
    return () => {
      cancelled = true;
    };
    // `settings` is captured through `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, key, active]);

  return useCallback((it: Loaded): Result | undefined => snapshot.get(`${it.id}|${key}`), [snapshot, key]);
}

export function useBlurPlaceholder() {
  const [mode, setMode] = useState<Mode>("single");
  const [sampleKey, setSampleKey] = useState<SampleKey | null>("sunset");
  const [samples, setSamples] = useState<Partial<Record<SampleKey, Loaded>>>({});
  const [upload, setUpload] = useState<Loaded | null>(null);
  const [batch, setBatch] = useState<Loaded[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [pick, setPick] = useState<FormatId>("base64");
  const [outTab, setOutTab] = useState<OutTab>("next");
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);

  // Samples: the first one right away, the rest for batch examples.
  useEffect(() => {
    let alive = true;
    for (const s of SAMPLES)
      loadSample(s).then(
        (l) => alive && setSamples((m) => ({ ...m, [s.key]: l })),
        () => alive && setErr(`Couldn't load the sample “${s.label}”.`),
      );
    return () => {
      alive = false;
    };
  }, []);

  // Revoke object URLs we created when they're replaced or on unmount.
  const uploadUrl = upload?.srcUrl;
  useEffect(() => {
    if (!uploadUrl?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(uploadUrl);
  }, [uploadUrl]);

  const readFiles = useCallback(async (files: FileList | readonly File[] | null | undefined) => {
    const list = Array.from(files ?? []).filter(isImageFile);
    if (!list.length) {
      if (files && files.length) setErr(NOT_IMAGE);
      return;
    }
    if (mode === "single") {
      const f = list[0];
      try {
        const d = await decodeImage(f);
        setUpload({ ...d, id: nextId("u"), label: f.name || "pasted-image.png", bytes: f.size, srcUrl: URL.createObjectURL(f) });
        setSampleKey(null);
        setErr("");
      } catch {
        setErr(cantOpen(f.name || "the pasted image"));
      }
      return;
    }
    // Batch: one at a time; rows appear in groups so the list doesn't re-render per file.
    setErr("");
    setProgress({ done: 0, total: list.length });
    let pendingRows: Loaded[] = [];
    let lastFlush = performance.now();
    const failed: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      try {
        const d = await decodeImage(f);
        pendingRows.push({ ...d, id: nextId("b"), label: f.name || `image-${i + 1}.png`, bytes: f.size, srcUrl: "" });
      } catch {
        failed.push(f.name);
      }
      if (performance.now() - lastFlush > 250 || i === list.length - 1) {
        const rows = pendingRows;
        pendingRows = [];
        const done = i + 1;
        startTransition(() => {
          setBatch((b) => [...b, ...rows]);
          setProgress({ done, total: list.length });
        });
        lastFlush = performance.now();
      }
    }
    startTransition(() => setProgress(null));
    if (failed.length) setErr(failed.length === 1 ? cantOpen(failed[0]) : `This browser can't open ${failed.length} of those files.`);
  }, [mode]);

  // Paste an image anywhere except text fields.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const files = e.clipboardData?.files;
      if (files && files.length) {
        e.preventDefault();
        void readFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [readFiles]);

  const item: Loaded | null = upload ?? (sampleKey ? (samples[sampleKey] ?? null) : null);

  // Slider drags stay smooth: results follow a deferred copy of the settings.
  const deferred = useDeferredValue(settings);
  const result = useMemo(() => (item ? generate(item, deferred, encodeLossy) : null), [item, deferred]);

  const exampleRows = useMemo(
    () => SAMPLES.map((s) => samples[s.key]).filter((x): x is Loaded => Boolean(x)),
    [samples],
  );
  const batchItems = batch.length ? batch : exampleRows;
  const batchResult = useBatchResults(batchItems, settings, mode === "batch");

  return {
    mode,
    setMode,
    sampleKey,
    pickSample: (k: SampleKey) => {
      setSampleKey(k);
      setUpload(null);
      setErr("");
      setMode("single");
    },
    upload,
    clearUpload: () => {
      setUpload(null);
      setSampleKey("sunset");
    },
    item,
    result,
    settings,
    setSettings,
    pick,
    setPick,
    outTab,
    setOutTab,
    err,
    drag,
    setDrag,
    readFiles,
    batch,
    batchItems,
    batchResult,
    isExample: batch.length === 0,
    clearBatch: () => setBatch([]),
    progress,
  };
}
