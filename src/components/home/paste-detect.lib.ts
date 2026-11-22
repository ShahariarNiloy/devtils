/**
 * "Paste anything" detection for the landing hero demo. Pure — no React,
 * no DOM beyond `atob` / `TextDecoder` / `URL`, no network.
 *
 * Runs on every keystroke, so every branch is gated by a cheap anchored
 * regex before anything expensive (JSON.parse, base64 decode), and input
 * beyond MAX_INSPECT characters is never parsed.
 */

export type DetectKind = "jwt" | "json" | "json-error" | "url" | "timestamp" | "uuid" | "color" | "cron" | "base64" | "text";
export type DetectTint = "clay" | "teal" | "sage" | "rose" | "plum" | "error" | "faint";
export type Confidence = "Sure" | "Likely" | "Guess";

export interface Fact {
  k: string;
  v: string;
}

export interface Detection {
  kind: DetectKind;
  /** "Looks like {type}" */
  type: string;
  glyph: string;
  tint: DetectTint;
  /** "Open in {tool}" */
  tool: string;
  /** Registry slug of the tool the button opens. */
  slug: string;
  facts: Fact[];
  preview: string;
  confidence: Confidence;
}

/** Inputs longer than this are classified by shape only, never parsed. */
export const MAX_INSPECT = 100_000;
/** The preview pane shows ~20 lines; never hand it more than this. */
export const PREVIEW_MAX = 4_000;

export type SampleKey = "json" | "jwt" | "b64" | "url" | "ts" | "cron" | "color";

export interface Sample {
  key: SampleKey;
  label: string;
  glyph: string;
  tint: DetectTint;
  value: string;
}

/** The example chips under the demo (exact strings from the design). */
export const SAMPLES: readonly Sample[] = [
  { key: "json", label: "JSON", glyph: "{}", tint: "clay", value: '{"user":{"id":4821,"name":"Ada","roles":["admin","editor"]},"active":true,"plan":"pro"}' },
  {
    key: "jwt", label: "JWT", glyph: "JWT", tint: "teal",
    value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ODIxIiwibmFtZSI6IkFkYSIsImV4cCI6MTgzMDAwMDAwMH0.4pcPyMD09olPSyXnrXCjTwXyr4BsezdI1AVTmud2fU4",
  },
  { key: "b64", label: "Base64", glyph: "64", tint: "plum", value: "aGVsbG8gZnJvbSB1dGlseXggLSBub3RoaW5nIHVwbG9hZGVk" },
  { key: "url", label: "URL", glyph: "://", tint: "rose", value: "https://shop.example.com/search?q=keyboard&page=2&utm_source=newsletter&utm_medium=email" },
  { key: "ts", label: "Timestamp", glyph: "⏱", tint: "sage", value: "1795196384" },
  { key: "cron", label: "Cron", glyph: "*/", tint: "sage", value: "*/15 9-17 * * 1-5" },
  { key: "color", label: "Colour", glyph: "#", tint: "plum", value: "#e0a072" },
];

// ── helpers ──────────────────────────────────────────────────────────────

const utf8 = new TextDecoder("utf-8", { fatal: true });

/** base64 / base64url → UTF-8 text. Throws on bad base64 or invalid UTF-8. */
function b64ToText(str: string): string {
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return utf8.decode(bytes);
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const pad2 = (n: number) => (n < 10 ? "0" : "") + n;
const clip = (s: string) => (s.length > PREVIEW_MAX ? `${s.slice(0, PREVIEW_MAX)}…` : s);
const isoMinute = (d: Date) => d.toISOString().replace("T", " ").slice(0, 16);
const isoSecond = (d: Date) => d.toISOString().replace("T", " ").slice(0, 19);

/** "2026-11-21 20:03:04 UTC+6" in the runtime's local zone. */
function localStamp(d: Date): string {
  const off = -d.getTimezoneOffset();
  const abs = Math.abs(off);
  const zone = off === 0 ? "UTC" : `UTC${off > 0 ? "+" : "-"}${Math.floor(abs / 60)}${abs % 60 ? `:${pad2(abs % 60)}` : ""}`;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} ${zone}`;
}

/** Nesting depth without recursion or argument spreading (safe on huge arrays). */
function jsonDepth(root: unknown): number {
  let max = 0;
  const stack: [unknown, number][] = [[root, 0]];
  for (let top = stack.pop(); top; top = stack.pop()) {
    const [v, d] = top;
    if (v === null || typeof v !== "object") continue;
    if (d + 1 > max) max = d + 1;
    for (const child of Object.values(v)) {
      if (child !== null && typeof child === "object") stack.push([child, d + 1]);
    }
  }
  return max;
}

function countWords(s: string): number {
  let n = 0;
  let inWord = false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const space = c === 32 || (c >= 9 && c <= 13) || c === 160;
    if (!space && !inWord) n++;
    inWord = !space;
  }
  return n;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Five cron fields → a short plain-English sentence. */
export function cronWords(f: readonly string[]): string {
  const [m, h, dom, mon, dow] = f;
  const out: string[] = [];
  if (/^\*\/\d+$/.test(m)) out.push(`every ${m.slice(2)} minutes`);
  else if (m === "*") out.push("every minute");
  else if (/^\d+$/.test(m) && /^\d+$/.test(h)) out.push(`at ${pad2(+h)}:${pad2(+m)}`);
  else out.push(`at minute ${m}`);
  if (/^\d+-\d+$/.test(h)) {
    const [a, b] = h.split("-");
    out.push(`from ${pad2(+a)}:00 to ${pad2(+b)}:59`);
  } else if (/^\*\/\d+$/.test(h)) out.push(`every ${h.slice(2)} hours`);
  else if (h !== "*" && !/^\d+$/.test(h)) out.push(`in hours ${h}`);
  if (dom !== "*") out.push(`on day ${dom} of the month`);
  if (mon !== "*") out.push(`in month ${mon}`);
  if (dow === "1-5") out.push("on weekdays");
  else if (dow === "0,6" || dow === "6,0") out.push("on weekends");
  else if (/^\d$/.test(dow)) out.push(`on ${DAYS[+dow % 7]}s`);
  else if (dow !== "*") out.push(`on days ${dow}`);
  const s = out.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── colour ───────────────────────────────────────────────────────────────

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_RE = /^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i;
const HSL_RE = /^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/i;

const hex2 = (n: number) => n.toString(16).padStart(2, "0");

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = (((h % 360) + 360) % 360) / 360;
  const ss = Math.min(1, s / 100);
  const ll = Math.min(1, l / 100);
  const k = (n: number) => (n + hh * 12) % 12;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number) => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function rgbToHsl(r: number, g: number, b: number): string {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return `hsl(${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

function parseColor(s: string): { rgb: [number, number, number]; from: "hex" | "rgb" | "hsl" } | null {
  const hx = HEX_RE.exec(s);
  if (hx) {
    const v = hx[1].length === 3 ? hx[1].split("").map((c) => c + c).join("") : hx[1];
    return { rgb: [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)], from: "hex" };
  }
  const rg = RGB_RE.exec(s);
  if (rg) {
    const c = [+rg[1], +rg[2], +rg[3]];
    if (c.some((n) => n > 255)) return null;
    return { rgb: [c[0], c[1], c[2]], from: "rgb" };
  }
  const hs = HSL_RE.exec(s);
  if (hs) return { rgb: hslToRgb(+hs[1], +hs[2], +hs[3]), from: "hsl" };
  return null;
}

// ── detect ───────────────────────────────────────────────────────────────

function make(
  kind: DetectKind,
  type: string,
  glyph: string,
  tint: DetectTint,
  tool: string,
  slug: string,
  facts: Fact[],
  preview: string,
  confidence: Confidence = "Sure",
): Detection {
  return { kind, type, glyph, tint, tool, slug, facts, preview: clip(preview), confidence };
}

const JWT_RE = /^eyJ[\w-]+\.eyJ[\w-]+\.[\w-]*$/;
const URL_RE = /^https?:\/\/\S+$/;
const TS_RE = /^\d{10}(\d{3})?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CRON_FIELD_RE = /^[\d*/,-]+$/;
const B64_RE = /^[A-Za-z0-9+/_-]{8,}={0,2}$/;
// Decoded Base64 must read as text: no control characters besides tab/LF/CR.
const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f�]/;

function plainText(s: string): Detection {
  return make("text", "Plain text", "Aa", "faint", "Word counter", "word-counter",
    [{ k: "Words", v: String(countWords(s)) }, { k: "Characters", v: String(s.length) }], s.slice(0, 400), "Guess");
}

/**
 * Classify pasted text. `now` (ms) decides whether a JWT has expired.
 * Returns null for empty / whitespace-only input.
 */
export function detect(raw: string, now: number = Date.now()): Detection | null {
  const s = raw.trim();
  if (!s) return null;

  const first = s.charCodeAt(0);
  const looksJson = first === 123 /* { */ || first === 91; /* [ */

  if (s.length > MAX_INSPECT) {
    // Too big to parse on a keystroke — classify by shape only.
    if (looksJson) {
      return make("json", "JSON", "{}", "clay", "JSON formatter", "json-formatter",
        [{ k: "Size", v: `${s.length} chars` }, { k: "Parsed", v: "in the formatter (too large to preview)" }], s, "Likely");
    }
    return plainText(s);
  }

  if (JWT_RE.test(s)) {
    try {
      const parts = s.split(".");
      const header: unknown = JSON.parse(b64ToText(parts[0]));
      const payload: unknown = JSON.parse(b64ToText(parts[1]));
      if (isRecord(header) && isRecord(payload)) {
        const facts: Fact[] = [{ k: "Algorithm", v: typeof header.alg === "string" ? header.alg : "?" }];
        if (payload.sub != null) facts.push({ k: "Subject", v: String(payload.sub) });
        if (typeof payload.exp === "number" && Number.isFinite(payload.exp)) {
          const ex = new Date(payload.exp * 1000);
          if (!Number.isNaN(ex.getTime())) {
            facts.push({ k: "Expires", v: `${isoMinute(ex)} UTC${ex.getTime() < now ? " · expired" : ""}` });
          }
        }
        return make("jwt", "JWT", "JWT", "teal", "JWT decoder", "jwt-decoder", facts, JSON.stringify(payload, null, 2));
      }
    } catch {
      /* not a decodable JWT — fall through */
    }
  }

  if (looksJson) {
    try {
      const v: unknown = JSON.parse(s);
      let top: string = typeof v;
      if (Array.isArray(v)) top = `array · ${v.length} items`;
      else if (isRecord(v)) top = `object · ${Object.keys(v).length} keys`;
      return make("json", "JSON", "{}", "clay", "JSON formatter", "json-formatter",
        [{ k: "Top level", v: top }, { k: "Depth", v: String(jsonDepth(v)) }, { k: "Size", v: `${s.length} chars` }],
        JSON.stringify(v, null, 2));
    } catch (e) {
      const msg = e instanceof Error ? e.message.replace(/ \(line.*$/, "") : "Invalid JSON";
      return make("json-error", "JSON (with errors)", "{}", "error", "JSON formatter", "json-formatter",
        [{ k: "Problem", v: msg }], s, "Likely");
    }
  }

  if (URL_RE.test(s)) {
    try {
      const u = new URL(s);
      const ps: string[] = [];
      u.searchParams.forEach((val, key) => ps.push(`${key} = ${val}`));
      const trk = ps.filter((p) => /^(utm_|fbclid|gclid)/.test(p)).length;
      return make("url", "URL", "://", "rose", "URL parser", "url-parser",
        [{ k: "Host", v: u.host }, { k: "Path", v: u.pathname }, { k: "Parameters", v: ps.length + (trk ? ` · ${trk} tracking` : "") }],
        ps.join("\n") || "(no query parameters)");
    } catch {
      /* invalid URL — fall through */
    }
  }

  if (TS_RE.test(s)) {
    const isMs = s.length === 13;
    const d = new Date(isMs ? +s : +s * 1000);
    return make("timestamp", "Unix timestamp", "⏱", "sage", "Timestamp converter", "timestamp-converter",
      [{ k: "Unit", v: isMs ? "milliseconds" : "seconds" }, { k: "UTC", v: isoSecond(d) }, { k: "Local", v: localStamp(d) }],
      d.toUTCString());
  }

  if (UUID_RE.test(s)) {
    return make("uuid", "UUID", "id", "sage", "UUID generator", "uuid-generator", [{ k: "Version", v: `v${s.charAt(14)}` }], s.toLowerCase());
  }

  if (s.length <= 64) {
    const c = parseColor(s);
    if (c) {
      const [r, g, b] = c.rgb;
      const hex = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
      const rgb = `rgb(${r}, ${g}, ${b})`;
      const facts: Fact[] = c.from === "hex"
        ? [{ k: "RGB", v: rgb }, { k: "HEX", v: hex }, { k: "HSL", v: rgbToHsl(r, g, b) }]
        : [{ k: "HEX", v: hex }, { k: "RGB", v: rgb }, { k: "HSL", v: rgbToHsl(r, g, b) }];
      return make("color", "Colour", "#", "plum", "Colour converter", "color-converter", facts,
        `color: ${hex};\ncolor: rgb(${r} ${g} ${b});`);
    }
  }

  if (s.length <= 200) {
    const cf = s.split(/\s+/);
    if (cf.length === 5 && cf.every((x) => CRON_FIELD_RE.test(x))) {
      return make("cron", "Cron expression", "*/", "sage", "Cron parser", "cron-parser",
        [{ k: "Fields", v: "min · hour · day · month · weekday" }], cronWords(cf));
    }
  }

  if (s.length % 4 !== 1 && B64_RE.test(s)) {
    try {
      const txt = b64ToText(s);
      if (txt && !CONTROL_RE.test(txt)) {
        return make("base64", "Base64", "64", "plum", "Base64 decoder", "base64", [{ k: "Decoded", v: `${txt.length} chars` }], txt, "Likely");
      }
    } catch {
      /* not base64 text — fall through */
    }
  }

  return plainText(s);
}
