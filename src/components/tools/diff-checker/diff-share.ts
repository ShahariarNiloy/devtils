/**
 * URL-hash share encoding for the diff-checker.
 *
 *   #d=g.<base64url>      ← gzip-compressed JSON (preferred)
 *   #d=u.<base64url>      ← uncompressed JSON   (fallback for browsers
 *                           without CompressionStream)
 *
 * Why gzip+base64url, not raw query params:
 *   - The two payloads can be many KB each; a JSON-stringified pair
 *     without compression hits URL length limits quickly. Gzip + base64
 *     gets us roughly 3–5× shrinkage on typical code diffs.
 *   - base64url (no `+`, `/`, `=`) survives copy-paste from a URL bar
 *     without re-encoding, which `btoa` standard base64 doesn't.
 *
 * The `g.` / `u.` prefix is a 2-byte format tag so we can evolve the
 * encoding without breaking old shared links.
 */

const HASH_KEY = "d";
const GZIP_TAG = "g.";
const UTF_TAG = "u.";

export interface SharedDiff {
  left: string;
  right: string;
}

// ── base64url helpers ───────────────────────────────────────────────────

function base64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  // Avoid String.fromCharCode(...bytes) — it overflows the call stack on
  // payloads larger than ~64 KB. Manual loop is unconditionally safe.
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded =
    str.replace(/-/g, "+").replace(/_/g, "/") +
    "==".slice(0, (4 - (str.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ── Encode / decode ─────────────────────────────────────────────────────

export async function encodeShare(left: string, right: string): Promise<string> {
  const json = JSON.stringify({ l: left, r: right });
  if (typeof CompressionStream === "undefined") {
    return UTF_TAG + base64urlEncode(new TextEncoder().encode(json));
  }
  const stream = new Blob([json])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  return GZIP_TAG + base64urlEncode(new Uint8Array(buf));
}

export async function decodeShare(token: string): Promise<SharedDiff | null> {
  try {
    let bytes: Uint8Array;
    let needsDecompress = false;

    if (token.startsWith(GZIP_TAG)) {
      bytes = base64urlDecode(token.slice(GZIP_TAG.length));
      needsDecompress = true;
    } else if (token.startsWith(UTF_TAG)) {
      bytes = base64urlDecode(token.slice(UTF_TAG.length));
    } else {
      return null;
    }

    let json: string;
    if (needsDecompress) {
      if (typeof DecompressionStream === "undefined") return null;
      // Slice the underlying buffer to the exact view size so the Blob
      // input type-checks as ArrayBuffer (not ArrayBufferLike) under
      // TS strict.
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const stream = new Blob([ab])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
      json = await new Response(stream).text();
    } else {
      json = new TextDecoder().decode(bytes);
    }

    const data = JSON.parse(json) as unknown;
    if (
      data !== null &&
      typeof data === "object" &&
      typeof (data as { l?: unknown }).l === "string" &&
      typeof (data as { r?: unknown }).r === "string"
    ) {
      return {
        left: (data as { l: string }).l,
        right: (data as { r: string }).r,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Hash glue ───────────────────────────────────────────────────────────

export function readShareFromHash(hash: string): string | null {
  if (!hash) return null;
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(clean);
  return params.get(HASH_KEY);
}

export function shareHashFor(token: string): string {
  return `#${HASH_KEY}=${token}`;
}
