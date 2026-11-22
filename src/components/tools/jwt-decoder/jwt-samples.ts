import { signJwt } from "./jwt-encode";

/**
 * The "Try …" example tokens. Each tells one story (valid, expired,
 * unsigned, RS256 with its public key). They're re-signed on the client
 * relative to the real clock so "Valid" stays valid; STATIC_SAMPLES (same
 * claims at SAMPLE_NOW) is what the server renders before that.
 *
 * The RSA key pair below is a published demo key — it signs nothing real.
 */

export type SampleId = "valid" | "expired" | "none" | "rs";

export interface Sample {
  id: SampleId;
  label: string;
  token: string;
  /** The key that verifies it ("" for alg none). */
  key: string;
}

export const SAMPLE_IDS: readonly SampleId[] = ["valid", "expired", "none", "rs"];

export const SAMPLE_LABELS: Record<SampleId, string> = {
  valid: "Valid",
  expired: "Expired",
  none: "alg: none",
  rs: "RS256 + public key",
};

/** The clock the static samples (and the server render) are frozen at. */
export const SAMPLE_NOW = 1795278120;

/** 33 bytes, so the weak-secret warning stays quiet for the demo. */
export const SAMPLE_SECRET = "utilyx-demo-secret-change-me-32b!";

export const SAMPLE_KID = "k1-2026-11";

const DEMO_RSA_PRIVATE = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDGcCWRxazTN1wx
ce7VlFGRVoFKlqA924ibp7LgBONxMA9S9KEbwWl0xtJPFGX6eLiOJ7YwhAbWIrkd
rYZJlx3WAo80Du5KVAideF6kMT2Di2Xv+glblXzID4W+792uqi29kGQc+3SLtFic
/dm969ZFlj5uXmRSTNvucZYP1PnrQM/IXJV6DdpDOq468FIJP0GjNb1IoKvJU+O3
BiE5xJ9/NALeydqtHxD0OrkIgU8spZcSDsl9hkK6fJL3NGjEoeKb8tdI/svmUVMr
b7p7d4M/oz5XdQwD+VrrhxxNZAoPVVT1fL00eCU/EuthrPFZtDTimQ/OcZi1oVdP
ljLGuaGhAgMBAAECggEAKJJyZAEWKmNFwshILDv0h3I34h+06KDTp/ucK4hkVlac
s3nX3NxpKtqh0lBZ32HCXjJJYlcELNERpzs82xv+Gi0QyXSKDQFsd4HOW+TDbntY
Xr3xHtwMFL1zu4vAd/9MddcpWPGirRO1EHgohlfLShQDdL5w5ZDYYMKxi1AgvxP3
mewkgMeNGFk17gAv0mcJbTLTux1hCKinbAdyexkuM5YsYYE1tjjq1WVG5V+m7iCe
Np/OyJJO/aBln3+jJEcPu4iZeo0092++7/xowh0nC4AjocoflPVYXDNaTVYOzh/O
VCBD8yEbrASSZfvXpNsH/pX8zA0KO2DCnu4RdxYdvwKBgQDlMjyU+9GV+jgyeoi/
4U+8ubbCn/GXfjxAcHoUk5VYXt4If70RHq+QcTZ3U/qJRQWu2GiniGQOEpn2IhI2
lWmIShCJND9D6ojCh4UQL32dncX4tNqNIMfaTmcQ+IW+5WtvJ9IZuZoX2yS+iJ0e
/KOtyAqZf/EfJNJ3YfmNDE7nXwKBgQDdpQ+D/G8IGKEn//wDGDlr3FZVjY/ePAY4
zIFvsIlfR5vk4lRcXKoAQyBzSjIS7nuDyNn8Y7Zzg1u0w4hgoXwBDI3yH/gLQxlc
/po1ZrcwLYUPkZ+oETDFM1XuLtUjt7NhxMpXmw78B+fTBhaQPJeJlc3ui1/FW4Yc
1PZstyEW/wKBgQDkzRHNaNYBcplHSyvY4YRIUt0vzZvQMCTV73Lvt6UPYyUkNuD3
hjqdZ2eIGD2za0QRF9jh5jZ8FfW80KZ99wozFD0NuyqtEiUUjVU4ozAzeJ15epHy
8RaRyFL7jh12RHDLtmT3aWF7DznPO3IezPZZNanfMunyvT+eDiChvffG4QKBgHUb
mEYRY4zwjn22+C2eaACAa7FKWaB/MH5kN2OO8BZCnLDjkNU4NK5syUGBC1ILZYFs
5xg+ixEfb53jzjPYPs/DFWC/2WwB6O3ErC/Y9KNk+bAPLj87zfvzssxlPEJh9kqL
EqoVCGbLuoY56kQNb7fHSgZm55Q8VnD3aLhqTfZ7AoGAT1J2b/sn4ByUUZ41mKTl
ioAHmkZs6APMZcJp6VTVaHeVHiw/uAz8i4VySnH0K7MFRVNYOjz0BlEyI0YA9TIP
FMhVtGISMBaQw8QI7w6IFcvpscyuzghd6MaYn4DeomGSZMnMe6RsL1FWUseQIFyf
NghXJVDlfoXJY1dBOQTqrTs=
-----END PRIVATE KEY-----
`;

export const SAMPLE_RSA_PUBLIC = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxnAlkcWs0zdcMXHu1ZRR
kVaBSpagPduIm6ey4ATjcTAPUvShG8FpdMbSTxRl+ni4jie2MIQG1iK5Ha2GSZcd
1gKPNA7uSlQInXhepDE9g4tl7/oJW5V8yA+Fvu/drqotvZBkHPt0i7RYnP3ZvevW
RZY+bl5kUkzb7nGWD9T560DPyFyVeg3aQzquOvBSCT9BozW9SKCryVPjtwYhOcSf
fzQC3snarR8Q9Dq5CIFPLKWXEg7JfYZCunyS9zRoxKHim/LXSP7L5lFTK2+6e3eD
P6M+V3UMA/la64ccTWQKD1VU9Xy9NHglPxLrYazxWbQ04pkPznGYtaFXT5Yyxrmh
oQIDAQAB
-----END PUBLIC KEY-----
`;

const USER = '"iss":"https://auth.example.com/","sub":"usr_9f2a","aud":"api.utilyx.dev"';
const PROFILE = '"name":"Ada Lovelace","email":"ada@example.com","roles":["admin","editor"],"scope":"read:tools write:snippets"';

/** Header + payload JSON text for each sample at `now` (compact, exact). */
export function sampleSource(id: SampleId, now: number): { header: string; payload: string; key: string } {
  switch (id) {
    case "valid":
      return {
        header: '{"alg":"HS256","typ":"JWT"}',
        payload: `{${USER},${PROFILE},"iat":${now - 720},"nbf":${now - 720},"exp":${now + 2880},"jti":"tok_5f1c9a"}`,
        key: SAMPLE_SECRET,
      };
    case "expired":
      return {
        header: '{"alg":"HS256","typ":"JWT"}',
        payload: `{${USER},${PROFILE},"iat":${now - 90000},"exp":${now - 86400},"jti":"tok_0b77e2"}`,
        key: SAMPLE_SECRET,
      };
    case "none":
      return {
        header: '{"alg":"none","typ":"JWT"}',
        payload: `{"sub":"usr_9f2a","role":"admin","iat":${now - 60}}`,
        key: "",
      };
    case "rs":
      return {
        header: `{"alg":"RS256","typ":"JWT","kid":"${SAMPLE_KID}"}`,
        // account_id is deliberately past 2^53 to show the precision warning.
        payload: `{${USER},"account_id":12345678901234567890,"iat":${now - 300},"exp":${now + 600}}`,
        key: SAMPLE_RSA_PUBLIC,
      };
  }
}

async function signSample(id: SampleId, now: number): Promise<Sample> {
  const src = sampleSource(id, now);
  const res = await signJwt({
    headerText: src.header,
    payloadText: src.payload,
    keyText: id === "rs" ? DEMO_RSA_PRIVATE : src.key,
  });
  if (!res.ok) throw new Error(res.error);
  return { id, label: SAMPLE_LABELS[id], token: res.token, key: src.key };
}

/** Sign every sample at `now`. */
export async function buildSamples(now: number): Promise<Record<SampleId, Sample>> {
  const [valid, expired, none, rs] = await Promise.all([
    signSample("valid", now),
    signSample("expired", now),
    signSample("none", now),
    signSample("rs", now),
  ]);
  return { valid, expired, none, rs };
}

/** Tokens signed at SAMPLE_NOW — the server render and first paint. */
export const STATIC_TOKENS: Record<SampleId, string> = {
  valid:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20vIiwic3ViIjoidXNyXzlmMmEiLCJhdWQiOiJhcGkudXRpbHl4LmRldiIsIm5hbWUiOiJBZGEgTG92ZWxhY2UiLCJlbWFpbCI6ImFkYUBleGFtcGxlLmNvbSIsInJvbGVzIjpbImFkbWluIiwiZWRpdG9yIl0sInNjb3BlIjoicmVhZDp0b29scyB3cml0ZTpzbmlwcGV0cyIsImlhdCI6MTc5NTI3NzQwMCwibmJmIjoxNzk1Mjc3NDAwLCJleHAiOjE3OTUyODEwMDAsImp0aSI6InRva181ZjFjOWEifQ.m1GKEoG5yjvZ6g6Rd8mLgWEDPOrAxnOEXHUTOczUWt0",
  expired:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20vIiwic3ViIjoidXNyXzlmMmEiLCJhdWQiOiJhcGkudXRpbHl4LmRldiIsIm5hbWUiOiJBZGEgTG92ZWxhY2UiLCJlbWFpbCI6ImFkYUBleGFtcGxlLmNvbSIsInJvbGVzIjpbImFkbWluIiwiZWRpdG9yIl0sInNjb3BlIjoicmVhZDp0b29scyB3cml0ZTpzbmlwcGV0cyIsImlhdCI6MTc5NTE4ODEyMCwiZXhwIjoxNzk1MTkxNzIwLCJqdGkiOiJ0b2tfMGI3N2UyIn0.gMOxPKsSHkjEba6clqM1ZUnWPBSG1exN5m3b4ksYkEg",
  none:
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ1c3JfOWYyYSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc5NTI3ODA2MH0.",
  rs:
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImsxLTIwMjYtMTEifQ.eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20vIiwic3ViIjoidXNyXzlmMmEiLCJhdWQiOiJhcGkudXRpbHl4LmRldiIsImFjY291bnRfaWQiOjEyMzQ1Njc4OTAxMjM0NTY3ODkwLCJpYXQiOjE3OTUyNzc4MjAsImV4cCI6MTc5NTI3ODcyMH0.n9GpIJvkvYfKRcvMO9w-ZGfZdo73USGxyY_8fUfqIypcyGj6B6iiDvQuxPkznEsHqQkhYSCEEvxTr6mSGkVg4TzJZzbMZSLNUsshO31-qRLv_7_BLT2w4-XZeanjgEd4T-5KxjSUlCRjfDuCi1AmQ4uKITUhxYWi5tI4nFB68hxz9fCLRzTiQQEhy2OZEDfx7De4YfJXauQQArzGfblBxAr-gX6NWpvHMWm2WTlg4X5gEWC1Mcgo8lQnK2PCv286-wVhx40ZtCKGuUhxw6q4JtGYmv3F9gixjLkIobAUh_E3yRg6Wn9qFN5IPosbyQ4QPzTgOOA7ik80gQYut-Wdqw",
};

export const STATIC_SAMPLES: Record<SampleId, Sample> = {
  valid: { id: "valid", label: SAMPLE_LABELS.valid, token: STATIC_TOKENS.valid, key: SAMPLE_SECRET },
  expired: { id: "expired", label: SAMPLE_LABELS.expired, token: STATIC_TOKENS.expired, key: SAMPLE_SECRET },
  none: { id: "none", label: SAMPLE_LABELS.none, token: STATIC_TOKENS.none, key: "" },
  rs: { id: "rs", label: SAMPLE_LABELS.rs, token: STATIC_TOKENS.rs, key: SAMPLE_RSA_PUBLIC },
};
