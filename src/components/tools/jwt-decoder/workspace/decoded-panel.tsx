"use client";

import { AlertTriangle, Copy, Info, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { STANDARD_CLAIMS, issuerLabel } from "../jwt-claims";
import { claimNote, claimTone, expiryLabel, expiryState } from "../jwt-decoder.lib";
import type { ParsedJwt, SecurityWarning } from "../jwt-decoder.types";
import type { JwtDecoderState } from "../useJwtDecoder";
import { SnippetsView } from "../views/snippets-view";
import { useNowSeconds } from "./use-now";

const VALUE_TONE = {
  string: "text-syntax-string",
  number: "text-syntax-number",
  boolean: "text-syntax-boolean",
  null: "text-syntax-punctuation",
  object: "text-syntax-plain",
} as const;

const LIFETIME_TONE = {
  valid: "bg-success/14 text-success-text",
  none: "bg-warning/14 text-warning-text",
  early: "bg-error/14 text-error-text",
  expired: "bg-error/14 text-error-text",
} as const;

const WARN_TONE: Record<SecurityWarning["severity"], { cls: string; Icon: typeof Info }> = {
  critical: { cls: "text-error-text", Icon: ShieldAlert },
  warning: { cls: "text-warning-text", Icon: AlertTriangle },
  info: { cls: "text-info-text", Icon: Info },
};

function copy(text: string, label: string) {
  void navigator.clipboard.writeText(text);
  toast.success(`${label} copied`);
}

/** Right column: summary pills, header JSON, payload claims (mockup). */
export function DecodedPanel({ state }: { state: JwtDecoderState }) {
  const { jwt, parseError, rawInput } = state;

  if (!jwt) {
    const empty = !rawInput.trim();
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3.5">
        <div className="surface-panel flex flex-col items-center gap-1.5 rounded-xl px-[18px] py-7 text-center">
          <span className="font-mono text-xl text-clay-light">a.b.c</span>
          <span className="text-[15px] font-bold">
            {empty ? "Paste a token to decode it" : "That doesn't look like a JWT"}
          </span>
          <span className="text-[13px] text-text-tertiary">A JWT is three Base64URL parts separated by dots.</span>
          {!empty && parseError && parseError.segment !== "structure" && (
            <span className="mt-1 text-xs text-error-text">
              <span className="capitalize">{parseError.segment}</span>: {parseError.message}
            </span>
          )}
        </div>
      </div>
    );
  }

  return <Decoded jwt={jwt} warnings={state.warnings} />;
}

function Decoded({ jwt, warnings }: { jwt: ParsedJwt; warnings: SecurityWarning[] }) {
  const [view, setView] = useState<"claims" | "json">("claims");
  const exp = typeof jwt.payload.exp === "number" ? jwt.payload.exp : null;
  const now = useNowSeconds(exp);
  const lifetime = expiryState(jwt.payload, now);
  const keys = Object.keys(jwt.payload);
  const headerJson = useMemo(() => JSON.stringify(jwt.header, null, 2), [jwt.header]);
  const payloadJson = useMemo(() => JSON.stringify(jwt.payload, null, 2), [jwt.payload]);

  const pills: { label: string; tone: string }[] = [
    { label: `${jwt.header.alg} · ${typeof jwt.header.typ === "string" ? jwt.header.typ : "JWT"}`, tone: "bg-white/6 text-text-strong" },
    {
      label: expiryLabel(lifetime, now),
      tone: LIFETIME_TONE[lifetime.kind],
    },
    { label: `${keys.length} ${keys.length === 1 ? "claim" : "claims"}`, tone: "bg-white/6 text-text-strong" },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 p-3.5">
      <div className="flex flex-wrap gap-2">
        {pills.map((p) => (
          <span key={p.label} className={cn("inline-flex items-center gap-[7px] rounded-full px-[11px] py-[5px] text-xs font-semibold", p.tone)}>
            {p.label}
          </span>
        ))}
      </div>

      {warnings.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Security notes">
          {warnings.map((w) => {
            const { cls, Icon } = WARN_TONE[w.severity];
            return (
              <li key={w.title} className="flex items-start gap-2 text-xs leading-[1.5]">
                <Icon size={13} aria-hidden className={cn("mt-px shrink-0", cls)} />
                <span>
                  <span className={cn("font-semibold", cls)}>{w.title}.</span>{" "}
                  <span className="text-text-faint">{w.description}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <section className="surface-panel overflow-hidden rounded-xl" aria-label="Header">
        <PanelHead tone="text-[#f2a0b9]" label="HEADER" onCopy={() => copy(headerJson, "Header JSON")} />
        <pre className="m-0 whitespace-pre-wrap break-words p-3 font-mono text-[12.5px] leading-[1.7] text-syntax-plain sm:text-[13px]">
          {headerJson}
        </pre>
      </section>

      <section className="surface-panel overflow-hidden rounded-xl" aria-label="Payload">
        <PanelHead
          tone="text-[#c3b3ff]"
          label={view === "claims" ? "PAYLOAD · CLAIMS" : "PAYLOAD · JSON"}
          onCopy={() => copy(payloadJson, "Payload JSON")}
          extra={
            <button
              type="button"
              onClick={() => setView(view === "claims" ? "json" : "claims")}
              className="min-h-7 rounded-md px-2 text-[11px] font-semibold text-text-faint transition-colors hover:bg-white/6 hover:text-text"
            >
              {view === "claims" ? "Show JSON" : "Show claims"}
            </button>
          }
        />
        {view === "json" && (
          <pre className="m-0 whitespace-pre-wrap break-words p-3 font-mono text-[12.5px] leading-[1.7] text-syntax-plain sm:text-[13px]">
            {payloadJson}
          </pre>
        )}
        {view === "claims" && keys.length === 0 && (
          <p className="m-0 px-3 py-3 text-[13px] text-text-faint">This payload has no claims.</p>
        )}
        {view === "claims" &&
          keys.map((k) => {
            const v = jwt.payload[k];
            let note = claimNote(k, v, now, STANDARD_CLAIMS);
            if (k === "iss" && typeof v === "string") {
              const provider = issuerLabel(v);
              if (provider) note = `${note} · ${provider}`;
            }
            return (
              <div key={k} className="flex flex-wrap gap-x-3 gap-y-0.5 border-b border-white/5 px-3 py-[9px] text-[13px] last:border-b-0">
                <span className="shrink-0 basis-16 break-all font-mono text-syntax-key">{k}</span>
                <span className={cn("min-w-0 flex-[1_1_160px] break-all font-mono", VALUE_TONE[claimTone(v)])}>
                  {JSON.stringify(v)}
                </span>
                {note && <span className="basis-full pl-[76px] text-xs text-text-faint">{note}</span>}
              </div>
            );
          })}
      </section>

      <details className="group surface-panel rounded-xl [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-[13px] font-semibold text-text-tertiary hover:text-text">
          <span aria-hidden className="font-mono text-text-faint transition-transform group-open:rotate-90">›</span>
          Show verify code for {jwt.header.alg}
        </summary>
        <div className="border-t border-border-subtle p-3">
          <SnippetsView jwt={jwt} />
        </div>
      </details>
    </div>
  );
}

function PanelHead({ tone, label, onCopy, extra }: { tone: string; label: string; onCopy: () => void; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 border-b border-border-subtle py-1 pr-1 pl-3">
      <span className={cn("grow text-[11px] font-bold tracking-[.06em]", tone)}>{label}</span>
      {extra}
      <button
        type="button"
        aria-label={`Copy ${label.toLowerCase()}`}
        onClick={onCopy}
        className="flex size-7 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-white/6 hover:text-text"
      >
        <Copy size={13} aria-hidden />
      </button>
    </div>
  );
}
