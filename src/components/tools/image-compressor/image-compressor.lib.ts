import {
  DEFAULT_CUSTOM_QUALITY,
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_PNG_MODE,
  DEFAULT_PNG_OPTIMIZATION_LEVEL,
  DEFAULT_PNG_QUANTIZATION_QUALITY,
  DEFAULT_QUALITY_MODE,
  PNG_QUANTIZATION_QUALITY_MAX,
  PNG_QUANTIZATION_QUALITY_MIN,
  QUALITY_MAX,
  QUALITY_MIN,
  SUPPORTED_INPUT_MIME_TYPES,
  type OutputFormat,
} from "./image-compressor.constants";
import { CompressionFailure } from "./image-compressor.errors";
import { QUALITY_MODE_DEFS } from "./image-compressor.modes";
import { quantizePng } from "./png-quantize";
import {
  SRGB_TO_LINEAR_LUT,
  linearToSrgb,
} from "./png-quantize/color-space";
import { computeSSIM, decodeBufferToImageData } from "./image-compressor.ssim";
import { extractIcc, injectIcc, supportsIcc } from "./image-compressor.icc";
import { convertP3ToSrgb, isDisplayP3 } from "./image-compressor.gamut";
import { isSmoothGradientPhoto } from "./image-compressor.gradient";
import {
  applyExifOrientation,
  readJpegOrientation,
} from "./image-compressor.exif";
import type {
  AdvancedEncoderOptions,
  CompressionResult,
  CompressionSettings,
} from "./image-compressor.types";

// ── Errors ────────────────────────────────────────────────────────

export class CodecLoadError extends Error {
  constructor(public readonly codec: string, public readonly cause: unknown) {
    super(`Failed to load ${codec} codec`);
    this.name = "CodecLoadError";
  }
}

// ── Defaults ──────────────────────────────────────────────────────

// Fixed, tuned per-codec encoder options. These were once a user-editable
// `advanced` settings block (the old CustomControls panel), but that UI was
// removed and the values were never changed at runtime — so they live here
// as a single internal constant rather than a phantom, un-editable setting.
const ENCODER_OPTIONS: AdvancedEncoderOptions = {
  jpegTrellis: true,
  jpegSmartQ: true,
  jpegChroma: "auto",
  webpMethod: 6,
  webpSharpYuv: true,
  webpAutofilter: true,
  avifSpeed: 4,
  avifTune: "ssim",
  avifSubsampling: "4:2:0",
  linearResize: false,
};

export function createDefaultSettings(): CompressionSettings {
  return {
    qualityMode: DEFAULT_QUALITY_MODE,
    customQuality: DEFAULT_CUSTOM_QUALITY,
    pngMode: DEFAULT_PNG_MODE,
    pngQuantizationQuality: DEFAULT_PNG_QUANTIZATION_QUALITY,
    pngOptimizationLevel: DEFAULT_PNG_OPTIMIZATION_LEVEL,
    outputFormat: DEFAULT_OUTPUT_FORMAT,
    resize: {
      enabled: false,
      width: null,
      height: null,
      lockAspectRatio: true,
    },
  };
}

// ── Output format resolution ─────────────────────────────────────

/**
 * Resolve the actual output mime from the user's `outputFormat` setting
 * and the input mime. "auto" preserves the input; GIF always becomes PNG
 * since we don't have a GIF encoder.
 */
function resolveOutputMime(
  inputMime: string,
  outputFormat: OutputFormat,
): "image/jpeg" | "image/png" | "image/webp" | "image/avif" {
  if (outputFormat !== "auto") return outputFormat;
  // Auto mode
  if (inputMime === "image/gif") return "image/png";
  // HEIC/HEIF have no web encoder — auto resolves to JPEG, the natural
  // home for the photographic content these formats almost always hold.
  if (inputMime === "image/heic" || inputMime === "image/heif") {
    return "image/jpeg";
  }
  if (
    inputMime === "image/jpeg" ||
    inputMime === "image/png" ||
    inputMime === "image/webp" ||
    inputMime === "image/avif"
  ) {
    return inputMime;
  }
  // Unknown input — default to PNG (lossless, safe).
  return "image/png";
}

/**
 * Flatten transparency to a solid background. Required when going to
 * JPEG (no alpha channel) — without this step the encoder either drops
 * alpha silently (turning transparent regions into black/random) or
 * fails. We composite over white because that matches most use cases
 * (web pages, document backgrounds).
 *
 * Compositing runs in linear light, then converts back to sRGB. Doing
 * the lerp directly on gamma-encoded sRGB values produces visibly
 * dimmer/duller edges on saturated colors (a red logo over white shows
 * a noticeable maroon halo). Linear-light math is the correct way to
 * blend two physical colors.
 */
function flattenAlpha(
  imageData: ImageData,
  bg: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 },
): ImageData {
  const { width, height, data } = imageData;
  // Fast-path: scan once to see if anything is actually transparent.
  let anyTransparent = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) {
      anyTransparent = true;
      break;
    }
  }
  if (!anyTransparent) return imageData;

  const bgLinear = {
    r: SRGB_TO_LINEAR_LUT[bg.r],
    g: SRGB_TO_LINEAR_LUT[bg.g],
    b: SRGB_TO_LINEAR_LUT[bg.b],
  };

  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    const inv = 1 - alpha;
    const rL = SRGB_TO_LINEAR_LUT[data[i]] * alpha + bgLinear.r * inv;
    const gL = SRGB_TO_LINEAR_LUT[data[i + 1]] * alpha + bgLinear.g * inv;
    const bL = SRGB_TO_LINEAR_LUT[data[i + 2]] * alpha + bgLinear.b * inv;
    out[i] = linearToSrgb(rL);
    out[i + 1] = linearToSrgb(gL);
    out[i + 2] = linearToSrgb(bL);
    out[i + 3] = 255;
  }
  return new ImageData(out, width, height);
}

// ── Decoder dispatch ──────────────────────────────────────────────

type DecodeFn = (buffer: ArrayBuffer) => Promise<ImageData>;

async function loadDecoder(mime: string): Promise<DecodeFn> {
  try {
    switch (mime) {
      case "image/jpeg":
        return (await import("@jsquash/jpeg")).decode as DecodeFn;
      case "image/png":
        return (await import("@jsquash/png")).decode as DecodeFn;
      case "image/webp":
        return (await import("@jsquash/webp")).decode as DecodeFn;
      case "image/avif":
        return (await import("@jsquash/avif")).decode as DecodeFn;
      default:
        throw new Error(`No decoder for ${mime}`);
    }
  } catch (err) {
    throw new CodecLoadError(mime, err);
  }
}

// ── GIF: decode first frame ───────────────────────────────────────
// @jsquash doesn't ship a GIF decoder, so we use the platform's
// createImageBitmap + OffscreenCanvas. Both are available in modern
// workers (Baseline 2023). The previous `document.createElement` fallback
// was removed because this lib now runs exclusively inside a Worker
// (see compress.worker.ts) where `document` doesn't exist.

// Hard cap on GIF first-frame decode dimensions. A 10000×10000 GIF
// would allocate 400MB for the ImageBitmap and another 400MB for the
// getImageData buffer — enough to OOM most browser tabs before they
// can throw. Bail early with a meaningful error instead.
const MAX_GIF_PIXELS = 100_000_000; // 100 MP

async function decodeGifFirstFrame(buffer: ArrayBuffer): Promise<ImageData> {
  if (typeof OffscreenCanvas === "undefined") {
    throw new Error("GIF decoding requires a modern browser.");
  }
  const blob = new Blob([new Uint8Array(buffer)], { type: "image/gif" });
  const bitmap = await createImageBitmap(blob).catch((err) => {
    throw new Error(
      `Failed to decode GIF: ${(err as Error)?.message ?? "unknown error"}`,
    );
  });

  if (bitmap.width * bitmap.height > MAX_GIF_PIXELS) {
    bitmap.close();
    throw new Error(
      `GIF too large to decode in browser (${bitmap.width}×${bitmap.height}). Resize the source and retry.`,
    );
  }

  const off = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = off.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    throw new Error("Failed to decode GIF: 2D context unavailable");
  }
  try {
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, off.width, off.height);
  } catch (err) {
    throw new Error(
      `GIF decode failed at ${off.width}×${off.height}: ${(err as Error)?.message ?? "canvas error"}`,
    );
  } finally {
    bitmap.close();
  }
}

// ── HEIC/HEIF: decode via libheif-wasm ────────────────────────────
// @jsquash ships no HEIC codec, so we lean on libheif compiled to WASM.
// The `wasm-bundle` entry inlines the .wasm as base64, which avoids
// having to serve a separate binary and works cleanly inside the worker
// bundle. It's a ~1.4MB lazy chunk, only fetched when a HEIC is decoded.

interface HeifImage {
  get_width(): number;
  get_height(): number;
  /** Fills `target.data` (RGBA) and invokes the callback with the same
   *  object, or null on a processing error. */
  display(
    target: { data: Uint8ClampedArray; width: number; height: number },
    cb: (out: { data: Uint8ClampedArray } | null) => void,
  ): void;
}
interface HeifDecoderInstance {
  decode(buffer: Uint8Array): HeifImage[];
}
interface LibheifModule {
  HeifDecoder: new () => HeifDecoderInstance;
}

async function decodeHeic(buffer: ArrayBuffer): Promise<ImageData> {
  let libheif: LibheifModule;
  try {
    // The package has no type declarations for the high-level decoder;
    // the structural cast above covers the surface we touch.
    const mod = (await import(
      "libheif-js/wasm-bundle"
    )) as unknown as { default: LibheifModule };
    libheif = mod.default;
  } catch (err) {
    throw new CodecLoadError("heic", err);
  }

  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(new Uint8Array(buffer));
  if (!images || images.length === 0) {
    throw new Error("HEIC file contains no decodable image.");
  }
  const image = images[0];
  const width = image.get_width();
  const height = image.get_height();
  if (!width || !height) {
    throw new Error("HEIC image has invalid dimensions.");
  }
  const data = new Uint8ClampedArray(width * height * 4);
  await new Promise<void>((resolve, reject) => {
    image.display({ data, width, height }, (out) => {
      if (!out) reject(new Error("Failed to decode HEIC pixel data."));
      else resolve();
    });
  });
  return new ImageData(data, width, height);
}

// ── Public decode/resize ─────────────────────────────────────────

/** Decode an image buffer into ImageData. Mime must be one of the
 *  supported types (validated at the call site). */
export async function decodeImage(
  buffer: ArrayBuffer,
  mime: string,
): Promise<{
  imageData: ImageData;
  dimensions: { width: number; height: number };
}> {
  if (!(SUPPORTED_INPUT_MIME_TYPES as readonly string[]).includes(mime)) {
    throw new Error(`Unsupported input format: ${mime || "unknown"}`);
  }
  let imageData: ImageData;
  if (mime === "image/gif") {
    imageData = await decodeGifFirstFrame(buffer);
  } else if (mime === "image/heic" || mime === "image/heif") {
    imageData = await decodeHeic(buffer);
  } else {
    const decode = await loadDecoder(mime);
    try {
      imageData = await decode(buffer);
    } catch (err) {
      throw new Error(
        `Failed to decode ${mime}: ${(err as Error)?.message ?? "corrupt header or unsupported color profile"}`,
      );
    }
  }
  return {
    imageData,
    dimensions: { width: imageData.width, height: imageData.height },
  };
}

export async function resizeImage(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number,
): Promise<ImageData> {
  let resize;
  try {
    resize = (await import("@jsquash/resize")).default;
  } catch (err) {
    throw new CodecLoadError("resize", err);
  }
  try {
    return await resize(imageData, { width: targetWidth, height: targetHeight });
  } catch (err) {
    throw new Error(
      `Failed to resize: ${(err as Error)?.message ?? "unknown resize error"}`,
    );
  }
}

/**
 * Resize in linear-light space. Converts the input to 8-bit linear via
 * the sRGB LUT, runs the resampler, then converts back to sRGB. Slower
 * than `resizeImage` and uses 8-bit linear (some precision loss in
 * shadows), but produces noticeably brighter midtones on photographic
 * downscales — the standard gotcha of "averaging in gamma space dims
 * the result." Opt-in via `advanced.linearResize`.
 */
async function resizeImageLinear(
  img: ImageData,
  w: number,
  h: number,
): Promise<ImageData> {
  const linearIn = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < img.data.length; i += 4) {
    linearIn[i] = Math.round(SRGB_TO_LINEAR_LUT[img.data[i]] * 255);
    linearIn[i + 1] = Math.round(SRGB_TO_LINEAR_LUT[img.data[i + 1]] * 255);
    linearIn[i + 2] = Math.round(SRGB_TO_LINEAR_LUT[img.data[i + 2]] * 255);
    linearIn[i + 3] = img.data[i + 3];
  }
  const linearImg = new ImageData(linearIn, img.width, img.height);
  const resized = await resizeImage(linearImg, w, h);
  for (let i = 0; i < resized.data.length; i += 4) {
    resized.data[i] = linearToSrgb(resized.data[i] / 255);
    resized.data[i + 1] = linearToSrgb(resized.data[i + 1] / 255);
    resized.data[i + 2] = linearToSrgb(resized.data[i + 2] / 255);
  }
  return resized;
}

// ── Quality resolution helpers ────────────────────────────────────

/** Clamp + round any numeric input to the given inclusive integer range. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampQuality(q: number): number {
  return clamp(q, QUALITY_MIN, QUALITY_MAX);
}

interface EncodeResult {
  buffer: ArrayBuffer;
  mimeType: string;
  codec: string;
  /** PNG-only: set when the source was photographic (see `encodePng`). */
  pngPhotoAdvisory?: boolean;
  /** Lossy codecs: true when the SSIM target wasn't met (best-effort). */
  qualityFloorMissed?: boolean;
}

interface SsimSearchResult {
  quality: number;
  buffer: ArrayBuffer;
  mimeType: string;
  /** True when the search found a quality that met `targetSSIM`. False
   *  when even the fallback at `maxQ` couldn't meet the target — the
   *  caller should reflect this honestly in the codec label. */
  targetMet: boolean;
}

// SSIM comparison resolution cap. Full-res SSIM on a 4K image decodes
// and walks ~8M pixels per search iteration; for AVIF (slow decode) that
// dominates the whole compression. SSIM at ≤1024px is a slight
// over-estimate but preserves the *search direction*, and the final
// encode is still emitted at full resolution — only the quality probe
// runs downsampled. The reference is downsampled once and reused.
const SSIM_MAX_DIM = 1024;

function ssimTargetDims(width: number, height: number): {
  width: number;
  height: number;
  scaled: boolean;
} {
  const scale = Math.min(1, SSIM_MAX_DIM / Math.max(width, height));
  if (scale >= 1) return { width, height, scaled: false };
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: true,
  };
}

async function searchQualityBySSIM(
  original: ImageData,
  mime: "image/jpeg" | "image/webp" | "image/avif",
  encodeAtQuality: (q: number) => Promise<ArrayBuffer>,
  targetSSIM: number,
  bounds: { minQuality?: number; maxQuality?: number; maxIterations?: number; earlyExitDelta?: number } = {},
): Promise<SsimSearchResult> {
  // Lowered from 40 → 30 so the SSIM search can land on smaller files
  // when the target is reachable below q=40. The SSIM gate still prevents
  // visibly broken output — we just give the encoder more range.
  const minQ = bounds.minQuality ?? 30;
  const maxQ = bounds.maxQuality ?? 95;
  const maxIter = bounds.maxIterations ?? 6;
  const delta = bounds.earlyExitDelta ?? 0.005;

  // Downsample the reference once. Candidates (same dimensions as the
  // reference) are downsampled to match inside `scoreOf`.
  const dims = ssimTargetDims(original.width, original.height);
  const reference = dims.scaled
    ? await resizeImage(original, dims.width, dims.height)
    : original;
  const scoreOf = async (buffer: ArrayBuffer): Promise<number> => {
    const decoded = await decodeBufferToImageData(buffer, mime);
    const candidate = dims.scaled
      ? await resizeImage(decoded, dims.width, dims.height)
      : decoded;
    return computeSSIM(reference, candidate);
  };

  let lo = minQ;
  let hi = maxQ;
  let best: SsimSearchResult | null = null;

  for (let i = 0; i < maxIter; i++) {
    const mid = Math.round((lo + hi) / 2);
    const buffer = await encodeAtQuality(mid);
    const ssim = await scoreOf(buffer);
    if (ssim >= targetSSIM) {
      best = { quality: mid, buffer, mimeType: mime, targetMet: true };
      hi = mid - 1;
      if (ssim - targetSSIM < delta) break;
    } else {
      lo = mid + 1;
    }
    if (lo > hi) break;
  }

  if (!best) {
    // Fallback: encode at maxQ and verify it actually meets the target.
    // Previously we returned this with the same "(perceptual)" label as
    // a successful search, which was dishonest — the user thought their
    // perceptual target was met when it never was.
    const buffer = await encodeAtQuality(maxQ);
    const finalSsim = await scoreOf(buffer);
    best = {
      quality: maxQ,
      buffer,
      mimeType: mime,
      targetMet: finalSsim >= targetSSIM,
    };
  }
  return best;
}

// Per-mode quality search window (`QUALITY_MODE_DEFS[mode].ssimBounds`).
// "small" never needs to probe above q=80 (clearly too large for its
// target), and "maximum" never needs to go below q=60 — narrowing the
// window per mode skips wasted encodes and lands the binary search faster.
// The SSIM path never runs for "custom".

// ── Chroma detection for JPEG ─────────────────────────────────────

async function detectChromaMode(
  imageData: ImageData,
): Promise<"4:2:0" | "4:4:4"> {
  const { width, height, data } = imageData;
  const totalPixels = width * height;
  // Cap at ~1024 stratified samples regardless of image size. For a 4K
  // image the previous stride-8 walk did ~130k samples; variance
  // estimation converges long before that.
  const targetSamples = 1024;
  const stride = Math.max(1, Math.floor(Math.sqrt(totalPixels / targetSamples)));
  let sumSq = 0;
  let count = 0;
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Approximate Cb/Cr chroma signal (BT.601). High variance ⇒ high
      // chroma detail (logos, screenshots) ⇒ 4:4:4.
      const cb = -0.169 * r - 0.331 * g + 0.500 * b;
      const cr =  0.500 * r - 0.419 * g - 0.081 * b;
      sumSq += cb * cb + cr * cr;
      count++;
    }
  }
  const variance = count === 0 ? 0 : sumSq / count;
  return variance > 200 ? "4:4:4" : "4:2:0";
}

// ── Per-format encoders ───────────────────────────────────────────

async function encodeJpegAt(
  imageData: ImageData,
  quality: number,
  advanced: AdvancedEncoderOptions,
  chroma: "4:2:0" | "4:4:4",
): Promise<ArrayBuffer> {
  const { encode } = await import("@jsquash/jpeg");
  // @jsquash/jpeg options have shifted across versions; we pass a
  // structurally-typed object and cast at the call site rather than fight
  // the type defs.
  const options = {
    quality,
    baseline: false,
    progressive: true,
    optimize_coding: true,
    trellis_multipass: advanced.jpegTrellis,
    smoothing: 0,
    chroma_subsample: chroma === "4:4:4" ? 1 : 2,
    auto_subsample: false,
    chroma_quality: quality,
    trellis: advanced.jpegTrellis,
    smart_quant: advanced.jpegSmartQ,
  };
  return (encode as (img: ImageData, opts: unknown) => Promise<ArrayBuffer>)(imageData, options);
}

async function encodeJpeg(
  imageData: ImageData,
  settings: CompressionSettings,
): Promise<EncodeResult> {
  const chroma =
    ENCODER_OPTIONS.jpegChroma === "auto"
      ? await detectChromaMode(imageData)
      : ENCODER_OPTIONS.jpegChroma;

  if (settings.qualityMode === "custom") {
    const q = clampQuality(settings.customQuality);
    const buffer = await encodeJpegAt(imageData, q, ENCODER_OPTIONS, chroma);
    return { buffer, mimeType: "image/jpeg", codec: `MozJPEG · q${q}` };
  }

  const target = QUALITY_MODE_DEFS[settings.qualityMode].ssimTarget;
  const result = await searchQualityBySSIM(
    imageData,
    "image/jpeg",
    (q) => encodeJpegAt(imageData, q, ENCODER_OPTIONS, chroma),
    target,
    QUALITY_MODE_DEFS[settings.qualityMode].ssimBounds,
  );
  return {
    buffer: result.buffer,
    mimeType: "image/jpeg",
    codec: `MozJPEG · q${result.quality} ${result.targetMet ? "(perceptual)" : "(best effort)"}`,
    qualityFloorMissed: !result.targetMet,
  };
}

async function encodeWebpAt(
  imageData: ImageData,
  quality: number,
  advanced: AdvancedEncoderOptions,
): Promise<ArrayBuffer> {
  const { encode } = await import("@jsquash/webp");
  const options = {
    quality,
    method: advanced.webpMethod,
    use_sharp_yuv: advanced.webpSharpYuv ? 1 : 0,
    autofilter: advanced.webpAutofilter ? 1 : 0,
    alpha_compression: 1,
    alpha_filtering: 1,
    alpha_quality: 100,
    pass: 6,
    segments: 4,
    partitions: 0,
    filter_strength: 60,
    filter_sharpness: 0,
    filter_type: 1,
    preprocessing: 0,
  };
  return (encode as (img: ImageData, opts: unknown) => Promise<ArrayBuffer>)(imageData, options);
}

async function encodeWebp(
  imageData: ImageData,
  settings: CompressionSettings,
): Promise<EncodeResult> {
  if (settings.qualityMode === "custom") {
    const q = clampQuality(settings.customQuality);
    const buffer = await encodeWebpAt(imageData, q, ENCODER_OPTIONS);
    return { buffer, mimeType: "image/webp", codec: `libwebp · q${q}` };
  }
  const target = QUALITY_MODE_DEFS[settings.qualityMode].ssimTarget;
  const result = await searchQualityBySSIM(
    imageData,
    "image/webp",
    (q) => encodeWebpAt(imageData, q, ENCODER_OPTIONS),
    target,
    QUALITY_MODE_DEFS[settings.qualityMode].ssimBounds,
  );
  return {
    buffer: result.buffer,
    mimeType: "image/webp",
    codec: `libwebp · q${result.quality} ${result.targetMet ? "(perceptual)" : "(best effort)"}`,
    qualityFloorMissed: !result.targetMet,
  };
}

async function encodeAvifAt(
  imageData: ImageData,
  quality: number,
  advanced: AdvancedEncoderOptions,
  speed: number,
): Promise<ArrayBuffer> {
  const { encode } = await import("@jsquash/avif");
  const options = {
    quality,
    qualityAlpha: -1,
    denoiseLevel: 0,
    tileColsLog2: 0,
    tileRowsLog2: 0,
    speed,
    subsample: advanced.avifSubsampling === "4:4:4" ? 3 : 1,
    chromaDeltaQ: false,
    sharpness: 0,
    tune: advanced.avifTune === "ssim" ? 1 : 0,
  };
  return (encode as (img: ImageData, opts: unknown) => Promise<ArrayBuffer>)(imageData, options);
}

async function encodeAvif(
  imageData: ImageData,
  settings: CompressionSettings,
): Promise<EncodeResult> {
  if (settings.qualityMode === "custom") {
    const q = clampQuality(settings.customQuality);
    const buffer = await encodeAvifAt(imageData, q, ENCODER_OPTIONS, ENCODER_OPTIONS.avifSpeed);
    return { buffer, mimeType: "image/avif", codec: `libavif · q${q}` };
  }
  // SSIM search at a faster speed, then a final encode at the user's real
  // speed. AVIF at speed 4 takes ~6 seconds; 6 encodes would be 36s.
  const target = QUALITY_MODE_DEFS[settings.qualityMode].ssimTarget;
  const searchResult = await searchQualityBySSIM(
    imageData,
    "image/avif",
    (q) => encodeAvifAt(imageData, q, ENCODER_OPTIONS, 6),
    target,
    { ...QUALITY_MODE_DEFS[settings.qualityMode].ssimBounds, maxIterations: 4 },
  );
  const finalBuffer = await encodeAvifAt(
    imageData,
    searchResult.quality,
    ENCODER_OPTIONS,
    ENCODER_OPTIONS.avifSpeed,
  );
  return {
    buffer: finalBuffer,
    mimeType: "image/avif",
    codec: `libavif · q${searchResult.quality} ${searchResult.targetMet ? "(perceptual)" : "(best effort)"}`,
    qualityFloorMissed: !searchResult.targetMet,
  };
}

// A PNG is "photographic" for our purposes when it holds far more
// distinct colors than a palette can represent. Quantizing such an image
// to 256 colors visibly shifts hues and bands smooth gradients — the
// thing the user is reporting. 4096 (16× the palette budget) cleanly
// separates true photos / gradients from rich-but-quantizable graphics
// and illustrations (which palette-compress fine).
const PNG_PHOTOGRAPHIC_COLOR_COUNT = 4096;

function isPhotographicImage(
  imageData: ImageData,
  threshold = PNG_PHOTOGRAPHIC_COLOR_COUNT,
): boolean {
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  if (pixelCount === 0) return false;
  // Stride-sample so a huge *flat* image doesn't cost a full scan; a
  // photo crosses the threshold within the first few thousand samples and
  // early-exits. Caps work at ~250k samples regardless of resolution.
  const stride = Math.max(1, Math.floor(pixelCount / 250_000));
  const seen = new Set<number>();
  for (let p = 0; p < pixelCount; p += stride) {
    const i = p * 4;
    if (data[i + 3] === 0) continue; // ignore fully-transparent pixels
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    seen.add(key);
    if (seen.size > threshold) return true;
  }
  return false;
}

/**
 * Pick the OxiPNG optimisation level, scaled down for large images.
 *
 * OxiPNG is lossless at every level — the level only controls how hard it
 * works (more filter/deflate trials), so a lower level just yields a
 * slightly larger file, never different pixels. But level 6 runs the trial
 * passes over every scanline and costs ~10s/megapixel: measured ~157s on a
 * 16 MP image vs ~11s at level 2 (14× faster) for ~identical size. So a
 * 25 MP screenshot at level 6 hangs for minutes. Small images keep full
 * effort (level 6 is sub-second there); big ones cap progressively.
 *
 * Thresholds are interpolated from the 16 MP measurement — tune if needed.
 */
function oxipngLevelForSize(pixelCount: number, requested: number): number {
  let cap = 6;
  if (pixelCount > 16_000_000) cap = 2;
  else if (pixelCount > 8_000_000) cap = 3;
  else if (pixelCount > 4_000_000) cap = 4;
  return Math.max(1, Math.min(cap, Math.round(requested)));
}

async function encodePng(
  imageData: ImageData,
  settings: CompressionSettings,
): Promise<EncodeResult> {
  // Resolve the effective PNG mode + quantization quality. Named quality
  // modes override the explicit toggle; custom mode uses the toggle.
  let pngMode = settings.pngMode;
  let quantQ = settings.pngQuantizationQuality;
  if (settings.qualityMode !== "custom") {
    const mapped = QUALITY_MODE_DEFS[settings.qualityMode].png;
    pngMode = mapped.pngMode;
    quantQ = mapped.pngQuantizationQuality;
  }
  quantQ = clamp(quantQ, PNG_QUANTIZATION_QUALITY_MIN, PNG_QUANTIZATION_QUALITY_MAX);

  // Photographic flag drives the JPEG/WebP advisory (any photo-ish PNG —
  // these compress 2-3× smaller in those formats). Most quantize cleanly
  // now thanks to the anti-dominance quantizer, so this is a hint, not a
  // fix for broken color.
  const photographic = pngMode === "lossy" && isPhotographicImage(imageData);

  // Smooth-gradient guard. The quantizer preserves accents, but a *smooth
  // single-hue tonal ramp* (sky / skin / sunset) still bands visibly at
  // 256 colors — and "High" promises visually-identical output. Route ONLY
  // that worst case to lossless. Screenshots, UI, illustrations and
  // textured photos keep quantizing (small files); "Small" always
  // quantizes (the user opted into visible loss). See image-compressor.gradient.ts.
  const routedFromGradient =
    pngMode === "lossy" &&
    settings.qualityMode === "high" &&
    isSmoothGradientPhoto(imageData);
  const effectiveMode = routedFromGradient ? "lossless" : pngMode;

  let working = imageData;
  if (effectiveMode === "lossy") {
    try {
      const result = await quantizePng(imageData, { quality: quantQ, maxColors: 256 });
      working = result.imageData;
    } catch (err) {
      throw new Error(
        `Failed to quantize PNG: ${(err as Error)?.message ?? "unknown error"}`,
      );
    }
  }

  const { encode } = await import("@jsquash/png");
  const encoded = await (encode as (img: ImageData) => Promise<ArrayBuffer>)(working);

  let finalBuffer = encoded;
  try {
    const { optimise } = await import("@jsquash/oxipng");
    finalBuffer = await (
      optimise as (
        buf: ArrayBuffer,
        opts: unknown,
      ) => Promise<ArrayBuffer>
    )(encoded, {
      level: oxipngLevelForSize(
        working.width * working.height,
        settings.pngOptimizationLevel,
      ),
      interlace: false,
    });
  } catch (err) {
    // If oxipng fails for any reason, fall back to the raw PNG.
    throw new Error(
      `Failed to optimize PNG: ${(err as Error)?.message ?? "unknown error"}`,
    );
  }

  let codec: string;
  if (routedFromGradient) codec = "OxiPNG (lossless · gradient preserved)";
  else if (effectiveMode === "lossy") codec = "utilyx-quantize + OxiPNG";
  else codec = "OxiPNG";

  return {
    buffer: finalBuffer,
    mimeType: "image/png",
    codec,
    pngPhotoAdvisory: photographic,
  };
}

// ── Top-level dispatch ────────────────────────────────────────────

/**
 * Hard per-side pixel ceiling for the canvas alpha-flatten and the WASM
 * encoders. Browsers reject canvases past ~16384px on a side, and WebP
 * caps a hair lower (16383); 16384 is the shared bound the resize step
 * clamps to and the guard below refuses past.
 */
const CANVAS_MAX_DIMENSION = 16384;

/**
 * Compress an in-memory image buffer. Pure: no DOM dependencies beyond
 * `OffscreenCanvas` (only used for GIF first-frame decode) and the
 * dynamic-imported codec WASMs. Safe to call from a Web Worker.
 *
 * The main thread should read the user's File into an ArrayBuffer and
 * post it to a worker; the worker calls this function and posts the
 * result back. See `worker-pool.ts` and `compress.worker.ts`.
 */
export async function compressImageData(
  buffer: ArrayBuffer,
  mime: string,
  settings: CompressionSettings,
): Promise<CompressionResult> {
  const originalSize = buffer.byteLength;
  const startTime = performance.now();

  // Extract the source ICC profile *before* decoding so we still have
  // access to the raw container bytes. Decoding only reads from the
  // buffer; it doesn't consume it, but we extract early to keep the
  // contract simple.
  const sourceIcc = supportsIcc(mime) ? extractIcc(buffer, mime) : null;

  let decoded: ImageData;
  let dimensions: { width: number; height: number };
  try {
    const decodeResult = await decodeImage(buffer, mime);
    decoded = decodeResult.imageData;
    dimensions = decodeResult.dimensions;
  } catch (err) {
    const m = (err as Error)?.message ?? "";
    if (/unsupported input format/i.test(m))
      throw new CompressionFailure({ kind: "unsupported-input", mime });
    if (/memory|allocation/i.test(m))
      throw new CompressionFailure({ kind: "out-of-memory" });
    throw new CompressionFailure({ kind: "decode-failed", mime });
  }

  // @jsquash/jpeg ignores EXIF Orientation. Portrait iPhone JPEGs come
  // back landscape with orientation=6, so without this step the output
  // is sideways. Read the tag from the source bytes (orientation lives
  // in APP1, not in the decoded pixel data) and reorder pixels here.
  if (mime === "image/jpeg") {
    const orient = readJpegOrientation(buffer);
    if (orient !== 1) {
      decoded = applyExifOrientation(decoded, orient);
      dimensions = { width: decoded.width, height: decoded.height };
    }
  }

  // Resolve the output container up front — needed both for the color
  // management decision below and the encoder dispatch later.
  const outputMime = resolveOutputMime(mime, settings.outputFormat);

  // Color management: a format swap can't carry the source ICC profile
  // along, so a Display P3 source would be reinterpreted as sRGB and look
  // desaturated. Convert the pixels P3 → sRGB here so the swap stays
  // color-correct. (Same-format output keeps the profile via the splice
  // below, so no conversion is needed there.)
  let iccConverted = false;
  if (sourceIcc && mime !== outputMime && isDisplayP3(sourceIcc)) {
    convertP3ToSrgb(decoded);
    iccConverted = true;
  }

  // Optional resize first.
  let working = decoded;
  if (
    settings.resize.enabled &&
    (settings.resize.width || settings.resize.height)
  ) {
    const srcW = dimensions.width;
    const srcH = dimensions.height;
    const aspect = srcW / srcH;
    let targetW = settings.resize.width;
    let targetH = settings.resize.height;
    if (settings.resize.lockAspectRatio) {
      // Width is authoritative when both are filled — without this,
      // the lock used to silently disable itself and let the user's
      // (possibly wrong) height through unchanged.
      if (targetW) targetH = Math.round(targetW / aspect);
      else if (targetH) targetW = Math.round(targetH * aspect);
    }
    if (!targetW) targetW = srcW;
    if (!targetH) targetH = srcH;
    // Browsers fail past ~16384px on canvas in any case; clamp keeps
    // the bound explicit and uses the same helper as the rest of the file.
    targetW = clamp(targetW, 1, CANVAS_MAX_DIMENSION);
    targetH = clamp(targetH, 1, CANVAS_MAX_DIMENSION);
    if (targetW !== srcW || targetH !== srcH) {
      working = ENCODER_OPTIONS.linearResize
        ? await resizeImageLinear(working, targetW, targetH)
        : await resizeImage(working, targetW, targetH);
    }
  }

  // Fail fast on frames the canvas flatten / WASM encoders can't take.
  // Checked *after* resize so a "resize this huge image down" workflow
  // still succeeds — only an oversized frame that resize didn't (or
  // couldn't) shrink trips it, with an actionable hint instead of a
  // cryptic encoder error deeper in the pipeline.
  if (
    working.width > CANVAS_MAX_DIMENSION ||
    working.height > CANVAS_MAX_DIMENSION
  ) {
    throw new CompressionFailure({
      kind: "image-too-large",
      dimensions: [working.width, working.height],
    });
  }

  // JPEG can't represent alpha. Composite over white before encode so
  // transparent regions don't render as black.
  if (outputMime === "image/jpeg") {
    working = flattenAlpha(working);
  }

  let encoded: EncodeResult;
  try {
    switch (outputMime) {
      case "image/jpeg":
        encoded = await encodeJpeg(working, settings);
        break;
      case "image/png":
        // GIF input forces lossless PNG since the source palette is
        // already indexed; dithering it would introduce artifacts.
        if (mime === "image/gif") {
          encoded = await encodePng(working, {
            ...settings,
            qualityMode: "custom",
            pngMode: "lossless",
          });
        } else {
          encoded = await encodePng(working, settings);
        }
        break;
      case "image/webp":
        encoded = await encodeWebp(working, settings);
        break;
      case "image/avif":
        encoded = await encodeAvif(working, settings);
        break;
    }
  } catch (err) {
    const msg = (err as Error)?.message ?? "";
    if (/memory|allocation/i.test(msg)) {
      throw new CompressionFailure({ kind: "out-of-memory" });
    }
    if (err instanceof CompressionFailure) throw err;
    throw new CompressionFailure({ kind: "encode-failed", targetMime: outputMime });
  }

  // Quality-floor refusal. If a lossy codec couldn't reach the perceptual
  // (SSIM) target for a mode that promises quality ("High"/"Maximum"),
  // hand back the *original* rather than ship a degraded result the user
  // didn't choose — and let the UI offer a smaller mode / different format.
  // ("Small"/"custom" opted into their own quality, so they keep best-effort.)
  if (
    encoded.qualityFloorMissed &&
    (settings.qualityMode === "high" || settings.qualityMode === "maximum")
  ) {
    return {
      buffer,
      mimeType: mime,
      originalSize,
      newSize: originalSize,
      savedPct: 0,
      encodingTimeMs: Math.round(performance.now() - startTime),
      codec: `Original — couldn't reach "${settings.qualityMode}" quality`,
      dimensions: { width: dimensions.width, height: dimensions.height },
      sourceDimensions: { width: dimensions.width, height: dimensions.height },
      iccStatus: "none",
      qualityModeUsed: settings.qualityMode,
      pngPhotoAdvisory: false,
      qualityFloorMissed: true,
    };
  }

  // ICC pass-through: splice the source's color profile into the
  // output container so wide-gamut images (Display P3, Adobe RGB)
  // continue to display with their original colors.
  // Only valid when input format matches output format — once the user
  // changes container (PNG → JPEG, etc.) the chunk format differs and
  // we can't preserve the profile bit-exactly without color conversion.
  let finalBuffer = encoded.buffer;
  let iccStatus: "none" | "preserved" | "converted" | "lost" = "none";
  if (sourceIcc) {
    if (mime === encoded.mimeType && supportsIcc(encoded.mimeType)) {
      const result = injectIcc(finalBuffer, encoded.mimeType, sourceIcc);
      finalBuffer = result.buffer;
      iccStatus = result.injected ? "preserved" : "lost";
    } else if (iccConverted) {
      // Format swap, but we color-managed the pixels (Display P3 → sRGB),
      // so the profile-less output still displays correctly.
      iccStatus = "converted";
    } else {
      // Format swap dropping a profile we couldn't convert (non-P3) —
      // user is warned via the UI.
      iccStatus = "lost";
    }
  }

  const newSize = finalBuffer.byteLength;
  // savedPct is the *signed* reduction. Positive = output is smaller
  // (we saved bytes). Negative = output is larger than input (the
  // codec couldn't beat the source — already-optimized PNGs and small
  // AVIFs are common culprits). The UI surfaces this honestly instead
  // of hiding regressions as "0% saved".
  const savedPct =
    originalSize === 0
      ? 0
      : Math.round(((originalSize - newSize) / originalSize) * 100);
  const encodingTimeMs = Math.round(performance.now() - startTime);

  return {
    buffer: finalBuffer,
    mimeType: encoded.mimeType,
    originalSize,
    newSize,
    savedPct,
    encodingTimeMs,
    codec: encoded.codec,
    dimensions: { width: working.width, height: working.height },
    sourceDimensions: { width: dimensions.width, height: dimensions.height },
    iccStatus,
    qualityModeUsed: settings.qualityMode,
    pngPhotoAdvisory: encoded.pngPhotoAdvisory ?? false,
    qualityFloorMissed: false,
  };
}

// ── Formatting helpers ────────────────────────────────────────────

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0 B";
  if (n < KB) return `${Math.round(n)} B`;
  if (n < MB) return `${(n / KB).toFixed(1)} KB`;
  if (n < GB) return `${(n / MB).toFixed(1)} MB`;
  return `${(n / GB).toFixed(1)} GB`;
}

export function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg": return "jpg";
    case "image/png":  return "png";
    case "image/webp": return "webp";
    case "image/avif": return "avif";
    default:           return "bin";
  }
}

export function baseFileName(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(0, dot) : filename;
}

// Extension → mime fallback. Browsers frequently report an empty
// `File.type` for HEIC/HEIF (the OS doesn't recognize the container),
// so the file picker / drop would otherwise reject valid iPhone photos.
const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

/**
 * Resolve a file's effective input mime. Prefers a trustworthy
 * `File.type`, falling back to the filename extension when the browser
 * reported nothing usable. Returns the original `type` (possibly empty)
 * when the extension is unknown so the caller can still reject it.
 */
export function resolveInputMime(name: string, type: string): string {
  if ((SUPPORTED_INPUT_MIME_TYPES as readonly string[]).includes(type)) {
    return type;
  }
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  return EXTENSION_MIME[ext] ?? type;
}
