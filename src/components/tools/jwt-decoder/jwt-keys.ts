import { tryBase64UrlToBytes } from "./jwt-decoder.lib";
import type { JwksKey, VerifiableAlgorithm } from "./jwt-decoder.types";

/**
 * Key-material plumbing for verification and signing: algorithm parameters,
 * PEM/DER handling (SPKI, PKCS#1, X.509 certificates, PKCS#8) and JWK/JWKS
 * selection. Pure — WebCrypto lives in jwt-verify / jwt-encode.
 */

export type Family = "HS" | "RS" | "PS" | "ES";

export function familyOf(alg: VerifiableAlgorithm): Family {
  const f = alg.slice(0, 2);
  if (f === "HS" || f === "RS" || f === "PS") return f;
  return "ES";
}

export type HashName = "SHA-256" | "SHA-384" | "SHA-512";
export type Curve = "P-256" | "P-384" | "P-521";

export function hashOf(alg: VerifiableAlgorithm): HashName {
  if (alg.endsWith("384")) return "SHA-384";
  if (alg.endsWith("512")) return "SHA-512";
  return "SHA-256";
}

export function curveOf(alg: VerifiableAlgorithm): Curve {
  if (alg.endsWith("384")) return "P-384";
  if (alg.endsWith("512")) return "P-521";
  return "P-256";
}

/** JOSE ES signatures are raw r‖s: 2 × the curve's coordinate size. */
export function esSignatureLength(alg: VerifiableAlgorithm): number {
  if (alg.endsWith("384")) return 96;
  if (alg.endsWith("512")) return 132;
  return 64;
}

/** RFC 7518 §3.5: the PSS salt is as long as the hash output. */
export function pssSaltLength(alg: VerifiableAlgorithm): number {
  if (alg.endsWith("384")) return 48;
  if (alg.endsWith("512")) return 64;
  return 32;
}

export function importParams(alg: VerifiableAlgorithm): HmacImportParams | RsaHashedImportParams | EcKeyImportParams {
  const hash = hashOf(alg);
  switch (familyOf(alg)) {
    case "HS":
      return { name: "HMAC", hash };
    case "RS":
      return { name: "RSASSA-PKCS1-v1_5", hash };
    case "PS":
      return { name: "RSA-PSS", hash };
    case "ES":
      return { name: "ECDSA", namedCurve: curveOf(alg) };
  }
}

export function signatureParams(alg: VerifiableAlgorithm): AlgorithmIdentifier | RsaPssParams | EcdsaParams {
  switch (familyOf(alg)) {
    case "HS":
      return { name: "HMAC" };
    case "RS":
      return { name: "RSASSA-PKCS1-v1_5" };
    case "PS":
      return { name: "RSA-PSS", saltLength: pssSaltLength(alg) };
    case "ES":
      return { name: "ECDSA", hash: hashOf(alg) };
  }
}

/** Expected JWK `kty` for an asymmetric family. */
export function ktyFor(family: Family): "RSA" | "EC" | "oct" {
  if (family === "HS") return "oct";
  return family === "ES" ? "EC" : "RSA";
}

// ─── PEM / DER ───────────────────────────────────────────────────────────────

export interface PemBlock {
  label: string;
  der: Uint8Array;
}

/** First PEM block in the text, or null. Body must be valid base64. */
export function parsePem(text: string): PemBlock | { label: string; der: null } | null {
  const m = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/.exec(text);
  if (!m) return null;
  // Drop RFC 1421 header lines ("Proc-Type: …") before the base64 body.
  const body = m[2]
    .split(/\r?\n/)
    .filter((l) => !l.includes(":"))
    .join("")
    .replace(/\s+/g, "");
  return { label: m[1], der: tryBase64UrlToBytes(body) };
}

interface Tlv {
  tag: number;
  /** Offset of the tag byte. */
  offset: number;
  /** Offset of the first content byte. */
  start: number;
  /** Offset just past the content. */
  end: number;
}

function readTlv(b: Uint8Array, offset: number): Tlv | null {
  if (offset + 2 > b.length) return null;
  const tag = b[offset];
  let len = b[offset + 1];
  let start = offset + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0 || n > 4 || start + n > b.length) return null;
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + b[start + i];
    start += n;
  }
  const end = start + len;
  if (end > b.length) return null;
  return { tag, offset, start, end };
}

/** SubjectPublicKeyInfo DER from an X.509 certificate's DER, or null. */
export function spkiFromCertificate(der: Uint8Array): Uint8Array | null {
  const cert = readTlv(der, 0);
  if (!cert || cert.tag !== 0x30) return null;
  const tbs = readTlv(der, cert.start);
  if (!tbs || tbs.tag !== 0x30) return null;
  let p = tbs.start;
  let field = readTlv(der, p);
  if (field && field.tag === 0xa0) {
    p = field.end; // explicit [0] version
    field = readTlv(der, p);
  }
  // serial, signature, issuer, validity, subject, then subjectPublicKeyInfo
  for (let i = 0; i < 5; i++) {
    if (!field) return null;
    p = field.end;
    field = readTlv(der, p);
  }
  if (!field || field.tag !== 0x30) return null;
  return der.slice(field.offset, field.end);
}

function derLength(n: number): number[] {
  if (n < 0x80) return [n];
  const bytes: number[] = [];
  for (let v = n; v > 0; v = Math.floor(v / 256)) bytes.unshift(v & 0xff);
  return [0x80 | bytes.length, ...bytes];
}

const RSA_ALG_ID = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];

/** Wrap a PKCS#1 RSAPublicKey ("BEGIN RSA PUBLIC KEY") as SPKI. */
export function pkcs1ToSpki(pkcs1: Uint8Array): Uint8Array {
  const bitString = [0x03, ...derLength(pkcs1.length + 1), 0x00];
  const inner = RSA_ALG_ID.length + bitString.length + pkcs1.length;
  const head = [0x30, ...derLength(inner), ...RSA_ALG_ID, ...bitString];
  const out = new Uint8Array(head.length + pkcs1.length);
  out.set(head, 0);
  out.set(pkcs1, head.length);
  return out;
}

function hasBytes(hay: Uint8Array, needle: readonly number[], limit = 40): boolean {
  const end = Math.min(hay.length - needle.length, limit);
  outer: for (let i = 0; i <= end; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

const OID_RSA = [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01];
const OID_RSA_PSS = [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0a];
const OID_EC = [0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01];
const OID_ED25519 = [0x06, 0x03, 0x2b, 0x65, 0x70];
const OID_CURVES: [Curve, number[]][] = [
  ["P-256", [0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07]],
  ["P-384", [0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x22]],
  ["P-521", [0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x23]],
];

export type SpkiKind =
  | { kind: "RSA" }
  | { kind: "RSA-PSS" }
  | { kind: "EC"; curve: Curve | null }
  | { kind: "Ed25519" }
  | { kind: "unknown" };

/** Which key type an SPKI / PKCS#8 DER holds (from its algorithm OID). */
export function keyKindOf(der: Uint8Array): SpkiKind {
  if (hasBytes(der, OID_RSA)) return { kind: "RSA" };
  if (hasBytes(der, OID_RSA_PSS)) return { kind: "RSA-PSS" };
  if (hasBytes(der, OID_EC)) {
    const curve = OID_CURVES.find(([, oid]) => hasBytes(der, oid, 60));
    return { kind: "EC", curve: curve ? curve[0] : null };
  }
  if (hasBytes(der, OID_ED25519)) return { kind: "Ed25519" };
  return { kind: "unknown" };
}

/** Why a DER key of `kind` can't verify `alg`, or null when it fits. */
export function kindMismatch(kind: SpkiKind, alg: VerifiableAlgorithm): string | null {
  const fam = familyOf(alg);
  if (kind.kind === "unknown") return null;
  if (kind.kind === "Ed25519") return `This is an Ed25519 key, but the token says ${alg}.`;
  if (fam === "ES") {
    if (kind.kind !== "EC") return `This is an RSA key, but ${alg} needs an EC key on ${curveOf(alg)}.`;
    if (kind.curve && kind.curve !== curveOf(alg)) return `This EC key is on ${kind.curve}, but ${alg} needs ${curveOf(alg)}.`;
    return null;
  }
  if (kind.kind === "EC") return `This is an EC key, but ${alg} needs an RSA key.`;
  if (kind.kind === "RSA-PSS" && fam === "RS") return `This key is restricted to RSA-PSS, but the token says ${alg}.`;
  return null;
}

// ─── JWK / JWKS ──────────────────────────────────────────────────────────────

export function isJwkLike(v: unknown): v is JwksKey {
  return typeof v === "object" && v !== null && !Array.isArray(v) && typeof (v as { kty?: unknown }).kty === "string";
}

/** Only the public members of a JWK — safe to import with ["verify"]. */
export function publicJwk(jwk: JwksKey): JsonWebKey {
  if (jwk.kty === "RSA") return { kty: "RSA", n: jwk.n, e: jwk.e };
  if (jwk.kty === "EC") return { kty: "EC", crv: jwk.crv, x: jwk.x, y: jwk.y };
  if (jwk.kty === "OKP") return { kty: "OKP", crv: jwk.crv, x: jwk.x };
  return { kty: jwk.kty };
}

/** Why `jwk` can't verify `alg`, or null when it fits. */
export function jwkMismatch(jwk: JwksKey, alg: VerifiableAlgorithm): string | null {
  const fam = familyOf(alg);
  const want = ktyFor(fam);
  if (jwk.use === "enc") return "This key is marked for encryption (use: enc), not signatures.";
  if (jwk.kty !== want) {
    if (fam === "HS") return `This is an ${jwk.kty} public key, but the token uses ${alg}, which needs the shared secret.`;
    if (jwk.kty === "oct") return `This is a symmetric (oct) key, but ${alg} needs a public key.`;
    return `This is an ${jwk.kty} key, but ${alg} needs an ${want} key.`;
  }
  if (typeof jwk.alg === "string" && jwk.alg !== alg) return `This key is for ${jwk.alg}, but the token says ${alg}.`;
  if (fam === "ES" && jwk.crv !== curveOf(alg)) return `This key is on ${String(jwk.crv)}, but ${alg} needs ${curveOf(alg)}.`;
  return null;
}

export type JwksSelection =
  | { keys: JwksKey[]; note: string | null }
  | { error: string };

/**
 * Pick the JWKS keys to try for a token: the `kid` match when the token
 * names one (never a silent fallback to another key), otherwise every key
 * that fits the algorithm.
 */
export function selectJwksKeys(keys: readonly unknown[], kid: string | undefined, alg: VerifiableAlgorithm): JwksSelection {
  const jwks = keys.filter(isJwkLike);
  if (jwks.length === 0) return { error: "This JWKS has no keys." };
  if (kid !== undefined) {
    const hits = jwks.filter((k) => k.kid === kid);
    if (hits.length === 0) {
      const kids = jwks.map((k) => k.kid).filter((k): k is string => typeof k === "string");
      const has = kids.length ? ` It has ${kids.slice(0, 5).join(", ")}${kids.length > 5 ? "…" : ""}.` : "";
      return { error: `No key in this JWKS has kid “${kid}”.${has}` };
    }
    const fit = hits.filter((k) => jwkMismatch(k, alg) === null);
    if (fit.length === 0) return { error: jwkMismatch(hits[0], alg) ?? "That key doesn't fit this token." };
    return { keys: fit, note: `Using key ${kid} from the JWKS.` };
  }
  const fit = jwks.filter((k) => jwkMismatch(k, alg) === null);
  if (fit.length === 0) return { error: `No key in this JWKS fits ${alg}.` };
  if (fit.length === 1) {
    return { keys: fit, note: `The token has no kid, so the JWKS's only ${alg} key${fit[0].kid ? ` (${fit[0].kid})` : ""} was used.` };
  }
  return { keys: fit, note: `The token has no kid, so all ${fit.length} keys that fit ${alg} were tried.` };
}
