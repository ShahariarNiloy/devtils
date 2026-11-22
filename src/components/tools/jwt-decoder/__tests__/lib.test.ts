/**
 * Tests for the JWT decoder's pure logic: parsing, lossless JSON text,
 * WebCrypto sign → verify round trips (HS/RS/PS/ES), alg-confusion and
 * key-type mismatches, JWKS kid resolution, Node-crypto interop (PSS salt,
 * ES raw r‖s), the checks model and the quick actions.
 *
 * Run: npx tsx src/components/tools/jwt-decoder/__tests__/lib.test.ts
 */

/* eslint-disable no-console */

import { createPrivateKey, createPublicKey, generateKeyPairSync, sign as nodeSign, constants } from "node:crypto";
import { runChecks, timelineFor, verdictFor, type SigState } from "../jwt-checks";
import { jwksUrlFor } from "../jwt-claims";
import {
  bytesToBase64Url,
  extractToken,
  findUnsafeIntegerClaims,
  minifyJsonText,
  parseJwt,
  prettyJsonText,
  topLevelRawValues,
  tryBase64UrlToBytes,
} from "../jwt-decoder.lib";
import { isParseError, type ParsedJwt, type VerifiableAlgorithm } from "../jwt-decoder.types";
import { applyPayloadAction, generateTestKey, setHeaderAlg, signJwt } from "../jwt-encode";
import { buildSamples, SAMPLE_NOW, SAMPLE_SECRET, STATIC_SAMPLES } from "../jwt-samples";
import { verifyJwt } from "../jwt-verify";

let pass = 0;
let fail = 0;
function ok(cond: boolean, name: string, detail?: unknown) {
  if (cond) pass++;
  else {
    fail++;
    console.error(`✗ ${name}`, detail ?? "");
  }
}

function parsed(token: string): ParsedJwt {
  const p = parseJwt(token);
  if (isParseError(p)) throw new Error(`parse failed: ${p.message}`);
  return p;
}

const HEADER = (alg: string, extra = "") => `{"alg":"${alg}","typ":"JWT"${extra}}`;
const PAYLOAD = '{"sub":"usr_1","big":12345678901234567890,"iat":1700000000}';

const CERT = `-----BEGIN CERTIFICATE-----
MIIBgTCCASegAwIBAgIUUp+LXf3+jLo81h7mMLCxwuIZx9wwCgYIKoZIzj0EAwIw
FjEUMBIGA1UEAwwLdXRpbHl4IHRlc3QwHhcNMjYxMTIxMTY0MzM0WhcNMzYxMTE4
MTY0MzM0WjAWMRQwEgYDVQQDDAt1dGlseXggdGVzdDBZMBMGByqGSM49AgEGCCqG
SM49AwEHA0IABLiEARsLXlQ8FEIS3zcBZP1S+GXM3Il+RZcNZ78k6dviwQEL9Ax3
LpnjkU2p2PqZZQXTYDf6vaMnqJZhuW18HnujUzBRMB0GA1UdDgQWBBQgtbVkjiIg
rD3o9oHhF70rLatEGjAfBgNVHSMEGDAWgBQgtbVkjiIgrD3o9oHhF70rLatEGjAP
BgNVHRMBAf8EBTADAQH/MAoGCCqGSM49BAMCA0gAMEUCIQCHvWFxQAu7p3jLUqhj
CD6ERW115BmDzIcylMO/ViYdvwIgAPmc8+Ff7ZuFRwL8p5j+8wV8wLbhdOMG0/mN
UUNHnxY=
-----END CERTIFICATE-----`;
const CERT_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgbvkLZBYfxf0pvUkv
7Npy/hIZLFcddPcK2k1J7mqtFhOhRANCAAS4hAEbC15UPBRCEt83AWT9UvhlzNyJ
fkWXDWe/JOnb4sEBC/QMdy6Z45FNqdj6mWUF02A3+r2jJ6iWYbltfB57
-----END PRIVATE KEY-----`;

async function main() {
  // ── parsing ──
  ok(isParseError(parseJwt("")) && (parseJwt("") as { segment: string }).segment === "empty", "empty input");
  const two = parseJwt("a.b");
  ok(isParseError(two) && two.message === "A JWT has three parts separated by dots. This one has 2.", "two parts message", two);
  const badB64 = parseJwt("e!.e30.");
  ok(isParseError(badB64) && badB64.segment === "header", "bad base64 header doesn't throw");
  const arr = parseJwt(`${bytesToBase64Url("{}")}.${bytesToBase64Url("[1]")}.`);
  ok(isParseError(arr) && arr.message === "The payload must be a JSON object.", "payload array rejected");
  const badSig = parseJwt(`${bytesToBase64Url("{}")}.${bytesToBase64Url("{}")}.a`);
  ok(isParseError(badSig) && badSig.segment === "signature", "1-char signature is malformed base64url");
  ok(tryBase64UrlToBytes("a") === null && tryBase64UrlToBytes("ab+/") !== null, "base64 tolerance");
  ok(extractToken("Bearer  a.b.c ") === "a.b.c", "strip bearer");
  ok(extractToken("https://x.test/cb#id_token=aa.bb.cc&state=1") === "aa.bb.cc", "token from URL fragment");
  ok(extractToken("aa.\nbb.\ncc") === "aa.bb.cc", "line-wrapped token");
  const bad8 = parseJwt(`${bytesToBase64Url(new Uint8Array([0xff, 0xfe]))}.e30.`);
  ok(isParseError(bad8), "invalid UTF-8 header rejected");

  // ── lossless JSON text ──
  ok(prettyJsonText(PAYLOAD).includes("12345678901234567890"), "pretty keeps big int");
  ok(prettyJsonText('{"a":[],"b":{},"c":"x, y: {z}"}') === '{\n  "a": [],\n  "b": {},\n  "c": "x, y: {z}"\n}', "pretty handles empty containers + strings", prettyJsonText('{"a":[],"b":{},"c":"x, y: {z}"}'));
  ok(minifyJsonText('{ "a" : " b c " }') === '{"a":" b c "}', "minify keeps string whitespace");
  const raw = topLevelRawValues('{"a":1,"b":{"c":[1,2]},"d":"q\\"x","a":2}');
  ok(raw.get("a") === "2" && raw.get("b") === '{"c":[1,2]}' && raw.get("d") === '"q\\"x"', "top-level raw values", [...raw]);
  const big = findUnsafeIntegerClaims(topLevelRawValues('{"id":12345678901234567890,"ok":9007199254740991,"n":{"x":-99999999999999999}}'));
  ok(big.length === 2 && big[0].key === "id" && big[0].parsed === "12345678901234567000" && big[1].key === "n", "unsafe integers found", big);

  // ── HS round trips ──
  for (const alg of ["HS256", "HS384", "HS512"] as const) {
    const res = await signJwt({ headerText: HEADER(alg), payloadText: PAYLOAD, keyText: "s3cret" });
    ok(res.ok, `${alg} signs`, res);
    if (!res.ok) continue;
    const jwt = parsed(res.token);
    ok(jwt.payloadJson.includes("12345678901234567890"), `${alg} signs the exact text`);
    ok((await verifyJwt(jwt, "s3cret")).status === "valid", `${alg} verifies`);
    ok((await verifyJwt(jwt, "s3cret ")).status === "invalid", `${alg} wrong secret = invalid`);
  }
  const b64 = await signJwt({ headerText: HEADER("HS256"), payloadText: PAYLOAD, keyText: "c2VjcmV0LWJ5dGVz", secretIsBase64Url: true });
  ok(b64.ok && (await verifyJwt(parsed(b64.ok ? b64.token : ""), "c2VjcmV0LWJ5dGVz", { secretIsBase64Url: true })).status === "valid", "base64url secret");
  ok(b64.ok && (await verifyJwt(parsed(b64.ok ? b64.token : ""), "secret-bytes")).status === "valid", "base64url secret == its text");
  ok(b64.ok && (await verifyJwt(parsed(b64.ok ? b64.token : ""), "**", { secretIsBase64Url: true })).status === "keyerror", "bad base64 secret = keyerror");

  // ── asymmetric round trips via generated keys ──
  const asym: VerifiableAlgorithm[] = ["RS256", "RS512", "PS256", "PS384", "ES256", "ES384", "ES512"];
  for (const alg of asym) {
    const pem = await generateTestKey(alg);
    const res = await signJwt({ headerText: HEADER(alg), payloadText: PAYLOAD, keyText: pem });
    ok(res.ok, `${alg} signs`, res);
    if (!res.ok) continue;
    const jwt = parsed(res.token);
    const v = await verifyJwt(jwt, res.checkKey);
    ok(v.status === "valid", `${alg} verifies with derived public JWK`, v);
    ok((await verifyJwt(jwt, pem)).status === "valid", `${alg} verifies with the private PEM's public half`);
    // Tamper with the payload.
    const [h, , s] = res.token.split(".");
    const tampered = parsed(`${h}.${bytesToBase64Url(PAYLOAD.replace("usr_1", "usr_2"))}.${s}`);
    ok((await verifyJwt(tampered, res.checkKey)).status === "invalid", `${alg} tampered = invalid`);
    if (alg.startsWith("ES")) ok(jwt.signatureBytes.length === { ES256: 64, ES384: 96, ES512: 132 }[alg as "ES256"], `${alg} raw r||s length`);
    // HMAC-from-public-key never verifies.
    ok((await verifyJwt(jwt, "not a key")).status === "keyerror", `${alg} with a secret = keyerror`);
  }

  // ── Node interop: SPKI PEM, PKCS#1, PSS salt length, ES raw signatures ──
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const spkiPem = rsa.publicKey.export({ type: "spki", format: "pem" }).toString();
  const pkcs1Pem = rsa.publicKey.export({ type: "pkcs1", format: "pem" }).toString();
  const nodeToken = (alg: string, signer: (data: Buffer) => Buffer, extra = "") => {
    const si = `${bytesToBase64Url(HEADER(alg, extra))}.${bytesToBase64Url(PAYLOAD)}`;
    return parsed(`${si}.${bytesToBase64Url(new Uint8Array(signer(Buffer.from(si))))}`);
  };
  const rs = nodeToken("RS256", (d) => nodeSign("sha256", d, rsa.privateKey));
  ok((await verifyJwt(rs, spkiPem)).status === "valid", "RS256 node token + SPKI PEM");
  ok((await verifyJwt(rs, pkcs1Pem)).status === "valid", "RS256 + PKCS#1 PEM");
  const ps = nodeToken("PS256", (d) => nodeSign("sha256", d, { key: rsa.privateKey, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }));
  ok((await verifyJwt(ps, spkiPem)).status === "valid", "PS256 salt = 32 interop");
  const psWrongSalt = nodeToken("PS256", (d) => nodeSign("sha256", d, { key: rsa.privateKey, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 20 }));
  ok((await verifyJwt(psWrongSalt, spkiPem)).status === "invalid", "PS256 with a 20-byte salt rejected");
  ok((await verifyJwt(rs, JSON.stringify(rsa.publicKey.export({ format: "jwk" })))).status === "valid", "RS256 + JWK");

  const ec = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const ecPem = ec.publicKey.export({ type: "spki", format: "pem" }).toString();
  const es = nodeToken("ES256", (d) => nodeSign("sha256", d, { key: ec.privateKey, dsaEncoding: "ieee-p1363" }));
  ok((await verifyJwt(es, ecPem)).status === "valid", "ES256 node raw signature");
  const esDer = nodeToken("ES256", (d) => nodeSign("sha256", d, { key: ec.privateKey, dsaEncoding: "der" }));
  const derRes = await verifyJwt(esDer, ecPem);
  ok(derRes.status === "invalid" && derRes.reason !== null && derRes.reason.includes("DER"), "ES256 DER signature explained", derRes);

  // ── key/alg mismatch & alg confusion ──
  ok((await verifyJwt(rs, ecPem)).status === "keyerror", "RS256 + EC key = keyerror");
  ok((await verifyJwt(es, spkiPem)).status === "keyerror", "ES256 + RSA key = keyerror");
  const p384 = generateKeyPairSync("ec", { namedCurve: "P-384" }).publicKey.export({ type: "spki", format: "pem" }).toString();
  ok((await verifyJwt(es, p384)).status === "keyerror", "ES256 + P-384 key = keyerror");
  const confused = await signJwt({ headerText: HEADER("HS256"), payloadText: PAYLOAD, keyText: spkiPem });
  ok(confused.ok, "attacker can HMAC with the public PEM as secret");
  if (confused.ok) {
    const r = await verifyJwt(parsed(confused.token), spkiPem);
    ok(r.status === "keyerror", "alg confusion refused (HS256 + PEM)", r);
    const rj = await verifyJwt(parsed(confused.token), JSON.stringify(rsa.publicKey.export({ format: "jwk" })));
    ok(rj.status === "keyerror", "alg confusion refused (HS256 + RSA JWK)", rj);
  }

  // ── certificate ──
  const certTok = nodeToken("ES256", (d) => nodeSign("sha256", d, { key: createPrivateKey(CERT_KEY), dsaEncoding: "ieee-p1363" }));
  ok((await verifyJwt(certTok, CERT)).status === "valid", "ES256 + X.509 certificate");
  ok(createPublicKey(CERT).asymmetricKeyType === "ec", "cert fixture sane");

  // ── JWKS / kid ──
  const jwkA = { ...rsa.publicKey.export({ format: "jwk" }), kid: "a", alg: "RS256", use: "sig" };
  const other = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({ format: "jwk" });
  const jwks = JSON.stringify({ keys: [{ ...other, kid: "b" }, jwkA] });
  const rsKid = nodeToken("RS256", (d) => nodeSign("sha256", d, rsa.privateKey), ',"kid":"a"');
  const kidRes = await verifyJwt(rsKid, jwks);
  ok(kidRes.status === "valid" && kidRes.note === "Using key a from the JWKS.", "JWKS kid selects", kidRes);
  const rsKidMissing = nodeToken("RS256", (d) => nodeSign("sha256", d, rsa.privateKey), ',"kid":"zzz"');
  const missRes = await verifyJwt(rsKidMissing, jwks);
  ok(missRes.status === "keyerror" && missRes.reason.includes("zzz"), "unknown kid = keyerror, no fallback", missRes);
  ok((await verifyJwt(rs, jwks)).status === "valid", "no kid: tries each fitting key");
  const psWithRsKey = nodeToken("PS256", (d) => nodeSign("sha256", d, { key: rsa.privateKey, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }), ',"kid":"a"');
  ok((await verifyJwt(psWithRsKey, jwks)).status === "keyerror", "JWK alg RS256 refuses a PS256 token");

  // ── unsigned & unsupported ──
  const none = parsed(STATIC_SAMPLES.none.token);
  ok((await verifyJwt(none, "x")).status === "keyerror", "alg none never verifies");

  // ── samples ──
  ok((await verifyJwt(parsed(STATIC_SAMPLES.valid.token), SAMPLE_SECRET)).status === "valid", "static valid sample verifies");
  ok((await verifyJwt(parsed(STATIC_SAMPLES.rs.token), STATIC_SAMPLES.rs.key)).status === "valid", "static RS sample verifies");
  const fresh = await buildSamples(2_000_000_000);
  ok((await verifyJwt(parsed(fresh.rs.token), fresh.rs.key)).status === "valid", "fresh RS sample verifies");

  // ── checks ──
  const valid = parsed(STATIC_SAMPLES.valid.token);
  const good: SigState = { kind: "done", result: { status: "valid", note: null } };
  const base = { now: SAMPLE_NOW, leeway: 60, expectedIss: "", expectedAud: "", sig: good };
  const rows = runChecks({ jwt: valid, ...base });
  ok(rows.every((r) => r.level === "ok"), "valid sample: every check ok", rows);
  ok(verdictFor(rows, valid, good).title === "Would be accepted", "valid sample accepted");
  const expired = parsed(STATIC_SAMPLES.expired.token);
  const er = runChecks({ jwt: expired, ...base });
  ok(verdictFor(er, expired, good).title === "Would be rejected" && verdictFor(er, expired, good).sub === "expiry", "expired rejected", er);
  const nr = runChecks({ jwt: none, ...base, sig: { kind: "nokey" } });
  ok(verdictFor(nr, none, { kind: "nokey" }).sub === "algorithm, signature", "none: algorithm + signature", nr);
  const issBad = runChecks({ jwt: valid, ...base, expectedIss: "https://auth.example.com" });
  ok(issBad.some((r) => r.label === "Issuer" && r.level === "bad"), "iss compared exactly");
  const audOk = runChecks({ jwt: valid, ...base, expectedAud: "api.utilyx.dev" });
  ok(audOk.some((r) => r.label === "Audience" && r.level === "ok"), "aud matches");
  const nokey = runChecks({ jwt: valid, ...base, sig: { kind: "nokey" } });
  ok(verdictFor(nokey, valid, { kind: "nokey" }).title === "Looks valid, signature not checked", "unchecked signature verdict");
  // leeway: exp 30 s ago
  const exp = (valid.payload.exp as number) + 30;
  ok(runChecks({ jwt: valid, ...base, now: exp }).find((r) => r.label === "Expiry")?.level === "warn", "inside leeway = warn");
  ok(runChecks({ jwt: valid, ...base, now: exp, leeway: 0 }).find((r) => r.label === "Expiry")?.level === "bad", "leeway 0 = bad");
  const tl = timelineFor(valid.payload, SAMPLE_NOW);
  ok(tl !== null && tl.lifetime === "Lifetime 60 min" && tl.nowPct === 20 && !tl.expired, "timeline", tl);

  // ── quick actions ──
  const edited = applyPayloadAction(PAYLOAD, { kind: "plusHour", now: 1000 });
  ok(edited !== null && edited.includes("12345678901234567890") && edited.includes('"exp": 4600'), "exp +1 h lossless", edited);
  ok(applyPayloadAction(PAYLOAD, { kind: "expire", now: 1000 })?.includes('"exp": 940') === true, "expire it");
  ok(applyPayloadAction(PAYLOAD, { kind: "iatNow", now: 5 })?.includes('"iat": 5') === true, "iat = now");
  ok(applyPayloadAction(PAYLOAD, { kind: "jti", id: "tok_abc" })?.includes('"jti": "tok_abc"') === true, "+ jti");
  ok(applyPayloadAction("{oops", { kind: "jti", id: "x" }) === null, "action on invalid JSON = null");
  ok(setHeaderAlg('{"typ":"JWT","alg":"HS256"}', "HS512") === '{\n  "typ": "JWT",\n  "alg": "HS512"\n}', "setHeaderAlg keeps position");

  // ── issuer JWKS URL ──
  ok(jwksUrlFor("https://auth.example.com/") === "https://auth.example.com/.well-known/jwks.json", "jwks url");
  ok(jwksUrlFor("http://auth.example.com") === null && jwksUrlFor("javascript:alert(1)") === null && jwksUrlFor("https://u:p@x.test") === null, "jwks url only https");

  console.log(`${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

void main();
