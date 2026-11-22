/** PDF → image: names, picks and render sizes. Pure: no DOM, no React. */

export type ImageFormat = "png" | "jpg" | "webp";
export const MIME: Record<ImageFormat, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};
export const FORMAT_LABEL: Record<ImageFormat, string> = {
  png: "PNG",
  jpg: "JPG",
  webp: "WebP",
};

/**
 * "{name}-{n}" → "report-007.png". Page numbers are padded to the width of
 * the page count so files sort in order; characters that aren't allowed in
 * file names become dashes.
 */
export function fileNameFor(
  pattern: string,
  base: string,
  n: number,
  total: number,
  ext: string,
): string {
  const num = String(n).padStart(String(total).length, "0");
  const pat = pattern.trim() || "{name}-{n}";
  const raw = pat.replace(/\{name\}/g, base).replace(/\{n\}/g, num);
  const safe = raw
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\.(png|jpe?g|webp)$/i, "")
    .trim();
  // A pattern without {n} would give every page the same name.
  const unique = pat.includes("{n}") || total === 1 ? safe : `${safe}-${num}`;
  return `${unique || num}.${ext}`;
}

export type Quick = "all" | "odd" | "even" | "none";

/** 0-based page indices for a quick pick. Odd/even read as page numbers (1, 3, 5…). */
export function pickQuick(kind: Quick, total: number): number[] {
  const all = Array.from({ length: total }, (_, i) => i);
  if (kind === "all") return all;
  if (kind === "none") return [];
  return all.filter((i) => (kind === "odd" ? i % 2 === 0 : i % 2 === 1));
}

/** Browsers refuse canvases past ~32k pixels a side. */
const MAX_SIDE = 16_384;

/**
 * Pixel size for a page of `wPt` × `hPt` points at `dpi`, shrunk if needed to
 * stay under `maxArea` pixels — `capped` says so, with the DPI we really used.
 */
export function renderSize(
  wPt: number,
  hPt: number,
  dpi: number,
  maxArea: number,
): { w: number; h: number; scale: number; dpi: number; capped: boolean } {
  let scale = dpi / 72;
  const area = wPt * hPt * scale * scale;
  if (area > maxArea) scale *= Math.sqrt(maxArea / area);
  scale = Math.min(scale, MAX_SIDE / Math.max(wPt, hPt));
  // Round normally; floor when capped, where rounding up could tip it over.
  const px = area > maxArea ? Math.floor : Math.round;
  const w = Math.max(1, px(wPt * scale));
  const h = Math.max(1, px(hPt * scale));
  const used = Math.round(scale * 72);
  return { w, h, scale, dpi: used, capped: used < dpi };
}

/**
 * The largest canvas this device will reliably draw. iOS Safari stops at
 * 16.7 megapixels; desktops manage far more, but memory is finite.
 */
export function maxCanvasArea(touchSafari: boolean): number {
  return touchSafari ? 16_777_216 : 50_000_000;
}
