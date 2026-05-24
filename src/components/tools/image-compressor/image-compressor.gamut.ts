/**
 * Wide-gamut → sRGB color management.
 *
 * When a format swap drops the source ICC profile (e.g. PNG → JPEG), a
 * Display P3 image's pixel values get reinterpreted as sRGB and saturated
 * colors look washed out. Converting the pixels P3 → sRGB *before* the
 * swap keeps colors correct within the sRGB gamut.
 *
 * Only Display P3 is handled here — it's the dominant wide-gamut source
 * (every modern iPhone/Mac export). Adobe RGB, ProPhoto, etc. fall through
 * unconverted (a documented follow-up).
 */

import { SRGB_TO_LINEAR_LUT, linearToSrgb } from "./png-quantize/color-space";

// Display P3 → sRGB, in linear-light RGB. Display P3 shares the sRGB
// transfer curve, so the pipeline is: decode gamma → apply this 3×3 →
// clamp to the sRGB gamut → re-encode gamma.
const P3_TO_SRGB: ReadonlyArray<readonly [number, number, number]> = [
  [1.2249401, -0.2249404, 0.0],
  [-0.0420569, 1.0420571, 0.0],
  [-0.0196376, -0.0786361, 1.0982735],
];

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/**
 * Heuristic: does this ICC profile look like Display P3? Scans the
 * profile's text tags for the canonical description most encoders embed.
 * Crude but reliable for the dominant case; other profiles return false.
 */
export function isDisplayP3(icc: Uint8Array): boolean {
  if (icc.length < 128) return false;
  const text = new TextDecoder("ascii", { fatal: false }).decode(icc);
  return /display\s*p3/i.test(text);
}

/**
 * Convert RGBA pixels in place from Display P3 to sRGB. Call right before
 * a format swap that will drop the source profile. Out-of-sRGB-gamut P3
 * colors clamp to the nearest sRGB value rather than wrapping.
 */
export function convertP3ToSrgb(imageData: ImageData): void {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const r = SRGB_TO_LINEAR_LUT[data[i]];
    const g = SRGB_TO_LINEAR_LUT[data[i + 1]];
    const b = SRGB_TO_LINEAR_LUT[data[i + 2]];
    const r2 = P3_TO_SRGB[0][0] * r + P3_TO_SRGB[0][1] * g + P3_TO_SRGB[0][2] * b;
    const g2 = P3_TO_SRGB[1][0] * r + P3_TO_SRGB[1][1] * g + P3_TO_SRGB[1][2] * b;
    const b2 = P3_TO_SRGB[2][0] * r + P3_TO_SRGB[2][1] * g + P3_TO_SRGB[2][2] * b;
    data[i] = linearToSrgb(clamp01(r2));
    data[i + 1] = linearToSrgb(clamp01(g2));
    data[i + 2] = linearToSrgb(clamp01(b2));
    // Alpha (data[i + 3]) unchanged.
  }
}
