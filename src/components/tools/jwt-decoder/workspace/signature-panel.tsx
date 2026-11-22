"use client";

import { cn } from "@/lib/cn";
import { isHmac } from "../jwt-checks";
import { isUnsigned } from "../jwt-decoder.lib";
import type { ParsedJwt } from "../jwt-decoder.types";
import { unsupportedReason } from "../jwt-verify";
import type { JwtDecoderState } from "../useJwtDecoder";
import { InlineSwitch, OutlineButton, Swatch, SEG_TONE, WARN_TEXT } from "./ui";
import { partClass } from "./decoded-parts";

/**
 * "Verify signature": the key field (secret, or PEM / JWK / JWKS), the
 * Base64URL-secret switch for HS, the explicit "Fetch issuer's keys"
 * action for RS/PS/ES, and a live verdict chip.
 */
export function SignaturePanel({ state, jwt }: { state: JwtDecoderState; jwt: ParsedJwt }) {
  const { sig, jwksFetch } = state;
  const hs = isHmac(jwt);
  const unsigned = isUnsigned(jwt);
  const unsupported = !unsigned && jwt.alg.kind !== "supported";
  const keyerror = sig.kind === "done" && sig.result.status === "keyerror" ? sig.result.reason : null;
  const note = sig.kind === "done" && sig.result.status !== "keyerror" ? sig.result.note : null;
  const mismatchReason = sig.kind === "done" && sig.result.status === "invalid" ? sig.result.reason : null;

  let chip: { label: string; cls: string } | null = null;
  if (sig.kind === "checking") chip = { label: "Checking…", cls: "text-text-tertiary" };
  else if (sig.kind === "done" && sig.result.status === "valid") chip = { label: "✓ Verified", cls: "rounded-full bg-success/14 px-[9px] py-[3px] font-bold text-success-text" };
  else if (sig.kind === "done" && sig.result.status === "invalid") chip = { label: "✕ Doesn't match", cls: "rounded-full bg-error/14 px-[9px] py-[3px] font-bold text-error-text" };
  else if (keyerror) chip = { label: "Key unreadable", cls: cn("rounded-full bg-clay-light/14 px-[9px] py-[3px] font-bold", WARN_TEXT) };

  const field =
    "resize-y rounded-[10px] border border-border bg-bg px-3 py-2.5 font-mono text-xs leading-normal break-all text-syntax-plain outline-none placeholder:text-placeholder focus:border-white/20";

  return (
    <section aria-label="Signature" className={cn("overflow-hidden rounded-[14px] border border-white/7", partClass("signature", state.mobilePart))}>
      <div className="flex items-center gap-2 border-b border-white/5 bg-surface px-3 py-2.5">
        <Swatch className={SEG_TONE.signature.bg} />
        <span className="grow text-[13px] font-bold">Verify signature</span>
        <span aria-live="polite" className="text-xs">
          {chip && <span className={chip.cls}>{chip.label}</span>}
        </span>
      </div>

      {unsigned && (
        <p className="m-0 bg-[#0d0d0c] p-3.5 text-[13px] text-error-text">
          This token has no signature. Anyone can write one like it, so a server must never accept it.
        </p>
      )}
      {unsupported && jwt.alg.kind !== "supported" && (
        <p className={cn("m-0 bg-[#0d0d0c] p-3.5 text-[13px]", WARN_TEXT)}>{unsupportedReason(jwt.alg)}</p>
      )}

      {!unsigned && !unsupported && (
        <div className="flex flex-col gap-2.5 bg-[#0d0d0c] px-3.5 py-3">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-text-strong">
            {hs ? "Secret" : "Public key (PEM, JWK or JWKS)"}
            <textarea
              value={state.keyText}
              onChange={(e) => state.setKeyText(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              placeholder={hs ? "The HMAC secret used to sign this token" : '-----BEGIN PUBLIC KEY-----\n…\nor {"kty":"RSA",…} or {"keys":[…]}'}
              className={cn(field, hs ? "h-16" : "h-[150px] md:h-32")}
            />
          </label>
          {hs && (
            <InlineSwitch checked={state.b64Secret} onChange={state.setB64Secret}>
              Secret is Base64URL-encoded
            </InlineSwitch>
          )}
          {!hs && state.jwksUrl && (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-[10px] border border-dashed border-white/12 px-3 py-2.5">
              <OutlineButton onClick={() => void state.fetchIssuerKeys()} disabled={jwksFetch.status === "loading"}>
                {jwksFetch.status === "loading" ? "Fetching…" : "Fetch issuer's keys"}
              </OutlineButton>
              <span className="flex-[1_1_200px] text-xs [overflow-wrap:anywhere] text-text-faint">
                Only when you click. One request to <span className="font-mono text-text-tertiary">{state.jwksUrl}</span>. Your token is
                never sent.
              </span>
              {jwksFetch.status === "done" && jwksFetch.url === state.jwksUrl && (
                <span role="status" className="basis-full text-xs text-success-text">
                  Fetched {jwksFetch.count} {jwksFetch.count === 1 ? "key" : "keys"}. They&apos;re in the key field above.
                </span>
              )}
              {jwksFetch.status === "error" && jwksFetch.url === state.jwksUrl && (
                <span role="alert" className={cn("basis-full text-xs", WARN_TEXT)}>
                  {jwksFetch.message}
                </span>
              )}
            </div>
          )}
          {keyerror && <span className={cn("text-xs", WARN_TEXT)}>{keyerror}</span>}
          {mismatchReason && <span className="text-xs text-error-text">{mismatchReason}</span>}
          {note && !keyerror && <span className="text-xs text-text-faint">{note}</span>}
        </div>
      )}
    </section>
  );
}
