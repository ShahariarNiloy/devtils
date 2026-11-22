"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { runChecks, timelineFor, verdictFor, type SigState } from "./jwt-checks";
import { jwksUrlFor } from "./jwt-claims";
import {
  findUnsafeIntegerClaims,
  isPlainObject,
  parseJwt,
  prettyJsonText,
  topLevelRawValues,
} from "./jwt-decoder.lib";
import { isParseError, type Mode, type ParsedJwt, type VerificationResult } from "./jwt-decoder.types";
import { applyPayloadAction, headerAlg, setHeaderAlg, signInputError, signJwt, type PayloadAction, type SignResult } from "./jwt-encode";
import { buildSamples, SAMPLE_IDS, SAMPLE_NOW, SAMPLE_SECRET, STATIC_SAMPLES, type Sample, type SampleId } from "./jwt-samples";
import { verifyJwt } from "./jwt-verify";
import { useNowSeconds } from "./workspace/use-now";

export type PayloadView = "claims" | "json";
export type MobilePart = "payload" | "header" | "signature";
export type JwksFetch =
  | { status: "idle" }
  | { status: "loading"; url: string }
  | { status: "done"; url: string; count: number }
  | { status: "error"; url: string; message: string };

const LEEWAYS = [0, 30, 60, 300] as const;
export type Leeway = (typeof LEEWAYS)[number];
export { LEEWAYS };

/** Wait before verifying, so typing a PEM doesn't import a key per keystroke. */
const VERIFY_DELAY_MS = 90;
const SIGN_DELAY_MS = 60;
const JWKS_TIMEOUT_MS = 10_000;
const JWKS_MAX_BYTES = 1_000_000;
const MIN_SECRET_BYTES: Readonly<Record<string, number>> = { HS256: 32, HS384: 48, HS512: 64 };

function randomJti(): string {
  const b = crypto.getRandomValues(new Uint8Array(3));
  return `tok_${Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** Everything derived from one parsed token (memoised per token). */
function useDecoded(jwt: ParsedJwt | null) {
  return useMemo(() => {
    if (!jwt) return null;
    const raw = topLevelRawValues(jwt.payloadJson);
    return {
      raw,
      unsafe: findUnsafeIntegerClaims(raw),
      headerPretty: prettyJsonText(jwt.headerJson),
      payloadPretty: prettyJsonText(jwt.payloadJson),
    };
  }, [jwt]);
}

export function useJwtDecoder() {
  const [mode, setMode] = useState<Mode>("decode");
  const [samples, setSamples] = useState<Record<SampleId, Sample>>(STATIC_SAMPLES);
  const [samplesFresh, setSamplesFresh] = useState(false);

  // ── Token ─────────────────────────────────────────────────────────────────
  const [token, setTokenRaw] = useState(STATIC_SAMPLES.valid.token);
  // Decoding is cheap, but a deferred value keeps typing in a huge token
  // smooth: the editor updates first, the decoded panes follow.
  const deferredToken = useDeferredValue(token);
  const parsed = useMemo(() => parseJwt(deferredToken), [deferredToken]);
  const jwt = isParseError(parsed) ? null : parsed;
  const parseError = isParseError(parsed) ? parsed : null;
  const decoded = useDecoded(jwt);

  const activeSample = useMemo(() => {
    const t = token.trim();
    return SAMPLE_IDS.find((id) => samples[id].token === t) ?? null;
  }, [samples, token]);

  // Static samples tell their story at SAMPLE_NOW (also the server render);
  // everything else runs on the real clock.
  const times = useMemo(() => {
    if (!jwt) return [];
    return [jwt.payload.exp, jwt.payload.nbf, jwt.payload.iat].filter((t): t is number => typeof t === "number");
  }, [jwt]);
  const liveNow = useNowSeconds(times, SAMPLE_NOW);
  const now = !samplesFresh && activeSample ? SAMPLE_NOW : liveNow;

  // ── Verification key + options ────────────────────────────────────────────
  const [keyText, setKeyText] = useState(SAMPLE_SECRET);
  const [b64Secret, setB64Secret] = useState(false);
  const [leeway, setLeeway] = useState<Leeway>(60);
  const [expectedIss, setExpectedIss] = useState("");
  const [expectedAud, setExpectedAud] = useState("");
  const [payloadView, setPayloadView] = useState<PayloadView>("claims");
  const [mobilePart, setMobilePart] = useState<MobilePart>("payload");

  const canVerify = !!jwt && jwt.alg.kind === "supported" && jwt.segments.signature !== "";
  const hasKey = jwt?.alg.kind === "supported" && jwt.alg.name.startsWith("HS") ? keyText.length > 0 : keyText.trim().length > 0;
  const verifyKey = jwt && canVerify && hasKey ? `${jwt.raw}\u0000${keyText}\u0000${b64Secret ? 1 : 0}` : null;

  const [verified, setVerified] = useState<{ key: string; result: VerificationResult } | null>(null);
  useEffect(() => {
    if (!verifyKey || !jwt) return;
    let cancelled = false;
    const id = setTimeout(() => {
      void verifyJwt(jwt, keyText, { secretIsBase64Url: b64Secret }).then((result) => {
        if (!cancelled) setVerified({ key: verifyKey, result });
      });
    }, VERIFY_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [verifyKey, jwt, keyText, b64Secret]);

  let sig: SigState;
  if (!verifyKey) sig = { kind: "nokey" };
  else if (verified?.key === verifyKey) sig = { kind: "done", result: verified.result };
  else sig = { kind: "checking" };

  // A handful of comparisons — cheaper than memoising.
  const checks = jwt ? runChecks({ jwt, now, leeway, expectedIss, expectedAud, sig }) : [];
  const verdict = jwt ? verdictFor(checks, jwt, sig) : null;
  const timeline = jwt ? timelineFor(jwt.payload, now) : null;

  // ── Fetch issuer's keys (explicit click only) ─────────────────────────────
  const jwksUrl = jwt && jwt.alg.kind === "supported" && !jwt.alg.name.startsWith("HS") ? jwksUrlFor(jwt.payload.iss) : null;
  const [jwksFetch, setJwksFetch] = useState<JwksFetch>({ status: "idle" });
  const fetchAbort = useRef<AbortController | null>(null);
  const fetchIssuerKeys = useCallback(async () => {
    if (!jwksUrl) return;
    fetchAbort.current?.abort();
    const ac = new AbortController();
    fetchAbort.current = ac;
    const timer = setTimeout(() => ac.abort(), JWKS_TIMEOUT_MS);
    setJwksFetch({ status: "loading", url: jwksUrl });
    try {
      // A plain GET to the issuer: no cookies, no referrer, nothing from
      // the token in the URL, headers or body.
      const res = await fetch(jwksUrl, {
        method: "GET",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        signal: ac.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`The issuer answered ${res.status}.`);
      const text = await res.text();
      if (text.length > JWKS_MAX_BYTES) throw new Error("That response is too large to be a JWKS.");
      let json: unknown;
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        throw new Error("The issuer didn't return JSON.");
      }
      if (!isPlainObject(json) || !Array.isArray(json.keys)) throw new Error("That URL didn't return a JWKS.");
      if (fetchAbort.current !== ac) return;
      setKeyText(JSON.stringify(json, null, 2));
      setJwksFetch({ status: "done", url: jwksUrl, count: json.keys.length });
      toast.success(`Fetched ${json.keys.length} ${json.keys.length === 1 ? "key" : "keys"} from the issuer`);
    } catch (e) {
      if (fetchAbort.current !== ac) return;
      let message: string;
      if (ac.signal.aborted) message = "The issuer didn't answer in 10 seconds.";
      else if (e instanceof TypeError) {
        message = "The browser couldn't read the issuer's keys. Most issuers block cross-site requests (CORS). Open the URL yourself and paste the JSON.";
      } else message = e instanceof Error ? e.message : "Couldn't fetch the keys.";
      setJwksFetch({ status: "error", url: jwksUrl, message });
    } finally {
      clearTimeout(timer);
    }
  }, [jwksUrl]);
  useEffect(() => () => fetchAbort.current?.abort(), []);

  // ── Token actions ─────────────────────────────────────────────────────────
  const [encPayload, setEncPayload] = useState<string | null>(null);
  const [encHeader, setEncHeader] = useState<string | null>(null);

  const resetForNewToken = useCallback(() => {
    setEncPayload(null);
    // A key fetch still in flight belongs to the previous token's issuer.
    fetchAbort.current?.abort();
    fetchAbort.current = null;
    setJwksFetch({ status: "idle" });
  }, []);

  const setToken = useCallback(
    (v: string) => {
      setTokenRaw(v);
      resetForNewToken();
    },
    [resetForNewToken],
  );

  const pickSample = useCallback(
    (id: SampleId) => {
      setTokenRaw(samples[id].token);
      setKeyText(samples[id].key);
      setB64Secret(false);
      setEncHeader(null);
      resetForNewToken();
    },
    [samples, resetForNewToken],
  );

  const clear = useCallback(() => {
    setTokenRaw("");
    setKeyText("");
    resetForNewToken();
  }, [resetForNewToken]);

  // Re-sign the samples against the real clock once on the client, and
  // swap in the fresh copy if a static sample is still on screen.
  useEffect(() => {
    let cancelled = false;
    void buildSamples(Math.floor(Date.now() / 1000))
      .then((fresh) => {
        if (cancelled) return;
        setSamples(fresh);
        setSamplesFresh(true);
        setTokenRaw((t) => {
          const id = SAMPLE_IDS.find((s) => STATIC_SAMPLES[s].token === t.trim());
          return id ? fresh[id].token : t;
        });
      })
      .catch(() => {
        // Web Crypto unavailable (very old browser / insecure context):
        // keep the static samples on their frozen clock.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Share links carry the token in the #hash (never sent to a server).
  useEffect(() => {
    const m = window.location.hash.match(/token=([^&]+)/);
    if (!m) return;
    let t: string;
    try {
      t = decodeURIComponent(m[1]);
    } catch {
      return;
    }
    const id = setTimeout(() => {
      setTokenRaw(t);
      setKeyText("");
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const shareLink = useCallback(() => {
    return `${window.location.origin}${window.location.pathname}#token=${encodeURIComponent(token.trim())}`;
  }, [token]);

  // ── Encode / sign ─────────────────────────────────────────────────────────
  const [encAltAlg, setEncAltAlg] = useState("HS256");
  const [encSecret, setEncSecret] = useState(SAMPLE_SECRET);
  const [encPrivateKey, setEncPrivateKey] = useState("");
  const [defaultNow] = useState(() => Math.floor(Date.now() / 1000));

  const encHeaderText = encHeader ?? prettyJsonText(JSON.stringify({ alg: encAltAlg, typ: "JWT" }));
  const encPayloadText =
    encPayload ??
    (decoded ? decoded.payloadPretty : prettyJsonText(JSON.stringify({ sub: "usr_9f2a", iat: defaultNow, exp: defaultNow + 3600 })));
  const encAlg = headerAlg(encHeaderText) ?? encAltAlg;
  const encIsHs = /^HS/.test(encAlg);
  const encKeyText = encIsHs ? encSecret : encPrivateKey;
  const signInput = { headerText: encHeaderText, payloadText: encPayloadText, keyText: encKeyText };
  const encSyncError = mode === "encode" ? signInputError(signInput) : null;
  const signKey = mode === "encode" && !encSyncError ? `${encHeaderText}\u0000${encPayloadText}\u0000${encKeyText}` : null;

  const [signed, setSigned] = useState<{ key: string; result: SignResult } | null>(null);
  useEffect(() => {
    if (!signKey) return;
    let cancelled = false;
    const id = setTimeout(() => {
      void signJwt({ headerText: encHeaderText, payloadText: encPayloadText, keyText: encKeyText }).then((result) => {
        if (!cancelled) setSigned({ key: signKey, result });
      });
    }, SIGN_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [signKey, encHeaderText, encPayloadText, encKeyText]);

  let encState: { kind: "error"; message: string } | { kind: "signing" } | { kind: "ok"; token: string; checkKey: string } | { kind: "idle" };
  if (encSyncError) encState = { kind: "error", message: encSyncError };
  else if (!signKey) encState = { kind: "idle" };
  else if (signed?.key !== signKey) encState = { kind: "signing" };
  else if (signed.result.ok) encState = { kind: "ok", token: signed.result.token, checkKey: signed.result.checkKey };
  else encState = { kind: "error", message: signed.result.error };

  // RFC 7518 §3.2: an HMAC key should be at least as long as the hash.
  const minSecretBytes = MIN_SECRET_BYTES[encAlg] ?? 32;
  const weakSecret = encIsHs && encSecret.length > 0 && new TextEncoder().encode(encSecret).length < minSecretBytes ? minSecretBytes : null;

  const pickEncAlg = useCallback(
    (alg: string) => {
      setEncAltAlg(alg);
      setEncHeader(setHeaderAlg(encHeaderText, alg));
    },
    [encHeaderText],
  );

  const payloadAction = useCallback(
    (kind: "plusHour" | "expire" | "iatNow" | "jti") => {
      const nowS = Math.floor(Date.now() / 1000);
      const action: PayloadAction = kind === "jti" ? { kind, id: randomJti() } : { kind, now: nowS };
      const next = applyPayloadAction(encPayloadText, action);
      if (next === null) {
        toast.error("Fix the payload JSON first");
        return;
      }
      setEncPayload(next);
    },
    [encPayloadText],
  );

  const checkInDecoder = useCallback(() => {
    if (encState.kind !== "ok") return;
    setTokenRaw(encState.token);
    setKeyText(encState.checkKey);
    setB64Secret(false);
    setJwksFetch({ status: "idle" });
    setMode("decode");
  }, [encState]);

  // ── Compare ───────────────────────────────────────────────────────────────
  const [diffA, setDiffA] = useState("");
  const [diffB, setDiffB] = useState("");

  return {
    mode,
    setMode,
    // token
    token,
    setToken,
    clear,
    jwt,
    parseError,
    decoded,
    now,
    samples,
    activeSample,
    pickSample,
    shareLink,
    // checks
    checks,
    verdict,
    timeline,
    leeway,
    setLeeway,
    expectedIss,
    setExpectedIss,
    expectedAud,
    setExpectedAud,
    // views
    payloadView,
    setPayloadView,
    mobilePart,
    setMobilePart,
    // verify
    keyText,
    setKeyText,
    b64Secret,
    setB64Secret,
    sig,
    jwksUrl,
    jwksFetch,
    fetchIssuerKeys,
    // encode
    encHeaderText,
    setEncHeader,
    encPayloadText,
    setEncPayload,
    encAlg,
    pickEncAlg,
    encIsHs,
    encSecret,
    setEncSecret,
    encPrivateKey,
    setEncPrivateKey,
    encState,
    weakSecret,
    payloadAction,
    checkInDecoder,
    // compare
    diffA,
    setDiffA,
    diffB,
    setDiffB,
  };
}

export type JwtDecoderState = ReturnType<typeof useJwtDecoder>;
