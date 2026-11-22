import type {
  Goal,
  OutputFormat,
  OutputMime,
  PngMode,
  QualityMode,
} from "./image-compressor.constants";
import type { CompressionError } from "./image-compressor.errors";

export type { Goal, OutputFormat, OutputMime, PngMode, QualityMode };

export type IccStatus = "none" | "preserved" | "converted" | "lost" | "cmyk";

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
  /** Target output container: "auto" = smallest of AVIF/WebP/JPEG,
   *  "original" = keep each input's format, or one explicit mime. */
  outputFormat: OutputFormat;
  /** "quality" = fixed per-codec quality (mode or slider); "budget" = the
   *  highest quality whose file fits `budgetKb`, searched per image. */
  goal: Goal;
  /** Size budget in KB (1 KB = 1024 bytes), used when goal === "budget". */
  budgetKb: number;
  /** Keep the original bytes when the re-encode isn't smaller (same pixel
   *  size; same format, or any format under Auto). Off = always deliver
   *  the re-encode, with an honest "+x%". */
  neverBigger: boolean;
  resize: {
    enabled: boolean;
    width: number | null;
    height: number | null;
    lockAspectRatio: boolean;
    /** Treat width/height as a cap: images already within it are left at
     *  their source size instead of being upscaled ("Max 1920px wide"). */
    downscaleOnly?: boolean;
  };
}

export type FileStatus = "idle" | "compressing" | "done" | "error";

/** One format's outcome for an image — Auto's candidates and the
 *  "every format" comparison bars. */
export interface CandidateSummary {
  mimeType: OutputMime;
  size: number;
  /** Encoder quality used (palette quality for PNG; null = lossless). */
  quality: number | null;
  /** Budget goal: whether it fit. Null under the quality goal. */
  fits: boolean | null;
  iccStatus: IccStatus;
  /** An approximation from a downscaled sample, not a real encode. */
  estimated?: boolean;
  /** The estimate is known to be loose (non-photo content, palette PNG). */
  rough?: boolean;
}

export interface BudgetInfo {
  targetBytes: number;
  /** The delivered file is ≤ the budget. */
  fits: boolean;
  /** Encoder quality the search settled on (null = lossless / original). */
  quality: number | null;
  /** The budget pushed quality below Smallest — visibly softer. */
  soft: boolean;
}

/** What the source carries that the output drops (EXIF). */
export interface MetadataSummary {
  /** Any EXIF/XMP block at all. */
  exif: boolean;
  gps: boolean;
  /** "Google Pixel 8" from EXIF Make/Model, when present. */
  camera: string | null;
}

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
   *   "cmyk"      → source is a CMYK/YCCK JPEG (Photoshop / print export);
   *                 the WASM decoder converts CMYK → RGB only approximately,
   *                 so colours may shift. Warn rather than silently distort.
   */
  iccStatus: IccStatus;
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
   * True when re-encoding the same format at the same size came out no
   * smaller, so the original bytes were kept (savedPct 0).
   */
  keptOriginal: boolean;
  /**
   * A browser-displayable rendering of the *original* (JPEG q92, full
   * size) for sources browsers can't show — HEIC/HEIF. The UI swaps it in
   * for the row thumbnail and the compare view's "Original" side.
   */
  sourcePreview?: { buffer: ArrayBuffer; mimeType: string };
  /** The source was animated (GIF / APNG / animated WebP); only frame 1 was kept. */
  animatedSource: "gif" | "apng" | "webp" | null;
  /** The source carried EXIF/XMP metadata (camera, date, GPS) that the output omits. */
  metadataStripped: boolean;
  /** Auto chose this format among `candidates`. */
  autoPicked: boolean;
  /** Every format encoded for this result (Auto: the contenders). */
  candidates: CandidateSummary[];
  /** Set under the budget goal. */
  budget: BudgetInfo | null;
  /** The encoded pixels carry transparency (Auto skipped JPEG). */
  hasAlpha: boolean;
  /** Facts about the source the merge step needs (kept-original status). */
  source: { hasProfile: boolean; cmyk: boolean };
  /** Downscaled pre-encode pixels for the other formats' size estimates. */
  sample?: EstimateSampleData;
}

/** See EstimateSample in image-compressor.lib (kept structural here). */
export interface EstimateSampleData {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  ratio: number;
  inputMime: string;
  p3: boolean;
}

export interface ImageFile {
  id: string;
  file: File;
  originalSize: number;
  inputMimeType: string;
  inputDimensions: { width: number; height: number } | null;
  previewUrl: string;
  /** Small (~160px) WebP for the queue card; null until made or when the
   *  browser can't decode the file (the card then uses previewUrl). */
  thumbUrl?: string | null;
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
  /** EXIF camera / GPS facts, read from the first bytes on add. */
  meta: MetadataSummary | null;
  /** This image's own output format (set from its format bars), or null to
   *  follow the global Format. `settings` already has it applied. */
  formatOverride: OutputFormat | null;
  /** Generated sample image (the "examples" set) — replaced by real files. */
  sample: boolean;
  /** Extra formats encoded for the comparison bars, keyed by settings. */
  probes: { key: string; candidates: CandidateSummary[] } | null;
}
