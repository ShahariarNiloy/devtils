/**
 * Meta preview — pure logic (no React, no DOM).
 *
 * Pixel widths come from a `measure(text, font)` function the component
 * supplies (canvas measureText in the browser). `estimateWidth` is a
 * character-width fallback for Arial used before the canvas is available.
 */

import { escapeXml, isAbsUrl, type Check, type CheckLevel } from "@/components/tools/seo-shared/seo.lib";

export type Device = "desktop" | "mobile";
export type Measure = (text: string, font: string) => number;

export const DEVICES: readonly { id: Device; label: string }[] = [
  { id: "desktop", label: "Desktop" },
  { id: "mobile", label: "Mobile" },
];

/** Desktop title font; use `titleFont(device)` for the size actually shown. */
export const TITLE_FONT = "20px Arial";
export const DESC_FONT = "14px Arial";
export const TITLE_MAX = 600;
export const DESC_MAX: Record<Device, number> = { desktop: 920, mobile: 680 };
/** Result card width (px) and title size per device, as in the mockup. */
export const CARD: Record<Device, { width: number; titleSize: number }> = {
  desktop: { width: 640, titleSize: 20 },
  mobile: { width: 390, titleSize: 18 },
};

/** The title font as the SERP card renders it on `device` (20px desktop, 18px mobile). */
export const titleFont = (device: Device) => `${CARD[device].titleSize}px Arial`;

export interface MetaFields {
  title: string;
  desc: string;
  url: string;
}

export const SAMPLE_META: MetaFields = {
  title: "JSON Formatter & Validator — Free, Private, Works Offline | utilyx",
  desc: "Format, validate, repair and explore JSON in your browser. Tree, table and JSONPath views, ten output formats, and nothing ever leaves your device. No sign-up needed.",
  url: "https://utilyx.dev/tools/json-formatter",
};

export const EMPTY_META: MetaFields = { title: "", desc: "", url: "" };

/* Approximate Arial advance widths at 1px (em fractions), for the fallback. */
const NARROW = /[ijl.,:;'|!I ]/;
const SLIM = /[ftr()[\]{}\-"/ ]/;
const WIDE = /[mwMW@%]/;
const CAPS = /[A-Z]/;

/** Rough Arial width in px for `font` like "20px Arial" (used without canvas). */
export function estimateWidth(text: string, font: string): number {
  const size = parseFloat(font) || 16;
  let em = 0;
  for (const ch of text) {
    if (NARROW.test(ch)) em += 0.25;
    else if (SLIM.test(ch)) em += 0.32;
    else if (WIDE.test(ch)) em += 0.86;
    else if (CAPS.test(ch)) em += 0.68;
    else if (/[0-9]/.test(ch)) em += 0.556;
    else if (/[\u0000-ɏ]/.test(ch)) em += 0.52;
    else em += 1; // CJK, emoji and other wide glyphs
  }
  return em * size;
}

/** Cut text to fit `max` px, at a word boundary, ending in " …" (search-result style). */
export function cutToWidth(text: string, font: string, max: number, measure: Measure): string {
  if (measure(text, font) <= max) return text;
  const chars = Array.from(text);
  const withEllipsis = (n: number) => `${chars.slice(0, n).join("").trimEnd()} …`;
  // Longest prefix whose displayed form (prefix + " …") still fits.
  let lo = 0;
  let hi = chars.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (measure(withEllipsis(mid), font) <= max) lo = mid;
    else hi = mid - 1;
  }
  const head = chars.slice(0, lo).join("");
  // A cut that lands on a word boundary keeps the whole last word; otherwise
  // drop the partial word.
  const atBoundary = lo >= chars.length || /\s/.test(chars[lo]) || /\s$/.test(head);
  const atWord = atBoundary ? head : head.replace(/\s+\S*$/, "");
  return `${(atWord || head).trimEnd()} …`;
}

function parseUrl(u: string): URL | null {
  try {
    return new URL(u);
  } catch {
    return null;
  }
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export interface MetaResult {
  checks: Check[];
  titleWidth: number;
  descWidth: number;
  descMax: number;
  serp: { site: string; crumb: string; initial: string; title: string; desc: string; width: number; titleSize: number };
  html: string;
}

export function buildMeta(f: MetaFields, device: Device, measure: Measure): MetaResult {
  const checks: Check[] = [];
  const chk = (level: CheckLevel, text: string) => checks.push({ level, text });
  const title = f.title.trim();
  const desc = f.desc.trim();
  const url = f.url.trim();
  const tFont = titleFont(device);
  const tW = title ? measure(title, tFont) : 0;
  const dW = desc ? measure(desc, DESC_FONT) : 0;
  const dMax = DESC_MAX[device];
  const tLen = Array.from(title).length;
  const dLen = Array.from(desc).length;

  if (!title) chk("err", "Add a title tag.");
  else if (tW > TITLE_MAX) {
    chk("warn", `Title is about ${Math.round(tW)}px wide and will be cut off around ${TITLE_MAX}px (${tLen} characters).`);
  } else if (tLen < 30) chk("warn", "Title is short. 50–60 characters usually works best.");
  else chk("ok", `Title fits (${tLen} characters, ~${Math.round(tW)}px).`);

  if (!desc) chk("warn", "No meta description — search engines will pick text from the page.");
  else if (dW > dMax) chk("warn", `Description will be truncated on ${device} (~${Math.round(dW)}px of ${dMax}px).`);
  else if (dLen < 70) chk("warn", "Description is short. Aim for 120–155 characters.");
  else chk("ok", `Description fits on ${device} (${dLen} characters).`);

  const u = url ? parseUrl(url) : null;
  if (url && (!u || !isAbsUrl(url))) chk("err", "The URL must be absolute, like https://example.com/page.");
  chk("info", "Pixel widths are estimates. Search engines may also rewrite titles and descriptions.");

  const host = u ? u.hostname.replace(/^www\./, "") : "example.com";
  const first = host.split(".")[0] ?? host;
  const crumb = u
    ? `${u.protocol}//${u.hostname}${u.pathname
        .split("/")
        .filter(Boolean)
        .map((p) => ` › ${safeDecode(p)}`)
        .join("")}`
    : "https://example.com";

  const lines = [`<title>${escapeXml(title)}</title>`, `<meta name="description" content="${escapeXml(desc)}" />`];
  if (url) lines.push(`<link rel="canonical" href="${escapeXml(url)}" />`);

  return {
    checks,
    titleWidth: tW,
    descWidth: dW,
    descMax: dMax,
    serp: {
      ...CARD[device],
      initial: host.charAt(0).toUpperCase(),
      site: first.charAt(0).toUpperCase() + first.slice(1),
      crumb,
      title: title ? cutToWidth(title, tFont, TITLE_MAX, measure) : "Your page title",
      desc: desc ? cutToWidth(desc, DESC_FONT, dMax, measure) : "Add a meta description to control this text.",
    },
    html: lines.join("\n"),
  };
}

/** Counter colour for a pixel meter. */
export function pxTone(w: number, max: number): "faint" | "ok" | "err" {
  if (w === 0) return "faint";
  return w > max ? "err" : "ok";
}
