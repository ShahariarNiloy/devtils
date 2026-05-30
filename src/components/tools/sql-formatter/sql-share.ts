/**
 * URL-hash share encoding for the SQL formatter — same gzip+base64url
 * shape diff-checker uses, but encoded as `{ q: <sql>, d: <dialect> }` so
 * a share link round-trips the dialect along with the query.
 *
 *   #s=g.<base64url>   gzip-compressed JSON
 *   #s=u.<base64url>   uncompressed fallback
 */

import type { DialectId } from "./sql-formatter.lib";

const HASH_KEY = "s";
const GZIP_TAG = "g.";
const UTF_TAG = "u.";

export interface SharedSql {
  sql: string;
  dialect: DialectId;
}

function base64urlEncode(bytes: Uint8Array): string {
  let bin = "";
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

export async function encodeShare(
  sql: string,
  dialect: DialectId,
): Promise<string> {
  const json = JSON.stringify({ q: sql, d: dialect });
  if (typeof CompressionStream === "undefined") {
    return UTF_TAG + base64urlEncode(new TextEncoder().encode(json));
  }
  const stream = new Blob([json])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  return GZIP_TAG + base64urlEncode(new Uint8Array(buf));
}

export async function decodeShare(token: string): Promise<SharedSql | null> {
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
      const ab = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
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
      typeof (data as { q?: unknown }).q === "string" &&
      typeof (data as { d?: unknown }).d === "string"
    ) {
      return {
        sql: (data as { q: string }).q,
        dialect: (data as { d: string }).d as DialectId,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function readShareFromHash(hash: string): string | null {
  if (!hash) return null;
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(clean);
  return params.get(HASH_KEY);
}

export function shareHashFor(token: string): string {
  return `#${HASH_KEY}=${token}`;
}
