import { deltaE, srgbToOKLab } from "./color-space";
import { applyDither } from "./dither";
import { buildHistogram, computeEdgeMap } from "./histogram";
import { selectPalette } from "./palette";
import type { QuantizeOptions, QuantizeResult } from "./png-quantize.types";

const DEFAULT_MAX_COLORS = 256;

function clampQuality(q: number): number {
  return Math.max(1, Math.min(100, q));
}

function qualityToDitherStrength(quality: number): number {
  // Dither hides palette banding but its high-frequency noise hurts PNG
  // deflate. The old curve (0.2 + q×0.8 → 0.88 at q85) over-dithered and
  // bloated the file for little perceptual gain. Moderated so high quality
  // still suppresses banding without wrecking compression.
  //   q=100 → 0.75   q=85 → 0.67   q=45 → 0.45
  return 0.2 + (quality / 100) * 0.55;
}

/**
 * Stratified-sample mean perceptual error (OKLab ΔE) between two
 * ImageData. Uses a deterministic grid step rather than Math.random
 * so identical inputs produce identical diagnostics. Fully-transparent
 * source pixels are skipped because their RGB is undefined.
 */
function computeMeanDeltaE(original: ImageData, quantized: ImageData): number {
  const total = original.width * original.height;
  if (total === 0) return 0;
  const sample = Math.min(1024, total);
  const step = Math.max(1, Math.floor(total / sample));
  let sum = 0;
  let count = 0;
  for (let i = 0; i < total; i += step) {
    const idx = i * 4;
    if (original.data[idx + 3] === 0) continue;
    const a = srgbToOKLab(
      original.data[idx],
      original.data[idx + 1],
      original.data[idx + 2],
    );
    const b = srgbToOKLab(
      quantized.data[idx],
      quantized.data[idx + 1],
      quantized.data[idx + 2],
    );
    sum += deltaE(a, b);
    count++;
  }
  return count === 0 ? 0 : sum / count;
}

/**
 * Quantize an RGBA ImageData to ≤ maxColors distinct colors.
 *
 * Pipeline:
 *   1. Edge map (Sobel)
 *   2. Perceptual color histogram (OKLab buckets, weighted by edge + saturation)
 *   3. Weighted-variance palette selection in OKLab with adaptive sizing
 *   4. Region-modulated Floyd-Steinberg dithering in OKLab
 */
export async function quantizePng(
  imageData: ImageData,
  options: QuantizeOptions,
): Promise<QuantizeResult> {
  const start = performance.now();
  const maxColors = Math.min(256, options.maxColors ?? DEFAULT_MAX_COLORS);
  const quality = clampQuality(options.quality);

  if (imageData.width === 0 || imageData.height === 0) {
    throw new Error("Cannot quantize empty image");
  }

  const edgeMap = computeEdgeMap(imageData.data, imageData.width, imageData.height);
  const histogram = buildHistogram(imageData, edgeMap, quality);

  // Fast path: when the histogram already fits within the palette budget,
  // the source is a flat illustration / icon / UI screenshot rather than
  // a photo. Running palette selection + dithering on it only injects
  // noise for no benefit — the downstream OxiPNG pass reduces such images
  // to an indexed palette losslessly. Return the source pixels untouched.
  if (histogram.length <= maxColors) {
    return {
      imageData,
      paletteSize: histogram.length,
      meanDeltaE: 0,
      durationMs: performance.now() - start,
    };
  }

  const palette = selectPalette(histogram, { maxColors, quality });
  const ditherStrength = qualityToDitherStrength(quality);
  const output = applyDither(imageData, palette, edgeMap, {
    ditherStrength,
    noDither: options.noDither ?? false,
  });
  const meanDeltaE = computeMeanDeltaE(imageData, output);

  return {
    imageData: output,
    paletteSize: palette.length,
    meanDeltaE,
    durationMs: performance.now() - start,
  };
}

export type { QuantizeOptions, QuantizeResult } from "./png-quantize.types";
