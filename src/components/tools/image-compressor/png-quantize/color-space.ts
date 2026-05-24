import type { OKLab } from "./png-quantize.types";

/**
 * Precomputed lookup table for sRGB (0-255 integer) → linear RGB (0-1).
 * Eliminates Math.pow from per-pixel hot paths. Built once at module load.
 */
export const SRGB_TO_LINEAR_LUT: Float32Array = (() => {
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    lut[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  return lut;
})();

/** sRGB (0-255 integer) → linear RGB (0-1). Uses LUT for integer inputs. */
export function srgbToLinear(value: number): number {
  // Hot path: integer sRGB values from raw pixel data.
  if (value === (value | 0) && value >= 0 && value <= 255) {
    return SRGB_TO_LINEAR_LUT[value];
  }
  // Fallback for non-integer inputs (e.g. dithered intermediate values).
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Linear RGB (0-1) → sRGB (0-255, clamped + rounded). */
export function linearToSrgb(value: number): number {
  const v =
    value <= 0.0031308
      ? value * 12.92
      : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

/** Linear sRGB → OKLab (Björn Ottosson). */
export function linearRgbToOKLab(r: number, g: number, b: number): OKLab {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const lc = Math.cbrt(l);
  const mc = Math.cbrt(m);
  const sc = Math.cbrt(s);

  return {
    L: 0.2104542553 * lc + 0.7936177850 * mc - 0.0040720468 * sc,
    a: 1.9779984951 * lc - 2.4285922050 * mc + 0.4505937099 * sc,
    b: 0.0259040371 * lc + 0.7827717662 * mc - 0.8086757660 * sc,
  };
}

/** OKLab → linear sRGB. */
export function oklabToLinearRgb(lab: OKLab): { r: number; g: number; b: number } {
  const lc = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const mc = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const sc = lab.L - 0.0894841775 * lab.a - 1.2914855480 * lab.b;

  const l = lc * lc * lc;
  const m = mc * mc * mc;
  const s = sc * sc * sc;

  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  };
}

/** sRGB (0-255) → OKLab. */
export function srgbToOKLab(r: number, g: number, b: number): OKLab {
  return linearRgbToOKLab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
}

/** OKLab → sRGB (0-255). */
export function oklabToSrgb(lab: OKLab): { r: number; g: number; b: number } {
  const linear = oklabToLinearRgb(lab);
  return {
    r: linearToSrgb(linear.r),
    g: linearToSrgb(linear.g),
    b: linearToSrgb(linear.b),
  };
}

/**
 * Perceptual distance in OKLab. L weighted 2× because humans notice
 * lightness changes more than hue shifts.
 */
export function deltaE(a: OKLab, b: OKLab): number {
  const dL = (a.L - b.L) * 2.0;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

export function deltaESquared(a: OKLab, b: OKLab): number {
  const dL = (a.L - b.L) * 2.0;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return dL * dL + da * da + db * db;
}

/**
 * Compute mean color in linear RGB space, then convert to OKLab.
 *
 * This is photometrically correct: averaging gamma-encoded sRGB values
 * directly produces dark and hue-shifted results, especially for
 * gradients and saturated colors. Averaging in linear light matches
 * what the human eye perceives when squinting at the source pixels.
 *
 * Returns both the OKLab mean and the sRGB representation of that mean
 * so callers can use either without recomputing.
 */
export function meanColorInLinear(
  pixels: Array<{ r: number; g: number; b: number; weight: number }>,
): { srgb: { r: number; g: number; b: number }; oklab: OKLab } {
  let sumR = 0, sumG = 0, sumB = 0, sumW = 0;
  for (const p of pixels) {
    const w = p.weight;
    sumR += SRGB_TO_LINEAR_LUT[p.r] * w;
    sumG += SRGB_TO_LINEAR_LUT[p.g] * w;
    sumB += SRGB_TO_LINEAR_LUT[p.b] * w;
    sumW += w;
  }
  if (sumW === 0) {
    return { srgb: { r: 0, g: 0, b: 0 }, oklab: { L: 0, a: 0, b: 0 } };
  }
  const lR = sumR / sumW;
  const lG = sumG / sumW;
  const lB = sumB / sumW;
  // Convert linear mean → OKLab directly (no intermediate sRGB rounding)
  const oklab = linearRgbToOKLab(lR, lG, lB);
  // Convert linear mean → sRGB for the palette entry's display value
  const srgb = {
    r: linearToSrgb(lR),
    g: linearToSrgb(lG),
    b: linearToSrgb(lB),
  };
  return { srgb, oklab };
}
