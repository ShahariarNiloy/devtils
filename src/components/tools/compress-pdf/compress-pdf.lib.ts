/** Compress PDF: levels and the honest size verdict. Pure. */

export type Level = "light" | "recommended" | "strong";

export const LEVELS: Record<Level, { label: string; note: string; quality: number; maxPx: number; photosFromLossless: boolean }> = {
  light: { label: "Light", note: "Photos stay sharp, smaller saving", quality: 0.86, maxPx: 3000, photosFromLossless: false },
  recommended: { label: "Recommended", note: "Good for email and sharing", quality: 0.74, maxPx: 2000, photosFromLossless: true },
  strong: { label: "Strong", note: "Smallest file, softer photos", quality: 0.56, maxPx: 1300, photosFromLossless: true },
};

export interface Verdict {
  /** The compressed file is worth using. */
  smaller: boolean;
  /** Signed change in percent, rounded: −62 or +3. */
  pct: number;
  saved: number;
}

/** Anything under 1% smaller isn't worth a second file — keep the original. */
export function verdict(before: number, after: number): Verdict {
  const pct = before ? Math.round(((after - before) / before) * 100) : 0;
  return { smaller: after < before * 0.99, pct, saved: before - after };
}
