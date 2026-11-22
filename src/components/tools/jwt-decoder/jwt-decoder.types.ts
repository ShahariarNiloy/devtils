export type Algorithm =
  | "HS256" | "HS384" | "HS512"
  | "RS256" | "RS384" | "RS512"
  | "ES256" | "ES384" | "ES512"
  | "PS256" | "PS384" | "PS512"
  | "none";

/** An algorithm this tool can verify (and sign) with WebCrypto. */
export type VerifiableAlgorithm = Exclude<Algorithm, "none">;

/**
 * What the header's `alg` means for verification. The header itself is kept
 * verbatim — an unfamiliar alg is never rewritten to "none".
 *  - `supported`: one of the HS/RS/ES/PS algorithms verified here.
 *  - `none`: the literal, case-sensitive "none" (RFC 7518 §3.6) — unsigned.
 *  - `unsupported`: anything else (EdDSA, ES256K, "hs256", missing, …).
 *    `nonStandardNone` flags "None"/"NONE": not RFC "none", but some
 *    libraries have historically treated it as unsigned.
 */
export type AlgInfo =
  | { kind: "supported"; name: VerifiableAlgorithm }
  | { kind: "none"; name: "none" }
  | { kind: "unsupported"; name: string; nonStandardNone: boolean };

export interface ParsedJwt {
  raw: string;
  segments: { header: string; payload: string; signature: string };
  /** The decoded header exactly as sent (alg included, untouched). */
  header: Record<string, unknown>;
  /** Interpretation of `header.alg`; `name` is the display string. */
  alg: AlgInfo;
  payload: Record<string, unknown>;
  /** The payload's JSON text as sent — keeps big integers exact. */
  payloadJson: string;
  /** The header's JSON text as sent. */
  headerJson: string;
  signatureBytes: Uint8Array;
}

export interface JwtParseError {
  segment: "header" | "payload" | "signature" | "structure" | "empty";
  message: string;
}

/**
 * Outcome of one signature check.
 *  - `valid` / `invalid`: subtle.verify ran and said yes / no.
 *  - `keyerror`: the key couldn't be used (unreadable, wrong type for the
 *    alg, no JWKS match…). Never reported as a mismatch.
 */
export type VerificationResult =
  | { status: "valid"; note: string | null }
  | { status: "invalid"; reason: string | null; note: string | null }
  | { status: "keyerror"; reason: string };

export type KnownIssuer =
  | "auth0" | "clerk" | "cognito" | "firebase" | "keycloak"
  | "okta" | "supabase" | "aws" | "entra";

export type SnippetLanguage =
  | "node-jsonwebtoken" | "node-jose" | "python-pyjwt"
  | "go-jwt" | "rust-jsonwebtoken";

export type Mode = "decode" | "encode" | "diff";

export interface JwksKey {
  kid?: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  crv?: string;
  k?: string;
  [k: string]: unknown;
}

export function isParseError(
  v: ParsedJwt | JwtParseError,
): v is JwtParseError {
  return "segment" in v;
}
