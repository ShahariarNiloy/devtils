import {
  DEFAULT_BUDGET_KB,
  DEFAULT_CUSTOM_QUALITY,
  DEFAULT_GOAL,
  DEFAULT_MAX_WIDTH,
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_PNG_MODE,
  DEFAULT_PNG_OPTIMIZATION_LEVEL,
  DEFAULT_PNG_QUANTIZATION_QUALITY,
  DEFAULT_QUALITY_MODE,
  MAX_SIDE_FOR,
  PNG_QUANTIZATION_QUALITY_MAX,
  PNG_QUANTIZATION_QUALITY_MIN,
  SUPPORTED_INPUT_MIME_TYPES,
  type OutputFormat,
  type OutputMime,
} from "./image-compressor.constants";
import { autoFormats, mergeCandidates, signedSavedPct } from "./image-compressor.auto";
import { CompressionFailure } from "./image-compressor.errors";
import { QUALITY_MODE_DEFS } from "./image-compressor.modes";
import {
  BUDGET_FAST_PROBES,
  BUDGET_MAX_PROBES,
  BUDGET_SOFT_SCALE,
  PNG_BUDGET_RANGE,
  budgetRange,
  codecOfMime,
  jpegScaleOf,
  qualityForCodec,
  searchBudget,
  type LossyCodec,
} from "./image-compressor.quality";
import { quantizePng } from "./png-quantize";
import { SRGB_TO_LINEAR_LUT, linearToSrgb } from "./png-quantize/color-space";
import { extractIcc, iccProfileBytes, injectIcc, supportsIcc } from "./image-compressor.icc";
import { convertP3ToSrgb, isDisplayP3, isSrgbProfile } from "./image-compressor.gamut";
import {
  applyExifOrientation,
  readJpegOrientation,
} from "./image-compressor.exif";
import type {
  AdvancedEncoderOptions,
  CompressionResult,
  CompressionSettings,
  CandidateSummary,
  EstimateSampleData,
  IccStatus,
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
  // Speed 6 for every size (was 4 below 2 MP). Measured on 34 images
  // (Kodak, alpha graphics, screenshots, a 12 MP photo at 1920px):
  // 7.4× faster in total (median 4.7 s → 0.6 s per image) for a median
  // +1.8% in bytes — Auto encodes AVIF for every image, so this is what
  // keeps it feeling instant.
  avifSpeed: 6,
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
    goal: DEFAULT_GOAL,
    budgetKb: DEFAULT_BUDGET_KB,
    neverBigger: true,
    resize: {
      enabled: true,
      width: DEFAULT_MAX_WIDTH,
      height: null,
      lockAspectRatio: true,
      downscaleOnly: true,
    },
  };
}

// ── Output format resolution ─────────────────────────────────────

/**
 * Resolve the output mime for a single-format job. "original" preserves
 * the input; GIF always becomes PNG since we don't have a GIF encoder.
 * ("auto" is multi-format and handled by `formatsFor`; it never gets here.)
 */
export function resolveOutputMime(
  inputMime: string,
  outputFormat: Exclude<OutputFormat, "auto">,
): OutputMime {
  if (outputFormat !== "original") return outputFormat;
  // Original
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
 * Blends in sRGB (gamma-encoded) space — exactly what browsers and image
 * editors do when they draw a transparent PNG over a page. Linear-light
 * blending is "physically correct" but makes soft edges and shadows come
 * out visibly lighter than the same PNG looks on screen (50% red over
 * white: 242,189,190 vs the browser's 242,148,148), which reads as a
 * colour shift. Matching what users see wins.
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

  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    const inv = 255 - a;
    // (c·a + bg·(255−a)) / 255, rounded — integer math, no float per pixel.
    out[i] = (data[i] * a + bg.r * inv + 127) / 255;
    out[i + 1] = (data[i + 1] * a + bg.g * inv + 127) / 255;
    out[i + 2] = (data[i + 2] * a + bg.b * inv + 127) / 255;
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

// ── Platform decode (createImageBitmap + OffscreenCanvas) ─────────
// Used where @jsquash has no decoder or gives up: GIF (and the first frame
// of animated WebP), and CMYK/YCCK JPEGs, which mozjpeg's decoder rejects
// ("Unsupported color conversion request") but browsers decode — applying
// the embedded CMYK profile, so colours come out right. Both APIs are
// available in workers (Baseline 2023).

// Hard cap on platform-decode dimensions. A 10000×10000 frame would
// allocate 400MB for the ImageBitmap and another 400MB for the
// getImageData buffer — enough to OOM most tabs before they can throw.
const MAX_PLATFORM_DECODE_PIXELS = 100_000_000; // 100 MP

async function decodeWithPlatform(buffer: ArrayBuffer, mime: string): Promise<ImageData> {
  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") {
    throw new Error("Decoding this image requires a modern browser.");
  }
  const blob = new Blob([new Uint8Array(buffer)], { type: mime });
  // EXIF orientation is applied separately (readJpegOrientation), so ask
  // the platform not to rotate — otherwise rotated photos turn twice.
  const bitmap = await createImageBitmap(blob, { imageOrientation: "none" }).catch((err) => {
    throw new Error(`Failed to decode ${mime}: ${(err as Error)?.message ?? "unknown error"}`);
  });

  if (bitmap.width * bitmap.height > MAX_PLATFORM_DECODE_PIXELS) {
    bitmap.close();
    throw new Error(
      `Image too large to decode in the browser (${bitmap.width}×${bitmap.height}). Resize the source and retry.`,
    );
  }

  const off = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = off.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    throw new Error(`Failed to decode ${mime}: 2D context unavailable`);
  }
  try {
    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, off.width, off.height);
  } finally {
    bitmap.close();
  }
}

// ── Source inspection (cheap byte scans, no decode) ──────────────────

/** Which animated container this is, if any — we keep the first frame only. */
export function detectAnimation(buffer: ArrayBuffer, mime: string): "gif" | "apng" | "webp" | null {
  const b = new Uint8Array(buffer);
  if (mime === "image/gif") {
    // More than one Graphic Control Extension ⇒ more than one frame.
    let frames = 0;
    for (let i = 0; i + 1 < b.length; i++) {
      if (b[i] === 0x21 && b[i + 1] === 0xf9 && ++frames > 1) return "gif";
    }
    return null;
  }
  if (mime === "image/png") {
    // An acTL chunk before the first IDAT marks an APNG.
    let off = 8;
    while (off + 8 <= b.length) {
      const len = ((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0;
      const type = String.fromCharCode(b[off + 4], b[off + 5], b[off + 6], b[off + 7]);
      if (type === "acTL") return "apng";
      if (type === "IDAT") return null;
      off += 12 + len;
    }
    return null;
  }
  if (mime === "image/webp") {
    // RIFF....WEBPVP8X, flags byte at 20, animation bit 0x02.
    const isVp8x = b.length > 21 && b[12] === 0x56 && b[13] === 0x50 && b[14] === 0x38 && b[15] === 0x58;
    return isVp8x && (b[20] & 0x02) !== 0 ? "webp" : null;
  }
  return null;
}

/**
 * Whether the source carries metadata we drop on re-encode (EXIF — camera,
 * date, GPS — or XMP/text chunks). The output never includes it; this only
 * lets the UI say so instead of stripping silently.
 */
export function detectMetadata(buffer: ArrayBuffer, mime: string): boolean {
  const b = new Uint8Array(buffer);
  if (mime === "image/jpeg") {
    // APP1 (FFE1) segment = Exif or XMP.
    let off = 2;
    while (off + 4 <= b.length && b[off] === 0xff) {
      const marker = b[off + 1];
      if (marker === 0xda || marker === 0xd9) return false; // SOS / EOI
      if (marker === 0xe1) return true;
      off += 2 + ((b[off + 2] << 8) | b[off + 3]);
    }
    return false;
  }
  if (mime === "image/png") {
    let off = 8;
    while (off + 8 <= b.length) {
      const len = ((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0;
      const type = String.fromCharCode(b[off + 4], b[off + 5], b[off + 6], b[off + 7]);
      if (type === "eXIf" || type === "tEXt" || type === "iTXt" || type === "zTXt") return true;
      if (type === "IDAT") return false;
      off += 12 + len;
    }
    return false;
  }
  if (mime === "image/webp") {
    // VP8X flags: EXIF 0x08, XMP 0x04.
    const isVp8x = b.length > 21 && b[12] === 0x56 && b[13] === 0x50 && b[14] === 0x38 && b[15] === 0x58;
    return isVp8x && (b[20] & 0x0c) !== 0;
  }
  if (mime === "image/heic" || mime === "image/heif" || mime === "image/avif") {
    // An "Exif" item in the first 256 KB (the meta box lives up front).
    const end = Math.min(b.length - 4, 262_144);
    for (let i = 0; i < end; i++) {
      if (b[i] === 0x45 && b[i + 1] === 0x78 && b[i + 2] === 0x69 && b[i + 3] === 0x66) return true;
    }
  }
  return false;
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

/**
 * Detect a CMYK / YCCK JPEG by reading the component count from the Start-
 * Of-Frame marker. RGB JPEGs have 3 components (Y/Cb/Cr); CMYK/YCCK have 4.
 * The @jsquash (mozjpeg) decoder converts 4-component JPEGs to RGB only
 * approximately — there's no embedded-profile-aware CMYK transform — so
 * these sources can come out colour-shifted. We surface a warning instead
 * of silently distorting (per the tool's colour-honesty rule).
 */
function detectJpegCmyk(buffer: ArrayBuffer): boolean {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return false;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xffd9 || marker === 0xffda) break; // EOI / SOS
    if ((marker & 0xff00) !== 0xff00) break; // desync
    const segLen = view.getUint16(offset, false);
    const m = marker & 0xff;
    // SOF markers are 0xC0–0xCF except DHT(C4), JPG(C8), DAC(CC).
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      // SOF data: precision(1) height(2) width(2) Nf(1) → Nf at +7 from the
      // length field.
      if (offset + 7 < view.byteLength) {
        return view.getUint8(offset + 7) === 4;
      }
      return false;
    }
    offset += segLen;
  }
  return false;
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
  if (mime === "image/gif" || (mime === "image/webp" && detectAnimation(buffer, mime) === "webp")) {
    // GIF has no @jsquash decoder; libwebp's decoder rejects animated WebP.
    // The platform decoder hands back the first frame of either.
    imageData = await decodeWithPlatform(buffer, mime);
  } else if (mime === "image/heic" || mime === "image/heif") {
    imageData = await decodeHeic(buffer);
  } else {
    const decode = await loadDecoder(mime);
    try {
      imageData = await decode(buffer);
    } catch (err) {
      // CMYK/YCCK JPEGs: mozjpeg refuses them; the browser decodes them
      // with their embedded profile. Anything else genuinely failed.
      if (mime === "image/jpeg" && detectJpegCmyk(buffer)) {
        imageData = await decodeWithPlatform(buffer, mime);
      } else {
        throw new Error(
          `Failed to decode ${mime}: ${(err as Error)?.message ?? "corrupt header or unsupported color profile"}`,
        );
      }
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

/**
 * JPEG chroma subsampling for a named mode. "Best" always keeps full 4:4:4
 * chroma. Balanced/Smallest use 4:2:0 for photographic images — measured
 * ≈9% smaller at equal SSIMULACRA2, and what mozjpeg/cjpeg default to —
 * but keep 4:4:4 for screenshots and graphics, where halving chroma
 * resolution visibly smears coloured text and thin coloured lines.
 */
function jpegChromaFor(imageData: ImageData, mode: "full" | "photo-420"): "4:2:0" | "4:4:4" {
  if (mode === "full") return "4:4:4";
  return isPhotographicImage(imageData) ? "4:2:0" : "4:4:4";
}

// ── Per-format encoders ───────────────────────────────────────────

/** Every pixel has R = G = B (early exit on the first coloured pixel). */
function isGrayscale(imageData: ImageData): boolean {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] !== d[i + 1] || d[i] !== d[i + 2]) return false;
  }
  return true;
}

/** Any pixel not fully opaque. */
function hasTransparency(imageData: ImageData): boolean {
  const d = imageData.data;
  for (let i = 3; i < d.length; i += 4) if (d[i] !== 255) return true;
  return false;
}

async function encodeJpegAt(
  imageData: ImageData,
  quality: number,
  advanced: AdvancedEncoderOptions,
  chroma: "4:2:0" | "4:4:4",
  grayscale = false,
  /** Budget probes: skip the multipass trellis (≈2× faster, a few % bigger). */
  fast = false,
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
    trellis_multipass: advanced.jpegTrellis && !fast,
    smoothing: 0,
    chroma_subsample: chroma === "4:4:4" ? 1 : 2,
    auto_subsample: false,
    chroma_quality: quality,
    trellis: advanced.jpegTrellis,
    smart_quant: advanced.jpegSmartQ,
    // 1 = GRAYSCALE, 3 = YCbCr. A grayscale source keeps one channel
    // instead of being re-encoded as colour (smaller, and stays gray).
    color_space: grayscale ? 1 : 3,
  };
  return (encode as (img: ImageData, opts: unknown) => Promise<ArrayBuffer>)(imageData, options);
}

/**
 * Give fully-transparent pixels the colour of their nearest visible
 * neighbour (row-wise, then column-wise for empty rows). Their RGB is
 * invisible, but lossy WebP/AVIF predict and subsample across it: a blue
 * logo on a transparent-red canvas got a purple 1px edge. Only alpha = 0
 * pixels change, so the visible image is untouched — and smooth hidden
 * colour also compresses better. Returns the input when nothing is
 * transparent. O(pixels).
 */
function bleedTransparentPixels(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  let any = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) {
      any = true;
      break;
    }
  }
  if (!any) return imageData;
  const out = new Uint8ClampedArray(data);
  const rowFilled = new Uint8Array(height);
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    let last = -1;
    // Left → right: carry the last visible colour; remember the first one.
    let first = -1;
    for (let x = 0; x < width; x++) {
      const i = row + x * 4;
      if (out[i + 3] !== 0) {
        last = i;
        if (first < 0) first = i;
      } else if (last >= 0) {
        out[i] = out[last];
        out[i + 1] = out[last + 1];
        out[i + 2] = out[last + 2];
      }
    }
    if (first < 0) continue; // fully transparent row — filled below
    rowFilled[y] = 1;
    // Leading transparent run takes the first visible colour.
    for (let i = row; i < first; i += 4) {
      out[i] = out[first];
      out[i + 1] = out[first + 1];
      out[i + 2] = out[first + 2];
    }
  }
  // Fully transparent rows copy the nearest filled row above/below.
  let prev = -1;
  for (let y = 0; y < height; y++) {
    if (rowFilled[y]) {
      prev = y;
      continue;
    }
    let src = prev;
    if (src < 0) {
      for (let k = y + 1; k < height; k++) {
        if (rowFilled[k]) {
          src = k;
          break;
        }
      }
    }
    if (src < 0) return imageData; // nothing visible at all
    const from = src * width * 4;
    const to = y * width * 4;
    for (let x = 0; x < width * 4; x += 4) {
      out[to + x] = out[from + x];
      out[to + x + 1] = out[from + x + 1];
      out[to + x + 2] = out[from + x + 2];
    }
  }
  return new ImageData(out, width, height);
}

async function encodeWebpAt(
  imageData: ImageData,
  quality: number,
  advanced: AdvancedEncoderOptions,
  /** Budget probes: method 4 (much faster, ~1–3% bigger). */
  fast = false,
): Promise<ArrayBuffer> {
  const { encode } = await import("@jsquash/webp");
  const options = {
    quality,
    method: fast ? Math.min(4, advanced.webpMethod) : advanced.webpMethod,
    use_sharp_yuv: advanced.webpSharpYuv ? 1 : 0,
    autofilter: advanced.webpAutofilter ? 1 : 0,
    alpha_compression: 1,
    alpha_filtering: 1,
    alpha_quality: 100,
    pass: fast ? 1 : 6,
    segments: 4,
    partitions: 0,
    filter_strength: 60,
    filter_sharpness: 0,
    filter_type: 1,
    preprocessing: 0,
  };
  return (encode as (img: ImageData, opts: unknown) => Promise<ArrayBuffer>)(imageData, options);
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

/** AVIF encoder speed (see ENCODER_OPTIONS.avifSpeed for the measurement). */
function avifSpeedFor(): number {
  return ENCODER_OPTIONS.avifSpeed;
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

/** One PNG encode: optional palette quantization, then OxiPNG. */
async function encodePngAt(
  imageData: ImageData,
  mode: { lossless: true } | { lossless: false; quality: number },
  settings: CompressionSettings,
): Promise<ArrayBuffer> {
  let working = imageData;
  if (!mode.lossless) {
    try {
      const result = await quantizePng(imageData, {
        quality: clamp(mode.quality, PNG_QUANTIZATION_QUALITY_MIN, PNG_QUANTIZATION_QUALITY_MAX),
        maxColors: 256,
      });
      working = result.imageData;
    } catch (err) {
      throw new Error(`Failed to quantize PNG: ${(err as Error)?.message ?? "unknown error"}`);
    }
  }
  const { encode } = await import("@jsquash/png");
  const encoded = await (encode as (img: ImageData) => Promise<ArrayBuffer>)(working);
  try {
    const { optimise } = await import("@jsquash/oxipng");
    return await (optimise as (buf: ArrayBuffer, opts: unknown) => Promise<ArrayBuffer>)(encoded, {
      // Effort is measured, not maxed (26-image set, palette output):
      //   level 6: median 1.9 s, worst 10.2 s
      //   level 4: +0.1% bytes, median 0.83 s, worst 4.8 s
      //   level 2: +1–3% bytes, median 0.14 s, worst 0.75 s
      // Pixels are identical at every level (oxipng is lossless), so
      // Balanced/Small take the instant path and Best spends 2× for the
      // last 0.1%. Full-colour RGBA (lossless) is capped at 3: level 6 took
      // 12–29 s per image there for a couple of percent.
      level: Math.min(
        oxipngLevelForSize(working.width * working.height, settings.pngOptimizationLevel),
        settings.qualityMode === "maximum" && settings.goal !== "budget" ? 4 : 2,
        mode.lossless ? 3 : 6,
      ),
      interlace: false,
    });
  } catch (err) {
    throw new Error(`Failed to optimize PNG: ${(err as Error)?.message ?? "unknown error"}`);
  }
}

/** PNG behaviour for the quality goal: named modes override the toggle. */
function pngModeFor(settings: CompressionSettings): { lossless: true } | { lossless: false; quality: number } {
  let pngMode = settings.pngMode;
  let quantQ = settings.pngQuantizationQuality;
  if (settings.qualityMode !== "custom") {
    const mapped = QUALITY_MODE_DEFS[settings.qualityMode].png;
    pngMode = mapped.pngMode;
    quantQ = mapped.pngQuantizationQuality;
  }
  return pngMode === "lossless" ? { lossless: true } : { lossless: false, quality: quantQ };
}

// ── Encoding one format (quality goal or size budget) ─────────────

interface Encoded {
  buffer: ArrayBuffer;
  mimeType: OutputMime;
  codec: string;
  /** Encoder quality used; null = lossless. */
  quality: number | null;
  pngPhotoAdvisory: boolean;
  /** Budget goal: the search outcome (fit is re-checked after ICC splice). */
  budgetQuality?: number | null;
}

/**
 * One lossy codec, prepared once for repeated encodes (a budget search
 * re-encodes 5–7 times; estimates encode a sample). `fast` = reduced
 * effort: JPEG without multipass trellis, WebP method 4, AVIF one speed
 * step faster.
 */
function lossyEncoder(
  codec: LossyCodec,
  pixels: ImageData,
  settings: CompressionSettings,
): { encodeAt: (q: number, fast: boolean) => Promise<ArrayBuffer>; label: (q: number) => string } {
  const mode = settings.qualityMode;
  const def = mode === "custom" ? null : QUALITY_MODE_DEFS[mode];
  if (codec === "jpeg") {
    const chroma = jpegChromaFor(pixels, def ? def.jpegChroma : "photo-420");
    const gray = isGrayscale(pixels);
    return {
      encodeAt: (q, fast) => encodeJpegAt(pixels, q, ENCODER_OPTIONS, chroma, gray, fast),
      label: (q) => `MozJPEG · q${q} · ${gray ? "grayscale" : chroma}`,
    };
  }
  const bled = bleedTransparentPixels(pixels);
  if (codec === "webp") {
    return { encodeAt: (q, fast) => encodeWebpAt(bled, q, ENCODER_OPTIONS, fast), label: (q) => `libwebp · q${q}` };
  }
  const speed = avifSpeedFor();
  // Fast = one speed step up: speed 7 tracks speed 6 sizes closely
  // (speed 8 drifted up to +184% on alpha graphics in the benchmark).
  return { encodeAt: (q, fast) => encodeAvifAt(bled, q, ENCODER_OPTIONS, fast ? speed + 1 : speed), label: (q) => `libavif · q${q}` };
}

export async function encodeFormat(
  outMime: OutputMime,
  pixels: ImageData,
  settings: CompressionSettings,
  inputMime: string,
  /** Encoder-facing byte budget (already net of any ICC splice), or null. */
  targetBytes: number | null,
): Promise<Encoded> {
  if (outMime === "image/png") return encodePngFormat(pixels, settings, inputMime, targetBytes);

  const codec = codecOfMime(outMime) as LossyCodec;
  const { encodeAt, label } = lossyEncoder(codec, pixels, settings);

  if (targetBytes === null) {
    const q = qualityForCodec(codec, settings);
    const buffer = await encodeAt(q, false);
    return { buffer, mimeType: outMime, codec: label(q), quality: q, pngPhotoAdvisory: false };
  }

  // Size budget, coarse to fine: bracket the answer with fast probes
  // (reduced effort, 3–7× quicker), then settle it with full-effort
  // encodes — full effort is usually a little smaller at equal q, so it
  // may afford a step up. Whatever ships was measured: never over budget
  // unless even the floor doesn't fit (then the smallest, flagged).
  const range = budgetRange(codec);
  const start = qualityForCodec(codec, settings);
  const coarse = await searchBudget(
    async (q) => {
      const buf = await encodeAt(q, true);
      return { size: buf.byteLength, value: buf };
    },
    targetBytes,
    { min: range.min, max: range.max, start, maxProbes: BUDGET_FAST_PROBES },
  );
  let q = coarse.chosen.q;
  let buffer = await encodeAt(q, false);
  if (coarse.fits) {
    if (buffer.byteLength > targetBytes) {
      // Full effort came out bigger (rare): the probe's bytes fit — ship them.
      buffer = coarse.chosen.value;
    } else if (q < range.max) {
      // One step up, halfway to the first quality that didn't fit fast.
      const ceil = coarse.failAbove ?? range.max + 1;
      const up = Math.min(range.max, Math.round((q + ceil) / 2));
      if (up > q) {
        const next = await encodeAt(up, false);
        if (next.byteLength <= targetBytes) {
          q = up;
          buffer = next;
        }
      }
    }
  } else if (buffer.byteLength > coarse.chosen.size) {
    buffer = coarse.chosen.value;
  }
  return {
    buffer,
    mimeType: outMime,
    codec: `${label(q)} · budget`,
    quality: q,
    pngPhotoAdvisory: false,
    budgetQuality: q,
  };
}

async function encodePngFormat(
  pixels: ImageData,
  settings: CompressionSettings,
  inputMime: string,
  targetBytes: number | null,
): Promise<Encoded> {
  // GIF input forces lossless PNG under the quality goal: the source
  // palette is already indexed; re-quantizing it would add artifacts.
  const quality = inputMime === "image/gif" ? ({ lossless: true } as const) : pngModeFor(settings);
  // Photographic flag drives the JPEG/WebP advisory (any photo-ish PNG —
  // these compress 2-3× smaller in those formats).
  const photographic = isPhotographicImage(pixels);

  if (targetBytes === null) {
    const buffer = await encodePngAt(pixels, quality, settings);
    return {
      buffer,
      mimeType: "image/png",
      codec: quality.lossless ? "OxiPNG" : "utilyx-quantize + OxiPNG",
      quality: quality.lossless ? null : quality.quality,
      pngPhotoAdvisory: !quality.lossless && photographic,
    };
  }

  // Budget: lossless first (the best a PNG can be); then palette quality
  // steps, highest that fits.
  const lossless = await encodePngAt(pixels, { lossless: true }, settings);
  if (lossless.byteLength <= targetBytes) {
    return { buffer: lossless, mimeType: "image/png", codec: "OxiPNG · budget", quality: null, pngPhotoAdvisory: false, budgetQuality: null };
  }
  const outcome = await searchBudget(
    async (q) => {
      const buf = await encodePngAt(pixels, { lossless: false, quality: q }, settings);
      return { size: buf.byteLength, value: buf };
    },
    targetBytes,
    { min: PNG_BUDGET_RANGE.min, max: PNG_BUDGET_RANGE.max, start: PNG_BUDGET_RANGE.start, maxProbes: BUDGET_MAX_PROBES - 1 },
  );
  const smallest = outcome.chosen.size <= lossless.byteLength ? outcome.chosen : { q: null, value: lossless };
  return {
    buffer: smallest.value,
    mimeType: "image/png",
    codec: smallest.q === null ? "OxiPNG · budget" : "utilyx-quantize + OxiPNG · budget",
    quality: smallest.q,
    pngPhotoAdvisory: photographic,
    budgetQuality: smallest.q,
  };
}

// ── Top-level dispatch ────────────────────────────────────────────

/** Resize never targets past the most permissive encoder limit. */
const CANVAS_MAX_DIMENSION = 65500;

function targetSize(settings: CompressionSettings, srcW: number, srcH: number): { width: number; height: number } {
  if (!settings.resize.enabled || (!settings.resize.width && !settings.resize.height)) return { width: srcW, height: srcH };
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
  targetW = clamp(targetW, 1, CANVAS_MAX_DIMENSION);
  targetH = clamp(targetH, 1, CANVAS_MAX_DIMENSION);
  // A cap never enlarges: an image already within it keeps its size.
  if (settings.resize.downscaleOnly === true && targetW >= srcW && targetH >= srcH) return { width: srcW, height: srcH };
  return { width: targetW, height: targetH };
}

interface PreparedSource {
  /** Decoded (+ oriented, + resized) pixels in the source's colour space. */
  working: ImageData;
  sourceDimensions: { width: number; height: number };
  hasAlpha: boolean;
  sourceIcc: Uint8Array | null;
  /** The embedded profile is Display P3 (format swaps convert to sRGB). */
  p3: boolean;
  /** The embedded profile is plain sRGB (a swap that drops it is harmless). */
  srgb: boolean;
  cmyk: boolean;
  animatedSource: "gif" | "apng" | "webp" | null;
  metadataStripped: boolean;
  sourcePreview?: { buffer: ArrayBuffer; mimeType: string };
}

/** Decode → orient → resize. Shared by compression and the diff view so
 *  both see exactly the same pre-encode pixels. */
async function prepareSource(
  buffer: ArrayBuffer,
  mime: string,
  settings: CompressionSettings,
  opts: { preview: boolean },
): Promise<PreparedSource> {
  // Extract the source ICC profile *before* decoding so we still have
  // access to the raw container bytes.
  const sourceIcc = supportsIcc(mime) ? extractIcc(buffer, mime) : null;
  // Cheap byte scans for honest notices: animation we can't keep, and
  // metadata (EXIF/GPS) the re-encode drops.
  const animatedSource = detectAnimation(buffer, mime);
  const metadataStripped = detectMetadata(buffer, mime);
  // CMYK/YCCK JPEGs decode approximately — flag so we can warn the user.
  const cmyk = mime === "image/jpeg" && detectJpegCmyk(buffer);

  let decoded: ImageData;
  let dimensions: { width: number; height: number };
  try {
    const decodeResult = await decodeImage(buffer, mime);
    decoded = decodeResult.imageData;
    dimensions = decodeResult.dimensions;
  } catch (err) {
    const m = (err as Error)?.message ?? "";
    if (/unsupported input format/i.test(m)) throw new CompressionFailure({ kind: "unsupported-input", mime });
    if (/memory|allocation/i.test(m)) throw new CompressionFailure({ kind: "out-of-memory" });
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

  // Browsers can't display HEIC, so the UI would show a broken "Original".
  // Render the decoded source once as a high-quality JPEG for display only.
  let sourcePreview: { buffer: ArrayBuffer; mimeType: string } | undefined;
  if (opts.preview && (mime === "image/heic" || mime === "image/heif")) {
    try {
      sourcePreview = {
        buffer: await encodeJpegAt(flattenAlpha(decoded), 92, ENCODER_OPTIONS, "4:4:4"),
        mimeType: "image/jpeg",
      };
    } catch {
      /* preview is best-effort — compression continues regardless */
    }
  }

  const profile = sourceIcc ? await iccProfileBytes(sourceIcc, mime) : null;
  const p3 = !!profile && isDisplayP3(profile);
  const srgb = !!profile && !p3 && isSrgbProfile(profile);

  let working = decoded;
  const target = targetSize(settings, dimensions.width, dimensions.height);
  if (target.width !== dimensions.width || target.height !== dimensions.height) {
    working = ENCODER_OPTIONS.linearResize
      ? await resizeImageLinear(working, target.width, target.height)
      : await resizeImage(working, target.width, target.height);
  }

  return {
    working,
    sourceDimensions: { ...dimensions },
    hasAlpha: hasTransparency(working),
    sourceIcc,
    p3,
    srgb,
    cmyk,
    animatedSource,
    metadataStripped,
    sourcePreview,
  };
}

/** Pixels as a given output format sees them: a format swap can't carry the
 *  source profile, so a Display P3 source is converted to sRGB (in a copy —
 *  a same-format candidate keeps the profile and the original pixels);
 *  JPEG has no alpha, so transparency is composited over white. */
function pixelsForFormat(src: PreparedSource, inputMime: string, outMime: OutputMime, cache: Map<string, ImageData>): ImageData {
  const convert = src.p3 && outMime !== inputMime;
  const flatten = outMime === "image/jpeg";
  const key = `${convert ? "srgb" : "src"}:${flatten ? "flat" : "alpha"}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let px = src.working;
  if (convert) {
    px = new ImageData(new Uint8ClampedArray(px.data), px.width, px.height);
    convertP3ToSrgb(px);
  }
  if (flatten) px = flattenAlpha(px);
  cache.set(key, px);
  return px;
}

/** Which containers to encode for this job. */
function formatsFor(src: PreparedSource, inputMime: string, settings: CompressionSettings, only?: readonly OutputMime[]): OutputMime[] {
  const fitsSide = (m: OutputMime) => Math.max(src.working.width, src.working.height) <= MAX_SIDE_FOR[m];
  if (settings.outputFormat === "auto") {
    return autoFormats({ hasAlpha: src.hasAlpha, width: src.working.width, height: src.working.height }, only);
  }
  if (only) return only.filter(fitsSide);
  const outMime = resolveOutputMime(inputMime, settings.outputFormat);
  // Fail fast on frames the encoders can't take. Checked *after* resize so
  // a "resize this huge image down" workflow still succeeds.
  if (!fitsSide(outMime)) {
    throw new CompressionFailure({ kind: "image-too-large", dimensions: [src.working.width, src.working.height] });
  }
  return [outMime];
}

export interface CandidateOptions {
  /** Encode only these containers (split Auto jobs). */
  formats?: readonly OutputMime[];
  /** Render the HEIC display preview (one job per image should). */
  preview?: boolean;
  /** Attach the downscaled estimate sample (one job per image should). */
  sample?: boolean;
}

/**
 * Encode one image in every container this job asks for, returning one
 * un-merged result per format (keptOriginal false). Pure: no DOM beyond
 * OffscreenCanvas (GIF / CMYK decode) and the lazily imported codec WASMs.
 * Safe to call from a Web Worker.
 */
export async function compressCandidates(
  buffer: ArrayBuffer,
  mime: string,
  settings: CompressionSettings,
  opts: CandidateOptions = {},
): Promise<CompressionResult[]> {
  const startTime = performance.now();
  const src = await prepareSource(buffer, mime, settings, { preview: opts.preview !== false });
  const formats = formatsFor(src, mime, settings, opts.formats);
  // A split Auto job for a format this image can't use (JPEG with alpha,
  // WebP past 16383px) contributes nothing; the caller merges the rest.
  if (formats.length === 0) return [];
  const targetBytes = settings.goal === "budget" ? Math.max(1024, Math.round(settings.budgetKb * 1024)) : null;
  const cache = new Map<string, ImageData>();
  const parts: CompressionResult[] = [];
  let firstError: unknown = null;

  for (const outMime of formats) {
    const t0 = performance.now();
    const pixels = pixelsForFormat(src, mime, outMime, cache);
    // A same-format output gets the source profile spliced back in, which
    // costs bytes — budget the encoder for the file as delivered.
    const willInject = !!src.sourceIcc && outMime === mime && supportsIcc(outMime);
    const encoderBudget = targetBytes === null ? null : Math.max(512, targetBytes - (willInject ? (src.sourceIcc?.byteLength ?? 0) + 64 : 0));
    let encoded: Encoded;
    try {
      encoded = await encodeFormat(outMime, pixels, settings, mime, encoderBudget);
    } catch (err) {
      const msg = (err as Error)?.message ?? "";
      const failure =
        err instanceof CompressionFailure
          ? err
          : new CompressionFailure(/memory|allocation/i.test(msg) ? { kind: "out-of-memory" } : { kind: "encode-failed", targetMime: outMime });
      // Auto: one codec failing (e.g. AVIF out of memory) mustn't sink the rest.
      if (formats.length > 1) {
        firstError ??= failure;
        continue;
      }
      throw failure;
    }

    // ICC pass-through: splice the source's colour profile into a
    // same-format output so wide-gamut images keep their colours. A
    // format swap can't carry it: P3 pixels were converted to sRGB
    // above ("converted"); any other profile is reported as "lost".
    let finalBuffer = encoded.buffer;
    let iccStatus: IccStatus = "none";
    if (src.sourceIcc) {
      if (mime === outMime && supportsIcc(outMime)) {
        const result = injectIcc(finalBuffer, outMime, src.sourceIcc);
        finalBuffer = result.buffer;
        iccStatus = result.injected ? "preserved" : "lost";
      } else if (src.p3) {
        iccStatus = "converted";
      } else {
        // An sRGB profile is what browsers assume anyway — nothing is lost.
        iccStatus = src.srgb ? "none" : "lost";
      }
    }
    // A CMYK source is the dominant colour concern — its warning wins.
    if (src.cmyk) iccStatus = "cmyk";

    const newSize = finalBuffer.byteLength;
    const fits = targetBytes === null ? null : newSize <= targetBytes;
    const budgetQ = encoded.budgetQuality ?? null;
    const codec = codecOfMime(outMime);
    parts.push({
      buffer: finalBuffer,
      mimeType: outMime,
      originalSize: buffer.byteLength,
      newSize,
      savedPct: signedSavedPct(buffer.byteLength, newSize),
      encodingTimeMs: Math.round(performance.now() - (parts.length === 0 ? startTime : t0)),
      codec: encoded.codec,
      dimensions: { width: pixels.width, height: pixels.height },
      sourceDimensions: { ...src.sourceDimensions },
      iccStatus,
      qualityModeUsed: settings.qualityMode,
      pngPhotoAdvisory: encoded.pngPhotoAdvisory,
      keptOriginal: false,
      sourcePreview: parts.length === 0 ? src.sourcePreview : undefined,
      animatedSource: src.animatedSource,
      metadataStripped: src.metadataStripped,
      autoPicked: false,
      candidates: [{ mimeType: outMime, size: newSize, quality: encoded.quality, fits, iccStatus }],
      budget:
        targetBytes === null
          ? null
          : {
              targetBytes,
              fits: newSize <= targetBytes,
              quality: budgetQ,
              soft: budgetQ !== null && (codec ? jpegScaleOf(codec, budgetQ) : budgetQ) < BUDGET_SOFT_SCALE,
            },
      hasAlpha: src.hasAlpha,
      source: { hasProfile: src.sourceIcc !== null, cmyk: src.cmyk },
    });
  }
  if (parts.length === 0) {
    if (firstError) throw firstError;
    throw new CompressionFailure({ kind: "encode-failed", targetMime: formats[0] ?? "image" });
  }
  if (opts.sample !== false) {
    try {
      parts[0].sample = await makeEstimateSample(src.working, mime, src.p3);
    } catch {
      /* estimates are optional — the bars then show "—" */
    }
  }
  return parts;
}

/**
 * Compress an in-memory image buffer: every candidate container, then the
 * Auto pick and the never-bigger rule (see image-compressor.auto.ts).
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
  const startTime = performance.now();
  const parts = await compressCandidates(buffer, mime, settings);
  return mergeCandidates(parts, { buffer, mime }, settings, {
    encodingTimeMs: Math.round(performance.now() - startTime),
  });
}

// ── "Show what changed" ───────────────────────────────────────────

/** Largest diff map we render; bigger outputs are box-downscaled to it. */
const DIFF_MAX_PIXELS = 16_000_000;

export interface DiffResult {
  /** PNG of the amplified difference, at the output's size (or a box-
   *  downscaled copy when that exceeds DIFF_MAX_PIXELS). */
  blob: Blob;
  width: number;
  height: number;
  /** Mean perceptual error (0–255 scale). */
  mean: number;
  /** Share of pixels whose error is above ~1% (likely visible when zoomed). */
  changedShare: number;
}

/**
 * Per-pixel difference between the exact pixels the encoder was given and
 * the decoded result. Error is measured on a luma-weighted scale (luma
 * counts fully, chroma at half — the eye is less sensitive to it), alpha-
 * aware, then tone-mapped (1 − e^(−err/10)) so a 3-level ringing halo is
 * already visible and big errors saturate. Drawn over a dimmed copy of
 * the image so the changes have context: dim → clay → cream with loss.
 */
export async function computeDiff(
  buffer: ArrayBuffer,
  mime: string,
  settings: CompressionSettings,
  result: { buffer: ArrayBuffer; mimeType: string },
): Promise<DiffResult> {
  if (typeof OffscreenCanvas === "undefined") throw new Error("Diff needs OffscreenCanvas");
  const src = await prepareSource(buffer, mime, settings, { preview: false });
  const outMime = result.mimeType as OutputMime;
  const ref = pixelsForFormat(src, mime, outMime, new Map());
  let out = (await decodeImage(result.buffer, outMime)).imageData;
  if (out.width !== ref.width || out.height !== ref.height) out = await resizeImage(out, ref.width, ref.height);

  const k = Math.max(1, Math.ceil(Math.sqrt((ref.width * ref.height) / DIFF_MAX_PIXELS)));
  const w = Math.max(1, Math.floor(ref.width / k));
  const h = Math.max(1, Math.floor(ref.height / k));
  const a = ref.data;
  const b = out.data;
  const rgba = new Uint8ClampedArray(w * h * 4);
  let sum = 0;
  let changed = 0;
  const rw = ref.width;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Max error within the k×k block (so downscaling never hides a halo).
      let err = 0;
      let luma = 0;
      for (let dy = 0; dy < k; dy++) {
        const row = (y * k + dy) * rw;
        for (let dx = 0; dx < k; dx++) {
          const i = (row + x * k + dx) * 4;
          const aa = a[i + 3] / 255;
          const ab = b[i + 3] / 255;
          const dr = (a[i] * aa - b[i] * ab);
          const dg = (a[i + 1] * aa - b[i + 1] * ab);
          const db = (a[i + 2] * aa - b[i + 2] * ab);
          const dY = 0.299 * dr + 0.587 * dg + 0.114 * db;
          const dCb = db - dY;
          const dCr = dr - dY;
          const e = Math.sqrt(dY * dY + 0.25 * (dCb * dCb + dCr * dCr)) + 0.5 * Math.abs(a[i + 3] - b[i + 3]);
          if (e > err) err = e;
          luma += (0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]) * aa;
        }
      }
      luma /= k * k;
      sum += err;
      if (err > 2.5) changed++;
      const t = 1 - Math.exp(-err / 10);
      const base = 0.24 * luma;
      let r: number;
      let g: number;
      let bl: number;
      if (t < 0.6) {
        const u = t / 0.6;
        r = base + (224 - base) * u;
        g = base + (160 - base) * u;
        bl = base + (114 - base) * u;
      } else {
        const u = (t - 0.6) / 0.4;
        r = 224 + (255 - 224) * u;
        g = 160 + (246 - 160) * u;
        bl = 114 + (232 - 114) * u;
      }
      const o = (y * w + x) * 4;
      rgba[o] = r;
      rgba[o + 1] = g;
      rgba[o + 2] = bl;
      rgba[o + 3] = 255;
    }
  }
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Diff: 2D context unavailable");
  ctx.putImageData(new ImageData(rgba, w, h), 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return { blob, width: w, height: h, mean: sum / (w * h), changedShare: changed / (w * h) };
}

// ── Per-format size estimates (the comparison bars) ───────────────

/** Estimates encode a downscaled copy of the pre-encode pixels (≤ 0.25 MP). */
export const ESTIMATE_MAX_PIXELS = 262_144;

/**
 * Median bias of the mosaic estimate vs real full encodes, per codec,
 * measured on 34 images (Kodak ×20, alpha graphics ×9, screenshots ×4, a
 * 12 MP photo at 1920px): est/real = 1.064 JPEG, 1.128 WebP, 1.140 AVIF,
 * 0.903 PNG. The scaled sample size is multiplied by the inverse.
 * After calibration — photos: median error 3–6%, worst 25%; screenshots
 * and flat graphics: median 14–49%, worst 76% (tiles miss the long-range
 * redundancy of big flat areas), so those are flagged `rough`.
 */
export const ESTIMATE_CALIBRATION: Record<OutputMime, number> = {
  "image/jpeg": 0.94,
  "image/webp": 0.89,
  "image/avif": 0.88,
  "image/png": 1.11,
};

/** The downscaled pre-encode pixels a result carries for estimating. */
export type EstimateSample = EstimateSampleData;

/** Mosaic tile side: a multiple of every codec's block size (8/16/64-aligned
 *  enough), so tile seams cost little. */
const MOSAIC_TILE = 128;
const MOSAIC_GRID = 4;

/**
 * Build the estimate sample from the working pixels. Small images are used
 * whole (ratio 1, the estimate is then nearly exact). Larger ones become
 * either a mosaic of full-resolution tiles taken on an even grid — detail
 * per pixel stays the image's own, so bytes scale with area — or, for
 * frames too thin for tiles, a plain downscale.
 */
export async function makeEstimateSample(
  working: ImageData,
  inputMime: string,
  p3: boolean,
  mode: "mosaic" | "downscale" = "mosaic",
): Promise<EstimateSample> {
  const { width: w, height: h } = working;
  const px = w * h;
  if (px <= ESTIMATE_MAX_PIXELS) {
    return { buffer: working.data.slice().buffer, width: w, height: h, ratio: 1, inputMime, p3 };
  }
  const nx = Math.min(MOSAIC_GRID, Math.floor(w / MOSAIC_TILE));
  const ny = Math.min(MOSAIC_GRID, Math.floor(h / MOSAIC_TILE));
  if (mode === "mosaic" && nx >= 2 && ny >= 2) {
    const mw = nx * MOSAIC_TILE;
    const mh = ny * MOSAIC_TILE;
    const out = new Uint8ClampedArray(mw * mh * 4);
    for (let ty = 0; ty < ny; ty++) {
      // Evenly spaced tile origins across the whole frame.
      const sy = Math.round(((h - MOSAIC_TILE) * (ty + 0.5)) / ny);
      for (let tx = 0; tx < nx; tx++) {
        const sx = Math.round(((w - MOSAIC_TILE) * (tx + 0.5)) / nx);
        for (let row = 0; row < MOSAIC_TILE; row++) {
          const from = ((sy + row) * w + sx) * 4;
          out.set(working.data.subarray(from, from + MOSAIC_TILE * 4), ((ty * MOSAIC_TILE + row) * mw + tx * MOSAIC_TILE) * 4);
        }
      }
    }
    return { buffer: out.buffer, width: mw, height: mh, ratio: px / (mw * mh), inputMime, p3 };
  }
  const k = Math.sqrt(ESTIMATE_MAX_PIXELS / px);
  const sample = await resizeImage(working, Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)));
  return { buffer: sample.data.buffer, width: sample.width, height: sample.height, ratio: px / (sample.width * sample.height), inputMime, p3 };
}

/**
 * Approximate size of the full image in each format, from the sample:
 * same quality settings, fast encoder effort, bytes × pixel ratio ×
 * calibration. Budget goal: whether the format would fit (encoding the
 * sample at the budget search's top and floor qualities).
 */
/** Per-file bytes that don't grow with the pixel count (headers, tables). */
export const ESTIMATE_OVERHEAD: Record<OutputMime, number> = {
  "image/jpeg": 620,
  "image/webp": 40,
  "image/avif": 320,
  "image/png": 120,
};

export async function estimateFromSample(
  sample: EstimateSample,
  settings: CompressionSettings,
  formats: readonly OutputMime[],
  opts: { fast?: boolean } = {},
): Promise<CandidateSummary[]> {
  const fast = opts.fast ?? false;
  const base = new ImageData(new Uint8ClampedArray(sample.buffer), sample.width, sample.height);
  const src: PreparedSource = {
    working: base,
    sourceDimensions: { width: base.width, height: base.height },
    hasAlpha: hasTransparency(base),
    sourceIcc: null,
    p3: sample.p3,
    srgb: false,
    cmyk: false,
    animatedSource: null,
    metadataStripped: false,
  };
  const cache = new Map<string, ImageData>();
  const target = settings.goal === "budget" ? Math.max(1024, Math.round(settings.budgetKb * 1024)) : null;
  const out: CandidateSummary[] = [];
  // Photos estimate well; screenshots / flat graphics and palette PNG don't.
  const photographic = isPhotographicImage(base);
  for (const mime of formats) {
    if (mime === "image/jpeg" && src.hasAlpha) continue;
    const pixels = pixelsForFormat(src, sample.inputMime, mime, cache);
    const head = ESTIMATE_OVERHEAD[mime];
    const scale = (bytes: number) =>
      Math.round(Math.min(bytes, head) + Math.max(0, bytes - head) * sample.ratio * ESTIMATE_CALIBRATION[mime]);
    const lossy = codecOfMime(mime);
    let size: number;
    let quality: number | null;
    let fits: boolean | null = null;
    if (lossy) {
      const { encodeAt } = lossyEncoder(lossy, pixels, settings);
      if (target === null) {
        quality = qualityForCodec(lossy, settings);
        size = scale((await encodeAt(quality, fast)).byteLength);
      } else {
        const range = budgetRange(lossy);
        const top = scale((await encodeAt(range.max, fast)).byteLength);
        if (top <= target) {
          [size, quality, fits] = [top, range.max, true];
        } else {
          const floor = scale((await encodeAt(range.min, fast)).byteLength);
          // Fits somewhere between the floor and Best: the search would land
          // just under the budget.
          [size, quality, fits] = floor > target ? [floor, range.min, false] : [target, null, true];
        }
      }
    } else {
      const mode = sample.inputMime === "image/gif" ? ({ lossless: true } as const) : pngModeFor(settings);
      if (target === null) {
        size = scale((await encodePngAt(pixels, mode, settings)).byteLength);
        quality = mode.lossless ? null : mode.quality;
      } else {
        const lossless = scale((await encodePngAt(pixels, { lossless: true }, settings)).byteLength);
        if (lossless <= target) [size, quality, fits] = [lossless, null, true];
        else {
          const floor = scale((await encodePngAt(pixels, { lossless: false, quality: PNG_BUDGET_RANGE.min }, settings)).byteLength);
          [size, quality, fits] = floor > target ? [floor, PNG_BUDGET_RANGE.min, false] : [target, null, true];
        }
      }
    }
    out.push({ mimeType: mime, size, quality, fits, iccStatus: "none", estimated: true, rough: !photographic || mime === "image/png" });
  }
  return out;
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
    case "image/gif":  return "gif";
    case "image/heic": return "heic";
    case "image/heif": return "heif";
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
