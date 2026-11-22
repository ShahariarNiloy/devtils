"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import { classifyAlg } from "../jwt-decoder.lib";
import { generateTestKey } from "../jwt-encode";
import type { JwtDecoderState } from "../useJwtDecoder";
import { OutlineButton, Segmented, Swatch, SEG_TONE, WARN_TEXT } from "../workspace/ui";

const HS_ALGS = [
  { value: "HS256", label: "HS256" },
  { value: "HS384", label: "HS384" },
  { value: "HS512", label: "HS512" },
] as const;

const OTHER_ALGS = ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512", "none"] as const;

const editor =
  "rounded-xl border border-border bg-bg px-3 py-2.5 font-mono text-[12.5px] leading-[1.6] text-syntax-plain outline-none focus:border-white/20";

const QUICK = [
  { kind: "plusHour", label: "exp +1 h" },
  { kind: "expire", label: "expire it" },
  { kind: "iatNow", label: "iat = now" },
  { kind: "jti", label: "+ jti" },
] as const;

/** "Edit & sign": header/payload editors, quick claim edits, alg + key, signed output. */
export function EncodePanel({ state }: { state: JwtDecoderState }) {
  const { encState, encAlg, encIsHs } = state;
  const isNone = encAlg === "none";
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const otherActive = !encIsHs && OTHER_ALGS.some((a) => a === encAlg);
  const parts = encState.kind === "ok" ? encState.token.split(".") : [];

  const copyToken = () => {
    if (encState.kind !== "ok") return;
    void navigator.clipboard.writeText(encState.token).then(
      () => {
        setCopied(true);
        if (copyTimer.current) clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(false), 1600);
      },
      () => toast.error("Couldn't reach the clipboard"),
    );
  };

  const generate = async () => {
    const info = classifyAlg(encAlg);
    if (info.kind !== "supported") return;
    setGenerating(true);
    try {
      state.setEncPrivateKey(await generateTestKey(info.name));
      toast.success(`Generated a throwaway ${info.name} key`);
    } catch {
      toast.error("This browser couldn't generate that key");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid items-stretch lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <div className="flex min-w-0 flex-col gap-3 p-4 lg:border-r lg:border-white/6">
        <label className="flex flex-col gap-1.5 text-[13px] font-bold">
          <span className="inline-flex items-center gap-2">
            <Swatch className={SEG_TONE.header.bg} />
            Header
          </span>
          <textarea
            value={state.encHeaderText}
            onChange={(e) => state.setEncHeader(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            className={cn(editor, "h-[84px] resize-none font-normal")}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-bold">
          <span className="inline-flex items-center gap-2">
            <Swatch className={SEG_TONE.payload.bg} />
            Payload
          </span>
          <textarea
            value={state.encPayloadText}
            onChange={(e) => state.setEncPayload(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            className={cn(editor, "h-[280px] resize-y font-normal")}
          />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick claim edits">
          {QUICK.map((q) => (
            <OutlineButton key={q.kind} mono onClick={() => state.payloadAction(q.kind)} className="min-h-[30px] rounded-lg border-white/12 px-2.5">
              {q.label}
            </OutlineButton>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-[13px] font-bold">Algorithm</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Segmented
              label="Algorithm"
              mono
              options={HS_ALGS}
              value={encAlg}
              onChange={state.pickEncAlg}
              itemClassName="min-h-7 px-2.5 text-xs font-normal"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/7 px-2.5 font-mono text-xs transition-colors max-md:min-h-11",
                    otherActive ? "bg-selected text-text" : "bg-[#0d0d0c] text-text-tertiary hover:text-text",
                  )}
                >
                  {otherActive ? encAlg : "RS · PS · ES"}
                  <ChevronDown size={12} aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-40">
                {OTHER_ALGS.map((a) => (
                  <DropdownMenuItem key={a} onSelect={() => state.pickEncAlg(a)} className="flex items-center gap-2 font-mono text-xs">
                    <span className="grow">{a}</span>
                    {a === encAlg && <Check size={12} aria-hidden className="text-brand" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {encIsHs && (
          <label className="flex flex-col gap-1.5 text-[13px] font-bold">
            Secret
            <input
              type="text"
              value={state.encSecret}
              onChange={(e) => state.setEncSecret(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              className="min-h-10 rounded-[10px] border border-border bg-bg px-3 font-mono text-[12.5px] font-normal text-syntax-plain outline-none focus:border-white/20 max-md:min-h-11"
            />
          </label>
        )}
        {encIsHs && state.weakSecret !== null && (
          <span className={cn("text-xs", WARN_TEXT)}>
            ! Shorter than {state.weakSecret} bytes. Fine for testing, too weak for {encAlg} in production.
          </span>
        )}
        {!encIsHs && !isNone && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <label htmlFor="jwt-enc-key" className="grow text-[13px] font-bold">
                Private key (PKCS#8 PEM or JWK)
              </label>
              <OutlineButton onClick={() => void generate()} disabled={generating} className="min-h-7 px-2.5">
                {generating ? "Generating…" : "Generate a test key"}
              </OutlineButton>
            </div>
            <textarea
              id="jwt-enc-key"
              value={state.encPrivateKey}
              onChange={(e) => state.setEncPrivateKey(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              placeholder="-----BEGIN PRIVATE KEY-----"
              className={cn(editor, "h-32 resize-y rounded-[10px] text-xs break-all")}
            />
          </div>
        )}
        {isNone && (
          <span className="text-xs text-error-text">alg none makes an unsigned token. Use it to check that your server rejects it.</span>
        )}

        <div className="flex flex-col gap-2 rounded-[14px] border border-white/7 bg-[#0d0d0c] p-3.5" aria-live="polite">
          <span className="text-[13px] font-bold">Signed token</span>
          {encState.kind === "ok" && (
            <>
              <div className="font-mono text-xs leading-[1.65] break-all">
                <span className={SEG_TONE.header.text}>{parts[0]}</span>
                <span className="text-text-ghost">.</span>
                <span className={SEG_TONE.payload.text}>{parts[1]}</span>
                <span className="text-text-ghost">.</span>
                <span className={SEG_TONE.signature.text}>{parts[2]}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyToken}
                  className="btn-action min-h-9 cursor-pointer rounded-[9px] border-0 px-3.5 text-[13px] font-bold max-md:min-h-11"
                >
                  {copied ? "Copied" : "Copy token"}
                </button>
                <OutlineButton onClick={state.checkInDecoder} className="min-h-9 rounded-[9px] px-3.5 text-[13px]">
                  Check it in the decoder
                </OutlineButton>
              </div>
            </>
          )}
          {encState.kind === "signing" && <span className="text-[13px] text-text-tertiary">Signing…</span>}
          {encState.kind === "error" && <span className="text-[13px] text-error-text">{encState.message}</span>}
        </div>
        <p className="m-0 text-xs leading-[1.6] text-text-faint">
          Signed in your browser with Web Crypto. For testing and debugging, so don&apos;t paste production signing secrets.
        </p>
      </div>
    </div>
  );
}
