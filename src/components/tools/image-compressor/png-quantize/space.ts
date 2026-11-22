/**
 * The quantizer's internal colour space: alpha-premultiplied OKLab, laid
 * out so that plain Euclidean distance equals the visible compositing
 * error (see the backdrop note below). Vector: (u_dark, u_light, a·α, b·α).
 *
 * A faint glow pixel (α≈0.05) therefore costs almost nothing to
 * approximate, while an opaque pixel's hue is held to full OKLab
 * precision. Fully transparent pixels collapse to the origin.
 *
 * Palette building and nearest-colour search run in this space; error
 * diffusion runs in premultiplied sRGB (see dither.ts).
 */

import { SRGB_TO_LINEAR_LUT } from "./color-space";

/**
 * Reference backgrounds (OKLab L) the alpha error is judged against: a
 * dark-mode and a light-mode backdrop (sRGB ≈ 10% / 90% grey). Over a
 * grey background of lightness Lb the composite error of a pixel is
 * Δ(L·α) − Lb·Δα in lightness and Δ(a·α), Δ(b·α) in chroma, so storing
 * u_i = (L·α − Lb_i·α)/√2 makes plain Euclidean distance equal the mean
 * squared composite error over both backdrops. For opaque pixels it
 * reduces to ordinary OKLab distance.
 */
const BG_DARK = 0.215;
const BG_LIGHT = 0.923;
const INV_SQRT2 = Math.SQRT1_2;

/** Lightness weight (OKLab is near-uniform; kept explicit for clarity). */
const W_L = 1;
/** Chroma (a, b) weight. */
const W_AB = 1;

/**
 * Write the internal vector of an 8-bit sRGBA colour into `out[o..o+3]`.
 * Float inputs (0–255) are accepted for averaged colours.
 */
export function rgbaToInternal(
  r: number,
  g: number,
  b: number,
  a: number,
  out: Float64Array,
  o: number,
): void {
  const alpha = a / 255;
  if (alpha <= 0) {
    out[o] = 0;
    out[o + 1] = 0;
    out[o + 2] = 0;
    out[o + 3] = 0;
    return;
  }
  const lr = linearOf(r);
  const lg = linearOf(g);
  const lb = linearOf(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const kL = W_L * alpha * INV_SQRT2;
  const kAB = W_AB * alpha;
  out[o] = kL * (L - BG_DARK);
  out[o + 1] = kL * (L - BG_LIGHT);
  out[o + 2] = kAB * (1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s);
  out[o + 3] = kAB * (0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s);
}

function linearOf(v: number): number {
  if (v === (v | 0)) return SRGB_TO_LINEAR_LUT[v];
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb8(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  const x = Math.round(c * 255);
  return Math.min(255, Math.max(0, x));
}

/**
 * Convert an internal vector back to 8-bit sRGBA, writing into
 * `rgba[ro..ro+3]`. Out-of-gamut colours are clamped per channel.
 * `forceOpaque` pins α to 255 (used for opaque-only clusters so float
 * drift can never make an opaque pixel translucent).
 */
export function internalToRgba(
  v: Float64Array,
  o: number,
  rgba: Uint8Array,
  ro: number,
  forceOpaque: boolean,
): void {
  // u0 − u1 = W_L·α·(BG_LIGHT − BG_DARK)/√2
  let alpha = (v[o] - v[o + 1]) / (W_L * INV_SQRT2 * (BG_LIGHT - BG_DARK));
  if (!(alpha > 0)) {
    if (!forceOpaque) {
      rgba[ro] = 0;
      rgba[ro + 1] = 0;
      rgba[ro + 2] = 0;
      rgba[ro + 3] = 0;
      return;
    }
    alpha = 1;
  }
  if (alpha > 1) alpha = 1;
  const a8 = forceOpaque ? 255 : Math.round(alpha * 255);
  if (a8 <= 0) {
    rgba[ro] = 0;
    rgba[ro + 1] = 0;
    rgba[ro + 2] = 0;
    rgba[ro + 3] = 0;
    return;
  }
  rgba[ro + 3] = a8;
  const L = v[o] / (W_L * INV_SQRT2 * alpha) + BG_DARK;
  const A = v[o + 2] / (W_AB * alpha);
  const B = v[o + 3] / (W_AB * alpha);
  const lc = L + 0.3963377774 * A + 0.2158037573 * B;
  const mc = L - 0.1055613458 * A - 0.0638541728 * B;
  const sc = L - 0.0894841775 * A - 1.291485548 * B;
  const l = lc * lc * lc;
  const m = mc * mc * mc;
  const s = sc * sc * sc;
  rgba[ro] = linearToSrgb8(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  rgba[ro + 1] = linearToSrgb8(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  rgba[ro + 2] = linearToSrgb8(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
}
