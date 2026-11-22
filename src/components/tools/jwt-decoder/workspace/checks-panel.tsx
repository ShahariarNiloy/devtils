"use client";

import { cn } from "@/lib/cn";
import type { CheckRow, Timeline, Verdict } from "../jwt-checks";
import { LEEWAYS, type JwtDecoderState, type Leeway } from "../useJwtDecoder";
import { LEVEL_TONE, Segmented } from "./ui";

const VERDICT_FRAME = {
  ok: "border-success/32 bg-success/10",
  warn: "border-clay-light/30 bg-clay-light/8",
  bad: "border-error/35 bg-error/10",
  neutral: "border-white/12 bg-white/4",
} as const;

const VERDICT_ICON = { ok: "✓", warn: "!", bad: "✕", neutral: "…" } as const;

const SR_PREFIX = { ok: "Pass: ", bad: "Fail: ", warn: "Warning: ", neutral: "" } as const;

const LEEWAY_LABEL: Record<Leeway, string> = { 0: "0 s", 30: "30 s", 60: "60 s", 300: "5 min" };

/** Verdict card, the per-check list with its expectations row, lifetime bar. */
export function ChecksPanel({ state }: { state: JwtDecoderState }) {
  const { verdict, checks, timeline } = state;
  if (!verdict) return null;
  return (
    <>
      <VerdictCard verdict={verdict} />
      <div className="flex flex-col overflow-hidden rounded-[14px] border border-white/7">
        <ul aria-label="Checks" className="m-0 list-none p-0">
          {checks.map((c) => (
            <CheckLine key={c.label} row={c} />
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-surface px-3 py-2.5">
          <span className="text-xs text-text-faint">Clock leeway</span>
          <Segmented
            label="Clock leeway"
            size="xs"
            mono
            options={LEEWAYS.map((l) => ({ value: l, label: LEEWAY_LABEL[l] }))}
            value={state.leeway}
            onChange={state.setLeeway}
          />
          <Expect label="iss" placeholder="expected issuer" value={state.expectedIss} onChange={state.setExpectedIss} className="flex-[1_1_180px]" />
          <Expect label="aud" placeholder="expected audience" value={state.expectedAud} onChange={state.setExpectedAud} className="flex-[1_1_140px]" />
        </div>
      </div>
      {timeline && <LifetimeBar tl={timeline} />}
    </>
  );
}

function VerdictCard({ verdict }: { verdict: Verdict }) {
  const tone = LEVEL_TONE[verdict.level];
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center gap-3 rounded-[14px] border p-3.5", VERDICT_FRAME[verdict.level])}>
      <span
        aria-hidden="true"
        className={cn("flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-black/25 text-base font-bold", tone.text)}
      >
        {VERDICT_ICON[verdict.level]}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className={cn("text-base font-bold", tone.text)}>{verdict.title}</span>
        <span className="text-[13px] text-text-tertiary">{verdict.sub}</span>
      </div>
    </div>
  );
}

function CheckLine({ row }: { row: CheckRow }) {
  const tone = LEVEL_TONE[row.level];
  return (
    <li className="grid grid-cols-[22px_92px_minmax(0,1fr)] items-start gap-2.5 border-b border-white/5 px-3 py-[9px]">
      <span aria-hidden="true" className={cn("flex size-5 items-center justify-center rounded-md text-[11px] font-bold", tone.bg, tone.text)}>
        {tone.icon}
      </span>
      <span className="text-[13px] leading-5 font-semibold text-text-strong">{row.label}</span>
      <span className={cn("text-[13px] leading-5 [overflow-wrap:anywhere]", tone.text)}>
        <span className="sr-only">{SR_PREFIX[row.level]}</span>
        {row.text}
      </span>
    </li>
  );
}

function Expect({
  label,
  placeholder,
  value,
  onChange,
  className,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  className: string;
}) {
  return (
    <label
      className={cn(
        "inline-flex min-h-[30px] min-w-0 items-center gap-1.5 rounded-lg border border-border px-2 text-xs text-text-faint focus-within:border-white/20 max-md:min-h-11",
        className,
      )}
    >
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={`Expected ${label === "iss" ? "issuer" : "audience"} (${label})`}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        className="min-w-0 flex-auto border-0 bg-transparent font-mono text-xs text-text outline-none placeholder:text-placeholder"
      />
    </label>
  );
}

function LifetimeBar({ tl }: { tl: Timeline }) {
  const dot = tl.expired ? "bg-error" : "bg-clay-light";
  const dotText = tl.expired ? "text-error" : "text-clay-light";
  const align = { start: "translate-x-0", center: "-translate-x-1/2", end: "-translate-x-full" }[tl.nowAlign];
  return (
    <div className="rounded-[14px] border border-white/7 bg-[#0d0d0c] px-3.5 pt-3.5 pb-3">
      <div className="mb-[26px] flex items-baseline">
        <span className="grow text-[13px] font-bold">Lifetime</span>
        <span className="font-mono text-xs text-text-faint">{tl.lifetime}</span>
      </div>
      <div
        role="img"
        aria-label={`${tl.lifetime}. ${tl.startLabel}, ${tl.endLabel}. ${tl.nowLabel === "now" ? `Now is ${Math.round(tl.nowPct)}% through it.` : tl.nowLabel}.`}
        className="relative mx-1 h-1.5 rounded-full bg-white/7"
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            tl.expired ? "bg-linear-to-r from-error/15 to-error/55" : "bg-linear-to-r from-clay-light/15 to-clay-light/60",
          )}
          style={{ width: `${tl.nowPct}%` }}
        />
        {tl.nbfPct !== null && <div className="absolute -top-1 h-3.5 w-[1.5px] bg-text/40" style={{ left: `${tl.nbfPct}%` }} />}
        <div
          className={cn("absolute top-1/2 -mt-[7px] -ml-[7px] size-3.5 rounded-full shadow-[0_0_0_4px_rgba(224,160,114,.18)]", dot)}
          style={{ left: `${tl.nowPct}%` }}
        />
        <span
          className={cn("absolute bottom-3.5 font-mono text-[11px] whitespace-nowrap", dotText, align)}
          style={{ left: `${tl.nowPct}%` }}
        >
          {tl.nowLabel}
        </span>
      </div>
      <div className="mt-2.5 flex justify-between gap-2.5 font-mono text-[11px] text-text-faint">
        <span>{tl.startLabel}</span>
        <span>{tl.endLabel}</span>
      </div>
    </div>
  );
}
