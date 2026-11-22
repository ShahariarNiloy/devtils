/**
 * Pure presentation helpers for the workspace — the settings column's
 * format / goal / max-width controls map onto `CompressionSettings` here,
 * so the components stay declarative. No React, no DOM.
 */

import { MIME_LABEL } from "./image-compressor.constants";
import { baseFileName, extensionForMime, formatBytes } from "./image-compressor.lib";
import { QUALITY_MODE_DEFS } from "./image-compressor.modes";
import { maxWidthOf } from "./image-compressor.resize";
import type { CompressionResult, CompressionSettings, ImageFile, OutputFormat } from "./image-compressor.types";

export { maxWidthOf, maxWidthPatch } from "./image-compressor.resize";

/** Format buttons (design order), with their one-line notes. */
export const FORMAT_OPTIONS: readonly { value: OutputFormat; label: string; note: string; title: string }[] = [
  { value: "auto", label: "Auto", note: "Smallest per image", title: "Encodes AVIF, WebP and JPEG at the same quality and keeps the smallest" },
  { value: "image/avif", label: "AVIF", note: "Smallest, newer", title: "AVIF — smallest files, slower to encode" },
  { value: "image/webp", label: "WebP", note: "Works everywhere", title: "WebP — small files, every current browser" },
  { value: "image/jpeg", label: "JPEG", note: "Photos, no alpha", title: "JPEG — universal; transparency is flattened to white" },
  { value: "image/png", label: "PNG", note: "Graphics, alpha", title: "PNG — sharp edges and transparency (palette, or lossless at Best)" },
  { value: "original", label: "Original", note: "Keep each format", title: "Re-encode each image in its own format (GIF → PNG, HEIC → JPEG)" },
];

export const SLIDER_MIN = 10;
export const SLIDER_MAX = 100;

/** Moving the slider switches to an explicit quality (on the picked codec's scale). */
export function customQualityPatch(q: number): Partial<CompressionSettings> {
  const quality = Math.round(Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, q)));
  return {
    qualityMode: "custom",
    customQuality: quality,
    pngQuantizationQuality: quality,
    // 100 means "don't touch the pixels" — for PNG that's lossless.
    pngMode: quality >= 100 ? "lossless" : "lossy",
  };
}

/** The encoder quality actually used, parsed from the codec string ("MozJPEG · q72 …"). */
export function usedQuality(codec: string): number | null {
  const m = /\bq(\d{1,3})\b/.exec(codec);
  return m ? Number(m[1]) : null;
}

/** Label for the compressed side of the compare canvas: "WebP · q72". */
export function compressedLabel(result: CompressionResult): string {
  const fmt = MIME_LABEL[result.mimeType] ?? "Output";
  const q = usedQuality(result.codec);
  return q === null ? `${fmt} · ${formatBytes(result.newSize)}` : `${fmt} · q${q}`;
}

/** "2400×1350" or "2400×1350 → 1920×1080" once resized. */
export function dimensionsLabel(file: ImageFile): string {
  const r = file.result;
  const src = r?.sourceDimensions ?? file.inputDimensions;
  if (!src) return MIME_LABEL[file.inputMimeType] ?? "Image";
  const base = `${src.width}×${src.height}`;
  if (r && (r.dimensions.width !== src.width || r.dimensions.height !== src.height)) {
    return `${base} → ${r.dimensions.width}×${r.dimensions.height}`;
  }
  return base;
}

/** Bar width: output as a share of the input, never invisible, capped at full. */
export function sizeBarPct(originalSize: number, newSize: number): number {
  if (originalSize <= 0) return 100;
  return Math.max(3, Math.min(100, Math.round((newSize / originalSize) * 100)));
}

/** Signed savings, honest when the output grew: "−71%", "+12%", "±0%". */
export function savingsText(savedPct: number): string {
  if (savedPct > 0) return `−${savedPct}%`;
  if (savedPct < 0) return `+${Math.abs(savedPct)}%`;
  return "±0%";
}

/** Header summary: "Saved 63% · 3.6 MB", or "Grew 4% · 120 KB" when larger. */
export function totalSavedText(totalOriginal: number, totalCompressed: number, savedPct: number): string {
  const delta = Math.abs(totalOriginal - totalCompressed);
  if (savedPct < 0) return `Grew ${Math.abs(savedPct)}% · ${formatBytes(delta)}`;
  return `Saved ${savedPct}% · ${formatBytes(delta)}`;
}

/** Pick the file shown in the compare panel: the selected one, else the first with a result. */
export function pickFocusedFile(files: readonly ImageFile[], selectedId: string | null): ImageFile | null {
  if (selectedId) {
    const hit = files.find((f) => f.id === selectedId);
    if (hit) return hit;
  }
  return files.find((f) => f.result) ?? files[0] ?? null;
}

// OS filename safety. Strip characters most filesystems reject and trim
// length — protects users who type pasted text or accidentally include
// path separators. Falls back to "image" so a download is never named "".
export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_").trim().slice(0, 200) || "image";
}

/** Download / ZIP / <img> name: "street-dusk-1920w.avif" (width suffix once resized). */
export function outputFileName(file: Pick<ImageFile, "displayName" | "file">, result: CompressionResult): string {
  const base = sanitizeFilename(file.displayName ?? baseFileName(file.file.name));
  const src = result.sourceDimensions;
  const resized = result.dimensions.width !== src.width || result.dimensions.height !== src.height;
  return `${base}${resized ? `-${result.dimensions.width}w` : ""}.${extensionForMime(result.mimeType)}`;
}

/** Unique names inside a ZIP: later duplicates get " (2)", " (3)"… —
 *  compared case-insensitively, as on macOS / Windows file systems. */
export function uniqueNames(names: readonly string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    let out = name;
    for (let n = 2; used.has(out.toLowerCase()); n++) out = `${base} (${n})${ext}`;
    used.add(out.toLowerCase());
    return out;
  });
}

/** Settings that change what the encoder produces — the comparison-probe
 *  cache key, and what "N settings changed" counts. */
export function settingsFingerprint(s: CompressionSettings): Record<string, string> {
  return {
    format: s.outputFormat,
    goal: s.goal,
    quality: s.qualityMode === "custom" ? `q${s.customQuality}` : s.qualityMode,
    budget: String(s.budgetKb),
    width: String(maxWidthOf(s)),
    keep: String(s.neverBigger),
  };
}

export function changedSettingsCount(a: CompressionSettings, b: CompressionSettings): number {
  if (a === b) return 0;
  const fa = settingsFingerprint(a);
  const fb = settingsFingerprint(b);
  let n = 0;
  for (const k of Object.keys(fa)) if (fa[k] !== fb[k]) n++;
  return n;
}

/** Cache key for a file's comparison probes. "keep" doesn't change bytes. */
export function probeKey(s: CompressionSettings): string {
  const f = settingsFingerprint(s);
  return [f.format, f.goal, f.quality, f.budget, f.width, s.pngMode, s.pngQuantizationQuality].join("|");
}

/** Comparison-bar title (design copy). */
export function compareTitle(s: CompressionSettings, sliderQ: number): string {
  if (s.goal === "budget") return `Each format at its best quality under ${s.budgetKb} KB`;
  if (s.qualityMode !== "custom") return `Same image, every format, ${QUALITY_MODE_DEFS[s.qualityMode].label} quality`;
  return `Same image, every format, quality ${sliderQ}`;
}
