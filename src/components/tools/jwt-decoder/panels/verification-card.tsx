"use client";

import { Button } from "@/components/primitives/button";
import { ShieldCheck } from "lucide-react";
import { Card, CardCaption, Section } from "../parts/card";
import { VerifyStatus } from "../parts/verify-status";
import type { JwtDecoderState } from "../useJwtDecoder";

export function VerificationCard({ state }: { state: JwtDecoderState }) {
  const { jwt } = state;
  if (!jwt) return null;

  const alg = jwt.header.alg;
  const isHmac = alg.startsWith("HS");
  const isNone = alg === "none";
  const secretLabel = isHmac ? "Secret" : "Public key";

  return (
    <Section
      title="JWT Signature Verification"
      aside={
        <span className="text-sm font-medium uppercase tracking-tag text-text-faint">
          Optional
        </span>
      }
      status={
        <div className="flex flex-col gap-1">
          <VerifyStatus verification={state.verification} />
          {state.jwksNote && (
            <span className="text-sm text-text-faint">{state.jwksNote}</span>
          )}
        </div>
      }
    >
      <p className="text-sm text-text-faint">
        Algorithm <span className="font-mono text-text-muted">{alg}</span>
        {isNone && (
          <span className="ml-1.5" style={{ color: "var(--color-danger)" }}>
            · unsigned — nothing to verify
          </span>
        )}
        {!isNone && " — enter the key used to sign the JWT below."}
      </p>

      {!isNone && (
        <div className="mt-2 flex flex-col gap-3">
          <Card left={<CardCaption>{secretLabel}</CardCaption>}>
            <textarea
              value={state.keyMaterial}
              onChange={(e) => state.setKeyMaterial(e.target.value)}
              spellCheck={false}
              aria-label={secretLabel}
              placeholder={
                isHmac
                  ? "a-string-secret-at-least-256-bits-long"
                  : "-----BEGIN PUBLIC KEY-----"
              }
              className="h-20 w-full resize-none rounded-lg bg-bg p-3 font-mono text-base text-text outline-none"
            />
          </Card>

          <details className="rounded-lg border border-border bg-surface [&_summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-text-muted">
              Verify with a JWKS endpoint or JSON instead
            </summary>
            <div className="px-3 pb-3">
              <textarea
                value={state.jwks}
                onChange={(e) => state.setJwksInput(e.target.value)}
                spellCheck={false}
                placeholder="https://issuer/.well-known/jwks.json — or paste JWKS JSON"
                className="h-16 w-full resize-none rounded-lg border border-border bg-bg p-2.5 font-mono text-base text-text outline-none"
              />
            </div>
          </details>

          <div>
            <Button
              variant="primary"
              size="sm"
              disabled={state.verifying}
              onClick={() => void state.runVerify()}
            >
              <ShieldCheck size={14} aria-hidden />
              {state.verifying ? "Verifying…" : "Verify signature"}
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}
