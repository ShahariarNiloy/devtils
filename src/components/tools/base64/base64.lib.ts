/**
 * Pure base64 logic — no React, no DOM beyond TextEncoder/TextDecoder.
 * UTF-8 safe: never uses btoa/atob on raw text (those are Latin-1 only and
 * silently corrupt non-ASCII).
 */

import type {
  Base64Variant,
  Charset,
  DecodeOptions,
  DecodeResult,
  Direction,
  EncodeOptions,
  EncodeResult,
  HexRow,
  PresetItem,
  ValidationError,
  ValidationResult,
} from "./base64.types";

// ── Alphabets ────────────────────────────────────────────────────────────────

const STD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// URL-safe input is normalised to standard (-/_ → +/) before decode, so we
// only need a single lookup table.
const STD_LOOKUP = buildLookup(STD_ALPHABET);

const MIME_LINE_LEN = 76;
const PEM_LINE_LEN  = 64;

function buildLookup(alphabet: string): Int8Array {
  const t = new Int8Array(256).fill(-1);
  for (let i = 0; i < alphabet.length; i++) t[alphabet.charCodeAt(i)] = i;
  return t;
}

// ── Charset helpers ──────────────────────────────────────────────────────────

function textToBytes(text: string, charset: Charset): Uint8Array {
  if (charset === "utf-8") return new TextEncoder().encode(text);
  // Latin-1 / ASCII: take the low byte of each code point.
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (charset === "ascii" && c > 0x7f) c = 0x3f; // ?
    bytes[i] = c & 0xff;
  }
  return bytes;
}

function bytesToText(bytes: Uint8Array, charset: Charset): string {
  if (charset === "utf-8") return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]!);
  return out;
}

// ── Core byte → b64 (no btoa/atob) ───────────────────────────────────────────

function bytesToBase64(bytes: Uint8Array, alphabet: string): string {
  const len = bytes.length;
  const remainder = len % 3;
  const fullLen = len - remainder;
  let out = "";

  for (let i = 0; i < fullLen; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1]!;
    const c = bytes[i + 2]!;
    const triplet = (a << 16) | (b << 8) | c;
    out +=
      alphabet[(triplet >> 18) & 0x3f]! +
      alphabet[(triplet >> 12) & 0x3f]! +
      alphabet[(triplet >> 6)  & 0x3f]! +
      alphabet[triplet & 0x3f]!;
  }

  if (remainder === 1) {
    const a = bytes[fullLen]!;
    out += alphabet[(a >> 2) & 0x3f]! + alphabet[(a << 4) & 0x3f]! + "==";
  } else if (remainder === 2) {
    const a = bytes[fullLen]!;
    const b = bytes[fullLen + 1]!;
    out += alphabet[(a >> 2) & 0x3f]! + alphabet[((a << 4) | (b >> 4)) & 0x3f]! + alphabet[(b << 2) & 0x3f]! + "=";
  }

  return out;
}

function base64ToBytes(input: string, lookup: Int8Array): Uint8Array {
  // Caller has already stripped whitespace + ensured padding/length is sane.
  const len = input.length;
  if (len === 0) return new Uint8Array();

  let pad = 0;
  if (input.charCodeAt(len - 1) === 0x3d) pad++;
  if (len > 1 && input.charCodeAt(len - 2) === 0x3d) pad++;

  const outLen = ((len * 3) >> 2) - pad;
  const bytes = new Uint8Array(outLen);
  let bi = 0;

  for (let i = 0; i < len; i += 4) {
    const c0 = lookup[input.charCodeAt(i)] ?? -1;
    const c1 = lookup[input.charCodeAt(i + 1)] ?? -1;
    const c2 = lookup[input.charCodeAt(i + 2)] ?? -1;
    const c3 = lookup[input.charCodeAt(i + 3)] ?? -1;
    if (c0 < 0 || c1 < 0) throw new Error("Decode failed");
    const triplet =
      (c0 << 18) |
      (c1 << 12) |
      ((c2 < 0 ? 0 : c2) << 6) |
      (c3 < 0 ? 0 : c3);
    if (bi < outLen) bytes[bi++] = (triplet >> 16) & 0xff;
    if (bi < outLen) bytes[bi++] = (triplet >> 8) & 0xff;
    if (bi < outLen) bytes[bi++] = triplet & 0xff;
  }

  return bytes;
}

// ── Variant wrappers ─────────────────────────────────────────────────────────

function applyVariant(stdB64: string, variant: Base64Variant): string {
  switch (variant) {
    case "standard": return stdB64;
    case "url-safe": return stdB64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    case "mime":     return chunkLines(stdB64, MIME_LINE_LEN, "\r\n");
    case "pem":      return chunkLines(stdB64, PEM_LINE_LEN,  "\n");
  }
}

function chunkLines(s: string, lineLen: number, sep: string): string {
  if (s.length <= lineLen) return s;
  const parts: string[] = [];
  for (let i = 0; i < s.length; i += lineLen) parts.push(s.slice(i, i + lineLen));
  return parts.join(sep);
}

// ── Public API ───────────────────────────────────────────────────────────────

export function encode(input: string, options: EncodeOptions): EncodeResult {
  const bytes = textToBytes(input, options.charset);
  const stdB64 = bytesToBase64(bytes, STD_ALPHABET);
  const output = applyVariant(stdB64, options.variant);
  const inputBytes = bytes.length;
  const outputChars = output.length;
  const sizeDelta = inputBytes === 0 ? 0 : Math.round(((outputChars - inputBytes) / inputBytes) * 100);
  const roundTripOk = roundTripCheck(input, output, options);
  return { output, inputBytes, outputChars, sizeDelta, roundTripOk };
}

export function decode(input: string, options: DecodeOptions): DecodeResult {
  // Transparently handle data URIs — strip the prefix and decode just the payload
  const dataUri = fromDataUri(input.trim());
  const effectiveInput = dataUri ? dataUri.encoded : input;

  const bytes = decodeToBytes(effectiveInput, options.variant);
  const output = bytesToText(bytes, options.charset);
  const inputChars = effectiveInput.length;
  const outBytes = bytes.length;
  const sizeDelta = inputChars === 0 ? 0 : Math.round(((outBytes - inputChars) / inputChars) * 100);
  // Prefer mime type declared in the data URI header; fall back to magic-byte detection
  const sig = (dataUri?.mime.startsWith("image/") ? dataUri.mime : undefined) ?? detectImageMime(bytes);
  return {
    output,
    outputBytes: bytes,
    inputChars,
    outputBytes_: outBytes,
    sizeDelta,
    isImage: !!sig,
    imageMime: sig,
    roundTripOk: roundTripCheck(output, effectiveInput, { variant: options.variant, charset: options.charset }),
  };
}

export function decodeToBytes(input: string, variant: Base64Variant): Uint8Array {
  if (!input) return new Uint8Array();
  const body = variant === "pem" ? maskPemArmor(input) : input;
  const padError = paddingError(body);
  if (padError) throw new Error(padError.message);
  let cleaned = stripWhitespace(body);
  if (variant === "url-safe") {
    cleaned = cleaned.replace(/-/g, "+").replace(/_/g, "/");
  }
  // Padding is now known to be trailing-only; re-derive it from the data
  // length so "QQ", "QQ=" and "QQ==" all decode the same way.
  const data = cleaned.replace(/=+$/, "");
  if (data.length % 4 === 1) {
    throw new Error("Truncated Base64: the last group has a single character, which can't encode a byte");
  }
  return base64ToBytes(autoPadding(data), STD_LOOKUP);
}

// ── PEM armor ────────────────────────────────────────────────────────────────

const PEM_BOUNDARY_LINE_RE = /^[ \t]*-----(?:BEGIN|END) [^\r\n-]*-----[ \t]*$/;
const PEM_HEADER_LINE_RE = /^[A-Za-z0-9][A-Za-z0-9-]*:/; // RFC 1421: Proc-Type:, DEK-Info:, …
const PEM_ARMOR_RE = /-----BEGIN [^\r\n-]*-----/;

/** True when the text carries PEM armor (`-----BEGIN …-----`). */
export function looksLikePemArmor(input: string): boolean {
  return PEM_ARMOR_RE.test(input);
}

/**
 * Blank out PEM armor so only the Base64 body is left: `-----BEGIN/END …-----`
 * boundary lines, RFC 1421 header lines (`Proc-Type: 4,ENCRYPTED`) and their
 * indented continuation lines. Characters are replaced with spaces (newlines
 * kept), so positions in the result still index the original input.
 */
export function maskPemArmor(input: string): string {
  // Odd indices hold the captured line breaks; even indices are lines.
  const lines = input.split(/(\r?\n)/);
  let afterHeader = false;
  for (let i = 0; i < lines.length; i += 2) {
    const line = lines[i] ?? "";
    // Base64 bodies never contain ":", so a `Name:` line is always a header.
    const isHeader = PEM_HEADER_LINE_RE.test(line);
    const isContinuation: boolean = afterHeader && /^[ \t]+\S/.test(line);
    if (PEM_BOUNDARY_LINE_RE.test(line) || isHeader || isContinuation) {
      lines[i] = " ".repeat(line.length);
    }
    afterHeader = isHeader || isContinuation;
  }
  return lines.join("");
}

/**
 * `=` is only legal as 1–2 trailing padding characters. Anything after a
 * padding `=` (e.g. `QQ==QQ==`, two concatenated chunks) would otherwise be
 * decoded into stray NUL bytes, so it's reported with its position.
 */
function paddingError(input: string): ValidationError | null {
  const first = input.indexOf("=");
  if (first < 0) return null;
  let count = 0;
  for (let i = first; i < input.length; i++) {
    const ch = input[i]!;
    if (ch === "=") {
      count++;
      continue;
    }
    if (/\s/.test(ch)) continue;
    return {
      message: `Padding "=" at position ${first} is followed by more data at position ${i}. "=" is only allowed at the very end — this looks like several Base64 chunks joined together`,
      position: first,
      char: "=",
      hint: "Decode each chunk separately, or remove the padding between them.",
    };
  }
  if (count > 2) {
    return {
      message: `Too much padding: ${count} "=" at position ${first}. Base64 ends with at most two`,
      position: first,
      char: "=",
      hint: "Remove the extra = characters.",
    };
  }
  return null;
}

export function encodeFile(bytes: Uint8Array, _mime: string, variant: Base64Variant): string {
  void _mime;
  return applyVariant(bytesToBase64(bytes, STD_ALPHABET), variant);
}

export function stripWhitespace(input: string): string {
  return input.replace(/\s+/g, "");
}

export function autoPadding(input: string): string {
  const remainder = input.length % 4;
  if (remainder === 0) return input;
  return input + "=".repeat(4 - remainder);
}

// ── Detection ────────────────────────────────────────────────────────────────

const STD_RE = /^[A-Za-z0-9+/\s]*={0,2}$/;
const URL_RE = /^[A-Za-z0-9\-_\s]*={0,2}$/;

const STD_BODY_RE = /^[A-Za-z0-9+/]+=*$/;
const URL_BODY_RE = /^[A-Za-z0-9\-_]+=*$/;

const MIN_AUTODETECT_LEN = 16;

/**
 * Strict-ish heuristic for "this is *probably* Base64". Conservative on
 * purpose so plain English doesn't get flipped into decode mode.
 *
 * A string passes only if ALL of:
 *   1. It's at least 16 characters (after trimming).
 *   2. It has no spaces inside (line breaks allowed only for MIME/PEM).
 *   3. Its length (after stripping whitespace) is divisible by 4.
 *   4. It matches the variant's alphabet exactly.
 *   5. It shows at least one strong base64 signal:
 *      - trailing `=` padding, OR
 *      - variant-specific punctuation (`+`/`/` for std, `-`/`_` for url-safe), OR
 *      - all three character classes present (uppercase + lowercase + digit).
 *
 * Rule 5 is what stops things like "Utilyxistheword" (15 chars, mixed case,
 * no digits, no padding) from being misread as base64.
 */
export function detectIsBase64(input: string, variant: Base64Variant): boolean {
  const trimmed = input.trim();
  if (trimmed.length < MIN_AUTODETECT_LEN) return false;

  // Real base64 has no spaces inside the body. MIME / PEM allow line breaks.
  if (/[ \t]/.test(trimmed)) return false;
  if (/\r?\n/.test(trimmed) && variant !== "mime" && variant !== "pem") return false;

  const cleaned = stripWhitespace(trimmed);
  if (cleaned.length === 0 || cleaned.length % 4 !== 0) return false;

  const bodyRe = variant === "url-safe" ? URL_BODY_RE : STD_BODY_RE;
  if (!bodyRe.test(cleaned)) return false;

  const hasPadding = /=$/.test(cleaned);
  const hasVariantSpecial = variant === "url-safe"
    ? /[-_]/.test(cleaned)
    : /[+/]/.test(cleaned);
  const hasAllClasses =
    /[A-Z]/.test(cleaned) && /[a-z]/.test(cleaned) && /[0-9]/.test(cleaned);

  return hasPadding || hasVariantSpecial || hasAllClasses;
}

/** Lax matcher kept around for places that just want "could possibly parse". */
export function looksLikeBase64Lax(input: string, variant: Base64Variant): boolean {
  const cleaned = stripWhitespace(input);
  if (cleaned.length < 4) return false;
  if (variant === "url-safe") return URL_RE.test(input);
  return STD_RE.test(input);
}

export function detectVariant(input: string): Base64Variant | null {
  const cleaned = stripWhitespace(input);
  if (cleaned.length < 4) return null;
  // Armor first: its dashes would otherwise read as URL-safe characters.
  if (looksLikePemArmor(input)) return "pem";
  if (/[-_]/.test(cleaned)) return "url-safe";
  if (/\r?\n/.test(input) && cleaned.length > MIME_LINE_LEN) {
    // PEM line len is 64; MIME is 76. Choose by line length.
    const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
    if (firstLine.length === PEM_LINE_LEN) return "pem";
    return "mime";
  }
  if (STD_RE.test(input)) return "standard";
  return null;
}

// ── Validation ───────────────────────────────────────────────────────────────

export function validateBase64(rawInput: string, variant: Base64Variant): ValidationResult {
  if (rawInput.length === 0) return { valid: true };
  const hasArmor = looksLikePemArmor(rawInput);
  // Outside PEM mode, armor is never valid Base64 — even in URL-safe mode,
  // where "-" and the header letters would otherwise slip through.
  if (hasArmor && variant !== "pem") {
    const position = rawInput.search(PEM_ARMOR_RE);
    return {
      valid: false,
      error: {
        message: `PEM armor ("-----BEGIN …-----") at position ${position} isn't Base64`,
        position,
        char: "-",
        hint: "This looks like a PEM block. Switch to the PEM variant to strip the BEGIN/END lines.",
      },
    };
  }
  // PEM mode: armor lines are blanked (positions preserved) before checking.
  const input = variant === "pem" ? maskPemArmor(rawInput) : rawInput;
  const allowed = variant === "url-safe"
    ? /[A-Za-z0-9\-_=\s]/
    : /[A-Za-z0-9+/=\s]/;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (!allowed.test(ch)) {
      const isUrlSafeChar = /[-_]/.test(ch);
      const hint = isUrlSafeChar && variant !== "url-safe"
        ? "URL-safe characters detected (- or _). Switch to URL-safe variant?"
        : 'Use Strip whitespace, or check the variant matches.';
      return {
        valid: false,
        error: {
          message: `Invalid character "${ch}" at position ${i}. Base64 uses A-Z, a-z, 0-9, +, / only`,
          position: i,
          char: ch,
          hint,
        },
      };
    }
  }

  // Line-break detection vs variant
  if (/\r?\n/.test(input) && variant !== "mime" && variant !== "pem") {
    return {
      valid: false,
      error: {
        message: "MIME line breaks detected. Enable MIME mode or use Strip whitespace first",
        hint: "Switch variant to MIME, or click Strip whitespace.",
      },
    };
  }

  const padError = paddingError(input);
  if (padError) return { valid: false, error: padError };

  return { valid: true };
}

// ── Data URI ─────────────────────────────────────────────────────────────────

export function toDataUri(encoded: string, mime: string): string {
  return `data:${mime || "text/plain"};base64,${encoded.replace(/\s+/g, "")}`;
}

const DATA_URI_RE = /^data:([^;,]*(?:;[^,;]+)*),([\s\S]*)$/i;

export function fromDataUri(dataUri: string): { encoded: string; mime: string } | null {
  const m = dataUri.trim().match(DATA_URI_RE);
  if (!m) return null;
  const meta = m[1] ?? "";
  const data = m[2] ?? "";
  if (!/;base64/i.test(meta)) return null;
  return { encoded: data, mime: meta.split(";")[0]?.trim() || "text/plain" };
}

// ── Image detection (subset of full detector — only what preview uses) ──────

function detectImageMime(bytes: Uint8Array): string | undefined {
  if (bytes.length < 4) return undefined;
  const b = bytes;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return "image/webp";
  return undefined;
}

// ── Hex dump ─────────────────────────────────────────────────────────────────

const HEX_BYTES_PER_ROW = 8;

export function hexDump(bytes: Uint8Array): HexRow[] {
  const rows: HexRow[] = [];
  for (let off = 0; off < bytes.length; off += HEX_BYTES_PER_ROW) {
    const slice = bytes.slice(off, off + HEX_BYTES_PER_ROW);
    let hex = "";
    let ascii = "";
    for (let j = 0; j < slice.length; j++) {
      const b = slice[j]!;
      hex += b.toString(16).padStart(2, "0");
      if (j < slice.length - 1) hex += " ";
      ascii += b >= 32 && b < 127 ? String.fromCharCode(b) : ".";
    }
    rows.push({
      offset: off.toString(16).padStart(8, "0"),
      hex,
      ascii,
    });
  }
  return rows;
}

// ── Share URL ────────────────────────────────────────────────────────────────

export function generateShareUrl(input: string, mode: Direction, variant: Base64Variant, baseUrl: string): string {
  const params = new URLSearchParams({ in: input, mode, v: variant });
  return `${baseUrl}?${params}`;
}

// ── Round-trip ───────────────────────────────────────────────────────────────

export function roundTripCheck(original: string, encoded: string, options: EncodeOptions): boolean {
  if (!original) return true;
  try {
    const bytes = decodeToBytes(encoded, options.variant);
    const back = bytesToText(bytes, options.charset);
    return back === original;
  } catch {
    return false;
  }
}

// ── Presets ──────────────────────────────────────────────────────────────────

export const PRESETS: PresetItem[] = [
  {
    id: "jwt",
    label: "JWT payload",
    icon: "lock",
    direction: "decode",
    variant: "url-safe",
    input:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    description: "Decodes the payload segment of a JWT token",
  },
  {
    id: "basic-auth",
    label: "Basic Auth header",
    icon: "key",
    direction: "decode",
    variant: "standard",
    input: "dXNlcm5hbWU6cGFzc3dvcmQ=",
    description: "Decodes a Basic Authorization header value",
  },
  {
    id: "data-uri",
    label: "Data URI image",
    icon: "image",
    direction: "encode",
    variant: "standard",
    input: "Hello, this simulates image bytes for a data URI",
    description: "Encodes content for use in a data: URI",
  },
  {
    id: "pem",
    label: "PEM certificate",
    icon: "shield",
    direction: "decode",
    variant: "pem",
    input:
      "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2a2rwplBQLzHPZe5TNJF\nHWKXqzr3BmUmBfGAJqPPJMTqXFLBZ8r1R1WUUI4s1lRA1BSaRBxGSGTfK4RFK/o=",
    description: "Decodes a PEM-formatted certificate body",
  },
];

// JWT helper used by the orchestrator when the user picks the JWT preset.
export function extractJwtPayload(jwt: string): string | null {
  const parts = jwt.split(".");
  return parts.length === 3 ? (parts[1] ?? null) : null;
}

// ── Sanity export for charset selector default formatting ───────────────────

export const CHARSETS: { value: Charset; label: string }[] = [
  { value: "utf-8",   label: "UTF-8"   },
  { value: "latin-1", label: "Latin-1" },
  { value: "ascii",   label: "ASCII"   },
];
