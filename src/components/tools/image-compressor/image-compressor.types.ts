import type {
  OutputFormat,
  PngMode,
  QualityMode,
} from "./image-compressor.constants";
import type { CompressionError } from "./image-compressor.errors";

export type { OutputFormat, PngMode, QualityMode };

export interface AdvancedEncoderOptions {
  // JPEG
  jpegTrellis: boolean;          // trellis_multipass — slower, ~3-5% smaller
  jpegSmartQ: boolean;           // adaptive quantization
  jpegChroma: "4:2:0" | "4:4:4" | "auto";
  // WebP
  webpMethod: number;            // 0–6, libwebp method
  webpSharpYuv: boolean;
  webpAutofilter: boolean;
  // AVIF
  avifSpeed: number;             // 0–10, lower = slower & smaller
  avifTune: "ssim" | "psnr";
  avifSubsampling: "4:2:0" | "4:4:4";
  /**
   * When true, the resize step converts to linear light before the
   * resampler runs and back to sRGB after. Slightly slower and uses
   * 8-bit linear (loses precision in shadows) but produces noticeably
   * brighter midtones for photographic downscales. Default off.
   */
  linearResize: boolean;
}

export interface CompressionSettings {
  qualityMode: QualityMode;            // 'maximum' | 'high' | 'small' | 'custom'
  customQuality: number;               // 1–100, used only when qualityMode === 'custom'
  pngMode: PngMode;                    // 'lossy' (default) or 'lossless'
  pngQuantizationQuality: number;      // 1–100, lossy-PNG only
  pngOptimizationLevel: number;        // 1–6 oxipng level
  /** Target output container. "auto" preserves the input mime. */
  outputFormat: OutputFormat;
  resize: {
    enabled: boolean;
    width: number | null;
    height: number | null;
    lockAspectRatio: boolean;
  };
}

export type FileStatus = "idle" | "compressing" | "done" | "error";

export interface CompressionResult {
  buffer: ArrayBuffer;
  mimeType: string;                    // image/jpeg, image/png, image/webp, image/avif
  originalSize: number;
  newSize: number;
  savedPct: number;                    // 0–100, rounded
  encodingTimeMs: number;
  codec: string;                       // e.g. "MozJPEG · q72 (perceptual)"
  /** Output dimensions, post-resize. */
  dimensions: { width: number; height: number };
  /** Pre-resize source dimensions. Equal to `dimensions` when resize is off. */
  sourceDimensions: { width: number; height: number };
  /**
   * ICC color profile pass-through status:
   *   "none"      → source had no embedded profile (sRGB default)
   *   "preserved" → source profile was extracted and re-embedded in output
   *   "converted" → format swap dropped the profile, but the pixels were
   *                 color-managed (Display P3 → sRGB) so colors stay correct
   *   "lost"      → source had a profile that was dropped without conversion
   *                 (injection failed, or a non-P3 wide-gamut profile on swap)
   */
  iccStatus: "none" | "preserved" | "converted" | "lost";
  /**
   * The quality mode this result was produced under. Captured so the
   * UI can show estimates honestly: if the user changes the chip
   * without recompressing, the current-mode estimate must reflect the
   * *result's* mode, not the user's pending choice.
   */
  qualityModeUsed: QualityMode;
  /**
   * True when the source is a photographic PNG that stayed a PNG. Such
   * images can't be palette-quantized without visible color shifts (so
   * "High" keeps them lossless, which barely shrinks them). The UI uses
   * this to nudge the user toward JPEG/WebP — the right container for
   * photos. Only ever true for PNG output.
   */
  pngPhotoAdvisory: boolean;
  /**
   * True when a lossy encoder (JPEG/WebP/AVIF) couldn't meet the perceptual
   * (SSIM) target for "High"/"Maximum" mode. In that case `buffer` is the
   * *original* input, not a degraded re-encode — the user is asked to pick
   * a smaller quality or a different format rather than silently shipped a
   * result below the bar they chose.
   */
  qualityFloorMissed: boolean;
}

export interface ImageFile {
  id: string;
  file: File;
  originalSize: number;
  inputMimeType: string;
  inputDimensions: { width: number; height: number } | null;
  previewUrl: string;
  settings: CompressionSettings;
  status: FileStatus;
  result: CompressionResult | null;
  /** Structured failure detail when `status === "error"`. The UI maps the
   *  `kind` to a distinct message + recovery hint (see image-compressor.errors). */
  error: CompressionError | null;
  // True when settings have changed since the current result was produced,
  // so a manual re-compress is needed to apply them.
  settingsDirty: boolean;
  /** True once the user has explicitly edited *this file's* settings
   *  (per-file quality / format / resize). Files with this flag are
   *  immune to subsequent global Settings drawer changes. */
  settingsTouched: boolean;
  /** User-edited display name (basename only, extension is appended from
   *  the output mime at download time). Null means use the source file's
   *  original basename. */
  displayName: string | null;
  /** Whether the source contains an embedded ICC color profile. Null
   *  until the async probe completes. Used to warn before a format
   *  swap would silently drop the profile. */
  hasIcc: boolean | null;
}
