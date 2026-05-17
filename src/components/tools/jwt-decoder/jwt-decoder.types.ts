export type Algorithm =
  | "HS256" | "HS384" | "HS512"
  | "RS256" | "RS384" | "RS512"
  | "ES256" | "ES384" | "ES512"
  | "PS256" | "PS384" | "PS512"
  | "none";

export interface ParsedJwt {
  raw: string;
  segments: { header: string; payload: string; signature: string };
  header: Record<string, unknown> & {
    alg: Algorithm;
    typ?: string;
    kid?: string;
  };
  payload: Record<string, unknown>;
  signatureBytes: Uint8Array;
}

export interface JwtParseError {
  segment: "header" | "payload" | "signature" | "structure";
  message: string;
  position?: number;
}

export type VerificationResult =
  | { status: "valid" }
  | { status: "invalid"; reason: string }
  | { status: "unsupported"; reason: string };

export interface ClaimMeta {
  label: string;
  rfcSection: string;
  description: string;
  isDate?: boolean;
}

export type KnownIssuer =
  | "auth0" | "clerk" | "cognito" | "firebase" | "keycloak"
  | "okta" | "supabase" | "aws" | "entra";

export interface SecurityWarning {
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
}

export type SnippetLanguage =
  | "node-jsonwebtoken" | "node-jose" | "python-pyjwt"
  | "go-jwt" | "rust-jsonwebtoken";

export type Mode = "decode" | "encode" | "diff";

/** Key material for verification — discriminated by the token's algorithm. */
export interface VerificationKey {
  /** HMAC secret for HS algorithms, or a PEM / JWK JSON string otherwise. */
  material: string;
}

export interface SigningKey {
  material: string;
}

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
  return (v as JwtParseError).segment !== undefined;
}
