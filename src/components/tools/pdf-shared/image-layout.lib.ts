/**
 * Where an image sits on its PDF page. Shared by the preview tiles and the
 * worker that writes the PDF, so what you see is what you get. PDF points,
 * origin bottom-left. Pure: no DOM, no React.
 */

export type PageSize = "a4" | "letter" | "fit";
export type Orient = "auto" | "portrait" | "landscape";
export type Margin = "none" | "small" | "large";
export type Fit = "contain" | "cover";

export interface LayoutOpts {
  page: PageSize;
  orient: Orient;
  margin: Margin;
  fit: Fit;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PageLayout {
  pw: number;
  ph: number;
  /** The area inside the margin. */
  inner: Rect;
  /** Where the whole image is drawn — larger than `inner` when filling. */
  box: Rect;
  /** Filling the page cut part of the image off. */
  cropped: boolean;
}

export const PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792] } as const;
const MARGIN: Record<Margin, number> = { none: 0, small: 0.045, large: 0.09 };
/** "Same as image" pages: one image pixel = 1/96 inch, the CSS pixel. */
const PT_PER_PX = 0.75;
/** PDF's largest page side (200 inches). */
const MAX_SIDE = 14_400;

/** Lay out an upright image of `w` × `h` pixels (after any rotation). */
export function layoutPage(w: number, h: number, o: LayoutOpts): PageLayout {
  let pw: number;
  let ph: number;
  if (o.page === "fit") {
    const k = Math.min(PT_PER_PX, MAX_SIDE / Math.max(w, h));
    pw = Math.max(1, w * k);
    ph = Math.max(1, h * k);
  } else {
    const [sw, sh] = PAGE_SIZES[o.page];
    const landscape =
      o.orient === "landscape" || (o.orient === "auto" && w > h);
    pw = landscape ? sh : sw;
    ph = landscape ? sw : sh;
  }
  const m = Math.min(pw, ph) * MARGIN[o.margin];
  const inner = { x: m, y: m, w: pw - 2 * m, h: ph - 2 * m };
  const fill = o.fit === "cover" && o.page !== "fit";
  const k = fill
    ? Math.max(inner.w / w, inner.h / h)
    : Math.min(inner.w / w, inner.h / h);
  const bw = w * k;
  const bh = h * k;
  const box = {
    x: inner.x + (inner.w - bw) / 2,
    y: inner.y + (inner.h - bh) / 2,
    w: bw,
    h: bh,
  };
  return {
    pw,
    ph,
    inner,
    box,
    cropped: fill && (bw > inner.w + 0.5 || bh > inner.h + 0.5),
  };
}

/** Width and height once turned `rotate` degrees (multiples of 90). */
export function turned(
  w: number,
  h: number,
  rotate: number,
): { w: number; h: number } {
  return (((rotate / 90) % 2) + 2) % 2 === 1 ? { w: h, h: w } : { w, h };
}

export type SizeMode = "original" | "balanced" | "small";

/** How each "File size" choice treats images. */
export const SIZE_MODES: Record<SizeMode, { maxPx: number; quality: number }> =
  {
    original: { maxPx: Number.POSITIVE_INFINITY, quality: 1 },
    balanced: { maxPx: 2400, quality: 0.85 },
    small: { maxPx: 1600, quality: 0.7 },
  };

/** What we know about an added image before the PDF is written. */
export interface ImageFacts {
  type: string;
  bytes: number;
  w: number;
  h: number;
}

/**
 * Rough output size, shown as "about …" before writing. Photo formats are
 * costed at typical JPEG density for the pixels kept; PNG and GIF are
 * treated as screenshots, which stay lossless.
 */
export function estimatePdfBytes(
  images: readonly ImageFacts[],
  mode: SizeMode,
): number {
  const { maxPx, quality } = SIZE_MODES[mode];
  let total = 900;
  for (const im of images) {
    total += 1800;
    const s = Math.min(1, maxPx / Math.max(im.w, im.h));
    const px = im.w * im.h * s * s;
    const lossless =
      im.type === "png" || im.type === "gif" || im.type === "bmp";
    // Untouched non-JPEG photos are stored losslessly: ~2 bytes a pixel.
    if (mode === "original")
      total += im.type === "jpeg" || lossless ? im.bytes : px * 2;
    else if (lossless) total += im.bytes * s * s;
    else
      total += Math.min(
        im.type === "jpeg" ? im.bytes : Number.POSITIVE_INFINITY,
        px * (quality > 0.8 ? 0.22 : 0.12),
      );
  }
  return Math.round(total);
}
