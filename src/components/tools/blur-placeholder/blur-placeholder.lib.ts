/**
 * Blur placeholder — pure pipeline. Given a small sRGB RGBA source (≤ 100 px
 * on the long side, already decoded and downscaled by the component) and the
 * settings, produce every placeholder format plus the code to paste.
 *
 * No React, no DOM. Lossy WebP/JPEG need a browser encoder, so the caller
 * passes one in (`EncodeLossy`); PNG is encoded here, exactly.
 */

import { encodeBlurhash, decodeBlurhash } from "./blurhash";
import { bytesToBase64, pngDataUrl } from "./png";
import { rgbaToDataURL, rgbaToThumbHash, thumbHashToDataURL } from "./thumbhash";

/* ───────────────────────── types ───────────────────────── */

export type Fmt = "png" | "webp" | "jpeg";
export type FlattenBg = "dark" | "white" | "avg";
export type FormatId = "base64" | "thumbhash" | "blurhash" | "css" | "svg" | "color";
export type OutTab = "next" | "react" | "html" | "value";

export interface Settings {
  /** Width of the Base64 image, 4–64 px; height follows the aspect ratio. (plaiceholder sizes portrait images by height instead, e.g. 3×4 vs our 4×6.) */
  size: number;
  fmt: Fmt;
  /** Fill transparent areas with `bg`. */
  flatten: boolean;
  bg: FlattenBg;
  /** sharp modulate(): L × brightness. */
  brightness: number;
  /** sharp modulate(): C × saturation. */
  saturation: number;
  /** sharp modulate(): h + hue (degrees). */
  hue: number;
  /** sharp modulate(): L + lightness (CIE L units, 0–100 scale). */
  lightness: number;
  /** BlurHash components, 1–9 each way. */
  bx: number;
  by: number;
}

export const DEFAULT_SETTINGS: Settings = {
  size: 4,
  fmt: "png",
  flatten: false,
  bg: "dark",
  brightness: 1,
  saturation: 1.2,
  hue: 0,
  lightness: 0,
  bx: 4,
  by: 3,
};

export type Adjustments = Pick<Settings, "brightness" | "saturation" | "hue" | "lightness">;
export const DEFAULT_ADJUST: Adjustments = { brightness: 1, saturation: 1.2, hue: 0, lightness: 0 };
const IDENTITY: Adjustments = { brightness: 1, saturation: 1, hue: 0, lightness: 0 };

/** A decoded image, downscaled to the working size. */
export interface SourceImage {
  id: string;
  /** File name. */
  label: string;
  /** Original (oriented) dimensions. */
  w: number;
  h: number;
  /** Original file size in bytes. */
  bytes: number;
  /** Working pixels (≤ 100 × 100, sRGB, straight alpha). */
  sw: number;
  sh: number;
  px: Uint8ClampedArray;
}

/** Browser-side lossy encoder: returns a data URL, or null if unsupported. */
export type EncodeLossy = (w: number, h: number, px: Uint8ClampedArray, mime: "image/webp" | "image/jpeg") => string | null;

export interface CssLayers {
  backgroundImage: string;
  backgroundPosition: string;
  backgroundSize: string;
  backgroundRepeat: "no-repeat";
}

export interface Result {
  /** Base64 image dimensions. */
  w: number;
  h: number;
  /** Output keeps an alpha channel. */
  alpha: boolean;
  /** Source has any transparency. */
  hasAlpha: boolean;
  b64: string;
  /** Format actually produced (WebP falls back to PNG where the browser can't encode it). */
  b64Fmt: Fmt;
  /** Data-URL length of every format for the same pixels (null: browser can't encode it). */
  fmtLengths: Record<Fmt, number | null>;
  color: string;
  css: CssLayers;
  cssText: string;
  svg: string;
  svgUrl: string;
  blurhash: string;
  /** BlurHash decoded to a PNG data URL, for previews. */
  bhPng: string;
  /** ThumbHash bytes as standard Base64. */
  th: string;
  /** ThumbHash decoded to a PNG data URL (same bytes as thumbHashToDataURL). */
  thPng: string;
}

/* ───────────────────────── pixels ───────────────────────── */

/**
 * Area-average downscale with alpha weighting: every source pixel contributes
 * in proportion to the area it covers and to its alpha, so transparent
 * pixels never bleed their (meaningless) colour into the result.
 */
export function resize(src: ArrayLike<number>, sw: number, sh: number, dw: number, dh: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const y0 = (y * sh) / dh;
    const y1 = ((y + 1) * sh) / dh;
    for (let x = 0; x < dw; x++) {
      const x0 = (x * sw) / dw;
      const x1 = ((x + 1) * sw) / dw;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let wsum = 0;
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
        const wy = Math.min(sy + 1, y1) - Math.max(sy, y0);
        if (wy <= 0) continue;
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          const wx = Math.min(sx + 1, x1) - Math.max(sx, x0);
          if (wx <= 0) continue;
          const wgt = wx * wy;
          const i = (sy * sw + sx) * 4;
          const al = src[i + 3] / 255;
          r += src[i] * al * wgt;
          g += src[i + 1] * al * wgt;
          b += src[i + 2] * al * wgt;
          a += al * wgt;
          wsum += wgt;
        }
      }
      const o = (y * dw + x) * 4;
      if (a > 0) {
        out[o] = r / a;
        out[o + 1] = g / a;
        out[o + 2] = b / a;
      }
      out[o + 3] = wsum ? (255 * a) / wsum : 0;
    }
  }
  return out;
}

/** Base64 image size: `n` px wide, height by aspect (≤ 64), never larger than the source. */
export function baseDims(w: number, h: number, n: number): { w: number; h: number } {
  const dw = Math.min(n, w);
  const dh = Math.max(1, Math.min(64, h, Math.round((dw * h) / w)));
  return { w: dw, h: dh };
}

/** Fit `w × h` into a box whose long side is `n`, never larger than the source. */
export function fitDims(w: number, h: number, n: number): { w: number; h: number } {
  const target = Math.min(n, Math.max(w, h));
  if (w >= h) return { w: target, h: Math.max(1, Math.round((target * h) / w)) };
  return { w: Math.max(1, Math.round((target * w) / h)), h: target };
}

/** True when any pixel is not fully opaque. */
export function hasTransparency(px: ArrayLike<number>): boolean {
  for (let i = 3; i < px.length; i += 4) if (px[i] < 255) return true;
  return false;
}

/* sRGB ⇄ CIE LCh(ab), D65 — the space sharp's modulate() works in. */
const S2L = (() => {
  const t = new Float64Array(256);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    t[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  return t;
})();
const linToSrgb = (v: number): number => {
  const c = Math.min(1, Math.max(0, v));
  return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
};
const XN = 0.95047;
const ZN = 1.08883;
const EPS = 216 / 24389;
const KAPPA = 24389 / 27;
const fLab = (t: number) => (t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
const fInv = (t: number) => {
  const t3 = t * t * t;
  return t3 > EPS ? t3 : (116 * t - 16) / KAPPA;
};

/** Modulate one sRGB colour (0–255 floats) — sharp's modulate() semantics. */
export function modulate(r: number, g: number, b: number, o: Adjustments): [number, number, number] {
  const R = S2L[Math.round(r)];
  const G = S2L[Math.round(g)];
  const B = S2L[Math.round(b)];
  const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / XN;
  const Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const Z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / ZN;
  const fx = fLab(X);
  const fy = fLab(Y);
  const fz = fLab(Z);
  const L = 116 * fy - 16;
  const A = 500 * (fx - fy);
  const Bb = 200 * (fy - fz);
  // LCh: L × brightness + lightness, C × saturation, h + hue.
  const L2 = Math.max(0, L * o.brightness + o.lightness);
  const C = Math.hypot(A, Bb) * o.saturation;
  const hRad = Math.atan2(Bb, A) + (o.hue * Math.PI) / 180;
  const A2 = C * Math.cos(hRad);
  const B2 = C * Math.sin(hRad);
  const fy2 = (L2 + 16) / 116;
  const X2 = fInv(fy2 + A2 / 500) * XN;
  const Y2 = L2 > KAPPA * EPS ? fy2 * fy2 * fy2 : L2 / KAPPA;
  const Z2 = fInv(fy2 - B2 / 200) * ZN;
  return [
    linToSrgb(3.2404542 * X2 - 1.5371385 * Y2 - 0.4985314 * Z2),
    linToSrgb(-0.969266 * X2 + 1.8760108 * Y2 + 0.041556 * Z2),
    linToSrgb(0.0556434 * X2 - 0.2040259 * Y2 + 1.0572252 * Z2),
  ];
}

const isIdentity = (o: Adjustments) => o.brightness === 1 && o.saturation === 1 && o.hue === 0 && o.lightness === 0;

/**
 * Optionally flatten onto `bg`, then apply modulate(). Alpha is untouched
 * unless flattened. Identity settings are an exact pass-through.
 */
export function adjust(px: ArrayLike<number>, o: Adjustments, flatten: boolean, bg: readonly number[]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(px.length);
  const mod = !isIdentity(o);
  // Few distinct colours in a ≤100 px source: memoise the colour transform.
  const memo = mod ? new Map<number, [number, number, number]>() : null;
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i];
    let g = px[i + 1];
    let b = px[i + 2];
    let a = px[i + 3];
    if (flatten) {
      const al = a / 255;
      r = r * al + bg[0] * (1 - al);
      g = g * al + bg[1] * (1 - al);
      b = b * al + bg[2] * (1 - al);
      a = 255;
    }
    if (memo) {
      const key = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
      let c = memo.get(key);
      if (!c) {
        c = modulate(r, g, b, o);
        memo.set(key, c);
      }
      r = c[0];
      g = c[1];
      b = c[2];
    }
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = a;
  }
  return out;
}

/** Alpha-weighted average colour, rounded to 8-bit. */
export function average(px: ArrayLike<number>): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  for (let i = 0; i < px.length; i += 4) {
    const al = px[i + 3] / 255;
    r += px[i] * al;
    g += px[i + 1] * al;
    b += px[i + 2] * al;
    a += al;
  }
  return a ? [Math.round(r / a), Math.round(g / a), Math.round(b / a)] : [0, 0, 0];
}

export function hex(c: readonly number[]): string {
  return (
    "#" +
    c
      .slice(0, 3)
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

/* ───────────────────────── outputs ───────────────────────── */

export const PAGE_BG: readonly [number, number, number] = [11, 11, 10];
const BG: Record<Exclude<FlattenBg, "avg">, readonly [number, number, number]> = {
  dark: PAGE_BG,
  white: [255, 255, 255],
};

/** Hard-stop gradient rows from a ≤ 4 × 4 grid. */
export function cssLayers(full: ArrayLike<number>, sw: number, sh: number, alpha: boolean): CssLayers {
  const { w: gw, h: gh } = fitDims(sw, sh, 4);
  const g = resize(full, sw, sh, gw, gh);
  const colour = (i: number) =>
    alpha && g[i + 3] < 255
      ? `rgba(${g[i]},${g[i + 1]},${g[i + 2]},${(g[i + 3] / 255).toFixed(2)})`
      : hex([g[i], g[i + 1], g[i + 2]]);
  const rows: string[] = [];
  const pos: string[] = [];
  for (let y = 0; y < gh; y++) {
    const stops: string[] = [];
    for (let x = 0; x < gw; x++)
      stops.push(`${colour((y * gw + x) * 4)} ${Math.round((x * 100) / gw)}% ${Math.round(((x + 1) * 100) / gw)}%`);
    rows.push(`linear-gradient(90deg,${stops.join(",")})`);
    pos.push(`0 ${gh > 1 ? Math.round((y * 100) / (gh - 1)) : 0}%`);
  }
  return {
    backgroundImage: rows.join(","),
    backgroundPosition: pos.join(","),
    backgroundSize: `100% ${(100 / gh).toFixed(2)}%`,
    backgroundRepeat: "no-repeat",
  };
}

export const cssDeclarations = (c: CssLayers) =>
  `background-image:${c.backgroundImage};background-position:${c.backgroundPosition};background-size:${c.backgroundSize};background-repeat:no-repeat`;
const CSS_BLUR = ";filter:blur(24px);transform:scale(1.15)";

/** ≤ 8 px grid of rects under a Gaussian blur; opaque images keep hard edges at the border. */
export function svgMarkup(full: ArrayLike<number>, sw: number, sh: number, alpha: boolean): string {
  const { w: vw, h: vh } = fitDims(sw, sh, 8);
  const v = resize(full, sw, sh, vw, vh);
  let rects = "";
  for (let y = 0; y < vh; y++)
    for (let x = 0; x < vw; x++) {
      const k = (y * vw + x) * 4;
      const op = alpha && v[k + 3] < 255 ? ` fill-opacity='${(v[k + 3] / 255).toFixed(2)}'` : "";
      rects += `<rect x='${x}' y='${y}' width='1' height='1' fill='${hex([v[k], v[k + 1], v[k + 2]])}'${op}/>`;
    }
  const restoreAlpha = alpha ? "" : "<feComponentTransfer><feFuncA type='discrete' tableValues='1 1'/></feComponentTransfer>";
  return (
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${vw} ${vh}' preserveAspectRatio='none'>` +
    `<filter id='b' color-interpolation-filters='sRGB'><feGaussianBlur stdDeviation='.6'/>${restoreAlpha}</filter>` +
    `<g filter='url(#b)'>${rects}</g></svg>`
  );
}

export const svgToDataUrl = (svg: string) =>
  "data:image/svg+xml," + svg.replace(/%/g, "%25").replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E");

/* ---------- slimming browser-encoded WebP / JPEG ---------- */

const fromB64 = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const u32le = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

/**
 * Browsers embed a ~450-byte sRGB ICC profile in canvas WebP/JPEG output —
 * bigger than a 4 px image. Untagged images are already treated as sRGB, so
 * dropping it changes no colour. WebP: ICCP (and EXIF/XMP) chunks are removed;
 * an opaque image becomes the simple RIFF + VP8 form. JPEG: APPn segments go.
 */
export function slimWebp(b: Uint8Array): Uint8Array {
  if (b.length < 20 || String.fromCharCode(...b.subarray(0, 4)) !== "RIFF" || String.fromCharCode(...b.subarray(8, 12)) !== "WEBP")
    return b;
  const chunks: { type: string; data: Uint8Array }[] = [];
  for (let o = 12; o + 8 <= b.length; ) {
    const type = String.fromCharCode(...b.subarray(o, o + 4));
    const n = u32le(b, o + 4);
    if (o + 8 + n > b.length) return b;
    chunks.push({ type, data: b.subarray(o + 8, o + 8 + n) });
    o += 8 + n + (n & 1);
  }
  const vp8x = chunks.find((c) => c.type === "VP8X");
  const hasAlpha = chunks.some((c) => c.type === "ALPH") || (vp8x ? (vp8x.data[0] & 0x10) !== 0 : false);
  const anim = vp8x ? (vp8x.data[0] & 0x02) !== 0 : false;
  if (anim) return b;
  let keep = chunks.filter((c) => c.type !== "ICCP" && c.type !== "EXIF" && c.type !== "XMP ");
  if (!hasAlpha) keep = keep.filter((c) => c.type === "VP8 " || c.type === "VP8L");
  else if (vp8x) {
    const flags = new Uint8Array(vp8x.data);
    flags[0] &= ~(0x20 | 0x08 | 0x04); // no ICC, EXIF or XMP
    keep = keep.map((c) => (c === vp8x ? { type: c.type, data: flags } : c));
  }
  let size = 4;
  for (const c of keep) size += 8 + c.data.length + (c.data.length & 1);
  const out = new Uint8Array(8 + size);
  const put32 = (o: number, v: number) => {
    out[o] = v & 255;
    out[o + 1] = (v >>> 8) & 255;
    out[o + 2] = (v >>> 16) & 255;
    out[o + 3] = (v >>> 24) & 255;
  };
  out.set([82, 73, 70, 70], 0);
  put32(4, size);
  out.set([87, 69, 66, 80], 8);
  let o = 12;
  for (const c of keep) {
    for (let i = 0; i < 4; i++) out[o + i] = c.type.charCodeAt(i);
    put32(o + 4, c.data.length);
    out.set(c.data, o + 8);
    o += 8 + c.data.length + (c.data.length & 1);
  }
  return out;
}

export function slimJpeg(b: Uint8Array): Uint8Array {
  if (b[0] !== 0xff || b[1] !== 0xd8) return b;
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let o = 2;
  while (o + 4 <= b.length) {
    if (b[o] !== 0xff) return b;
    const m = b[o + 1];
    if (m === 0xda) {
      parts.push(b.subarray(o));
      break;
    }
    const n = (b[o + 2] << 8) | b[o + 3];
    // JFIF (APP0), EXIF/XMP (APP1), ICC (APP2) and comments are metadata only.
    if (!(m === 0xe0 || m === 0xe1 || m === 0xe2 || m === 0xfe)) parts.push(b.subarray(o, o + 2 + n));
    o += 2 + n;
  }
  if (o + 4 > b.length) return b;
  const out = new Uint8Array(parts.reduce((s2, p) => s2 + p.length, 0));
  let k = 0;
  for (const p of parts) {
    out.set(p, k);
    k += p.length;
  }
  return out;
}

/** Strip metadata from a browser-made WebP/JPEG data URL. */
export function slimDataUrl(url: string): string {
  const comma = url.indexOf(",");
  const head = url.slice(0, comma);
  const bytes = fromB64(url.slice(comma + 1));
  let slim = bytes;
  if (head.startsWith("data:image/webp")) slim = slimWebp(bytes);
  else if (head.startsWith("data:image/jpeg")) slim = slimJpeg(bytes);
  return `${head},${bytesToBase64(slim)}`;
}

const MIME: Record<Fmt, "image/png" | "image/webp" | "image/jpeg"> = {
  png: "image/png",
  webp: "image/webp",
  jpeg: "image/jpeg",
};

/** Every placeholder format for one image. */
export function generate(src: SourceImage, s: Settings, encodeLossy?: EncodeLossy): Result {
  const { sw, sh } = src;
  const hasAlpha = hasTransparency(src.px);
  const flat = s.flatten && hasAlpha;
  const bgc = s.bg === "avg" ? average(src.px) : BG[s.bg];
  const full = adjust(src.px, s, flat, bgc);
  const alpha = hasAlpha && !flat;

  // Base64 image — every format is encoded so the sizes can be compared honestly.
  // Aspect from the original size (the working copy is rounded), capped by the working pixels.
  const bd0 = baseDims(src.w, src.h, s.size);
  const w = Math.min(bd0.w, sw);
  const h = Math.min(bd0.h, sh);
  const small = resize(full, sw, sh, w, h);
  const urls: Record<Fmt, string | null> = { png: pngDataUrl(w, h, small, alpha), webp: null, jpeg: null };
  if (encodeLossy) {
    for (const f of ["webp", "jpeg"] as const) {
      // JPEG has no alpha: fill with the chosen background first.
      const input = f === "jpeg" && alpha ? adjust(small, IDENTITY, true, bgc) : small;
      const url = encodeLossy(w, h, input, MIME[f] as "image/webp" | "image/jpeg");
      urls[f] = url && url.startsWith(`data:${MIME[f]};base64,`) ? slimDataUrl(url) : null;
    }
  }
  const chosen = urls[s.fmt];
  const b64Fmt: Fmt = chosen ? s.fmt : "png";
  const b64 = chosen ?? (urls.png as string);
  const fmtLengths: Record<Fmt, number | null> = {
    png: urls.png?.length ?? null,
    webp: urls.webp?.length ?? null,
    jpeg: urls.jpeg?.length ?? null,
  };

  const color = hex(average(full));
  const css = cssLayers(full, sw, sh, alpha);
  const svg = svgMarkup(full, sw, sh, alpha);

  // BlurHash has no alpha: composite transparent sources onto the page colour.
  const bd = fitDims(sw, sh, 32);
  const bsrc = resize(full, sw, sh, bd.w, bd.h);
  const bhInput = alpha ? adjust(bsrc, IDENTITY, true, PAGE_BG) : bsrc;
  const blurhash = encodeBlurhash(bhInput, bd.w, bd.h, s.bx, s.by);
  // Preview only (never copied): the fast uncompressed writer is enough.
  const bhPng = rgbaToDataURL(bd.w, bd.h, decodeBlurhash(blurhash, bd.w, bd.h));

  const thBytes = rgbaToThumbHash(sw, sh, full);

  return {
    w,
    h,
    alpha,
    hasAlpha,
    b64,
    b64Fmt,
    fmtLengths,
    color,
    css,
    cssText: cssDeclarations(css) + CSS_BLUR,
    svg,
    svgUrl: svgToDataUrl(svg),
    blurhash,
    bhPng,
    th: bytesToBase64(thBytes),
    thPng: thumbHashToDataURL(thBytes),
  };
}

/* ───────────────────────── presentation ───────────────────────── */

export function kb(n: number): string {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
}

export interface FormatInfo {
  id: FormatId;
  name: string;
  short: string;
  tag: string;
  why: string;
  /** Tint class for the tag. */
  tone: "clay" | "sage" | "teal" | "rose" | "coral" | "muted";
}

export const FORMATS: readonly FormatInfo[] = [
  { id: "base64", name: "Base64 image", short: "Base64", why: "What Next/Image takes as blurDataURL.", tag: "Next.js", tone: "clay" },
  { id: "thumbhash", name: "ThumbHash", short: "ThumbHash", why: "Most detail per byte. Keeps aspect ratio and transparency.", tag: "Sharpest", tone: "sage" },
  { id: "blurhash", name: "BlurHash", short: "BlurHash", why: "Short text you can store in a database column.", tag: "Popular", tone: "teal" },
  { id: "css", name: "CSS gradients", short: "CSS", why: "No image request and no JavaScript.", tag: "No JS", tone: "rose" },
  { id: "svg", name: "Inline SVG", short: "SVG", why: "Scales smoothly, works in any src attribute.", tag: "Any stack", tone: "coral" },
  { id: "color", name: "Average colour", short: "Colour", why: "Smallest. Store it next to width and height.", tag: "7 bytes", tone: "muted" },
];

/** The raw value of a format — exactly what "Raw value" copies. */
export function valueOf(id: FormatId, r: Result): string {
  switch (id) {
    case "base64":
      return r.b64;
    case "thumbhash":
      return r.th;
    case "blurhash":
      return r.blurhash;
    case "css":
      return r.cssText;
    case "svg":
      return r.svgUrl;
    case "color":
      return r.color;
  }
}

/** Percent of the original file, with enough precision to stay honest. */
export function pctOf(size: number, original: number): string {
  if (!original) return "";
  const pct = (size / original) * 100;
  if (pct < 0.01) return "< 0.01% of the original";
  return `${pct < 1 ? pct.toFixed(2) : pct.toFixed(1)}% of the original`;
}

export interface CodeTarget {
  /** File name, used for the example src path. */
  label: string;
  w: number;
  h: number;
}

/** Code snippet for one output tab and format. */
export function buildCode(tab: OutTab, id: FormatId, item: CodeTarget, r: Result): string {
  if (tab === "value") return valueOf(id, r);
  const src = "/images/" + encodeURI(item.label).replace(/"/g, "%22");
  const W = item.w;
  const H = item.h;
  const thDecode = `Uint8Array.from(atob("${r.th}"), (c) => c.charCodeAt(0))`;

  if (tab === "next") {
    const head = 'import Image from "next/image";\n';
    switch (id) {
      case "base64":
        return `${head}\n<Image\n  src="${src}"\n  width={${W}}\n  height={${H}}\n  alt=""\n  placeholder="blur"\n  blurDataURL="${r.b64}"\n/>`;
      case "svg":
        return `${head}\n// Next.js 14+ accepts a data URL as the placeholder itself\n<Image\n  src="${src}"\n  width={${W}}\n  height={${H}}\n  alt=""\n  placeholder="${r.svgUrl}"\n/>`;
      case "thumbhash":
        return `${head}import { thumbHashToDataURL } from "thumbhash";\n\nconst hash = ${thDecode};\n\n<Image\n  src="${src}"\n  width={${W}}\n  height={${H}}\n  alt=""\n  placeholder="blur"\n  blurDataURL={thumbHashToDataURL(hash)}\n/>`;
      case "blurhash":
        return `${head}import { Blurhash } from "react-blurhash";\n\n// next/image can't decode BlurHash itself — draw it underneath\n<div style={{ position: "relative", aspectRatio: "${W} / ${H}" }}>\n  <Blurhash hash="${r.blurhash}" width="100%" height="100%" style={{ position: "absolute" }} />\n  <Image src="${src}" fill alt="" />\n</div>`;
      case "css":
        return `${head}\nconst placeholder = {\n  backgroundImage: "${r.css.backgroundImage}",\n  backgroundPosition: "${r.css.backgroundPosition}",\n  backgroundSize: "${r.css.backgroundSize}",\n  backgroundRepeat: "no-repeat",\n};\n\n<Image src="${src}" width={${W}} height={${H}} alt="" style={placeholder} />`;
      case "color":
        return `${head}\n<Image\n  src="${src}"\n  width={${W}}\n  height={${H}}\n  alt=""\n  style={{ backgroundColor: "${r.color}" }}\n/>`;
    }
  }

  if (tab === "html") {
    const bgDecls: Partial<Record<FormatId, string>> = {
      color: `background: ${r.color}`,
      css: cssDeclarations(r.css),
      svg: `background: url('${r.svgUrl.replace(/'/g, "%27")}') center / cover`,
      base64: `background: url(${r.b64}) center / cover`,
    };
    const bgDecl = bgDecls[id];
    if (bgDecl)
      return `<img\n  src="${src}"\n  width="${W}" height="${H}"\n  loading="lazy" decoding="async" alt=""\n  style="${bgDecl}"\n  onload="this.style.background='none'"\n>`;
    const ch = Math.max(1, Math.round((32 * H) / W));
    if (id === "blurhash")
      return `<!-- BlurHash needs a small decoder script -->\n<canvas id="ph" width="32" height="${ch}" style="width:100%;height:auto"></canvas>\n<script type="module">\n  import { decode } from "https://esm.sh/blurhash@2";\n  const c = document.getElementById("ph");\n  const px = decode("${r.blurhash}", c.width, c.height);\n  c.getContext("2d").putImageData(new ImageData(px, c.width, c.height), 0, 0);\n</script>`;
    return `<!-- ThumbHash needs a small decoder script -->\n<canvas id="ph" style="width:100%;height:auto"></canvas>\n<script type="module">\n  import { thumbHashToRGBA } from "https://esm.sh/thumbhash@0.1";\n  const { w, h, rgba } = thumbHashToRGBA(${thDecode});\n  const c = document.getElementById("ph");\n  c.width = w;\n  c.height = h;\n  c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);\n</script>`;
  }

  // React
  const phStyles: Record<FormatId, string> = {
    color: `{ background: "${r.color}" }`,
    base64: `{ backgroundImage: \`url(${r.b64})\`, backgroundSize: "cover", filter: "blur(20px)", transform: "scale(1.1)" }`,
    svg: `{ backgroundImage: \`url("${r.svgUrl}")\`, backgroundSize: "cover" }`,
    css: `{ backgroundImage: "${r.css.backgroundImage}", backgroundPosition: "${r.css.backgroundPosition}", backgroundSize: "${r.css.backgroundSize}", backgroundRepeat: "no-repeat", filter: "blur(24px)", transform: "scale(1.15)" }`,
    thumbhash: "{ backgroundImage: `url(${placeholderUrl})`, backgroundSize: \"cover\" }",
    blurhash: "",
  };
  const phStyle = phStyles[id];
  const pres: Partial<Record<FormatId, string>> = {
    thumbhash: `import { thumbHashToDataURL } from "thumbhash";\n\nconst placeholderUrl = thumbHashToDataURL(${thDecode});\n\n`,
    blurhash: `import { Blurhash } from "react-blurhash";\n\n`,
  };
  const pre = pres[id] ?? "";
  const layer =
    id === "blurhash"
      ? `<Blurhash hash="${r.blurhash}" width="100%" height="100%" style={{ position: "absolute", inset: 0 }} />`
      : `<div aria-hidden style={{ position: "absolute", inset: 0, ...${phStyle} }} />`;
  return `"use client";\nimport { useState } from "react";\n${pre}export function Photo() {\n  const [loaded, setLoaded] = useState(false);\n  return (\n    <div style={{ position: "relative", overflow: "hidden", aspectRatio: "${W} / ${H}" }}>\n      ${layer}\n      <img\n        src="${src}" alt=""\n        onLoad={() => setLoaded(true)}\n        style={{ position: "relative", width: "100%", height: "100%", objectFit: "cover", opacity: loaded ? 1 : 0, transition: "opacity .4s" }}\n      />\n    </div>\n  );\n}`;
}

/* ───────────────────────── batch ───────────────────────── */

export interface ManifestEntry {
  width: number;
  height: number;
  blurDataURL: string;
  color: string;
  blurhash: string;
  thumbhash: string;
}

/** placeholders.json, keyed by file name (duplicates get " (2)", " (3)"…). */
export function buildManifest(rows: readonly { item: SourceImage; result: Result }[]): Record<string, ManifestEntry> {
  const out: Record<string, ManifestEntry> = {};
  for (const { item, result } of rows) {
    let key = item.label;
    for (let n = 2; Object.prototype.hasOwnProperty.call(out, key); n++) key = `${item.label} (${n})`;
    out[key] = {
      width: item.w,
      height: item.h,
      blurDataURL: result.b64,
      color: result.color,
      blurhash: result.blurhash,
      thumbhash: result.th,
    };
  }
  return out;
}

/** Working size for decoded sources: the ThumbHash limit, never upscaled. */
export function workingDims(w: number, h: number): { w: number; h: number } {
  const scale = Math.min(1, 100 / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}
