/**
 * Pure detectors for "smart preview" rendering in the Tree view. Every
 * detector is a constant-time regex/string check — no parsing of large
 * payloads, no DOM work, no network. Safe to run once per leaf per render.
 *
 * Conservatism is deliberate: we'd rather miss a plausible value than
 * misidentify a normal string (e.g. an integer pretending to be a Unix
 * epoch). False positives feel buggy; false negatives look like "no preview"
 * which is just the existing behaviour.
 */

// ── Color ────────────────────────────────────────────────────────────────────

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR =
  /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*(?:\d*\.?\d+%?|\.\d+))?\s*\)$/i;
const HSL_COLOR =
  /^hsla?\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*(?:,\s*(?:\d*\.?\d+%?|\.\d+))?\s*\)$/i;

/**
 * Return a CSS color string if `s` looks like a recognized color literal,
 * otherwise null. The returned string is the original — usable directly as a
 * `background` value via a style attribute.
 */
export function detectColor(s: string): string | null {
  if (HEX_COLOR.test(s) || RGB_COLOR.test(s) || HSL_COLOR.test(s)) return s;
  return null;
}

// ── URL / image ──────────────────────────────────────────────────────────────

const IMAGE_PATH_EXT = /\.(?:png|jpe?g|gif|webp|svg|avif|bmp|ico)(?:$|[?#])/i;
const DATA_URI_IMAGE = /^data:image\/[a-z+]+;base64,/i;

export interface UrlDetection {
  url: string;
  isImage: boolean;
  host: string;
}

export function detectUrl(s: string): UrlDetection | null {
  if (s.length < 8 || s.length > 2048) return null;
  // Cheap prefix gate before the expensive URL constructor.
  if (!s.startsWith("http://") && !s.startsWith("https://")) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return {
      url: s,
      isImage: IMAGE_PATH_EXT.test(u.pathname),
      host: u.host,
    };
  } catch {
    return null;
  }
}

/** Detect a base64-encoded image embedded as a data URI. */
export function detectDataUriImage(s: string): string | null {
  if (!s.startsWith("data:image/")) return null;
  return DATA_URI_IMAGE.test(s) ? s : null;
}

// ── Date ─────────────────────────────────────────────────────────────────────
// Only ISO 8601 — date-only, date-time, and date-time-with-offset. We skip
// Unix-epoch numeric detection because the false-positive rate on arbitrary
// integers (counts, IDs, prices) is too high to feel trustworthy.

const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const RTF = typeof Intl !== "undefined" && Intl.RelativeTimeFormat
  ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
  : null;

const RTF_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: 365.25 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30.44 * 24 * 60 * 60 * 1000 },
  { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
  { unit: "second", ms: 1000 },
];

export interface DateDetection {
  /** Pretty relative time like "5 days ago" or "in 3 hours". */
  relative: string;
  /** ISO of the canonical UTC instant — usable as a title attribute. */
  iso: string;
}

export function detectIsoDate(s: string, now: number = Date.now()): DateDetection | null {
  if (s.length < 10 || s.length > 35 || !ISO_DATE.test(s)) return null;
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return null;
  const diff = ms - now;
  const abs = Math.abs(diff);
  let relative = "now";
  if (RTF) {
    for (const { unit, ms: unitMs } of RTF_UNITS) {
      if (abs >= unitMs || unit === "second") {
        relative = RTF.format(Math.round(diff / unitMs), unit);
        break;
      }
    }
  }
  return { relative, iso: new Date(ms).toISOString() };
}

// ── Unified ──────────────────────────────────────────────────────────────────

export type ValueHint =
  | { kind: "color"; css: string }
  | { kind: "data-image"; src: string }
  | { kind: "url"; url: string; isImage: boolean; host: string }
  | { kind: "date"; relative: string; iso: string }
  | null;

/**
 * Best-effort single-pass detection — runs each detector in order, returns
 * the first match. Order matters: data-URI before generic URL, color before
 * anything else (so `#abc` isn't mistaken for a fragment).
 */
export function detectValueHint(s: string): ValueHint {
  if (!s) return null;
  // Data-URI image is cheap to gate (prefix match).
  const dataImg = detectDataUriImage(s);
  if (dataImg) return { kind: "data-image", src: dataImg };

  const color = detectColor(s);
  if (color) return { kind: "color", css: color };

  const url = detectUrl(s);
  if (url) return { kind: "url", ...url };

  const date = detectIsoDate(s);
  if (date) return { kind: "date", ...date };

  return null;
}
