import { base64UrlToBytes, bytesToBase64Url } from "./jwt-decoder.lib";
import type { Algorithm, SigningKey } from "./jwt-decoder.types";

function shaFor(alg: Algorithm): "SHA-256" | "SHA-384" | "SHA-512" {
  if (alg.endsWith("384")) return "SHA-384";
  if (alg.endsWith("512")) return "SHA-512";
  return "SHA-256";
}

function ecCurve(alg: Algorithm): "P-256" | "P-384" | "P-521" {
  if (alg.endsWith("384")) return "P-384";
  if (alg.endsWith("512")) return "P-521";
  return "P-256";
}

function saltLen(alg: Algorithm): number {
  if (alg.endsWith("384")) return 48;
  if (alg.endsWith("512")) return 64;
  return 32;
}

function pemToDer(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  return base64UrlToBytes(b64);
}

async function importSignKey(
  alg: Algorithm,
  material: string,
): Promise<CryptoKey> {
  const hash = shaFor(alg);
  if (alg.startsWith("HS")) {
    return crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(material),
      { name: "HMAC", hash },
      false,
      ["sign"],
    );
  }
  const der = pemToDer(material);
  if (alg.startsWith("RS")) {
    return crypto.subtle.importKey(
      "pkcs8",
      der as BufferSource,
      { name: "RSASSA-PKCS1-v1_5", hash },
      false,
      ["sign"],
    );
  }
  if (alg.startsWith("PS")) {
    return crypto.subtle.importKey(
      "pkcs8",
      der as BufferSource,
      { name: "RSA-PSS", hash },
      false,
      ["sign"],
    );
  }
  return crypto.subtle.importKey(
    "pkcs8",
    der as BufferSource,
    { name: "ECDSA", namedCurve: ecCurve(alg) },
    false,
    ["sign"],
  );
}

function signParams(alg: Algorithm): AlgorithmIdentifier | RsaPssParams | EcdsaParams {
  if (alg.startsWith("HS")) return "HMAC";
  if (alg.startsWith("RS")) return "RSASSA-PKCS1-v1_5";
  if (alg.startsWith("PS")) return { name: "RSA-PSS", saltLength: saltLen(alg) };
  return { name: "ECDSA", hash: shaFor(alg) };
}

export async function signSegment(
  data: string,
  alg: Algorithm,
  key: SigningKey,
): Promise<string> {
  if (alg === "none") return "";
  const cryptoKey = await importSignKey(alg, key.material.trim());
  const sig = await crypto.subtle.sign(
    signParams(alg),
    cryptoKey,
    new TextEncoder().encode(data),
  );
  return bytesToBase64Url(new Uint8Array(sig));
}

export async function encodeJwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  key: SigningKey,
): Promise<string> {
  const alg = (typeof header.alg === "string" ? header.alg : "none") as Algorithm;
  const fullHeader = { typ: "JWT", ...header, alg };
  const h = bytesToBase64Url(JSON.stringify(fullHeader));
  const p = bytesToBase64Url(JSON.stringify(payload));
  const signingInput = `${h}.${p}`;
  const sig = await signSegment(signingInput, alg, key);
  return `${signingInput}.${sig}`;
}
