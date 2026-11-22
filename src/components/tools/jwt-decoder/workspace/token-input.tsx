"use client";

import { useMemo } from "react";
import { Swatch, SEG_TONE } from "./ui";

const metrics = "m-0 p-3 font-mono text-xs leading-[1.6] whitespace-pre-wrap break-all";

/**
 * "Encoded token": a colour-coded mirror (<pre>, in flow, sets the height)
 * under a transparent textarea. Grows with the token up to 460px, then the
 * frame scrolls both layers together.
 */
export function TokenInput({ value, onChange, onClear }: { value: string; onChange: (v: string) => void; onClear: () => void }) {
  const parts = useMemo(() => value.split("."), [value]);
  const three = parts.length === 3 && value.trim() !== "";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor="jwt-token" className="grow text-[13px] font-bold">
          Encoded token
        </label>
        <button
          type="button"
          onClick={onClear}
          className="min-h-7 cursor-pointer rounded-[7px] border-0 bg-transparent px-2.5 text-xs text-text-tertiary transition-colors hover:bg-white/6 hover:text-text max-md:min-h-11"
        >
          Clear
        </button>
      </div>
      <div className="max-h-[460px] overflow-auto rounded-xl border border-border bg-bg focus-within:border-white/16">
        <div className="relative min-h-24">
          <pre aria-hidden="true" className={`${metrics} min-h-24 text-syntax-plain`}>
            {three ? (
              <>
                <span className={SEG_TONE.header.text}>{parts[0]}</span>
                <span className="text-text-ghost">.</span>
                <span className={SEG_TONE.payload.text}>{parts[1]}</span>
                <span className="text-text-ghost">.</span>
                {parts[2] ? <span className={SEG_TONE.signature.text}>{parts[2]}</span> : <span className="text-text-faint">(no signature)</span>}
              </>
            ) : (
              value
            )}
            {/* Keeps a trailing newline's height in the mirror. */}
            {"​"}
          </pre>
          <textarea
            id="jwt-token"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="Paste a token: eyJhbGciOi…"
            className={`${metrics} absolute inset-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent text-transparent caret-text outline-none placeholder:text-text-ghost selection:bg-clay-light/30 selection:text-transparent`}
          />
        </div>
      </div>
      {three && (
        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs">
          <Legend tone={SEG_TONE.header.bg} label="Header" n={`${parts[0].length} chars`} />
          <Legend tone={SEG_TONE.payload.bg} label="Payload" n={`${parts[1].length} chars`} />
          <Legend tone={SEG_TONE.signature.bg} label="Signature" n={parts[2] ? `${parts[2].length} chars` : "none"} />
        </div>
      )}
    </div>
  );
}

function Legend({ tone, label, n }: { tone: string; label: string; n: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Swatch className={tone} />
      <span className="text-text-strong">{label}</span>
      <span className="text-text-ghost">{n}</span>
    </span>
  );
}
