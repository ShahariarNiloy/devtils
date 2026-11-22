import { isPlainObject, tryBase64UrlToBytes } from "./jwt-decoder.lib";
import type { AlgInfo, JwksKey, ParsedJwt, VerifiableAlgorithm, VerificationResult } from "./jwt-decoder.types";
import {
  esSignatureLength,
  familyOf,
  importParams,
  isJwkLike,
  jwkMismatch,
  keyKindOf,
  kindMismatch,
  parsePem,
  pkcs1ToSpki,
  publicJwk,
  selectJwksKeys,
  signatureParams,
  spkiFromCertificate,
} from "./jwt-keys";

/**
 * Signature verification with WebCrypto only (crypto.subtle.verify — no
 * string comparison of signatures). The key must fit the token's alg:
 * an HMAC token is never checked against something that looks like a
 * public key (the classic alg-confusion attack), and an RSA/EC token never
 * against a secret. Every failure resolves to a result; nothing throws.
 */

export interface VerifyOptions {
  /** HS only: the secret field holds Base64URL, not text. */
  secretIsBase64Url?: boolean;
}

type ResolvedKeys =
  | { keys: CryptoKey[]; note: string | null }
  | { error: string };

const enc = new TextEncoder();

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

async function resolveHmacKey(alg: VerifiableAlgorithm, text: string, opts: VerifyOptions): Promise<ResolvedKeys> {
  const t = text.trim();
  if (/-----BEGIN /.test(t)) {
    return {
      error: `${alg} needs the shared secret, not a PEM key. Checking an HMAC token with a public key is the classic algorithm-confusion attack, so it's refused.`,
    };
  }
  let raw: Uint8Array | null = null;
  let note: string | null = null;
  if (t.startsWith("{") && /"kty"\s*:/.test(t)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(t) as unknown;
    } catch {
      return { error: "That JWK JSON doesn't parse." };
    }
    const list: unknown[] = isPlainObject(parsed) && Array.isArray(parsed.keys) ? parsed.keys : [parsed];
    const jwk = list.find((k): k is JwksKey => isJwkLike(k) && k.kty === "oct");
    if (!jwk) {
      const other = list.find(isJwkLike);
      return {
        error: other
          ? (jwkMismatch(other, alg) ?? `${alg} needs the shared secret.`) + " Refused: that's the algorithm-confusion attack."
          : "That JSON isn't a JWK.",
      };
    }
    const mismatch = jwkMismatch(jwk, alg);
    if (mismatch) return { error: mismatch };
    raw = typeof jwk.k === "string" ? tryBase64UrlToBytes(jwk.k) : null;
    if (!raw) return { error: "That oct JWK has no readable k value." };
    note = "Using the k value of the oct JWK.";
  } else if (opts.secretIsBase64Url) {
    raw = tryBase64UrlToBytes(t);
    if (!raw) return { error: "The secret isn't valid Base64URL. Turn off “Secret is Base64URL-encoded” if it's plain text." };
  } else {
    // Plain-text secrets are used byte for byte: whitespace is significant.
    raw = enc.encode(text);
  }
  if (raw.length === 0) return { error: "The secret is empty." };
  const key = await crypto.subtle.importKey("raw", raw as BufferSource, importParams(alg), false, ["verify"]);
  return { keys: [key], note };
}

async function importSpki(alg: VerifiableAlgorithm, der: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("spki", der as BufferSource, importParams(alg), false, ["verify"]);
}

async function resolvePemKey(alg: VerifiableAlgorithm, t: string): Promise<ResolvedKeys> {
  const pem = parsePem(t);
  if (!pem) return { error: "That PEM block is incomplete — it needs matching BEGIN and END lines." };
  if (!pem.der) return { error: "The PEM body isn't valid base64." };
  let spki: Uint8Array | null = null;
  let note: string | null = null;
  switch (pem.label) {
    case "PUBLIC KEY":
      spki = pem.der;
      break;
    case "RSA PUBLIC KEY":
      spki = pkcs1ToSpki(pem.der);
      note = "Read as a PKCS#1 RSA public key.";
      break;
    case "CERTIFICATE":
      spki = spkiFromCertificate(pem.der);
      if (!spki) return { error: "Couldn't find the public key inside that certificate." };
      note = "Using the public key from the certificate.";
      break;
    case "PRIVATE KEY": {
      const mismatch = kindMismatch(keyKindOf(pem.der), alg);
      if (mismatch) return { error: mismatch };
      // Derive the public half; the private key is only held in memory.
      const priv = await crypto.subtle.importKey("pkcs8", pem.der as BufferSource, importParams(alg), true, ["sign"]);
      const jwk = await crypto.subtle.exportKey("jwk", priv);
      if (!isJwkLike(jwk)) return { error: "Couldn't read that private key." };
      const key = await crypto.subtle.importKey("jwk", publicJwk(jwk), importParams(alg), false, ["verify"]);
      return { keys: [key], note: "That's a private key, so its public half was used. Keep private keys off shared machines." };
    }
    case "RSA PRIVATE KEY":
    case "EC PRIVATE KEY":
      return { error: "That's a private key in a legacy format. Paste the public key (BEGIN PUBLIC KEY) instead." };
    default:
      return { error: `A “${pem.label}” PEM isn't a public key. Paste BEGIN PUBLIC KEY, a certificate, a JWK or a JWKS.` };
  }
  const mismatch = kindMismatch(keyKindOf(spki), alg);
  if (mismatch) return { error: mismatch };
  return { keys: [await importSpki(alg, spki)], note };
}

async function resolveJwkKeys(alg: VerifiableAlgorithm, t: string, kid: string | undefined): Promise<ResolvedKeys> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(t) as unknown;
  } catch {
    return { error: "That JSON doesn't parse." };
  }
  let candidates: JwksKey[];
  let note: string | null = null;
  if (isPlainObject(parsed) && Array.isArray(parsed.keys)) {
    const sel = selectJwksKeys(parsed.keys, kid, alg);
    if ("error" in sel) return sel;
    candidates = sel.keys;
    note = sel.note;
  } else if (isJwkLike(parsed)) {
    const mismatch = jwkMismatch(parsed, alg);
    if (mismatch) return { error: mismatch };
    candidates = [parsed];
  } else {
    return { error: "That JSON isn't a JWK or a JWKS ({\"keys\": […]})." };
  }
  const keys: CryptoKey[] = [];
  let lastError: unknown = null;
  for (const jwk of candidates) {
    try {
      keys.push(await crypto.subtle.importKey("jwk", publicJwk(jwk), importParams(alg), false, ["verify"]));
    } catch (e) {
      lastError = e;
    }
  }
  if (keys.length === 0) return { error: errMsg(lastError, "That JWK couldn't be read.") };
  return { keys, note };
}

async function resolveKeys(
  alg: VerifiableAlgorithm,
  text: string,
  kid: string | undefined,
  opts: VerifyOptions,
): Promise<ResolvedKeys> {
  if (familyOf(alg) === "HS") return resolveHmacKey(alg, text, opts);
  const t = text.trim();
  if (/^https?:\/\//i.test(t)) {
    return { error: "That's a URL. Use “Fetch issuer's keys”, or paste the JWKS JSON itself." };
  }
  if (t.startsWith("{")) return resolveJwkKeys(alg, t, kid);
  if (/-----BEGIN /.test(t)) return resolvePemKey(alg, t);
  // Bare base64 SPKI (a PEM without its armour lines).
  if (/^[A-Za-z0-9+/=\s]+$/.test(t) && t.length > 60) {
    const der = tryBase64UrlToBytes(t.replace(/\s+/g, ""));
    if (der && der[0] === 0x30) {
      const mismatch = kindMismatch(keyKindOf(der), alg);
      if (mismatch) return { error: mismatch };
      return { keys: [await importSpki(alg, der)], note: "Read as a base64 SPKI public key." };
    }
  }
  return {
    error: `${alg} needs a public key (PEM, JWK or JWKS), not a secret.`,
  };
}

/** Why a token's alg can't be verified here (none vs. an unknown alg). */
export function unsupportedReason(info: Exclude<AlgInfo, { kind: "supported" }>): string {
  if (info.kind === "none") return "This token has no signature. Anyone can write one like it, so a server must never accept it.";
  if (info.nonStandardNone) {
    return `“${info.name}” isn't the standard “none”, but some libraries have treated it as unsigned. Reject it.`;
  }
  if (info.name === "(missing)") return "The header has no alg, so the signature can't be checked.";
  return `${info.name} can't be verified here. This tool verifies HS, RS, PS and ES with SHA-256, 384 and 512.`;
}

/**
 * Verify `jwt`'s signature with `keyText` (a secret, PEM, JWK or JWKS).
 * Resolves to valid / invalid (subtle.verify's answer) or keyerror.
 */
export async function verifyJwt(jwt: ParsedJwt, keyText: string, opts: VerifyOptions = {}): Promise<VerificationResult> {
  if (jwt.alg.kind !== "supported") return { status: "keyerror", reason: unsupportedReason(jwt.alg) };
  const alg = jwt.alg.name;
  if (jwt.signatureBytes.length === 0) return { status: "invalid", reason: "The token has no signature.", note: null };
  if (familyOf(alg) === "HS" ? keyText.length === 0 : !keyText.trim()) {
    return { status: "keyerror", reason: "Add a key to check the signature." };
  }

  const kid = typeof jwt.header.kid === "string" ? jwt.header.kid : undefined;
  let resolved: ResolvedKeys;
  try {
    resolved = await resolveKeys(alg, keyText, kid, opts);
  } catch (e) {
    return { status: "keyerror", reason: errMsg(e, "Couldn't read this key.") };
  }
  if ("error" in resolved) return { status: "keyerror", reason: resolved.error };

  if (familyOf(alg) === "ES" && jwt.signatureBytes.length !== esSignatureLength(alg)) {
    return {
      status: "invalid",
      reason: `An ${alg} signature is ${esSignatureLength(alg)} bytes (r‖s); this one is ${jwt.signatureBytes.length}. It may be DER-encoded, which JWTs don't use.`,
      note: resolved.note,
    };
  }

  const data = enc.encode(`${jwt.segments.header}.${jwt.segments.payload}`);
  try {
    for (const key of resolved.keys) {
      const ok = await crypto.subtle.verify(signatureParams(alg), key, jwt.signatureBytes as BufferSource, data);
      if (ok) return { status: "valid", note: resolved.note };
    }
  } catch (e) {
    return { status: "keyerror", reason: errMsg(e, "Verification failed.") };
  }
  return { status: "invalid", reason: null, note: resolved.note };
}
