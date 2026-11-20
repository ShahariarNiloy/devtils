import type { Algorithm, JwtParseError, ParsedJwt } from "./jwt-decoder.types";

const ALGS: ReadonlySet<string> = new Set([
  "HS256", "HS384", "HS512",
  "RS256", "RS384", "RS512",
  "ES256", "ES384", "ES512",
  "PS256", "PS384", "PS512",
  "none",
]);

/** Decode a base64url (or tolerant base64) segment to a UTF-8 string. */
export function decodeBase64Url(s: string): string {
  const bytes = base64UrlToBytes(s);
  return new TextDecoder().decode(bytes);
}

/** Decode a base64url (or standard base64) segment to raw bytes. */
export function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Encode bytes (or a string) to unpadded base64url. */
export function bytesToBase64Url(input: Uint8Array | string): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Strip common wrappers so a pasted "Authorization: Bearer …" header or a
 * redirect URL containing `?token=`/`#id_token=` still decodes.
 */
export function extractToken(raw: string): string {
  let t = raw.trim();
  const bearer = /^bearer\s+/i;
  if (bearer.test(t)) t = t.replace(bearer, "").trim();
  const m = t.match(/(?:[?#&](?:access_token|id_token|token)=)([\w-]+\.[\w-]+\.[\w-]*)/);
  if (m) return m[1];
  return t;
}

export function parseJwt(rawInput: string): ParsedJwt | JwtParseError {
  const raw = extractToken(rawInput);
  if (!raw) {
    return { segment: "structure", message: "Paste a token to decode." };
  }
  const parts = raw.split(".");
  if (parts.length < 2 || parts.length > 3) {
    return {
      segment: "structure",
      message:
        "A JWT has three dot-separated segments: header.payload.signature.",
    };
  }
  const [h, p, s = ""] = parts;

  let headerJson: string;
  try {
    headerJson = decodeBase64Url(h);
  } catch {
    return { segment: "header", message: "Header is not valid base64url." };
  }
  let header: Record<string, unknown>;
  try {
    header = JSON.parse(headerJson) as Record<string, unknown>;
  } catch (e) {
    return {
      segment: "header",
      message: `Header is not valid JSON${jsonPos(e)}.`,
    };
  }

  let payloadJson: string;
  try {
    payloadJson = decodeBase64Url(p);
  } catch {
    return { segment: "payload", message: "Payload is not valid base64url." };
  }
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(payloadJson) as Record<string, unknown>;
  } catch (e) {
    return {
      segment: "payload",
      message: `Payload is not valid JSON${jsonPos(e)}.`,
    };
  }

  let signatureBytes: Uint8Array = new Uint8Array(0);
  if (s) {
    try {
      signatureBytes = base64UrlToBytes(s);
    } catch {
      return {
        segment: "signature",
        message: "Signature is not valid base64url.",
      };
    }
  }

  const alg = normalizeAlg(header.alg);
  return {
    raw,
    segments: { header: h, payload: p, signature: s },
    header: { ...header, alg },
    payload,
    signatureBytes,
  };
}

function normalizeAlg(a: unknown): Algorithm {
  const v = typeof a === "string" ? a : "";
  return (ALGS.has(v) ? v : "none") as Algorithm;
}

function jsonPos(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message.match(/position (\d+)/);
    if (m) return ` (at character ${m[1]})`;
  }
  return "";
}

/** "in 22 hours" / "3 hours ago" — coarse relative time from a unix seconds ts. */
export function formatRelativeTime(unixSeconds: number, now = Date.now()): string {
  const deltaMs = unixSeconds * 1000 - now;
  const past = deltaMs < 0;
  const abs = Math.abs(deltaMs);
  const units: [number, string][] = [
    [31536000000, "year"],
    [2592000000, "month"],
    [86400000, "day"],
    [3600000, "hour"],
    [60000, "minute"],
    [1000, "second"],
  ];
  for (const [ms, name] of units) {
    if (abs >= ms || name === "second") {
      const n = Math.max(1, Math.round(abs / ms));
      const label = `${n} ${name}${n === 1 ? "" : "s"}`;
      return past ? `${label} ago` : `in ${label}`;
    }
  }
  return past ? "just now" : "in a moment";
}

/** Absolute, human date for a unix seconds timestamp. */
export function formatAbsoluteTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── v2 claim notes ──────────────────────────────────────────────────────────

/** "2026-11-26 17:00 UTC" — unambiguous, sortable, timezone-explicit. */
export function formatUtc(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  if (Number.isNaN(d.getTime())) return "invalid date";
  return `${d.toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

/** Short relative time: "in 6 days", "12 min ago", "in 3 h". */
export function formatRelativeShort(unixSeconds: number, nowSeconds: number): string {
  const delta = unixSeconds - nowSeconds;
  const a = Math.abs(delta);
  let unit: string;
  if (a < 3600) unit = `${Math.max(1, Math.round(a / 60))} min`;
  else if (a < 86400) unit = `${Math.round(a / 3600)} h`;
  else {
    const d = Math.round(a / 86400);
    unit = `${d} ${d === 1 ? "day" : "days"}`;
  }
  return delta >= 0 ? `in ${unit}` : `${unit} ago`;
}

export type ExpiryState =
  | { kind: "none" }
  | { kind: "early"; nbf: number }
  | { kind: "valid"; exp: number }
  | { kind: "expired"; exp: number };

/** Lifetime state of a payload at `nowSeconds` (nbf wins over exp). */
export function expiryState(payload: Record<string, unknown>, nowSeconds: number): ExpiryState {
  const exp = typeof payload.exp === "number" ? payload.exp : undefined;
  const nbf = typeof payload.nbf === "number" ? payload.nbf : undefined;
  if (nbf !== undefined && nowSeconds < nbf) return { kind: "early", nbf };
  if (exp === undefined) return { kind: "none" };
  return nowSeconds >= exp ? { kind: "expired", exp } : { kind: "valid", exp };
}

/** Pill label for an expiry state ("Expires in 6 days", "Expired 2 h ago"). */
export function expiryLabel(state: ExpiryState, nowSeconds: number): string {
  switch (state.kind) {
    case "none":
      return "No expiry";
    case "early":
      return `Not active yet · starts ${formatRelativeShort(state.nbf, nowSeconds)}`;
    case "valid":
      return `Expires ${formatRelativeShort(state.exp, nowSeconds)}`;
    case "expired":
      return `Expired ${formatRelativeShort(state.exp, nowSeconds)}`;
  }
}

/**
 * The faint explanatory line under a claim row. Time claims get relative +
 * absolute UTC; registered claims get their name. Unknown claims: "".
 */
export function claimNote(
  key: string,
  value: unknown,
  nowSeconds: number,
  labels: Readonly<Record<string, { label: string }>>,
): string {
  if (typeof value === "number" && (key === "exp" || key === "iat" || key === "nbf")) {
    const rel = formatRelativeShort(value, nowSeconds);
    const abs = formatUtc(value);
    if (key === "exp") return `${value <= nowSeconds ? "Expired" : "Expires"} ${rel} · ${abs}`;
    if (key === "iat") return `Issued ${rel} · ${abs}`;
    return `${value <= nowSeconds ? "Active since" : "Not before"} ${abs}`;
  }
  return labels[key]?.label ?? "";
}

/** Colour family for a claim value, matching the JSON syntax palette. */
export function claimTone(value: unknown): "string" | "number" | "boolean" | "null" | "object" {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "object";
}
