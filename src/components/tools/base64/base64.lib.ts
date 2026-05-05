/**
 * Base64 helpers built on the browser's TextEncoder/Decoder + atob/btoa,
 * extended with optional URL-safe alphabet handling.
 */

const toUrlSafe = (b64: string) =>
  b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const fromUrlSafe = (s: string) => {
  const replaced = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = replaced.length % 4 === 0 ? 0 : 4 - (replaced.length % 4);
  return replaced + "=".repeat(pad);
};

export interface EncodeOptions {
  urlSafe?: boolean;
}

export function encodeText(text: string, opts: EncodeOptions = {}): string {
  if (!text) return "";
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  const b64 = btoa(bin);
  return opts.urlSafe ? toUrlSafe(b64) : b64;
}

export interface DecodeResult {
  ok: true;
  text: string;
}
export interface DecodeError {
  ok: false;
  message: string;
}

export function decodeText(input: string, opts: EncodeOptions = {}): DecodeResult | DecodeError {
  if (!input.trim()) return { ok: true, text: "" };
  try {
    const normalized = opts.urlSafe ? fromUrlSafe(input.trim()) : input.trim();
    const bin = atob(normalized);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return { ok: true, text: new TextDecoder("utf-8", { fatal: false }).decode(bytes) };
  } catch {
    return { ok: false, message: "Input is not valid Base64." };
  }
}

/**
 * Read a File and return its Base64 encoding. Promise-based wrapper around
 * FileReader.readAsDataURL — we strip the `data:...,` prefix.
 */
export function encodeFile(file: File, opts: EncodeOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected result from FileReader"));
        return;
      }
      const comma = result.indexOf(",");
      const b64 = comma === -1 ? result : result.slice(comma + 1);
      resolve(opts.urlSafe ? toUrlSafe(b64) : b64);
    };
    reader.readAsDataURL(file);
  });
}

const BASE64_RE = /^[A-Za-z0-9+/]+=*$/;
const URL_SAFE_RE = /^[A-Za-z0-9\-_]+=*$/;

/**
 * Heuristic: looks like base64 when it contains only base64 chars and is
 * non-trivial (>=8 characters). Used by auto-detect mode.
 */
export function looksLikeBase64(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 8) return false;
  if (BASE64_RE.test(trimmed)) return true;
  if (URL_SAFE_RE.test(trimmed)) return true;
  return false;
}
