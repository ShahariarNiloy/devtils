/**
 * Sign PDF: the field model and the maths, as pure functions. No React, no
 * DOM, no PDF library — the page geometry comes in as a converter function.
 */

export type FieldKind = "sig" | "init" | "date" | "text" | "check";

/** A placed field. x, y, w, h are fractions of the page as the reader sees it. */
export interface Field {
  id: string;
  kind: FieldKind;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Text fields: the words. Date fields: the date as yyyy-mm-dd. */
  text: string;
  /** Date fields: how the date is written. */
  fmt?: DateFormat;
}

export const FIELD_LABEL: Record<FieldKind, string> = {
  sig: "Signature",
  init: "Initials",
  date: "Date",
  text: "Text",
  check: "Checkmark",
};

/** Default width, as a fraction of the page width (board values). */
const DEFAULT_W: Record<FieldKind, number> = { sig: 0.3, init: 0.12, date: 0.22, text: 0.34, check: 0.05 };
/** Text-like fields: height as a fraction of the page *width* (a ~11 pt line on A4). */
const LINE_H = 0.04;

export type DateFormat = "long" | "us" | "iso";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(d: Date, f: DateFormat): string {
  if (f === "iso") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (f === "us") return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** What a date field shows: its own date in its own format. */
export function dateFieldText(f: Pick<Field, "text" | "fmt">): string {
  return formatDate(parseDateInput(f.text) ?? new Date(), f.fmt ?? "long");
}

/** Today as the yyyy-mm-dd a date input uses (local time). */
export function todayInput(now = new Date()): string {
  return formatDate(now, "iso");
}

/** "2026-11-22" (a date input's value) → a local Date, or null. */
export function parseDateInput(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A new field centred on a click at (cx, cy) (page fractions).
 * `aspect` is the content's height ÷ width (for signatures and initials);
 * `pageAspect` is the page's height ÷ width.
 */
export function newField(kind: FieldKind, page: number, cx: number, cy: number, pageAspect: number, aspect: number, id: string): Field {
  const w = DEFAULT_W[kind];
  let hPx: number; // in page-width units
  if (kind === "sig" || kind === "init") hPx = w * aspect;
  else if (kind === "check") hPx = w;
  else hPx = LINE_H;
  const h = hPx / pageAspect;
  return {
    id,
    kind,
    page,
    w,
    h,
    x: clamp(cx - w / 2, 0, 1 - w),
    y: clamp(cy - h / 2, 0, 1 - h),
    text: kind === "text" ? "Type here" : "",
  };
}

/** Move a field by (dx, dy) page fractions, keeping it on the page. */
export function moveField(f: Field, dx: number, dy: number): Field {
  return { ...f, x: clamp(f.x + dx, 0, 1 - f.w), y: clamp(f.y + dy, 0, 1 - f.h) };
}

/** Resize from the bottom-right corner to width `w`, keeping the aspect ratio. */
export function resizeField(f: Field, w: number): Field {
  const maxW = Math.min(1 - f.x, ((1 - f.y) * f.w) / f.h);
  const nw = clamp(w, 0.03, maxW);
  return { ...f, w: nw, h: (f.h * nw) / f.w };
}

/** Keep signature/initial boxes in step with the current signature's shape. */
export function refitAspect(f: Field, pageAspect: number, aspect: number): Field {
  const h = (f.w * aspect) / pageAspect;
  return { ...f, h, y: clamp(f.y, 0, 1 - h) };
}

type Point = readonly [number, number];

/**
 * A field → the box pdf-lib draws into, in PDF user space. `toPdf` maps a
 * point on the page *as displayed at scale 1* (top-left origin, rotation
 * applied) to PDF coordinates — PDF.js's viewport.convertToPdfPoint.
 */
export function fieldToPdfBox(f: Field, viewW: number, viewH: number, toPdf: (x: number, y: number) => Point) {
  const X = f.x * viewW;
  const Y = f.y * viewH;
  const W = f.w * viewW;
  const H = f.h * viewH;
  const bl = toPdf(X, Y + H); // bottom-left as seen
  const br = toPdf(X + W, Y + H);
  const tl = toPdf(X, Y);
  const rotate = (Math.atan2(br[1] - bl[1], br[0] - bl[0]) * 180) / Math.PI;
  return {
    page: f.page,
    x: bl[0],
    y: bl[1],
    w: Math.hypot(br[0] - bl[0], br[1] - bl[1]),
    h: Math.hypot(tl[0] - bl[0], tl[1] - bl[1]),
    rotate: Math.round(rotate * 1000) / 1000,
  };
}

/** Can the standard Helvetica font (WinAnsi) write this text? */
export function isWinAnsi(text: string): boolean {
  return /^[ -~ -ÿ–—‘’“”•…€]*$/.test(text);
}

/**
 * A photo of a signature on paper → ink on transparent. Light pixels fade
 * out, ink keeps its colour; works in place on RGBA data.
 */
export function removePaper(px: Uint8ClampedArray): void {
  for (let i = 0; i < px.length; i += 4) {
    const l = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
    if (l > 200) px[i + 3] = 0;
    else if (l > 150) px[i + 3] = Math.round(((200 - l) / 50) * px[i + 3]);
  }
}

/** Bounding box of non-transparent pixels, or null if there are none. */
export function inkBounds(px: Uint8ClampedArray, w: number, h: number, alphaMin = 8): { x: number; y: number; w: number; h: number } | null {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] < alphaMin) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** "Ada Lovelace" → "AL". */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3);
}
