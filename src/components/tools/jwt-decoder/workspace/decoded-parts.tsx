"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { CLAIM_MEANINGS, TIME_CLAIMS } from "../jwt-checks";
import { formatRelative, formatUtc, highlightJsonLines, isUnsigned, valueTone, type UnsafeIntegerClaim } from "../jwt-decoder.lib";
import type { ParsedJwt } from "../jwt-decoder.types";
import type { JwtDecoderState, MobilePart } from "../useJwtDecoder";
import { JSON_TONE, JsonLines, Segmented, Swatch, SEG_TONE, WARN_TEXT } from "./ui";

const PARTS = [
  { value: "payload", label: "Payload" },
  { value: "header", label: "Header" },
  { value: "signature", label: "Signature" },
] as const;

const PAYLOAD_VIEWS = [
  { value: "claims", label: "Claims" },
  { value: "json", label: "JSON" },
] as const;

/** Mobile-only part switcher (desktop and tablet show every part). */
export function PartTabs({ value, onChange }: { value: MobilePart; onChange: (v: MobilePart) => void }) {
  return (
    <Segmented
      tabs
      label="Part"
      options={PARTS}
      value={value}
      onChange={onChange}
      className="grid grid-cols-3 md:hidden"
      itemClassName="min-h-9 px-0"
    />
  );
}

/** Hide a part on mobile unless its tab is selected. */
export function partClass(part: MobilePart, selected: MobilePart): string {
  return part === selected ? "" : "max-md:hidden";
}

function pillValue(v: unknown): string {
  return typeof v === "string" ? v : JSON.stringify(v);
}

const sectionHead = "flex flex-wrap items-center gap-2 border-b border-white/5 bg-surface";

export function HeaderSection({ state, jwt }: { state: JwtDecoderState; jwt: ParsedJwt }) {
  const pretty = state.decoded?.headerPretty ?? "{}";
  const lines = useMemo(() => highlightJsonLines(pretty), [pretty]);
  const unsigned = isUnsigned(jwt);
  const pills = (["alg", "typ", "kid"] as const).filter((k) => jwt.header[k] !== undefined && jwt.header[k] !== null);

  return (
    <section aria-label="Header" className={cn("overflow-hidden rounded-[14px] border border-white/7", partClass("header", state.mobilePart))}>
      <div className={cn(sectionHead, "px-3 py-2.5")}>
        <Swatch className={SEG_TONE.header.bg} />
        <span className="grow text-[13px] font-bold">Header</span>
        {pills.map((k) => (
          <span key={k} className="rounded-md bg-white/6 px-2 py-0.5 font-mono text-[11px] text-text-faint">
            {k}{" "}
            <span className={k === "alg" && unsigned ? "text-error-text" : "text-text-key"}>{pillValue(jwt.header[k])}</span>
          </span>
        ))}
      </div>
      <JsonLines lines={lines} />
    </section>
  );
}

export function PayloadSection({ state, jwt }: { state: JwtDecoderState; jwt: ParsedJwt }) {
  const decoded = state.decoded;
  const pretty = decoded?.payloadPretty ?? "{}";
  const lines = useMemo(() => (state.payloadView === "json" ? highlightJsonLines(pretty) : []), [pretty, state.payloadView]);
  const keys = Object.keys(jwt.payload);
  const unsafe = decoded?.unsafe ?? [];
  const unsafeByKey = new Map(unsafe.map((u) => [u.key, u]));

  return (
    <section aria-label="Payload" className={cn("overflow-hidden rounded-[14px] border border-white/7", partClass("payload", state.mobilePart))}>
      <div className={cn(sectionHead, "flex-nowrap py-2 pr-2 pl-3")}>
        <Swatch className={SEG_TONE.payload.bg} />
        <span className="text-[13px] font-bold">Payload</span>
        <span className="grow text-xs text-text-faint">
          {keys.length} {keys.length === 1 ? "claim" : "claims"}
        </span>
        <Segmented tabs label="Payload view" size="sm" options={PAYLOAD_VIEWS} value={state.payloadView} onChange={state.setPayloadView} />
      </div>
      {unsafe.length > 0 && <BigNumberNote unsafe={unsafe} />}
      {state.payloadView === "claims" ? (
        <dl className="m-0 flex flex-col bg-[#0d0d0c]">
          {keys.length === 0 && <p className="m-0 px-3.5 py-3 text-[13px] text-text-faint">This payload has no claims.</p>}
          {keys.map((k) => (
            <ClaimRow key={k} name={k} value={jwt.payload[k]} raw={decoded?.raw.get(k)} unsafe={unsafeByKey.get(k)} now={state.now} />
          ))}
        </dl>
      ) : (
        <JsonLines lines={lines} />
      )}
    </section>
  );
}

function BigNumberNote({ unsafe }: { unsafe: readonly UnsafeIntegerClaim[] }) {
  const many = unsafe.length > 1;
  return (
    <div role="note" className={cn("flex gap-2 border-b border-clay-light/18 bg-clay-light/8 px-3 py-[9px] text-xs leading-normal", WARN_TEXT)}>
      <span aria-hidden="true">!</span>
      <span>
        “{unsafe.map((u) => u.key).join("”, “")}” {many ? "are" : "is"} too large for a JavaScript number. Read {many ? "them" : "it"} as a
        string, or use a parser with BigInt support.
      </span>
    </div>
  );
}

function ClaimRow({
  name,
  value,
  raw,
  unsafe,
  now,
}: {
  name: string;
  value: unknown;
  raw: string | undefined;
  unsafe: UnsafeIntegerClaim | undefined;
  now: number;
}) {
  // Strings read unquoted; everything else is shown as written in the token,
  // so big integers keep every digit.
  const shown = typeof value === "string" ? value : (raw ?? JSON.stringify(value));
  const time = TIME_CLAIMS.has(name) && typeof value === "number" ? value : null;
  const meaning = CLAIM_MEANINGS[name] ?? "Custom claim";
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-b border-white/4 px-3.5 py-[9px] md:grid-cols-[110px_minmax(0,1fr)_160px]">
      <dt className="font-mono text-[12.5px] break-all text-syntax-key">{name}</dt>
      <dd className="m-0 flex min-w-0 flex-col">
        <span className={cn("font-mono text-[12.5px] [overflow-wrap:anywhere]", JSON_TONE[valueTone(value)])}>{shown}</span>
        {time !== null && (
          <span className="text-xs text-text-tertiary">
            {formatUtc(time)} · {formatRelative(time, now)}
          </span>
        )}
        {unsafe && (
          <span className={cn("text-[11.5px]", WARN_TEXT)}>Bigger than JavaScript can hold exactly. JSON.parse turns it into {unsafe.parsed}.</span>
        )}
      </dd>
      <dd className="col-start-2 m-0 text-xs text-text-faint md:col-start-auto">{meaning}</dd>
    </div>
  );
}
