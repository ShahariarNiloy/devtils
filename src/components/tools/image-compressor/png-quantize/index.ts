import { deltaE, srgbToOKLab } from "./color-space";
import { computeDitherMap, remapPixels } from "./dither";
import { buildAdaptiveHistogram, countUniqueColors } from "./histogram";
import {
  addOutlierClusters,
  medianCut,
  refinePalette,
  type MedianCutResult,
  type Palette,
} from "./palette";
import type {
  IndexedQuantizeResult,
  QuantizeOptions,
  QuantizeResult,
} from "./png-quantize.types";

const DEFAULT_MAX_COLORS = 256;
/** Histogram entries kept for palette building (bucketing beyond this). */
const HIST_CAP = 32768;

function clampQuality(q: number): number {
  return Math.max(1, Math.min(100, Number.isFinite(q) ? q : 85));
}

/**
 * Stratified-sample mean perceptual error (OKLab ΔE) between two RGBA
 * buffers. Deterministic grid step; fully transparent source pixels are
 * skipped because their RGB is undefined.
 */
function computeMeanDeltaE(original: Uint8ClampedArray, quantized: Uint8ClampedArray): number {
  const total = original.length >> 2;
  if (total === 0) return 0;
  const step = Math.max(1, Math.floor(total / Math.min(1024, total)));
  let sum = 0;
  let count = 0;
  for (let i = 0; i < total; i += step) {
    const idx = i * 4;
    if (original[idx + 3] === 0) continue;
    const a = srgbToOKLab(original[idx], original[idx + 1], original[idx + 2]);
    const b = srgbToOKLab(quantized[idx], quantized[idx + 1], quantized[idx + 2]);
    sum += deltaE(a, b);
    count++;
  }
  return count === 0 ? 0 : sum / count;
}

/** Drop never-used clusters so the palette is dense. */
function compactPalette(pal: Palette, used: Uint8Array): Palette {
  let n = 0;
  for (let c = 0; c < pal.size; c++) if (used[c] === 1) n++;
  const out: Palette = {
    size: n,
    vec: new Float64Array(n * 4),
    rgba: new Uint8Array(n * 4),
    opaque: new Uint8Array(n),
  };
  let j = 0;
  for (let c = 0; c < pal.size; c++) {
    if (used[c] !== 1) continue;
    out.vec.set(pal.vec.subarray(c * 4, c * 4 + 4), j * 4);
    out.rgba.set(pal.rgba.subarray(c * 4, c * 4 + 4), j * 4);
    out.opaque[j] = pal.opaque[c];
    j++;
  }
  return out;
}

function withTransparent(pal: Palette): Palette {
  const n = pal.size + 1;
  const out: Palette = {
    size: n,
    vec: new Float64Array(n * 4),
    rgba: new Uint8Array(n * 4),
    opaque: new Uint8Array(n),
  };
  out.vec.set(pal.vec);
  out.rgba.set(pal.rgba);
  out.opaque.set(pal.opaque);
  // Last entry: (0,0,0,0) in both spaces.
  return out;
}

/** Lloyd iterations after median cut (stops earlier on < 0.2% gain). */
const KMEANS_ITERATIONS = 6;
/** Importance of flat-fill pixels when sizing the palette (see below). */
const FLAT_IMPORTANCE = 0.01;
/** Colours farther than this (internal ΔE) from their palette entry get rescued. */
const OUTLIER_DIST_BASE = 0.03;
const OUTLIER_DIST_SLOPE = 0.0015;
/**
 * Second sizing criterion: mean squared error over smooth (gradient)
 * pixels only, where banding is unmasked — a sky or cloud must not
 * posterize even when the rest of the photo is busy texture. Chosen by
 * eye on Kodak skies/clouds at 4× zoom (3e-5 still shows faint contours,
 * 5e-5 posterizes like pngquant); scaled with the quality target.
 */
const SMOOTH_TARGET = 2e-5;
/** Dither-map contrast thresholds (luma levels): full dither ≤ T0, none ≥ T1. */
const DITHER_T0 = 6;
const DITHER_T1 = 48;
/** Max residual carried by error diffusion (premultiplied sRGB, 0–1). */
const DITHER_MAX_ERROR = 0.2;
/** Max extra internal distance a dithered pick may add over the nearest colour. */
const DITHER_GUARD = 0.03;

/**
 * Quality 1–100 → target mean squared error (internal space, flat fills
 * excluded) used to pick the palette size. Smooth shading needs a tighter
 * target than textured content because nothing masks its banding.
 * Calibrated on SSIMULACRA2 so q85 never lands below pngquant
 * `--quality 65-80` on the same image (benchmark: Kodak, UI screenshots,
 * alpha logos); lower q relaxes the target gently so "small" still avoids
 * visible posterization. q ≥ 98 always uses the full palette.
 */
function targetMse(quality: number, smoothFraction: number): number {
  if (quality >= 98) return 0;
  return Math.pow(10, -3.95 - 0.6 * smoothFraction + (85 - quality) * 0.006);
}

/** Everything after the distinct-colour check. */
function quantizeIndexedUnchecked(
  imageData: ImageData,
  maxColors: number,
  quality: number,
  noDither: boolean,
  start: number,
): IndexedQuantizeResult {
  const { width, height, data } = imageData;

  const dmap = computeDitherMap(data, width, height, DITHER_T0, DITHER_T1);
  const importance = new Float32Array(width * height);
  const smoothMask = new Uint8Array(width * height);
  for (let p = 0; p < importance.length; p++) {
    const flat = dmap.flat[p] === 1;
    importance[p] = flat ? FLAT_IMPORTANCE : 1;
    smoothMask[p] = !flat && dmap.strength[p] >= 1 ? 1 : 0;
  }
  const hist = buildAdaptiveHistogram(data, importance, smoothMask, HIST_CAP);
  const hasTransparent = hist.transparentPixels > 0;
  const k = maxColors - (hasTransparent ? 1 : 0);

  // Fewest colours that meet the quality target (pngquant-style), judged
  // on importance mass so large flat fills (which any palette reproduces
  // exactly) don't dilute the error. The palette itself is then built on
  // plain pixel counts, so those fills still get exact entries.
  const target = targetMse(quality, dmap.smoothFraction);
  let kUse = k;
  if (target > 0) {
    kUse = smallestK(medianCut(hist, k, hist.importance), hist.totalImportance, target);
    // Smooth regions get their own, stricter budget (see SMOOTH_TARGET),
    // when they are a meaningful part of the image.
    if (kUse < k && hist.totalSmooth > hist.totalWeight * 0.02) {
      const smoothTarget = SMOOTH_TARGET * (target / targetMse(85, 0));
      const ks = smallestK(medianCut(hist, k, hist.smooth), hist.totalSmooth, smoothTarget);
      if (ks > kUse) kUse = ks;
    }
  }
  let mc = medianCut(hist, kUse);
  let pal = refinePalette(hist, mc, KMEANS_ITERATIONS, 0.002);
  // Spend unused budget on small distinct colours the MSE target ignored
  // (fidelity first: never silently shift a visible colour).
  const rescue = addOutlierClusters(
    hist,
    pal,
    mc.assign,
    k - kUse,
    OUTLIER_DIST_BASE + (100 - quality) * OUTLIER_DIST_SLOPE,
    Math.max(4, hist.totalWeight * 1e-5),
  );
  if (rescue !== null) {
    mc = rescue;
    pal = refinePalette(hist, mc, 3, 0.002);
  }

  // Remove clusters nothing maps to, then add the transparent entry.
  const used = new Uint8Array(pal.size);
  for (let e = 0; e < hist.size; e++) used[mc.assign[e]] = 1;
  pal = compactPalette(pal, used);
  let transparentIndex = -1;
  if (hasTransparent) {
    pal = withTransparent(pal);
    transparentIndex = pal.size - 1;
  }

  // Smooth shading needs fuller diffusion to hide banding; texture masks
  // banding, so dither lightly there (less noise → smaller deflate).
  const level = noDither ? 0 : Math.min(0.85, 0.42 + 0.33 * dmap.smoothFraction);
  const indices = remapPixels(data, width, height, pal, transparentIndex, noDither ? null : dmap, {
    level,
    deadZone: 0.004 + (1 - quality / 100) * 0.02,
    maxError: DITHER_MAX_ERROR,
    guard: DITHER_GUARD,
  });

  return {
    width,
    height,
    palette: pal.rgba.slice(0, pal.size * 4),
    paletteSize: pal.size,
    indices,
    durationMs: performance.now() - start,
  };
}

/** Smallest box count whose median-cut error per unit mass meets `target`. */
function smallestK(mc: MedianCutResult, total: number, target: number): number {
  const tw = total > 0 ? total : 1;
  for (let kk = 2; kk < mc.boxes; kk++) {
    if (mc.sseAfter[kk - 1] / tw <= target) return kk;
  }
  return mc.boxes;
}

function resolveMaxColors(options: QuantizeOptions): number {
  return Math.max(2, Math.min(256, Math.floor(options.maxColors ?? DEFAULT_MAX_COLORS)));
}

/**
 * Quantize to an indexed image: ≤ maxColors RGBA palette + one index per
 * pixel. Returns null when the image already has ≤ maxColors distinct
 * colours (nothing to do — encode it as-is, it's lossless).
 */
export function quantizeToIndexed(
  imageData: ImageData,
  options: QuantizeOptions,
): IndexedQuantizeResult | null {
  const start = performance.now();
  if (imageData.width === 0 || imageData.height === 0) {
    throw new Error("Cannot quantize empty image");
  }
  const maxColors = resolveMaxColors(options);
  if (countUniqueColors(imageData.data, maxColors).count <= maxColors) return null;
  return quantizeIndexedUnchecked(
    imageData,
    maxColors,
    clampQuality(options.quality),
    options.noDither ?? false,
    start,
  );
}

/** Expand an indexed result to RGBA pixels. */
export function indexedToRgba(r: IndexedQuantizeResult): Uint8ClampedArray<ArrayBuffer> {
  const n = r.width * r.height;
  const out = new Uint8ClampedArray(n * 4);
  const out32 = new Uint32Array(out.buffer);
  const pal32 = new Uint32Array(r.paletteSize);
  const pb = new Uint8Array(pal32.buffer);
  pb.set(r.palette.subarray(0, r.paletteSize * 4));
  for (let p = 0; p < n; p++) out32[p] = pal32[r.indices[p]];
  return out;
}

/**
 * Quantize an RGBA ImageData to ≤ maxColors distinct RGBA colours.
 *
 * Pipeline (all in alpha-premultiplied OKLab+α, see space.ts):
 *   1. Exact distinct-colour count with early exit → lossless pass-through
 *   2. Weighted histogram (exact, or bucketed means on very rich images)
 *   3. Variance-minimising median cut → weighted k-means refinement
 *   4. Remap with contrast-adaptive, dead-zoned Floyd–Steinberg dithering
 */
export async function quantizePng(
  imageData: ImageData,
  options: QuantizeOptions,
): Promise<QuantizeResult> {
  const start = performance.now();
  const { data, width, height } = imageData;
  if (width === 0 || height === 0) throw new Error("Cannot quantize empty image");
  const maxColors = resolveMaxColors(options);
  const { count, transparentVariants } = countUniqueColors(data, maxColors);

  if (count <= maxColors) {
    // Already fits a palette: lossless pass-through (oxipng will write it
    // as an indexed PNG).
    if (!transparentVariants) {
      return { imageData, paletteSize: count, meanDeltaE: 0, durationMs: performance.now() - start };
    }
    // Several RGB values hide under α=0: normalise them so they count
    // (and encode) as one transparent colour. Visible pixels untouched.
    const copy = new Uint8ClampedArray(data);
    for (let i = 3; i < copy.length; i += 4) {
      if (copy[i] === 0) {
        copy[i - 3] = 0;
        copy[i - 2] = 0;
        copy[i - 1] = 0;
      }
    }
    return {
      imageData: new ImageData(copy, width, height),
      paletteSize: count,
      meanDeltaE: 0,
      durationMs: performance.now() - start,
    };
  }

  const indexed = quantizeIndexedUnchecked(
    imageData,
    maxColors,
    clampQuality(options.quality),
    options.noDither ?? false,
    start,
  );
  const rgba = indexedToRgba(indexed);
  return {
    imageData: new ImageData(rgba, width, height),
    paletteSize: indexed.paletteSize,
    meanDeltaE: computeMeanDeltaE(data, rgba),
    durationMs: performance.now() - start,
  };
}

export type {
  IndexedQuantizeResult,
  QuantizeOptions,
  QuantizeResult,
} from "./png-quantize.types";
