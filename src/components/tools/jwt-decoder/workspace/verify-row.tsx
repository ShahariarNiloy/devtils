"use client";

import { cn } from "@/lib/cn";
import type { JwtDecoderState } from "../useJwtDecoder";
import { SAMPLE_SECRET } from "../useJwtDecoder";

/**
 * "Verify signature · optional, HS256" (mockup): one key field + a live
 * verdict chip. HS* takes a secret; RS/PS/ES take a PEM, JWK or pasted
 * JWKS. alg:none is refused honestly instead of hiding the row.
 */
export function VerifyRow({ state }: { state: JwtDecoderState }) {
  const { jwt, verification, verifying, keyMaterial } = state;
  const alg = jwt?.header.alg ?? "HS256";
  const isNone = jwt?.header.alg === "none";
  const isHmac = alg.startsWith("HS");
  const hasKey = keyMaterial.trim().length > 0;

  let chip: { label: string; tone: string };
  if (!jwt) chip = { label: "Not verified", tone: "bg-white/5 text-text-tertiary" };
  else if (isNone) chip = { label: "Unsigned token", tone: "bg-error/14 text-error-text" };
  else if (!hasKey) chip = { label: "Not verified", tone: "bg-white/5 text-text-tertiary" };
  else if (verifying && !verification) chip = { label: "Checking…", tone: "bg-white/5 text-text-tertiary" };
  else if (verification?.status === "valid") chip = { label: "✓ Signature valid", tone: "bg-success/14 text-success-text" };
  else if (verification?.status === "unsupported") chip = { label: "Can't verify", tone: "bg-warning/14 text-warning-text" };
  else if (verification) chip = { label: "✕ Doesn't match", tone: "bg-error/14 text-error-text" };
  else chip = { label: "Checking…", tone: "bg-white/5 text-text-tertiary" };

  // Say *why* when it's not a plain mismatch (bad key format, no kid…).
  const reason =
    verification && verification.status !== "valid" && verification.reason !== "Signature does not match."
      ? verification.reason
      : null;

  let placeholder = "Public key — PEM, JWK or JWKS JSON";
  if (isHmac) placeholder = state.isSample ? `Secret — try ${SAMPLE_SECRET}` : "Secret used to sign the token";

  const field = cn(
    "min-w-0 grow rounded-[10px] border border-white/10 bg-[#0d0d0c] font-mono text-[13px] text-text outline-none transition-colors placeholder:text-placeholder focus:border-clay-light/50",
  );

  return (
    <div className="mt-auto flex flex-col gap-2.5 border-t border-border-subtle px-4 py-3.5">
      <div className="text-[13px] font-bold">
        Verify signature{" "}
        <span className="font-medium text-text-faint">
          · {isNone ? "alg is none — nothing to verify" : `optional, ${alg}`}
        </span>
      </div>
      {!isNone && (
        <div className="flex flex-wrap gap-2">
          {isHmac ? (
            <input
              type="text"
              aria-label="Secret"
              value={keyMaterial}
              onChange={(e) => state.setKeyMaterial(e.target.value)}
              placeholder={placeholder}
              spellCheck={false}
              autoComplete="off"
              disabled={!jwt}
              className={cn(field, "min-h-11 basis-[200px] px-3 disabled:opacity-50")}
            />
          ) : (
            <textarea
              aria-label="Public key"
              value={keyMaterial}
              onChange={(e) => state.setKeyMaterial(e.target.value)}
              placeholder={placeholder}
              spellCheck={false}
              rows={3}
              disabled={!jwt}
              className={cn(field, "basis-[200px] resize-y px-3 py-2.5 leading-[1.6] disabled:opacity-50")}
            />
          )}
          <span
            role="status"
            className={cn("inline-flex min-h-11 items-center gap-[7px] self-start rounded-[10px] px-3.5 text-[13px] font-semibold", chip.tone)}
          >
            {chip.label}
          </span>
        </div>
      )}
      {(reason || state.jwksNote) && (
        <p className={cn("m-0 text-xs", reason ? "text-error-text" : "text-text-faint")}>{reason ?? state.jwksNote}</p>
      )}
    </div>
  );
}
