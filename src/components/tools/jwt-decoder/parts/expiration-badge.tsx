"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { ParsedJwt } from "../jwt-decoder.types";

type State = "valid" | "expired" | "early" | "none";

function compute(jwt: ParsedJwt, now: number): { state: State; exp?: number } {
  const exp = typeof jwt.payload.exp === "number" ? jwt.payload.exp : undefined;
  const nbf = typeof jwt.payload.nbf === "number" ? jwt.payload.nbf : undefined;
  const s = now / 1000;
  if (nbf !== undefined && s < nbf) return { state: "early", exp };
  if (exp === undefined) return { state: "none" };
  return { state: s > exp ? "expired" : "valid", exp };
}

function fmtCountdown(secondsLeft: number): string {
  const m = Math.floor(secondsLeft / 60);
  const sec = Math.floor(secondsLeft % 60);
  return `${m}m ${sec}s remaining`;
}

export function ExpirationBadge({ jwt }: { jwt: ParsedJwt }) {
  const [now, setNow] = useState(() => Date.now());
  const { state, exp } = compute(jwt, now);

  const liveCountdown =
    state === "valid" &&
    exp !== undefined &&
    exp * 1000 - now < 3600000;

  useEffect(() => {
    if (!liveCountdown) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [liveCountdown]);

  if (state === "none") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold"
        style={{
          background: "var(--color-surface-soft)",
          color: "var(--color-text-muted)",
        }}
      >
        <Clock size={12} aria-hidden />
        No expiry
      </span>
    );
  }

  if (state === "valid") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold"
        style={{
          background: "color-mix(in oklab, var(--color-success) 16%, transparent)",
          color: "var(--color-success)",
        }}
      >
        <CheckCircle2 size={12} aria-hidden />
        {liveCountdown && exp !== undefined
          ? fmtCountdown((exp * 1000 - now) / 1000)
          : "Valid"}
      </span>
    );
  }

  if (state === "expired") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold"
        style={{
          background: "color-mix(in oklab, var(--color-danger) 16%, transparent)",
          color: "var(--color-danger)",
        }}
      >
        <AlertCircle size={12} aria-hidden />
        Expired
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold"
      style={{
        background: "var(--color-mist-sage)",
        color: "var(--color-charcoal)",
      }}
    >
      <Clock size={12} aria-hidden />
      Not yet active
    </span>
  );
}
