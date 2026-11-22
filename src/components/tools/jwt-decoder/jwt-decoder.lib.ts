import { findLossyJsonNumbers } from "@/components/json-converter/number-precision";
import type { AlgInfo, JwtParseError, ParsedJwt, VerifiableAlgorithm } from "./jwt-decoder.types";

/**
 * Pure JWT helpers: base64url, parsing, time formatting and lossless JSON
 * text handling (big integers are read from the token's own JSON text, so
 * nothing is rounded by JSON.parse). No React, no DOM.
 */

const VERIFIABLE_ALGS: readonly VerifiableAlgorithm[] = [
  "HS256", "HS384", "HS512",
  "RS256", "RS384", "RS512",
  "ES256", "ES384", "ES512",
  "PS256", "PS384", "PS512",
];

// ─── base64url ───────────────────────────────────────────────────────────────

/** base64url, tolerating standard base64 (`+`, `/`) and `=` padding. */
const B64_CHARS = /^[A-Za-z0-9_\-+/]*={0,2}$/;

/** Decode base64url (or standard base64) to bytes; null when malformed. */
export function tryBase64UrlToBytes(s: string): Uint8Array | null {
  if (!B64_CHARS.test(s)) return null;
  const body = s.replace(/=+$/, "");
  if (body.length % 4 === 1) return null;
  const b64 = body.replace(/-/g, "+").replace(/_/g, "/");
  let bin: string;
  try {
    bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  } catch {
    return null;
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Decode a base64url segment to bytes; throws on malformed input. */
export function base64UrlToBytes(s: string): Uint8Array {
  const out = tryBase64UrlToBytes(s);
  if (!out) throw new Error("Not valid Base64URL.");
  return out;
}

/** Encode bytes (or a UTF-8 string) to unpadded base64url. */
export function bytesToBase64Url(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const UTF8 = new TextDecoder("utf-8", { fatal: true });

function decodeSegmentText(s: string): string | null {
  const bytes = tryBase64UrlToBytes(s);
  if (!bytes) return null;
  try {
    return UTF8.decode(bytes);
  } catch {
    return null;
  }
}

// ─── parsing ─────────────────────────────────────────────────────────────────

/**
 * Strip common wrappers so a pasted "Authorization: Bearer …" header, a
 * line-wrapped token or a redirect URL with `?token=` / `#id_token=` still
 * decodes.
 */
export function extractToken(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^authorization:\s*/i, "");
  t = t.replace(/^bearer\s+/i, "");
  const m = t.match(/[?#&](?:access_token|id_token|token)=([\w-]+\.[\w-]+\.[\w-]*)/);
  if (m) return m[1];
  return t.replace(/\s+/g, "");
}

export function parseJwt(rawInput: string): ParsedJwt | JwtParseError {
  const raw = extractToken(rawInput);
  if (!raw) return { segment: "empty", message: "Paste a token to decode it." };
  const parts = raw.split(".");
  if (parts.length !== 3) {
    return {
      segment: "structure",
      message: `A JWT has three parts separated by dots. This one has ${parts.length}.`,
    };
  }
  const [h, p, s] = parts;

  const headerJson = decodeSegmentText(h);
  const header = headerJson === null ? undefined : tryParseJson(headerJson);
  if (header === undefined) {
    return { segment: "header", message: "The header isn't valid Base64URL-encoded JSON." };
  }
  if (!isPlainObject(header)) {
    return { segment: "header", message: "The header must be a JSON object." };
  }

  const payloadJson = decodeSegmentText(p);
  const payload = payloadJson === null ? undefined : tryParseJson(payloadJson);
  if (payloadJson === null || payload === undefined) {
    return { segment: "payload", message: "The payload isn't valid Base64URL-encoded JSON." };
  }
  // RFC 7519 §7.2: the claims set must be a JSON object.
  if (!isPlainObject(payload)) {
    return { segment: "payload", message: "The payload must be a JSON object." };
  }

  const signatureBytes = s ? tryBase64UrlToBytes(s) : new Uint8Array(0);
  if (!signatureBytes) {
    return { segment: "signature", message: "The signature isn't valid Base64URL." };
  }

  return {
    raw,
    segments: { header: h, payload: p, signature: s },
    header,
    alg: classifyAlg(header.alg),
    payload,
    payloadJson,
    headerJson: headerJson ?? "{}",
    signatureBytes,
  };
}

/** `undefined` when the text isn't JSON (a JSON `null` stays `null`). */
function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Classify a header `alg` without rewriting it. Only the exact string "none"
 * is the unsigned algorithm; "None"/"NONE" are flagged as non-standard.
 */
export function classifyAlg(a: unknown): AlgInfo {
  if (a === "none") return { kind: "none", name: "none" };
  if (typeof a !== "string") {
    const name = a === undefined ? "(missing)" : JSON.stringify(a);
    return { kind: "unsupported", name, nonStandardNone: false };
  }
  const supported = VERIFIABLE_ALGS.find((v) => v === a);
  if (supported) return { kind: "supported", name: supported };
  return { kind: "unsupported", name: a, nonStandardNone: a.toLowerCase() === "none" };
}

/** True when the token carries no usable signature (alg none or empty sig). */
export function isUnsigned(jwt: ParsedJwt): boolean {
  if (jwt.alg.kind === "none") return true;
  if (jwt.alg.kind === "unsupported" && jwt.alg.nonStandardNone) return true;
  return jwt.segments.signature === "";
}

// ─── time ────────────────────────────────────────────────────────────────────

/** "2026-11-26 17:00 UTC" — unambiguous and timezone-explicit. */
export function formatUtc(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  if (Number.isNaN(d.getTime())) return "invalid date";
  return `${d.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

/** "17:00" — the UTC clock time of a timestamp. */
export function formatUtcClock(unixSeconds: number): string {
  return formatUtc(unixSeconds).slice(11, 16);
}

function unitFor(a: number): string {
  if (a < 90) return `${a} s`;
  if (a < 5400) return `${Math.round(a / 60)} min`;
  if (a < 172800) return `${Math.round(a / 3600)} h`;
  return `${Math.round(a / 86400)} days`;
}

/** "in 48 min", "12 min ago", "in 30 s", "3 days ago". */
export function formatRelative(unixSeconds: number, nowSeconds: number): string {
  const delta = Math.round(unixSeconds - nowSeconds);
  const u = unitFor(Math.abs(delta));
  return delta >= 0 ? `in ${u}` : `${u} ago`;
}

/** "60 min", "1 h", "30 days" — a span of seconds. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 5400) return `${Math.round(s / 60)} min`;
  if (s < 172800) return `${Math.round(s / 3600)} h`;
  return `${Math.round(s / 86400)} days`;
}

// ─── lossless JSON text ──────────────────────────────────────────────────────

const WS = new Set([" ", "\t", "\n", "\r"]);

/** Index just past the JSON string starting at `i` (which is a quote). */
function skipString(text: string, i: number): number {
  let j = i + 1;
  while (j < text.length) {
    const c = text[j];
    if (c === "\\") j += 2;
    else if (c === '"') return j + 1;
    else j++;
  }
  return j;
}

/** Remove insignificant whitespace, keeping every token exactly as written. */
export function minifyJsonText(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      const end = skipString(text, i);
      out += text.slice(i, end);
      i = end;
    } else {
      if (!WS.has(c)) out += c;
      i++;
    }
  }
  return out;
}

/**
 * Pretty-print valid JSON text without parsing it, so numbers keep their
 * exact spelling (12345678901234567890 stays 12345678901234567890).
 */
export function prettyJsonText(text: string, indent = 2): string {
  const src = minifyJsonText(text);
  const pad = (d: number) => "\n" + " ".repeat(d * indent);
  let out = "";
  let depth = 0;
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"') {
      const end = skipString(src, i);
      out += src.slice(i, end);
      i = end;
      continue;
    }
    if (c === "{" || c === "[") {
      const close = c === "{" ? "}" : "]";
      if (src[i + 1] === close) {
        out += c + close;
        i += 2;
        continue;
      }
      depth++;
      out += c + pad(depth);
    } else if (c === "}" || c === "]") {
      depth = Math.max(0, depth - 1);
      out += pad(depth) + c;
    } else if (c === ",") {
      out += "," + pad(depth);
    } else if (c === ":") {
      out += ": ";
    } else {
      out += c;
    }
    i++;
  }
  return out;
}

/** End index of the JSON value starting at `i` (minified or not). */
function skipValue(text: string, i: number): number {
  const c = text[i];
  if (c === '"') return skipString(text, i);
  if (c === "{" || c === "[") {
    let depth = 0;
    let j = i;
    while (j < text.length) {
      const d = text[j];
      if (d === '"') {
        j = skipString(text, j);
        continue;
      }
      if (d === "{" || d === "[") depth++;
      else if (d === "}" || d === "]") {
        depth--;
        if (depth === 0) return j + 1;
      }
      j++;
    }
    return j;
  }
  let j = i;
  while (j < text.length && !WS.has(text[j]) && text[j] !== "," && text[j] !== "}" && text[j] !== "]") j++;
  return j;
}

/**
 * The raw (minified) JSON text of each top-level member of an object, keyed
 * by member name. Assumes `text` is valid JSON for an object. Later duplicate
 * keys win, matching JSON.parse.
 */
export function topLevelRawValues(text: string): Map<string, string> {
  const src = minifyJsonText(text);
  const out = new Map<string, string>();
  if (src[0] !== "{") return out;
  let i = 1;
  while (i < src.length && src[i] !== "}") {
    if (src[i] === ",") {
      i++;
      continue;
    }
    if (src[i] !== '"') break;
    const keyEnd = skipString(src, i);
    let key: string;
    try {
      key = JSON.parse(src.slice(i, keyEnd)) as string;
    } catch {
      break;
    }
    i = keyEnd + 1; // past ':'
    const end = skipValue(src, i);
    out.set(key, src.slice(i, end));
    i = end;
  }
  return out;
}

export interface UnsafeIntegerClaim {
  key: string;
  /** The exact integer as written in the token. */
  raw: string;
  /** What JSON.parse turns it into. */
  parsed: string;
}

/** Top-level claims holding integers JavaScript can't represent exactly. */
export function findUnsafeIntegerClaims(rawValues: Map<string, string>): UnsafeIntegerClaim[] {
  const out: UnsafeIntegerClaim[] = [];
  for (const [key, raw] of rawValues) {
    if (!/\d{16,}/.test(raw)) continue; // fast path: needs ≥16 digits
    const lossy = findLossyJsonNumbers(raw).find((n) => /^-?\d+$/.test(n.raw));
    if (lossy) out.push({ key, raw: lossy.raw, parsed: JSON.stringify(lossy.value) });
  }
  return out;
}

export type JsonTone = "key" | "string" | "number" | "boolean" | "null" | "punct" | "plain";

export interface JsonSeg {
  v: string;
  t: JsonTone;
  /** Column where the segment starts (a stable render key). */
  o: number;
}

export interface JsonLine {
  /** Line number (a stable render key). */
  n: number;
  segs: JsonSeg[];
}

const JSON_TOKEN =
  /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false)|(null)|([{}[\],])|(\s+)/g;

/** Split pretty JSON into lines of coloured segments. */
export function highlightJsonLines(pretty: string): JsonLine[] {
  return pretty.split("\n").map((line, n) => {
    const segs: JsonSeg[] = [];
    const push = (v: string, t: JsonTone, o: number) => segs.push({ v, t, o });
    let last = 0;
    JSON_TOKEN.lastIndex = 0;
    for (let m = JSON_TOKEN.exec(line); m; m = JSON_TOKEN.exec(line)) {
      if (m.index > last) push(line.slice(last, m.index), "plain", last);
      if (m[1]) {
        push(m[1], m[2] ? "key" : "string", m.index);
        if (m[2]) push(m[2], "punct", m.index + m[1].length);
      } else if (m[3]) push(m[3], "number", m.index);
      else if (m[4]) push(m[4], "boolean", m.index);
      else if (m[5]) push(m[5], "null", m.index);
      else if (m[6]) push(m[6], "punct", m.index);
      else push(m[0], "plain", m.index);
      last = JSON_TOKEN.lastIndex;
    }
    if (last < line.length) push(line.slice(last), "plain", last);
    return { n, segs };
  });
}

/** Colour family for a decoded claim value. */
export function valueTone(value: unknown): JsonTone {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "plain";
}
