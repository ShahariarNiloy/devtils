import { formatDuration, formatRelative, formatUtc, formatUtcClock, isUnsigned } from "./jwt-decoder.lib";
import type { ParsedJwt, VerificationResult } from "./jwt-decoder.types";

/**
 * The "would a server accept this?" model: one row per check a typical JWT
 * library runs, a verdict over them, and the lifetime bar. Pure.
 */

export type Level = "ok" | "warn" | "bad" | "neutral";

export interface CheckRow {
  label: string;
  level: Level;
  text: string;
}

/** Where signature verification stands for the current token + key. */
export type SigState =
  | { kind: "nokey" }
  | { kind: "checking" }
  | { kind: "done"; result: VerificationResult };

export interface CheckInput {
  jwt: ParsedJwt;
  now: number;
  /** Clock leeway in seconds. */
  leeway: number;
  expectedIss: string;
  expectedAud: string;
  sig: SigState;
}

export function isHmac(jwt: ParsedJwt): boolean {
  return jwt.alg.kind === "supported" && jwt.alg.name.startsWith("HS");
}

function leewayText(leeway: number): string {
  return leeway >= 60 && leeway % 60 === 0 ? `${leeway / 60} min` : `${leeway} s`;
}

export function runChecks({ jwt, now, leeway, expectedIss, expectedAud, sig }: CheckInput): CheckRow[] {
  const rows: CheckRow[] = [];
  const add = (label: string, level: Level, text: string) => rows.push({ label, level, text });
  const { payload, header, alg } = jwt;
  const hs = isHmac(jwt);
  const keyWord = hs ? "secret" : "public key";
  const unsigned = isUnsigned(jwt);

  add("Format", "ok", `3 parts · Base64URL · JSON${typeof header.typ === "string" ? ` · typ ${header.typ}` : ""}`);

  if (unsigned) add("Algorithm", "bad", `Unsigned token (alg: ${alg.name}). Never accept it.`);
  else if (alg.kind !== "supported") {
    add("Algorithm", "warn", alg.name === "(missing)" ? "The header has no alg, so it can't be verified." : `${alg.name} can't be verified here.`);
  } else add("Algorithm", "ok", `${alg.name} · ${hs ? "shared secret" : "public key"}`);

  if (unsigned) add("Signature", "bad", "There is no signature to check.");
  else if (alg.kind !== "supported") add("Signature", "neutral", "Not checked. This tool verifies HS, RS, PS and ES.");
  else if (sig.kind === "nokey") add("Signature", "neutral", `Not checked. Add the ${keyWord} below.`);
  else if (sig.kind === "checking") add("Signature", "neutral", "Checking…");
  else if (sig.result.status === "valid") add("Signature", "ok", `Verified with the ${keyWord}.`);
  else if (sig.result.status === "invalid") add("Signature", "bad", sig.result.reason ?? "Doesn't match. Wrong key, or the token was changed.");
  else add("Signature", "warn", `Couldn't use this key: ${sig.result.reason}`);

  const { exp, nbf, iat } = payload;
  if (exp === undefined) add("Expiry", "warn", "No exp claim. This token never expires.");
  else if (typeof exp !== "number") add("Expiry", "bad", "exp isn't a number (NumericDate), so libraries reject it.");
  else if (exp + leeway <= now) add("Expiry", "bad", `Expired ${formatRelative(exp, now)} (${formatUtc(exp)}).`);
  else if (exp <= now) add("Expiry", "warn", `Expired ${formatRelative(exp, now)}, inside the ${leewayText(leeway)} leeway.`);
  else add("Expiry", "ok", `Expires ${formatRelative(exp, now)}.`);

  if (typeof nbf === "number") {
    if (nbf - leeway > now) add("Not before", "bad", `Not valid until ${formatUtc(nbf)}.`);
    else if (nbf > now) add("Not before", "warn", `Starts ${formatRelative(nbf, now)}, inside the ${leewayText(leeway)} leeway.`);
    else add("Not before", "ok", `Active since ${formatRelative(nbf, now)}.`);
  }
  if (typeof iat === "number") {
    if (iat - leeway > now) add("Issued at", "warn", "Issued in the future. Check clock skew.");
    else add("Issued at", "ok", `Issued ${formatRelative(iat, now)}.`);
  }
  if (typeof exp === "number" && typeof iat === "number" && exp - iat > 86400) {
    add("Lifetime", "warn", `Long-lived: ${formatDuration(exp - iat)}. Short tokens limit the damage if one leaks.`);
  }

  const wantIss = expectedIss.trim();
  if (wantIss) {
    const got = typeof payload.iss === "string" ? payload.iss : "";
    add("Issuer", got === wantIss ? "ok" : "bad", got === wantIss ? `Matches ${wantIss}` : `Expected ${wantIss}, got ${got || "nothing"}.`);
  }
  const wantAud = expectedAud.trim();
  if (wantAud) {
    const raw = payload.aud;
    let list: unknown[] = [];
    if (Array.isArray(raw)) list = raw;
    else if (raw !== undefined) list = [raw];
    const auds = list.map(String);
    const hit = auds.includes(wantAud);
    add("Audience", hit ? "ok" : "bad", hit ? `Includes ${wantAud}` : `Expected ${wantAud}, got ${auds.join(", ") || "nothing"}.`);
  }
  return rows;
}

export interface Verdict {
  level: Level;
  title: string;
  sub: string;
}

export function verdictFor(rows: readonly CheckRow[], jwt: ParsedJwt, sig: SigState): Verdict {
  const bad = rows.filter((r) => r.level === "bad");
  if (bad.length) return { level: "bad", title: "Would be rejected", sub: bad.map((r) => r.label.toLowerCase()).join(", ") };
  if (sig.kind === "checking") return { level: "neutral", title: "Checking signature…", sub: "Using the browser's built-in crypto" };
  const sigRow = rows.find((r) => r.label === "Signature");
  if (sigRow && (sigRow.level === "neutral" || sigRow.level === "warn")) {
    let sub = `Add the ${isHmac(jwt) ? "secret" : "public key"} to be sure`;
    if (jwt.alg.kind !== "supported") sub = `${jwt.alg.name} signatures can't be checked here`;
    else if (sig.kind === "done" && sig.result.status === "keyerror") sub = "The key couldn't be read";
    return { level: "warn", title: "Looks valid, signature not checked", sub };
  }
  const warn = rows.filter((r) => r.level === "warn").length;
  return { level: "ok", title: "Would be accepted", sub: warn ? `${warn} warning${warn > 1 ? "s" : ""}` : "All checks passed" };
}

// ─── lifetime bar ────────────────────────────────────────────────────────────

export interface Timeline {
  /** 0–100, where "now" sits between start and exp. */
  nowPct: number;
  nbfPct: number | null;
  expired: boolean;
  nowLabel: string;
  /** Label anchoring so it never overflows the bar. */
  nowAlign: "start" | "center" | "end";
  startLabel: string;
  endLabel: string;
  lifetime: string;
}

function alignFor(pct: number): Timeline["nowAlign"] {
  if (pct > 80) return "end";
  if (pct < 20) return "start";
  return "center";
}

export function timelineFor(payload: Record<string, unknown>, now: number): Timeline | null {
  const { exp, iat, nbf } = payload;
  if (typeof exp !== "number") return null;
  let start = exp - 3600;
  if (typeof iat === "number") start = iat;
  else if (typeof nbf === "number") start = nbf;
  const span = Math.max(exp - start, 1);
  const pct = (t: number) => Math.round(Math.max(0, Math.min(100, ((t - start) / span) * 100)) * 10) / 10;
  const nowPct = pct(now);
  const expired = now >= exp;
  return {
    nowPct,
    nbfPct: typeof nbf === "number" && nbf > start ? pct(nbf) : null,
    expired,
    nowLabel: expired ? `now · ${formatRelative(exp, now).replace(" ago", "")} after expiry` : "now",
    nowAlign: alignFor(nowPct),
    startLabel: `${typeof iat === "number" ? "issued" : "start"} ${formatUtcClock(start)}`,
    endLabel: `expires ${formatUtcClock(exp)}`,
    lifetime: `Lifetime ${formatDuration(span)}`,
  };
}

// ─── claim meanings ──────────────────────────────────────────────────────────

export const CLAIM_MEANINGS: Readonly<Record<string, string>> = {
  iss: "Issuer",
  sub: "Subject (who the token is about)",
  aud: "Audience (who it's for)",
  exp: "Expires",
  nbf: "Not valid before",
  iat: "Issued at",
  jti: "Token ID (for revocation)",
  azp: "Authorized party",
  scope: "Granted scopes",
  scp: "Granted scopes",
  auth_time: "Time of login",
  nonce: "Replay protection",
  name: "Full name",
  email: "Email",
  email_verified: "Email verified",
  roles: "Roles",
  sid: "Session ID",
  kid: "Key ID (picks the key in a JWKS)",
  alg: "Signing algorithm",
  typ: "Token type",
  cty: "Content type",
};

export const TIME_CLAIMS: ReadonlySet<string> = new Set(["exp", "iat", "nbf", "auth_time"]);
