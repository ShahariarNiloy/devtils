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
import { fetchJwks, parseJwks, selectJwksKey, verifyJwt } from "./jwt-verify";

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpc3MiOiJkZXZ0b29sYm94LmFwcCIsInN1YiI6ImRldnRvb2xib3giLCJuYW1lIjoiRGV2VG9vbGJveCIsInRhZ2xpbmUiOiJQcml2YWN5LWZpcnN0IGRldmVsb3BlciB1dGlsaXRpZXMsIDEwMCUgY2xpZW50LXNpZGUiLCJ0b29scyI6WyJqc29uLWZvcm1hdHRlciIsImp3dC1kZWNvZGVyIiwiYmFzZTY0IiwicmVnZXgtdGVzdGVyIiwiY29sb3ItY29udmVydGVyIl0sInJvbGUiOiJkZXZlbG9wZXIiLCJpYXQiOjE3MzA4NjQwMDAsImV4cCI6MTczMDk1MDQwMH0." +
  "kJ8YJsHvOmGqXr3vP2zZxK9wD4nF7mLcVbE6tQyR8uA";

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
  const [keyMaterial, setKeyMaterial] = useState("");
  const [jwks, setJwksInput] = useState("");
  const [verification, setVerification] = useState<VerificationResult | null>(
    null
  );
  const [verifying, setVerifying] = useState(false);
  const [jwksNote, setJwksNote] = useState<string | null>(null);

  const runVerify = useCallback(async () => {
    if (!jwt) return;
    setVerifying(true);
    setVerification(null);
    setJwksNote(null);
    try {
      let material = keyMaterial;
      const j = jwks.trim();
      if (j && !keyMaterial.trim()) {
        const keys = /^https?:\/\//.test(j) ? await fetchJwks(j) : parseJwks(j);
        const selected = selectJwksKey(keys, jwt.header.kid);
        if (!selected) {
          setVerification({
            status: "invalid",
            reason: jwt.header.kid
              ? `No JWKS key matches kid "${jwt.header.kid}".`
              : "JWKS has multiple keys but the token has no kid.",
          });
          setVerifying(false);
          return;
        }
        setJwksNote(`Using key ${selected.kid ?? "(no kid)"} from JWKS.`);
        material = JSON.stringify(selected);
      }
      const result = await verifyJwt(jwt, { material });
      setVerification(result);
    } catch (e) {
      setVerification({
        status: "invalid",
        reason: e instanceof Error ? e.message : "Verification failed.",
      });
    } finally {
      setVerifying(false);
    }
  }, [jwt, keyMaterial, jwks]);

  // Reset verification when the token changes — derived-state-from-props
  // (sync during render) instead of an effect, so it stays a single pass.
  const [verifiedFor, setVerifiedFor] = useState(debounced);
  if (debounced !== verifiedFor) {
    setVerifiedFor(debounced);
    setVerification(null);
    setJwksNote(null);
  }

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
    setKeyMaterial,
    jwks,
    setJwksInput,
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
  };
}

export type JwtDecoderState = ReturnType<typeof useJwtDecoder>;
