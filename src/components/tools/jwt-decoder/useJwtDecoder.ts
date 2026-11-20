"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSecurityWarnings } from "./jwt-claims";
import { parseJwt } from "./jwt-decoder.lib";
import type {
  Algorithm,
  Mode,
  ParsedJwt,
  VerificationResult,
} from "./jwt-decoder.types";
import { isParseError } from "./jwt-decoder.types";
import { encodeJwt } from "./jwt-encode";
import { resolveVerificationMaterial, verifyJwt } from "./jwt-verify";

/**
 * A real HS256 token signed with the secret `utilyx-demo`, so the verify
 * field's "try utilyx-demo" hint genuinely turns green.
 */
export const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiJ1c3JfOWYyYSIsIm5hbWUiOiJBZGEgTG92ZWxhY2UiLCJyb2xlIjoiYWRtaW4iLCJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJpYXQiOjE3OTUxODY4MDAsImV4cCI6MTc5NTcxMjQwMH0." +
  "QgGdreiKTqWJos4j_d6gVkQIhcu9TflNnlHNOAJ4-V4";
export const SAMPLE_SECRET = "utilyx-demo";

const DEFAULT_ENCODE_HEADER = '{\n  "alg": "HS256",\n  "typ": "JWT"\n}';
const DEFAULT_ENCODE_PAYLOAD =
  '{\n  "iss": "utilyx.dev",\n  "sub": "utilyx",\n  "name": "utilyx",\n  "iat": 1730864000\n}';

export function useJwtDecoder() {
  const [mode, setMode] = useState<Mode>("decode");

  // ── Decode ────────────────────────────────────────────────────────────────
  const [rawInput, setRawInput] = useState<string>(SAMPLE);
  const [debounced, setDebounced] = useState<string>(SAMPLE);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(rawInput), 300);
    return () => clearTimeout(id);
  }, [rawInput]);

  const parsed = useMemo(() => parseJwt(debounced), [debounced]);
  const jwt: ParsedJwt | null = isParseError(parsed) ? null : parsed;
  const parseError = isParseError(parsed) ? parsed : null;
  const warnings = useMemo(() => (jwt ? getSecurityWarnings(jwt) : []), [jwt]);

  const forceDecode = useCallback(() => setDebounced(rawInput), [rawInput]);

  // ── Verification ──────────────────────────────────────────────────────────
  // One field: an HMAC secret, a PEM / JWK public key, or a pasted JWKS
  // document. Verification runs as you type (debounced), entirely in
  // WebCrypto — keys are never fetched.
  const [keyMaterial, setKeyMaterial] = useState("");
  const [verification, setVerification] = useState<VerificationResult | null>(
    null
  );
  const [verifying, setVerifying] = useState(false);
  const [jwksNote, setJwksNote] = useState<string | null>(null);

  const verifyNow = useCallback(
    async (token: ParsedJwt, raw: string) => {
      if (!raw.trim()) return { result: null, note: null };
      const resolved = resolveVerificationMaterial(raw, token.header.kid);
      if ("error" in resolved) {
        return {
          result: { status: "invalid", reason: resolved.error } satisfies VerificationResult,
          note: null,
        };
      }
      try {
        return {
          result: await verifyJwt(token, { material: resolved.material }),
          note: resolved.note,
        };
      } catch (e) {
        const reason = e instanceof Error ? e.message : "Verification failed.";
        return { result: { status: "invalid", reason } satisfies VerificationResult, note: null };
      }
    },
    []
  );

  // Reset verification when the token changes — derived-state-from-props
  // (sync during render) instead of an effect, so it stays a single pass.
  const [verifiedFor, setVerifiedFor] = useState(debounced);
  if (debounced !== verifiedFor) {
    setVerifiedFor(debounced);
    setVerification(null);
    setJwksNote(null);
  }

  useEffect(() => {
    if (!jwt || !keyMaterial.trim()) return;
    let cancelled = false;
    const id = setTimeout(() => {
      setVerifying(true);
      void verifyNow(jwt, keyMaterial).then(({ result, note }) => {
        if (cancelled) return;
        setVerification(result);
        setJwksNote(note);
        setVerifying(false);
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [jwt, keyMaterial, verifyNow]);

  // Clearing the field clears the verdict (no stale "valid").
  const updateKeyMaterial = useCallback((v: string) => {
    setKeyMaterial(v);
    if (!v.trim()) {
      setVerification(null);
      setJwksNote(null);
      setVerifying(false);
    }
  }, []);

  /** Immediate verify (⌘⇧V) — skips the debounce. */
  const runVerify = useCallback(async () => {
    if (!jwt) return;
    setVerifying(true);
    const { result, note } = await verifyNow(jwt, keyMaterial);
    setVerification(result);
    setJwksNote(note);
    setVerifying(false);
  }, [jwt, keyMaterial, verifyNow]);

  // ── Encode ────────────────────────────────────────────────────────────────
  const [encHeader, setEncHeader] = useState(DEFAULT_ENCODE_HEADER);
  const [encPayload, setEncPayload] = useState(DEFAULT_ENCODE_PAYLOAD);
  const [encAlg, setEncAlg] = useState<Algorithm>("HS256");
  const [encKey, setEncKey] = useState("");
  const [encoded, setEncoded] = useState("");
  const [encodeError, setEncodeError] = useState<string | null>(null);

  const runEncode = useCallback(async () => {
    setEncodeError(null);
    try {
      const header = {
        ...(JSON.parse(encHeader) as Record<string, unknown>),
        alg: encAlg,
      };
      const payload = JSON.parse(encPayload) as Record<string, unknown>;
      const token = await encodeJwt(header, payload, { material: encKey });
      setEncoded(token);
    } catch (e) {
      setEncoded("");
      setEncodeError(
        e instanceof Error ? e.message : "Could not encode — check the JSON."
      );
    }
  }, [encHeader, encPayload, encAlg, encKey]);

  // ── Diff ──────────────────────────────────────────────────────────────────
  const [diffA, setDiffA] = useState("");
  const [diffB, setDiffB] = useState("");

  // ── Helpers ───────────────────────────────────────────────────────────────
  const loadSample = useCallback(() => {
    setRawInput(SAMPLE);
    setDebounced(SAMPLE);
    setMode("decode");
  }, []);
  const clear = useCallback(() => {
    setRawInput("");
    setDebounced("");
  }, []);

  // Share via hash (never hits the server) + hydrate on mount. The hash is
  // client-only, so this must run post-mount; the state writes are deferred
  // out of the effect body (a task) to avoid a cascading-render lint trip.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.location.hash.match(/token=([^&]+)/);
    if (!m) return;
    const t = decodeURIComponent(m[1]);
    const id = setTimeout(() => {
      setRawInput(t);
      setDebounced(t);
    }, 0);
    return () => clearTimeout(id);
  }, []);
  const shareLink = useCallback(() => {
    if (typeof window === "undefined") return "";
    const url = `${window.location.origin}${window.location.pathname}#token=${encodeURIComponent(rawInput.trim())}`;
    return url;
  }, [rawInput]);

  return {
    mode,
    setMode,
    rawInput,
    setRawInput,
    jwt,
    parseError,
    warnings,
    forceDecode,
    keyMaterial,
    setKeyMaterial: updateKeyMaterial,
    verification,
    verifying,
    jwksNote,
    runVerify,
    encHeader,
    setEncHeader,
    encPayload,
    setEncPayload,
    encAlg,
    setEncAlg,
    encKey,
    setEncKey,
    encoded,
    encodeError,
    runEncode,
    diffA,
    setDiffA,
    diffB,
    setDiffB,
    loadSample,
    clear,
    shareLink,
    isSample: debounced.trim() === SAMPLE,
  };
}

export type JwtDecoderState = ReturnType<typeof useJwtDecoder>;
