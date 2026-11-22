/**
 * Auto format selection + the final "never make it bigger" merge. Pure —
 * no DOM, no codecs — shared by the worker (all candidates in one job) and
 * the main thread (candidates split across the pool for one image).
 */

import { AUTO_CANDIDATES, DECODE_ONLY_INPUT_MIME_TYPES, MAX_SIDE_FOR, type OutputMime } from "./image-compressor.constants";
import { jpegScaleOf, codecOfMime } from "./image-compressor.quality";
import type { CandidateSummary, CompressionResult, CompressionSettings, Goal, IccStatus } from "./image-compressor.types";

/**
 * The containers Auto encodes for an image: AVIF, WebP and JPEG — minus
 * JPEG when the pixels carry transparency (it would be flattened, a
 * different image), minus any format whose side limit the frame exceeds.
 * With `only` (one split job's share) an empty list means "nothing to do";
 * otherwise there's always a fallback (AVIF, or PNG past every limit).
 */
export function autoFormats(
  img: { hasAlpha: boolean; width: number; height: number },
  only?: readonly OutputMime[],
): OutputMime[] {
  const side = Math.max(img.width, img.height);
  const pool = (only ?? AUTO_CANDIDATES).filter((m) => !(m === "image/jpeg" && img.hasAlpha) && side <= MAX_SIDE_FOR[m]);
  if (pool.length > 0 || only) return pool;
  return [side <= MAX_SIDE_FOR["image/avif"] ? "image/avif" : "image/png"];
}

/** Colour stays right: no profile, kept, or colour-managed to sRGB. A
 *  CMYK source is approximate in every format, so it doesn't rank. */
export function colourCorrect(s: IccStatus): boolean {
  return s !== "lost";
}

function tieRank(mime: string): number {
  const i = AUTO_CANDIDATES.indexOf(mime as (typeof AUTO_CANDIDATES)[number]);
  return i < 0 ? AUTO_CANDIDATES.length : i;
}

/** JPEG-scale quality of a candidate (higher = better looking). */
function visualQuality(c: Pick<CandidateSummary, "mimeType" | "quality">): number {
  const codec = codecOfMime(c.mimeType);
  if (c.quality === null) return 101; // lossless
  return codec ? jpegScaleOf(codec, c.quality) : c.quality;
}

/**
 * Auto's choice among encoded candidates:
 *  1. Colour accuracy first — a candidate that would drop a wide-gamut
 *     profile only wins if *every* candidate does (then the UI warns).
 *  2. Budget goal: candidates that fit beat ones that don't; among those
 *     that fit, the highest visual quality wins (all are under budget, so
 *     quality is what's left to maximise); ties go to the smaller file.
 *     Nothing fits → the smallest file (flagged by the caller).
 *  3. Quality goal: the smallest file.
 * Exact ties prefer the most compatible format (JPEG → WebP → AVIF).
 */
export function pickAuto<T extends Pick<CandidateSummary, "mimeType" | "size" | "quality" | "fits" | "iccStatus">>(
  candidates: readonly T[],
  goal: Goal,
): T | null {
  if (candidates.length === 0) return null;
  const correct = candidates.filter((c) => colourCorrect(c.iccStatus));
  const pool = correct.length > 0 ? correct : [...candidates];
  const bySize = (a: T, b: T) => a.size - b.size || tieRank(a.mimeType) - tieRank(b.mimeType);
  if (goal === "budget") {
    const fitting = pool.filter((c) => c.fits === true);
    if (fitting.length > 0) {
      return [...fitting].sort((a, b) => visualQuality(b) - visualQuality(a) || bySize(a, b))[0];
    }
  }
  return [...pool].sort(bySize)[0];
}

export interface KeepInput {
  neverBigger: boolean;
  auto: boolean;
  /** Output pixel size differs from the source (a resize happened). */
  resized: boolean;
  sameFormat: boolean;
  inputMime: string;
  animated: boolean;
  outputSize: number;
  originalSize: number;
}

/**
 * Keep the original bytes instead of the re-encode? Only for the same job:
 * same pixel size, and the same format (or Auto, where "the smallest
 * format" may well be the original). Never for sources browsers can't
 * show (HEIC) or animations (the output is a still — not the same image).
 */
export function shouldKeepOriginal(k: KeepInput): boolean {
  if (!k.neverBigger || k.resized) return false;
  if (DECODE_ONLY_INPUT_MIME_TYPES.has(k.inputMime)) return false;
  if (k.outputSize < k.originalSize) return false;
  if (k.sameFormat) return true;
  return k.auto && !k.animated && k.inputMime !== "image/gif";
}

export function signedSavedPct(originalSize: number, newSize: number): number {
  return originalSize === 0 ? 0 : Math.round(((originalSize - newSize) / originalSize) * 100);
}

/**
 * Merge one image's candidate results (one per format) into the delivered
 * result: Auto pick, then the never-bigger rule, then honest savings and
 * budget flags. `parts` come from compressImageData(…, { partial: true }).
 */
export function mergeCandidates(
  parts: readonly CompressionResult[],
  original: { buffer: ArrayBuffer; mime: string },
  settings: Pick<CompressionSettings, "outputFormat" | "goal" | "budgetKb" | "neverBigger" | "qualityMode">,
  timing: { encodingTimeMs: number },
): CompressionResult {
  if (parts.length === 0) throw new Error("No candidates to merge");
  const auto = settings.outputFormat === "auto";
  const winner = auto ? (pickAuto(parts.map((p) => ({ ...summaryOf(p), part: p })), settings.goal)?.part ?? parts[0]) : parts[0];
  const candidates = dedupeCandidates(parts.flatMap((p) => p.candidates));
  // The HEIC display preview rides on whichever part rendered it.
  const sourcePreview = parts.find((p) => p.sourcePreview)?.sourcePreview;
  const sample = parts.find((p) => p.sample)?.sample;
  const originalSize = original.buffer.byteLength;
  const src = winner.sourceDimensions;
  const resized = winner.dimensions.width !== src.width || winner.dimensions.height !== src.height;
  const targetBytes = Math.round(settings.budgetKb * 1024);

  if (
    shouldKeepOriginal({
      neverBigger: settings.neverBigger,
      auto,
      resized,
      sameFormat: winner.mimeType === original.mime,
      inputMime: original.mime,
      animated: winner.animatedSource !== null,
      outputSize: winner.newSize,
      originalSize,
    })
  ) {
    return {
      ...winner,
      buffer: original.buffer,
      mimeType: original.mime,
      originalSize,
      newSize: originalSize,
      savedPct: 0,
      encodingTimeMs: timing.encodingTimeMs,
      codec: "Original kept — already optimised",
      dimensions: { ...src },
      iccStatus: keptIccStatus(winner.source),
      pngPhotoAdvisory: false,
      keptOriginal: true,
      sourcePreview,
      sample,
      // The original bytes still carry their metadata.
      metadataStripped: false,
      autoPicked: false,
      candidates,
      budget:
        settings.goal === "budget"
          ? { targetBytes, fits: originalSize <= targetBytes, quality: null, soft: false }
          : null,
    };
  }

  return {
    ...winner,
    originalSize,
    savedPct: signedSavedPct(originalSize, winner.newSize),
    encodingTimeMs: timing.encodingTimeMs,
    keptOriginal: false,
    autoPicked: auto,
    candidates,
    sourcePreview,
    sample,
  };
}

/** The original bytes keep their own profile (if any); CMYK warns. */
function keptIccStatus(source: CompressionResult["source"]): IccStatus {
  if (source.cmyk) return "cmyk";
  return source.hasProfile ? "preserved" : "none";
}

function summaryOf(r: CompressionResult): Pick<CandidateSummary, "mimeType" | "size" | "quality" | "fits" | "iccStatus"> {
  const own = r.candidates.find((c) => c.mimeType === r.mimeType);
  return {
    mimeType: r.mimeType as CandidateSummary["mimeType"],
    size: r.newSize,
    quality: own?.quality ?? null,
    fits: r.budget ? r.budget.fits : null,
    iccStatus: r.iccStatus,
  };
}

/** One entry per format (the last one wins — later probes are fresher). */
export function dedupeCandidates(list: readonly CandidateSummary[]): CandidateSummary[] {
  const byMime = new Map<string, CandidateSummary>();
  for (const c of list) byMime.set(c.mimeType, c);
  return [...byMime.values()];
}
