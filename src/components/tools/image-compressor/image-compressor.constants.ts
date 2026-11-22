export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;        // 50 MB
export const MAX_FILES_IN_BATCH = 20;

/** Number of Web Workers in the compression pool. Scales with the
 *  machine but stays bounded: we leave 2 cores for the main thread /
 *  browser and cap at 4 so the per-worker WASM codec memory (≈40MB ×
 *  pool size) can't balloon on many-core machines. Falls back to 2 in
 *  non-browser environments (SSR) where `navigator` is undefined. */
export const WORKER_POOL_SIZE =
  typeof navigator !== "undefined"
    ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency ?? 4) - 2))
    : 2;

/** Display-friendly format label keyed by MIME type. */
export const MIME_LABEL: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
  "image/gif": "GIF",
  "image/heic": "HEIC",
  "image/heif": "HEIF",
};

/** Row-entry stagger: each new file is offset by STAGGER_STEP seconds
 *  from the previous, capped at STAGGER_CAP so adding 20 files at once
 *  doesn't introduce visible lag. */
export const STAGGER_STEP = 0.04;
export const STAGGER_CAP = 0.16;

export const SUPPORTED_INPUT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  // HEIC/HEIF (iPhone photos). Decode-only via libheif-wasm — there is
  // no browser HEIC *encoder*, so these always swap to another output
  // format (auto → JPEG). See `resolveOutputMime` / `loadDecoder`.
  "image/heic",
  "image/heif",
] as const;

/** Input mimes we can decode but never encode back to. The UI forces a
 *  format swap for these (auto resolves to JPEG). */
export const DECODE_ONLY_INPUT_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/heic",
  "image/heif",
]);

/** File-input `accept` value covering every supported input format, by
 *  both extension and mime so OS file pickers filter correctly even when
 *  the mime is reported inconsistently (common for HEIC). */
export const FILE_INPUT_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.avif,.gif,.heic,.heif," +
  "image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,image/heif";

// ── Output format ────────────────────────────────────────────────
//
// "auto"     → encode AVIF, WebP and JPEG (JPEG only without transparency)
//              at equivalent quality and keep the smallest, colour-correct one.
// "original" → keep each input's own format (GIF → PNG, HEIC → JPEG).
// A mime     → that container for every image.

export const OUTPUT_FORMATS = [
  "auto",
  "image/avif",
  "image/webp",
  "image/jpeg",
  "image/png",
  "original",
] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];
/** New sessions keep each upload's own format: nothing is converted until
 *  the user picks a format (or clicks its bar). */
export const DEFAULT_OUTPUT_FORMAT: OutputFormat = "original";

/** Concrete containers we can encode. */
export type OutputMime = "image/jpeg" | "image/png" | "image/webp" | "image/avif";

/**
 * Largest side each encoder accepts. WebP's bitstream stores 14-bit sizes
 * (16383 max); JPEG/PNG/AVIF go far higher. Memory, not geometry, is the
 * real limit for huge frames — that surfaces as out-of-memory instead.
 */
export const MAX_SIDE_FOR: Record<OutputMime, number> = {
  "image/webp": 16383,
  "image/jpeg": 65500,
  "image/png": 65535,
  "image/avif": 65535,
};

/** Formats Auto compares, in tie-break order (most compatible first). */
export const AUTO_CANDIDATES: readonly OutputMime[] = ["image/jpeg", "image/webp", "image/avif"];

/** Short labels for format buttons and badges. */
export const OUTPUT_FORMAT_LABEL: Record<OutputFormat, string> = {
  "auto": "Auto",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
  "original": "Original",
};

// Kept for the SettingsPanel's PNG-specific UI gating.
export const PNG_MIME = "image/png";

export const DEFAULT_QUALITY = {
  jpeg: 80,
  webp: 75,
  avif: 60,
} as const;

export const DEFAULT_PNG_OPTIMIZATION_LEVEL = 6; // oxipng level, range 1–6 (max = best ratio, lossless)

export const QUALITY_MIN = 1;
export const QUALITY_MAX = 100;

// ── Three-mode quality picker (v1.1) ─────────────────────────────

export const QUALITY_MODES = ["maximum", "high", "small", "custom"] as const;
export type QualityMode = (typeof QUALITY_MODES)[number];

export const DEFAULT_QUALITY_MODE: QualityMode = "high";

// Per-mode SSIM targets, quality-search bounds, PNG mapping, and display
// copy now live together in `image-compressor.modes.ts` (QUALITY_MODE_DEFS).

export const DEFAULT_CUSTOM_QUALITY = 75;

// ── Goal (v3) ────────────────────────────────────────────────────

export const GOALS = ["quality", "budget"] as const;
export type Goal = (typeof GOALS)[number];
export const DEFAULT_GOAL: Goal = "quality";
export const DEFAULT_BUDGET_KB = 150;
export const BUDGET_KB_CHIPS = [50, 100, 150, 250, 500] as const;
export const BUDGET_KB_MIN = 5;

/** "Max width" chips; 0 = keep the original width. Never upscales. */
export const MAX_WIDTH_CHIPS = [0, 2560, 1920, 1280, 800] as const;
export const DEFAULT_MAX_WIDTH = 1920;

// ── PNG mode (v1.1) ──────────────────────────────────────────────

export const PNG_MODES = ["lossy", "lossless"] as const;
export type PngMode = (typeof PNG_MODES)[number];

export const DEFAULT_PNG_MODE: PngMode = "lossy";
export const DEFAULT_PNG_QUANTIZATION_QUALITY = 80;
export const PNG_QUANTIZATION_QUALITY_MIN = 1;
export const PNG_QUANTIZATION_QUALITY_MAX = 100;
