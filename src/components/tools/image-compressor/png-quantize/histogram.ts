import {
  SRGB_TO_LINEAR_LUT,
  linearRgbToOKLab,
  linearToSrgb,
} from "./color-space";
import type { RGBA, WeightedColor } from "./png-quantize.types";

/**
 * Sobel-style gradient edge map. Returns a Float32Array (length =
 * width × height) of values in [0, 1].
 */
export function computeEdgeMap(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array {
  const out = new Float32Array(width * height);
  const luma = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    luma[i] =
      0.299 * data[i * 4] +
      0.587 * data[i * 4 + 1] +
      0.114 * data[i * 4 + 2];
  }
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx =
        -luma[idx - width - 1] +
        luma[idx - width + 1] -
        2 * luma[idx - 1] +
        2 * luma[idx + 1] -
        luma[idx + width - 1] +
        luma[idx + width + 1];
      const gy =
        -luma[idx - width - 1] -
        2 * luma[idx - width] -
        luma[idx - width + 1] +
        luma[idx + width - 1] +
        2 * luma[idx + width] +
        luma[idx + width + 1];
      out[idx] = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 200);
    }
  }
  return out;
}

function chooseBitDepth(pixelCount: number, quality: number): number {
  // Bit-depth 7 would allocate 2.1M buckets × 6 × 8B = ~100MB of histogram
  // memory, which blows up on small/mid devices for no measurable quality
  // gain over bit-depth 6 (262K buckets, ~12MB). Capping at 6 keeps the
  // ceiling at 1/8th the memory while still giving a 64³ color volume.
  if (pixelCount > 4_000_000) return 5;
  if (quality < 70) return 5;
  return 6;
}

function computeSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

/**
 * Anti-dominance exponent applied to each bucket's pixel frequency.
 *
 * Palette allocation (cluster splitting, adaptive reduction, Lloyd
 * refinement) is all weight-driven. With raw linear frequency a region
 * that fills most of the image — e.g. the dark navy background of a UI
 * screenshot — accrues so much weight that it swallows the palette and
 * starves small but salient accents (logos, text, skin tones), which is
 * exactly the "colors look dimmed" failure. Compressing frequency
 * sublinearly (count^E, E<1) keeps the dominant region important without
 * letting it monopolise, so accents earn palette entries. Dithering
 * still keeps the now-fewer background entries smooth in gradients.
 *
 * E=1 is the old linear behaviour; lower = more accent protection. 0.5
 * (√count) was chosen empirically against dark, accent-on-flat images.
 */
const FREQUENCY_DOMINANCE_EXPONENT = 0.5;

/**
 * Build a weighted color histogram. Per-pixel weight blends raw frequency
 * × edge proximity × saturation × alpha.
 *
 * Color accumulation happens in LINEAR RGB, not sRGB. Averaging
 * gamma-encoded sRGB values produces dark and hue-shifted centroids —
 * a visible defect on photographic gradients. Linear averaging matches
 * physical light addition.
 */
export function buildHistogram(
  imageData: ImageData,
  edgeMap: Float32Array,
  quality: number,
): WeightedColor[] {
  const { data, width, height } = imageData;
  const bitDepth = chooseBitDepth(width * height, quality);
  const shift = 8 - bitDepth;
  const bucketCount = 1 << (bitDepth * 3);
  // 6 floats per bucket: sumR_linear, sumG_linear, sumB_linear, sumA, totalWeight, count.
  const stride = 6;
  const buckets = new Float64Array(bucketCount * stride);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a === 0) continue;

      const alphaFrac = a / 255;
      let weight = 1.0;
      // Edges get MORE weight, not less. A/B measured: pngquant-style edge
      // *de*-weighting (`*= 1 - edge*0.5`) made files +5-7% LARGER on
      // screenshots/graphics — it starves text/UI edges of palette, so they
      // quantize worse and dither more (deflate-hostile noise). pngquant
      // assumes pure photographic input; this corpus isn't. Keep edge boost.
      weight += edgeMap[y * width + x] * 1.0;
      // Saturation boost kept at 0.5: lowering it to 0.25 (as v1.2.1
      // §6.3 suggested) starved vivid hues — palette entries got
      // pulled toward midtones and saturated reds/blues drifted toward
      // orange/teal. The "over-allocation" the patch worried about
      // turns out to be load-bearing for graphic/illustration input.
      weight *= 1 + computeSaturation(r, g, b) * 0.5;
      // Alpha is applied via premultiplied RGB below (a single alpha factor,
      // not α²) — pngquant-style, for accurate centroids at soft edges.

      const idx =
        ((r >> shift) << (bitDepth * 2)) +
        ((g >> shift) << bitDepth) +
        (b >> shift);
      const o = idx * stride;

      // Accumulate LINEAR RGB *premultiplied by alpha* so semi-transparent
      // pixels pull the centroid proportionally less; un-premultiplied when
      // the bucket is emitted. For opaque pixels (α=1) this is identical to
      // plain accumulation. The LUT read is the per-pixel hot path.
      const premul = alphaFrac * weight;
      buckets[o + 0] += SRGB_TO_LINEAR_LUT[r] * premul;
      buckets[o + 1] += SRGB_TO_LINEAR_LUT[g] * premul;
      buckets[o + 2] += SRGB_TO_LINEAR_LUT[b] * premul;
      buckets[o + 3] += a * weight; // Σ alpha·salience → mean alpha + un-premult
      buckets[o + 4] += weight; // Σ salience
      buckets[o + 5] += 1;
    }
  }

  const result: WeightedColor[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const o = i * stride;
    const totalWeight = buckets[o + 4];
    if (totalWeight === 0) continue;

    // RGB was accumulated premultiplied by alpha (Σ linear·α·salience), so
    // un-premultiply by Σ α·salience = buckets[o+3] / 255, not the salience
    // total. Opaque buckets reduce exactly to the plain mean.
    const alphaWeight = buckets[o + 3]; // Σ alpha[0..255]·salience
    const premulWeight = alphaWeight > 0 ? alphaWeight / 255 : totalWeight;
    const lR = buckets[o + 0] / premulWeight;
    const lG = buckets[o + 1] / premulWeight;
    const lB = buckets[o + 2] / premulWeight;
    const meanAlpha = Math.round(alphaWeight / totalWeight);
    const count = buckets[o + 5];

    // sRGB for the display/storage representation
    const r = linearToSrgb(lR);
    const g = linearToSrgb(lG);
    const b = linearToSrgb(lB);

    // OKLab directly from linear (no rounding in between → no drift)
    const oklab = linearRgbToOKLab(lR, lG, lB);

    // Anti-dominance: keep this bucket's average per-pixel salience
    // (edge/saturation boosts) but compress its raw frequency so a huge
    // flat region can't monopolise the palette. See the constant above.
    const avgSalience = totalWeight / count;
    const dominanceWeight =
      avgSalience * Math.pow(count, FREQUENCY_DOMINANCE_EXPONENT);

    const rgba: RGBA = { r, g, b, a: meanAlpha };
    result.push({
      rgba,
      linearRgb: { r: lR, g: lG, b: lB },
      oklab,
      weight: dominanceWeight,
      count,
    });
  }
  result.sort((x, y) => y.weight - x.weight);
  return result;
}
