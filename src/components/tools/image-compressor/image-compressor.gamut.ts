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
  if (icc.length < 132) return false;
  // Primary signal: the profile's colorant tags. Display P3 (D50-adapted,
  // as ICC stores them) has red ≈ (0.515, 0.241, −0.001); sRGB's red is
  // (0.436, 0.222, 0.014). Works for every P3 profile — Apple's, compact
  // v4 ones, and ones whose description is UTF-16 (mluc), which the old
  // text match missed.
  const red = readXyzTag(icc, "rXYZ");
  const green = readXyzTag(icc, "gXYZ");
  const blue = readXyzTag(icc, "bXYZ");
  if (red && green && blue) {
    const near = (v: [number, number, number], t: [number, number, number]) =>
      Math.abs(v[0] - t[0]) < 0.012 && Math.abs(v[1] - t[1]) < 0.012 && Math.abs(v[2] - t[2]) < 0.012;
    return near(red, [0.5151, 0.2412, -0.0011]) && near(green, [0.2919, 0.6922, 0.0419]) && near(blue, [0.1572, 0.0666, 0.7841]);
  }
  // No matrix tags (LUT-based profile): fall back to the description text,
  // ASCII or UTF-16.
  const ascii = new TextDecoder("latin1", { fatal: false }).decode(icc);
  if (/display\s*p3/i.test(ascii)) return true;
  const utf16 = new TextDecoder("utf-16be", { fatal: false }).decode(icc.subarray(0, icc.length & ~1));
  return /display\s*p3/i.test(utf16);
}

/**
 * Is this profile plain sRGB? Then dropping it on a format swap changes
 * nothing — browsers assume sRGB for untagged images — so it's neither
 * "lost" nor worth steering Auto away from smaller formats. Matched on the
 * colorant tags (sRGB's D50-adapted primaries, within the tolerance real
 * sRGB profiles vary by), falling back to the description text for
 * LUT-based profiles.
 */
export function isSrgbProfile(icc: Uint8Array): boolean {
  if (icc.length < 132) return false;
  // Profile class must be display/input/colorspace with RGB data.
  const space = String.fromCharCode(icc[16], icc[17], icc[18], icc[19]);
  if (space !== "RGB ") return false;
  const red = readXyzTag(icc, "rXYZ");
  const green = readXyzTag(icc, "gXYZ");
  const blue = readXyzTag(icc, "bXYZ");
  if (red && green && blue) {
    const near = (v: [number, number, number], t: [number, number, number]) =>
      Math.abs(v[0] - t[0]) < 0.006 && Math.abs(v[1] - t[1]) < 0.006 && Math.abs(v[2] - t[2]) < 0.006;
    return near(red, [0.4361, 0.2225, 0.0139]) && near(green, [0.3851, 0.7169, 0.0971]) && near(blue, [0.1431, 0.0606, 0.7141]);
  }
  const ascii = new TextDecoder("latin1", { fatal: false }).decode(icc);
  return /\bsRGB\b/.test(ascii) && !/display\s*p3|adobe|prophoto/i.test(ascii);
}

/** Read an ICC XYZType tag (s15Fixed16 ×3) by signature, or null. */
function readXyzTag(icc: Uint8Array, sig: string): [number, number, number] | null {
  const view = new DataView(icc.buffer, icc.byteOffset, icc.byteLength);
  const count = view.getUint32(128, false);
  if (count > 200 || 132 + count * 12 > icc.length) return null;
  for (let i = 0; i < count; i++) {
    const at = 132 + i * 12;
    const tag = String.fromCharCode(icc[at], icc[at + 1], icc[at + 2], icc[at + 3]);
    if (tag !== sig) continue;
    const off = view.getUint32(at + 4, false);
    if (off + 20 > icc.length) return null;
    const type = String.fromCharCode(icc[off], icc[off + 1], icc[off + 2], icc[off + 3]);
    if (type !== "XYZ ") return null;
    const f = (o: number) => view.getInt32(off + o, false) / 65536;
    return [f(8), f(12), f(16)];
  }
  return null;
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
