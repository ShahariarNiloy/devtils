import {
  bytesToBase64Url,
  classifyAlg,
  isPlainObject,
  minifyJsonText,
  prettyJsonText,
  topLevelRawValues,
  tryBase64UrlToBytes,
} from "./jwt-decoder.lib";
import type { VerifiableAlgorithm } from "./jwt-decoder.types";
import { curveOf, familyOf, hashOf, importParams, isJwkLike, keyKindOf, kindMismatch, parsePem, publicJwk, signatureParams } from "./jwt-keys";

/**
 * Signing in the browser with WebCrypto. Header and payload are signed as
 * the text you wrote (whitespace removed), never re-serialised, so big
 * integers survive. Pure apart from crypto.subtle.
 */

export type SignResult =
  | { ok: true; token: string; /** Key that verifies it, for the decoder. */ checkKey: string }
  | { ok: false; error: string };

export interface SignInput {
  headerText: string;
  payloadText: string;
  keyText: string;
  secretIsBase64Url?: boolean;
}

function jsonError(what: "Header" | "Payload", text: string): string | null {
  let v: unknown;
  try {
    v = JSON.parse(text) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message.replace(/ in JSON at position.*$/, "") : "invalid";
    return `${what} isn't valid JSON: ${msg}`;
  }
  return isPlainObject(v) ? null : `${what} must be a JSON object.`;
}

/** The header's alg, when the header parses. */
export function headerAlg(headerText: string): string | null {
  try {
    const h = JSON.parse(headerText) as unknown;
    return isPlainObject(h) && typeof h.alg === "string" ? h.alg : null;
  } catch {
    return null;
  }
}

async function importSigningKey(alg: VerifiableAlgorithm, keyText: string, b64: boolean): Promise<{ key: CryptoKey; checkKey: string } | { error: string }> {
  if (familyOf(alg) === "HS") {
    if (!keyText) return { error: "Add a secret to sign the token." };
    const raw = b64 ? tryBase64UrlToBytes(keyText.trim()) : new TextEncoder().encode(keyText);
    if (!raw || raw.length === 0) return { error: "The secret isn't valid Base64URL." };
    const key = await crypto.subtle.importKey("raw", raw as BufferSource, importParams(alg), false, ["sign"]);
    return { key, checkKey: keyText };
  }
  const t = keyText.trim();
  if (!t) return { error: `Add a private key (PKCS#8 PEM or JWK) to sign with ${alg}.` };
  let key: CryptoKey;
  if (t.startsWith("{")) {
    let jwk: unknown;
    try {
      jwk = JSON.parse(t) as unknown;
    } catch {
      return { error: "That JWK JSON doesn't parse." };
    }
    if (!isJwkLike(jwk) || typeof jwk.d !== "string") return { error: "Signing needs a private JWK (one with a d value)." };
    const priv: JsonWebKey = { ...publicJwk(jwk), d: jwk.d };
    for (const f of ["p", "q", "dp", "dq", "qi"] as const) {
      const v = jwk[f];
      if (typeof v === "string") priv[f] = v;
    }
    key = await crypto.subtle.importKey("jwk", priv, importParams(alg), true, ["sign"]);
  } else {
    const pem = parsePem(t);
    if (!pem || !pem.der) return { error: "Paste a PKCS#8 private key (BEGIN PRIVATE KEY) or a private JWK." };
    if (pem.label !== "PRIVATE KEY") {
      return { error: `A “${pem.label}” PEM can't sign. Convert it to PKCS#8 (BEGIN PRIVATE KEY).` };
    }
    const mismatch = kindMismatch(keyKindOf(pem.der), alg);
    if (mismatch) return { error: mismatch };
    key = await crypto.subtle.importKey("pkcs8", pem.der as BufferSource, importParams(alg), true, ["sign"]);
  }
  const exported = await crypto.subtle.exportKey("jwk", key);
  const pub = isJwkLike(exported) ? publicJwk(exported) : null;
  return { key, checkKey: pub ? JSON.stringify(pub, null, 2) : "" };
}

/**
 * Problems you can see without any crypto (bad JSON, unknown alg, missing
 * key), so the UI can show them on the same frame as the edit.
 */
export function signInputError(input: SignInput): string | null {
  const err = jsonError("Header", input.headerText) ?? jsonError("Payload", input.payloadText);
  if (err) return err;
  const info = classifyAlg(headerAlg(input.headerText) ?? undefined);
  if (info.kind === "unsupported") {
    return `Set "alg" to HS256/384/512, RS, PS or ES (or none). ${info.name} can't be signed here.`;
  }
  if (info.kind === "none") return null;
  if (familyOf(info.name) === "HS") return input.keyText ? null : "Add a secret to sign the token.";
  return input.keyText.trim() ? null : `Add a private key (PKCS#8 PEM or JWK) to sign with ${info.name}.`;
}

/** Sign header + payload. Resolves to the token or a readable error. */
export async function signJwt(input: SignInput): Promise<SignResult> {
  const err = signInputError(input);
  if (err) return { ok: false, error: err };
  const info = classifyAlg(headerAlg(input.headerText) ?? undefined);
  if (info.kind === "unsupported") return { ok: false, error: `${info.name} can't be signed here.` };
  const signingInput = `${bytesToBase64Url(minifyJsonText(input.headerText))}.${bytesToBase64Url(minifyJsonText(input.payloadText))}`;
  if (info.kind === "none") return { ok: true, token: `${signingInput}.`, checkKey: "" };
  const alg = info.name;
  try {
    const k = await importSigningKey(alg, input.keyText, input.secretIsBase64Url ?? false);
    if ("error" in k) return { ok: false, error: k.error };
    const sig = await crypto.subtle.sign(signatureParams(alg), k.key, new TextEncoder().encode(signingInput));
    return { ok: true, token: `${signingInput}.${bytesToBase64Url(new Uint8Array(sig))}`, checkKey: k.checkKey };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? `Couldn't sign: ${e.message}` : "Couldn't sign with this key." };
  }
}

/** A fresh PKCS#8 PEM private key for RS/PS/ES testing. */
export async function generateTestKey(alg: VerifiableAlgorithm): Promise<string> {
  const fam = familyOf(alg);
  const params: RsaHashedKeyGenParams | EcKeyGenParams =
    fam === "ES"
      ? { name: "ECDSA", namedCurve: curveOf(alg) }
      : {
          name: fam === "PS" ? "RSA-PSS" : "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: hashOf(alg),
        };
  const pair = await crypto.subtle.generateKey(params, true, ["sign", "verify"]);
  const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  let bin = "";
  for (let i = 0; i < der.length; i++) bin += String.fromCharCode(der[i]);
  const body = btoa(bin).replace(/.{64}/g, "$&\n").replace(/\n$/, "");
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
}

// ─── quick actions (lossless text edits) ─────────────────────────────────────

export type PayloadAction =
  | { kind: "plusHour"; now: number }
  | { kind: "expire"; now: number }
  | { kind: "iatNow"; now: number }
  | { kind: "jti"; id: string };

/**
 * Apply a quick action to payload JSON text, editing only the one member so
 * every other value keeps its exact spelling. Null when the text isn't a
 * JSON object.
 */
export function applyPayloadAction(payloadText: string, action: PayloadAction): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadText) as unknown;
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;
  const members = topLevelRawValues(payloadText);
  switch (action.kind) {
    case "plusHour": {
      const exp = parsed.exp;
      const base = typeof exp === "number" && exp > action.now ? exp : action.now;
      members.set("exp", String(Math.floor(base + 3600)));
      break;
    }
    case "expire":
      members.set("exp", String(Math.floor(action.now - 60)));
      break;
    case "iatNow":
      members.set("iat", String(Math.floor(action.now)));
      break;
    case "jti":
      members.set("jti", JSON.stringify(action.id));
      break;
  }
  const body = [...members].map(([k, v]) => `${JSON.stringify(k)}:${v}`).join(",");
  return prettyJsonText(`{${body}}`);
}

/** Set the header's alg (keeps the other members as written). */
export function setHeaderAlg(headerText: string, alg: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(headerText) as unknown;
  } catch {
    parsed = null;
  }
  const members = isPlainObject(parsed) ? topLevelRawValues(headerText) : new Map([["typ", '"JWT"']]);
  // Keep alg where it is; a header without one gets it first.
  const next = members.has("alg") ? members : new Map<string, string>([["alg", ""], ...members]);
  next.set("alg", JSON.stringify(alg));
  return prettyJsonText(`{${[...next].map(([k, v]) => `${JSON.stringify(k)}:${v}`).join(",")}}`);
}
