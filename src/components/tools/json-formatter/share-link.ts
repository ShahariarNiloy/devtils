/**
 * Share-link encoding. Zero-dep alternative to pako: uses the browser's
 * native CompressionStream / DecompressionStream (gzip-equivalent
 * deflate-raw), then base64url so the bytes are URL-safe.
 *
 * The output lives in the URL fragment (`#d=...`), not the query string —
 * fragments aren't transmitted to servers, so the raw JSON content stays
 * out of access logs, analytics, and CDN cache keys. The fragment also
 * dodges the 2 KB practical limit on query strings; modern browsers
 * happily handle multi-MB hashes.
 */

const SCHEME: CompressionFormat = "deflate-raw";
/** URL fragment parameter the formatter looks for on mount. */
export const SHARE_PARAM = "d";

/** Cap the compressed payload so we never produce a wholly unreasonable URL. */
const MAX_COMPRESSED_BYTES = 256 * 1024;

// ── Base64url (no padding) ───────────────────────────────────────────────────
// btoa/atob require a binary-string round-trip. We chunk to avoid blowing the
// stack on large buffers; 32 KB is well under the safe `String.fromCharCode`
// argument count in every engine we ship to.

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[],
    );
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(token: string): Uint8Array {
  const padded = token.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    token.length + ((4 - (token.length % 4)) % 4),
    "=",
  );
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

// ── Encode / decode ──────────────────────────────────────────────────────────

function toBlobPart(u8: Uint8Array): Blob {
  // Copy into a fresh ArrayBuffer so TS's strict BlobPart typing is happy
  // (Uint8Array<ArrayBufferLike> can't widen to ArrayBufferView<ArrayBuffer>).
  const buf = new ArrayBuffer(u8.byteLength);
  new Uint8Array(buf).set(u8);
  return new Blob([buf]);
}

export async function encodeShareToken(content: string): Promise<string | null> {
  if (typeof CompressionStream === "undefined") return null;
  const input = new TextEncoder().encode(content);
  const compressed = await new Response(
    toBlobPart(input).stream().pipeThrough(new CompressionStream(SCHEME)),
  ).arrayBuffer();
  if (compressed.byteLength > MAX_COMPRESSED_BYTES) return null;
  return bytesToBase64Url(new Uint8Array(compressed));
}

export async function decodeShareToken(token: string): Promise<string | null> {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const bytes = base64UrlToBytes(token);
    const decompressed = await new Response(
      toBlobPart(bytes).stream().pipeThrough(new DecompressionStream(SCHEME)),
    ).arrayBuffer();
    return new TextDecoder().decode(decompressed);
  } catch {
    return null;
  }
}

// ── URL helpers ──────────────────────────────────────────────────────────────

/**
 * Build a full sharable URL for the given token. The token lives in the
 * fragment so it never reaches the server.
 */
export function buildShareUrl(token: string): string {
  if (typeof window === "undefined") return `#${SHARE_PARAM}=${token}`;
  const u = new URL(window.location.href);
  u.hash = `${SHARE_PARAM}=${token}`;
  return u.toString();
}

/** Read the current URL fragment and pull out a share token if one is present. */
export function readShareToken(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  return params.get(SHARE_PARAM);
}

/** Remove the share token from the URL without reloading the page. */
export function clearShareTokenFromUrl(): void {
  if (typeof window === "undefined") return;
  const u = new URL(window.location.href);
  u.hash = "";
  window.history.replaceState(null, "", u.toString());
}
