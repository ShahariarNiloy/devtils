/**
 * Quality scale + size-budget search. Pure — no React, no DOM, no codecs —
 * so it runs in the worker and in unit tests alike.
 *
 * One slider, several codecs: "q75" does not mean the same thing to
 * MozJPEG, libwebp and libavif (AVIF q75 is far higher fidelity than JPEG
 * q75). The slider is expressed on the scale of the codec the user picked;
 * for Auto / Original it is the JPEG scale. Every other codec gets the
 * *equivalent* quality, interpolated through the calibrated mode anchors
 * (Smallest / Balanced / Best — SSIMULACRA2-matched in QUALITY_MODE_DEFS),
 * so "every format at the same quality" really is the same visual quality.
 */

import { QUALITY_MODE_DEFS } from "./image-compressor.modes";
import type { CompressionSettings } from "./image-compressor.types";

export type LossyCodec = "jpeg" | "webp" | "avif";

/** Piecewise-linear anchors: x is the JPEG-scale value. */
const ANCHORS: readonly { x: number; jpeg: number; webp: number; avif: number }[] = [
  { x: 1, jpeg: 1, webp: 1, avif: 1 },
  { x: 10, jpeg: 10, webp: 10, avif: 10 },
  { x: 60, ...QUALITY_MODE_DEFS.small.quality },
  { x: 75, ...QUALITY_MODE_DEFS.high.quality },
  { x: 90, ...QUALITY_MODE_DEFS.maximum.quality },
  // AVIF 100 is lossless (enormous); cap the top of its scale.
  { x: 100, jpeg: 100, webp: 100, avif: 95 },
];

function lerp(x: number, from: "x" | LossyCodec, to: "x" | LossyCodec): number {
  const v = Math.max(ANCHORS[0][from], Math.min(ANCHORS[ANCHORS.length - 1][from], x));
  for (let i = 1; i < ANCHORS.length; i++) {
    const a = ANCHORS[i - 1];
    const b = ANCHORS[i];
    if (v <= b[from]) {
      const span = b[from] - a[from];
      const t = span === 0 ? 0 : (v - a[from]) / span;
      return a[to] + t * (b[to] - a[to]);
    }
  }
  return ANCHORS[ANCHORS.length - 1][to];
}

/** JPEG-scale value → that codec's encoder quality (integer). */
export function codecQualityFor(codec: LossyCodec, jpegScale: number): number {
  return Math.round(lerp(jpegScale, "x", codec));
}

/** A codec's encoder quality → the JPEG-scale value (may be fractional). */
export function jpegScaleOf(codec: LossyCodec, q: number): number {
  return lerp(q, codec, "x");
}

export function codecOfMime(mime: string): LossyCodec | null {
  if (mime === "image/jpeg") return "jpeg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/avif") return "avif";
  return null;
}

/** The codec whose scale the slider speaks: the picked format, else JPEG. */
export function sliderCodec(outputFormat: CompressionSettings["outputFormat"]): LossyCodec {
  return codecOfMime(outputFormat) ?? "jpeg";
}

/** Encoder quality for `codec` under these settings (quality goal). */
export function qualityForCodec(codec: LossyCodec, s: Pick<CompressionSettings, "qualityMode" | "customQuality" | "outputFormat">): number {
  if (s.qualityMode !== "custom") return QUALITY_MODE_DEFS[s.qualityMode].quality[codec];
  const scale = sliderCodec(s.outputFormat);
  const q = Math.round(Math.max(1, Math.min(100, s.customQuality)));
  if (scale === codec) return q;
  return codecQualityFor(codec, jpegScaleOf(scale, q));
}

/** Slider position for the current settings (a named mode shows its value). */
export function sliderValue(s: Pick<CompressionSettings, "qualityMode" | "customQuality" | "outputFormat">): number {
  if (s.outputFormat === "image/png") {
    if (s.qualityMode === "custom") return Math.round(s.customQuality);
    const png = QUALITY_MODE_DEFS[s.qualityMode].png;
    return png.pngMode === "lossless" ? 100 : png.pngQuantizationQuality;
  }
  return qualityForCodec(sliderCodec(s.outputFormat), s);
}

/** Readout beside the slider (design copy), judged on the JPEG scale. */
export function qualityWord(jpegScale: number): string {
  if (jpegScale >= 90) return "Near lossless";
  if (jpegScale >= 75) return "Sharp — good default";
  if (jpegScale >= 55) return "Smaller, softer";
  if (jpegScale >= 35) return "Visible artifacts";
  return "Very lossy";
}

// ── Size budget ─────────────────────────────────────────────────────

/**
 * Lowest quality a budget may push a lossy codec to (JPEG scale 30). Below
 * this, photos break into blocks and smears — a budget that can't be met
 * above it is reported as "can't fit" instead of silently shipping mush.
 */
export const BUDGET_FLOOR_SCALE = 30;
/** Highest quality the search spends bytes on: Best (visually lossless).
 *  Going higher only buys invisible fidelity at a large size cost. */
export const BUDGET_CEIL_SCALE = 90;
/** Below Smallest (JPEG 60) the UI says the budget cost visible quality. */
export const BUDGET_SOFT_SCALE = 60;

export function budgetRange(codec: LossyCodec): { min: number; max: number } {
  return { min: codecQualityFor(codec, BUDGET_FLOOR_SCALE), max: codecQualityFor(codec, BUDGET_CEIL_SCALE) };
}

/** PNG palette quality bounds for the budget search (lossless is tried first). */
export const PNG_BUDGET_RANGE = { min: 20, max: 95, start: 85 } as const;

/** Fast (reduced-effort) probes in the coarse search… */
export const BUDGET_FAST_PROBES = 5;
/** …then at most this many full-effort encodes to settle the answer.
 *  5 + 2 = 7 real encodes worst case, typically 4–6. */
export const BUDGET_FINE_ENCODES = 2;
export const BUDGET_MAX_PROBES = BUDGET_FAST_PROBES + BUDGET_FINE_ENCODES;

export interface BudgetProbe<T> {
  q: number;
  size: number;
  value: T;
}

export interface BudgetOutcome<T> {
  /** Highest-quality probe that fit, or the smallest probe when none did. */
  chosen: BudgetProbe<T>;
  fits: boolean;
  /** Number of real encodes spent. */
  probes: number;
  /** Lowest probed quality above `chosen` that did NOT fit (null: none
   *  probed — `chosen` is the top of the range, or nothing fit). */
  failAbove: number | null;
}

/**
 * Highest integer quality in [min, max] whose encoded size is ≤ budget,
 * using at most `maxProbes` real encodes.
 *
 * Coarse to fine: probe the starting quality, then the bound on the side
 * it points to (max if it fit — done if max fits too; min if it didn't —
 * can't fit if min doesn't), then narrow the bracket with a log-size
 * secant step clamped toward the middle (bisection safeguard), which
 * typically lands within 1–2 quality steps in 4–6 encodes. Encoders are
 * nearly but not strictly monotonic, so the answer is the best *observed*
 * fitting probe — never an extrapolation.
 */
export async function searchBudget<T>(
  encodeAt: (q: number) => Promise<{ size: number; value: T }>,
  budget: number,
  opts: { min: number; max: number; start: number; maxProbes?: number; isCancelled?: () => boolean },
): Promise<BudgetOutcome<T>> {
  const maxProbes = Math.max(2, opts.maxProbes ?? BUDGET_MAX_PROBES);
  const min = Math.round(Math.min(opts.min, opts.max));
  const max = Math.round(Math.max(opts.min, opts.max));
  const start = Math.round(Math.max(min, Math.min(max, opts.start)));
  const seen = new Map<number, BudgetProbe<T>>();
  let bestFit: BudgetProbe<T> | null = null;
  let smallest: BudgetProbe<T> | null = null;

  const probe = async (q: number): Promise<BudgetProbe<T>> => {
    const hit = seen.get(q);
    if (hit) return hit;
    if (opts.isCancelled?.()) throw new Error("cancelled");
    const { size, value } = await encodeAt(q);
    const p = { q, size, value };
    seen.set(q, p);
    if (size <= budget && (!bestFit || q > bestFit.q)) bestFit = p;
    if (!smallest || size < smallest.size) smallest = p;
    return p;
  };
  const done = (): BudgetOutcome<T> => {
    const fit = bestFit as BudgetProbe<T> | null;
    const small = smallest as BudgetProbe<T> | null;
    if (!fit) return { chosen: small as BudgetProbe<T>, fits: false, probes: seen.size, failAbove: null };
    let failAbove: number | null = null;
    for (const p of seen.values()) if (p.q > fit.q && p.size > budget && (failAbove === null || p.q < failAbove)) failAbove = p.q;
    return { chosen: fit, fits: true, probes: seen.size, failAbove };
  };

  const first = await probe(start);
  let lo: BudgetProbe<T>;
  let hi: BudgetProbe<T>;
  if (first.size <= budget) {
    if (start === max) return done();
    const top = await probe(max);
    if (top.size <= budget) return done();
    lo = first;
    hi = top;
  } else {
    if (start === min) return done();
    const bottom = await probe(min);
    if (bottom.size > budget) return done();
    lo = bottom;
    hi = first;
  }

  while (hi.q - lo.q > 1 && seen.size < maxProbes) {
    const span = hi.q - lo.q;
    let guess = (lo.q + hi.q) / 2;
    if (lo.size > 0 && hi.size > lo.size) {
      const t = (Math.log(budget) - Math.log(lo.size)) / (Math.log(hi.size) - Math.log(lo.size));
      // Clamp the secant toward the middle so a skewed bracket still halves.
      const tt = Math.max(0.25, Math.min(0.75, t));
      guess = lo.q + tt * span;
    }
    const q = Math.max(lo.q + 1, Math.min(hi.q - 1, Math.round(guess)));
    const p = await probe(q);
    if (p.size <= budget) lo = p;
    else hi = p;
  }
  return done();
}
