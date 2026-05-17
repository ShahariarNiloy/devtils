import { base64UrlToBytes } from "./jwt-decoder.lib";
import type {
  Algorithm,
  JwksKey,
  ParsedJwt,
  VerificationKey,
  VerificationResult,
} from "./jwt-decoder.types";

type Family = "HS" | "RS" | "ES" | "PS";

function family(alg: Algorithm): Family | null {
  if (alg.startsWith("HS")) return "HS";
  if (alg.startsWith("RS")) return "RS";
  if (alg.startsWith("ES")) return "ES";
  if (alg.startsWith("PS")) return "PS";
  return null;
}

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

function looksLikePem(s: string): boolean {
  return /-----BEGIN /.test(s);
}

function looksLikeJwk(s: string): boolean {
  const t = s.trim();
  return t.startsWith("{") && /"kty"\s*:/.test(t);
}

async function importVerifyKey(
  alg: Algorithm,
  material: string,
): Promise<CryptoKey> {
  const fam = family(alg);
  const hash = shaFor(alg);

  if (fam === "HS") {
    if (looksLikePem(material)) {
      throw new Error(
        "Algorithm mismatch: the token uses HMAC but the key looks like a PEM. Paste the shared secret instead.",
      );
    }
    return crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(material),
      { name: "HMAC", hash },
      false,
      ["verify"],
    );
  }

  if (looksLikeJwk(material)) {
    const jwk = JSON.parse(material) as JsonWebKey;
    return crypto.subtle.importKey(
      "jwk",
      jwk,
      asymmetricParams(alg),
      false,
      ["verify"],
    );
  }

  if (!looksLikePem(material)) {
    throw new Error(
      `Algorithm mismatch: the token uses ${alg} but no PEM/JWK public key was provided.`,
    );
  }
  const der = pemToDer(material);
  return crypto.subtle.importKey(
    "spki",
    der as BufferSource,
    asymmetricParams(alg),
    false,
    ["verify"],
  );
}

function asymmetricParams(
  alg: Algorithm,
):
  | RsaHashedImportParams
  | EcKeyImportParams {
  const fam = family(alg);
  const hash = shaFor(alg);
  if (fam === "RS") return { name: "RSASSA-PKCS1-v1_5", hash };
  if (fam === "PS") return { name: "RSA-PSS", hash };
  return { name: "ECDSA", namedCurve: ecCurve(alg) };
}

function verifyParams(alg: Algorithm): AlgorithmIdentifier | RsaPssParams | EcdsaParams {
  const fam = family(alg);
  if (fam === "HS") return "HMAC";
  if (fam === "RS") return "RSASSA-PKCS1-v1_5";
  if (fam === "PS") return { name: "RSA-PSS", saltLength: saltLen(alg) };
  return { name: "ECDSA", hash: shaFor(alg) };
}

export async function verifyJwt(
  jwt: ParsedJwt,
  key: VerificationKey,
): Promise<VerificationResult> {
  const alg = jwt.header.alg;

  if (alg === "none") {
    return {
      status: "unsupported",
      reason:
        "Token uses alg:none — it is unsigned and cannot be trusted. Verification refused by design.",
    };
  }
  if (!family(alg)) {
    return { status: "unsupported", reason: `Unsupported algorithm: ${alg}.` };
  }
  if (!key.material.trim()) {
    return { status: "invalid", reason: "No key or secret provided." };
  }
  if (jwt.signatureBytes.length === 0) {
    return { status: "invalid", reason: "Token has no signature segment." };
  }

  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await importVerifyKey(alg, key.material.trim());
  } catch (e) {
    return {
      status: "invalid",
      reason: e instanceof Error ? e.message : "Invalid key format.",
    };
  }

  const data = new TextEncoder().encode(
    `${jwt.segments.header}.${jwt.segments.payload}`,
  );

  try {
    const ok = await crypto.subtle.verify(
      verifyParams(alg),
      cryptoKey,
      jwt.signatureBytes as BufferSource,
      data,
    );
    return ok
      ? { status: "valid" }
      : { status: "invalid", reason: "Signature does not match." };
  } catch (e) {
    return {
      status: "invalid",
      reason: e instanceof Error ? e.message : "Verification failed.",
    };
  }
}

export async function fetchJwks(url: string): Promise<JwksKey[]> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new Error(
      "Could not fetch JWKS (likely a CORS restriction). Paste the JWKS JSON instead.",
    );
  }
  if (!res.ok) {
    throw new Error(`JWKS endpoint returned HTTP ${res.status}.`);
  }
  const json = (await res.json()) as { keys?: JwksKey[] };
  if (!json.keys || !Array.isArray(json.keys)) {
    throw new Error("Response is not a JWKS document (missing `keys`).");
  }
  return json.keys;
}

export function parseJwks(raw: string): JwksKey[] {
  const json = JSON.parse(raw) as { keys?: JwksKey[] } | JwksKey;
  if (Array.isArray((json as { keys?: JwksKey[] }).keys)) {
    return (json as { keys: JwksKey[] }).keys;
  }
  if ((json as JwksKey).kty) return [json as JwksKey];
  throw new Error("Not a JWKS document or a single JWK.");
}

export function selectJwksKey(
  keys: JwksKey[],
  kid: string | undefined,
): JwksKey | null {
  if (keys.length === 0) return null;
  if (kid) {
    const match = keys.find((k) => k.kid === kid);
    if (match) return match;
  }
  return keys.length === 1 ? keys[0] : null;
}
