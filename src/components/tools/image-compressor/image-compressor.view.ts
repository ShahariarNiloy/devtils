/**
 * Pure presentation helpers for the v2 workspace — the toolbar's
 * format / quality / "Max 1920px wide" controls map onto the existing
 * `CompressionSettings` model here, so the components stay declarative.
 * No React, no DOM.
 */

import { MIME_LABEL } from "./image-compressor.constants";
import { formatBytes } from "./image-compressor.lib";
import { QUALITY_MODE_DEFS } from "./image-compressor.modes";
import type { CompressionResult, CompressionSettings, ImageFile, OutputFormat } from "./image-compressor.types";

/** Toolbar format segments. "auto" keeps each image's own format. */
export const TOOLBAR_FORMATS: readonly { value: OutputFormat; label: string; title: string }[] = [
  { value: "auto", label: "Auto", title: "Keep each image's own format" },
  { value: "image/webp", label: "WebP", title: "WebP — the safe modern default" },
  { value: "image/avif", label: "AVIF", title: "AVIF — smallest files, slower to encode" },
  { value: "image/jpeg", label: "JPEG", title: "JPEG — works everywhere, no transparency" },
  { value: "image/png", label: "PNG", title: "PNG — sharp edges and transparency" },
];

export const WEB_MAX_WIDTH = 1920;
export const SLIDER_MIN = 10;
export const SLIDER_MAX = 100;

/** True when the "Max 1920px wide" cap is what the resize settings say. */
export function isWebCapOn(s: CompressionSettings): boolean {
  return s.resize.enabled && s.resize.width === WEB_MAX_WIDTH && s.resize.height === null && s.resize.downscaleOnly === true;
}

export function webCapPatch(on: boolean): Partial<CompressionSettings> {
  return {
    resize: on
      ? { enabled: true, width: WEB_MAX_WIDTH, height: null, lockAspectRatio: true, downscaleOnly: true }
      : { enabled: false, width: null, height: null, lockAspectRatio: true, downscaleOnly: false },
  };
}

/** Moving the slider switches to an explicit quality for every codec. */
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

export interface QualityReadout {
  /** Perceptual (SSIM-targeted) mode rather than a fixed number. */
  auto: boolean;
  /** Slider position. */
  value: number;
  /** Readout text beside the slider. */
  text: string;
  /** Tooltip explaining the current mode. */
  title: string;
}

export function qualityReadout(s: CompressionSettings): QualityReadout {
  const value = Math.round(Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, s.customQuality)));
  if (s.qualityMode === "custom") {
    return { auto: false, value, text: String(value), title: `Fixed quality ${value} for every image` };
  }
  const def = QUALITY_MODE_DEFS[s.qualityMode];
  return {
    auto: true,
    value,
    text: "auto",
    title: `Auto (${def.label}): ${def.helper} Drag the slider to pick a fixed quality instead.`,
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

/** Status-bar format summary for the global settings: "WEBP q80", "AUTO · auto quality". */
export function settingsSummary(s: CompressionSettings): string {
  const fmt = TOOLBAR_FORMATS.find((f) => f.value === s.outputFormat)?.label ?? "Auto";
  const q = s.qualityMode === "custom" ? `q${s.customQuality}` : `${QUALITY_MODE_DEFS[s.qualityMode].label.toLowerCase()} quality`;
  return `${fmt.toUpperCase()} · ${q}${isWebCapOn(s) ? ` · max ${WEB_MAX_WIDTH}px` : ""}`;
}
