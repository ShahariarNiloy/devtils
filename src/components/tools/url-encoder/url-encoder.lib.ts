/**
 * Pure percent-encoding helpers — no React, no DOM.
 *
 * "Component" mode encodes everything that isn't unreserved, for a single
 * value (a query param, a path segment). "Full URL" mode keeps the
 * reserved delimiters (: / ? # & = …) so the address still works.
 */

export type UrlDirection = "encode" | "decode";

export interface UrlEncodeOptions {
  /** Keep : / ? # & = etc. (encodeURI) instead of encoding them (encodeURIComponent). */
  fullUrl: boolean;
  /** Form encoding: spaces become `+` instead of `%20`. */
  spaceAsPlus: boolean;
  /** RFC 3986 strict: also encode ! ' ( ) * (which encodeURIComponent leaves alone). */
  strict: boolean;
}

export interface UrlDecodeOptions {
  /** Keep escapes of reserved delimiters (%2F, %26, %3D …) so the URL's structure can't change. */
  fullUrl: boolean;
  /** Treat `+` as a space, as HTML form encoding does. */
  plusAsSpace: boolean;
}

export type UrlResult =
  | { ok: true; output: string; escapes: number }
  | { ok: false; error: string; position?: number };

export const URL_SAMPLE = "search?q=JSON formatter & regex&lang=en-GB";

const STRICT_RE = /[!'()*]/g;

function strictEscape(ch: string): string {
  return "%" + ch.charCodeAt(0).toString(16).toUpperCase();
}

/** Index of the first lone UTF-16 surrogate, or -1. */
function loneSurrogateAt(s: string): number {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const n = s.charCodeAt(i + 1);
      if (n >= 0xdc00 && n <= 0xdfff) {
        i++;
        continue;
      }
      return i;
    }
    if (c >= 0xdc00 && c <= 0xdfff) return i;
  }
  return -1;
}

export function encodeUrl(input: string, opts: UrlEncodeOptions): UrlResult {
  const bad = loneSurrogateAt(input);
  if (bad >= 0) {
    return { ok: false, error: `Can't encode — there's a broken Unicode character at position ${bad}.`, position: bad };
  }
  let out = opts.fullUrl ? encodeURI(input) : encodeURIComponent(input);
  if (opts.strict) out = out.replace(STRICT_RE, strictEscape);
  if (opts.spaceAsPlus) out = out.replace(/%20/g, "+");
  return { ok: true, output: out, escapes: countEscapes(out) };
}

/** Position of the first `%` not followed by two hex digits, or -1. */
export function findBadPercent(input: string): number {
  for (let i = 0; i < input.length; i++) {
    if (input[i] !== "%") continue;
    if (!/^[0-9a-fA-F]{2}$/.test(input.slice(i + 1, i + 3))) return i;
  }
  return -1;
}

export function decodeUrl(input: string, opts: UrlDecodeOptions): UrlResult {
  const bad = findBadPercent(input);
  if (bad >= 0) {
    return {
      ok: false,
      error: `Can't decode — the % at position ${bad} isn't followed by two hex digits.`,
      position: bad,
    };
  }
  const src = opts.plusAsSpace ? input.replace(/\+/g, " ") : input;
  try {
    const output = opts.fullUrl ? decodeURI(src) : decodeURIComponent(src);
    return { ok: true, output, escapes: countEscapes(input) };
  } catch {
    return { ok: false, error: "Can't decode — the %-escapes don't form valid UTF-8 (a byte sequence is cut short or malformed)." };
  }
}

export function countEscapes(s: string): number {
  const m = s.match(/%[0-9a-fA-F]{2}/g);
  return m ? m.length : 0;
}

/** Heuristic: does this look already percent-encoded? Used to suggest Decode. */
export function looksEncoded(s: string): boolean {
  return /%[0-9a-fA-F]{2}/.test(s) && findBadPercent(s) < 0 && !/\s/.test(s.trim());
}
