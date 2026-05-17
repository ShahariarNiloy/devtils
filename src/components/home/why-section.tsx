"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { highlightJson } from "@/components/tools/json-formatter/json-highlighter";
import { Band } from "./band";
import { SectionHeading } from "./section-heading";

/**
 * "Try one before you trust us" — a real, fully client-side JWT decoder
 * embedded on the homepage. It *demonstrates* the privacy claim instead of
 * asserting it: decoding is synchronous, in-browser, and the status bar
 * truthfully reports zero bytes sent. Nothing here touches a server.
 */

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildSample(): string {
  const header = b64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64urlEncode(
    JSON.stringify({
      sub: "1234567890",
      name: "Abrar",
      iat: 1730864000,
      exp: 1730950400,
      role: "admin",
    }),
  );
  return `${header}.${payload}.kJ8YJsHvOmGqXr3vP2zZxK9wD4nF7mLcVbE6tQyR8uA`;
}

function b64urlDecode(seg: string): string {
  const b64 = seg.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

interface Decoded {
  ok: boolean;
  header?: string;
  payload?: string;
  signature?: string;
  ms: number;
  error?: string;
}

function decodeJwt(token: string): Decoded {
  const t0 =
    typeof performance !== "undefined" ? performance.now() : 0;
  try {
    const parts = token.trim().split(".");
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      throw new Error("A JWT has three dot-separated segments.");
    }
    const header = JSON.parse(b64urlDecode(parts[0])) as unknown;
    const payload = JSON.parse(b64urlDecode(parts[1])) as unknown;
    const ms =
      (typeof performance !== "undefined" ? performance.now() : 0) - t0;
    return {
      ok: true,
      header: JSON.stringify(header, null, 2),
      payload: JSON.stringify(payload, null, 2),
      signature: parts[2] ?? "",
      ms,
    };
  } catch (e) {
    return {
      ok: false,
      ms: 0,
      error: e instanceof Error ? e.message : "Could not decode this token.",
    };
  }
}

export function WhySection() {
  const [token, setToken] = useState<string>(buildSample);
  const result = useMemo(() => decodeJwt(token), [token]);

  const timing = result.ms < 1 ? "<1 ms" : `${result.ms.toFixed(1)} ms`;

  return (
    <Band aria-label="Why devtils" className="pt-14 pb-16">
      <SectionHeading
        eyebrow="Why devtils"
        title="Try one before you trust us."
        hint="A real, working JWT decoder. Right here on the homepage. Nothing uploaded — open your network tab and watch."
      />

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        {/* Tool header */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border-subtle bg-surface-soft px-4 py-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              background: "var(--color-mist-sage)",
              color: "var(--color-olive-ink)",
            }}
            aria-hidden
          >
            <Lock size={15} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-text">
              JWT decoder
            </span>
            <span className="block font-mono text-[11px] text-text-faint">
              /tools/jwt-decoder
            </span>
          </span>
          <span className="ml-auto flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-faint">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--color-success)" }}
                aria-hidden
              />
              Running locally
            </span>
            <Link
              href="/tools/jwt-decoder"
              className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted transition-colors hover:text-text"
            >
              Open full tool
              <ArrowUpRight size={12} aria-hidden />
            </Link>
          </span>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Input */}
          <div className="flex flex-col border-b border-border-subtle lg:border-b-0 lg:border-r">
            <span className="px-4 pt-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-text-faint">
              Paste a token
            </span>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              spellCheck={false}
              aria-label="JWT token input"
              className="min-h-[260px] flex-1 resize-none break-all bg-transparent px-4 py-3 font-mono text-[12.5px] leading-[1.7] text-text outline-none placeholder:text-text-faint"
              placeholder="eyJhbGciOi…"
            />
          </div>

          {/* Decoded */}
          <div className="flex flex-col gap-3 p-4">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-faint">
              Decoded
            </span>

            {result.ok ? (
              <>
                <DecodedBlock
                  label="Header"
                  accent="var(--color-clay)"
                  html={highlightJson(result.header ?? "")}
                />
                <DecodedBlock
                  label="Payload"
                  accent="var(--color-success)"
                  html={highlightJson(result.payload ?? "")}
                />
                <div>
                  <span className="mb-1 block font-mono text-[10.5px] font-semibold uppercase tracking-wider text-text-faint">
                    Signature
                  </span>
                  <div className="break-all rounded-lg border border-border bg-surface-soft px-3 py-2.5 font-mono text-[11.5px] text-text-muted">
                    {result.signature || "—"}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-border bg-surface-soft px-3 py-6 text-center text-sm text-text-faint">
                {result.error}
              </div>
            )}
          </div>
        </div>

        {/* Status bar — the proof */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border-subtle bg-surface-soft px-4 py-2.5 font-mono text-[11px] text-text-faint">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2
              size={12}
              aria-hidden
              style={{ color: "var(--color-success)" }}
            />
            Decoded in {timing}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={12} aria-hidden />
            Bytes sent to server&nbsp;
            <span className="font-semibold text-text-muted">0</span>
          </span>
          <button
            type="button"
            onClick={() => setToken(buildSample())}
            className="ml-auto inline-flex items-center gap-1 font-semibold text-text-muted transition-colors hover:text-text"
          >
            Try a sample
            <ArrowUpRight size={11} aria-hidden />
          </button>
        </div>
      </div>
    </Band>
  );
}

function DecodedBlock({
  label,
  accent,
  html,
}: {
  label: string;
  accent: string;
  html: string;
}) {
  return (
    <div>
      <span className="mb-1 block font-mono text-[10.5px] font-semibold uppercase tracking-wider text-text-faint">
        {label}
      </span>
      <pre
        className="overflow-x-auto rounded-lg border border-border px-3 py-2.5 font-mono text-[12px] leading-[1.6] text-text"
        style={{
          borderLeft: `3px solid ${accent}`,
          background: `color-mix(in oklab, ${accent} 7%, var(--color-surface))`,
        }}
      >
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
