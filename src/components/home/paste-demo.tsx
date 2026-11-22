"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { KeyIcon, toolIcon } from "@/components/shared/key-icon";
import { DOCK_BTN, DOCK_LABEL, DOCK_ROW } from "./hero-dock";
import {
  detect,
  SAMPLES,
  type Detection,
  type DetectTint,
  type RowTone,
  type SampleKey,
} from "./paste-detect.lib";

const TINT_TEXT: Record<DetectTint, string> = {
  clay: "text-cat-clay",
  teal: "text-cat-teal",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
  plum: "text-syntax-boolean",
  error: "text-error",
  faint: "text-text-faint",
};
// `!`: the global `button:focus { outline: none }` would otherwise hide the
// selected ring as soon as the clicked key takes focus.
const TINT_OUTLINE: Record<DetectTint, string> = {
  clay: "outline-cat-clay!",
  teal: "outline-cat-teal!",
  sage: "outline-cat-sage!",
  rose: "outline-cat-rose!",
  plum: "outline-syntax-boolean!",
  error: "outline-error!",
  faint: "outline-text-faint!",
};
const SAMPLE_SLUG: Record<SampleKey, string> = {
  json: "json-formatter",
  jwt: "jwt-decoder",
  b64: "base64",
  url: "url-parser",
  ts: "timestamp-converter",
  cron: "cron-parser",
  color: "color-converter",
};

const TONE_TEXT: Record<RowTone, string> = {
  string: "text-syntax-string",
  number: "text-syntax-number",
  boolean: "text-syntax-boolean",
  null: "text-text-faint",
  plain: "text-text-key",
  muted: "text-text-faint",
};

/**
 * "Paste anything": one panel — the input on top, then what it is and a
 * button to the right tool, then the facts beside a readable preview.
 * Detection is the pure `paste-detect.lib`; nothing is sent anywhere.
 */
export function PasteDemo() {
  const [value, setValue] = useState<string>(SAMPLES[0].value);
  const [sampleKey, setSampleKey] = useState<SampleKey | null>("json");
  // Typing stays responsive on huge pastes: detection trails the textarea.
  const deferred = useDeferredValue(value);
  const det = useMemo(() => detect(deferred), [deferred]);

  const cur = SAMPLES.find((s) => s.key === sampleKey);
  const dockLabel = cur
    ? `Example · ${cur.label}`
    : `Your paste · ${det ? det.type : "empty"}`;

  return (
    <>
      <div className="flex min-h-0 w-full max-w-[860px] flex-[1_1_0] flex-col overflow-hidden rounded-2xl bg-[rgba(24,24,22,.96)] text-left shadow-search">
        <div className="flex items-start gap-3 border-b border-border-subtle px-[18px] py-4">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="mt-[3px] shrink-0 text-text-faint"
          >
            <rect x="8" y="3" width="8" height="4" rx="1.5" />
            <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          </svg>
          <label htmlFor="paste-demo-input" className="sr-only">
            Paste anything
          </label>
          <textarea
            id="paste-demo-input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSampleKey(null);
            }}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            placeholder="Paste JSON, a JWT, Base64, a URL, a timestamp, a cron expression, a colour…"
            className="h-24 min-w-0 grow resize-none border-0 bg-transparent p-0 font-mono text-sm leading-[1.6] break-all text-text outline-none placeholder:text-placeholder sm:h-[72px]"
          />
          <span aria-hidden="true" className="mt-px hidden shrink-0 gap-1 sm:inline-flex">
            {["⌘", "V"].map((k) => (
              <kbd
                key={k}
                className="surface-key inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-md font-mono text-[11px] text-text-tertiary"
              >
                {k}
              </kbd>
            ))}
          </span>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {det ? `Looks like ${det.type}` : "Nothing to detect yet"}
        </p>
        {det ? (
          <>
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3 border-b border-border-subtle bg-white/[.015] px-[18px] py-3.5">
              <span
                aria-hidden="true"
                className={cn(
                  "surface-key flex size-10 shrink-0 items-center justify-center rounded-[10px]",
                  TINT_TEXT[det.tint],
                )}
              >
                <KeyIcon icon={toolIcon(det.slug)} box={40} />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="text-xs text-text-faint">Looks like</span>
                <span className="flex items-center gap-2.5">
                  <span className="text-[19px] font-bold tracking-[-0.02em] text-text">
                    {det.type}
                  </span>
                  <span className="rounded-full bg-[rgba(132,179,106,.14)] px-2 py-0.5 text-[11px] font-bold text-success-text">
                    {det.confidence}
                  </span>
                </span>
              </div>
              <span className="grow" />
              <Link
                href={`/tools/${det.slug}`}
                className="btn-action inline-flex min-h-[42px] items-center gap-2.5 rounded-[10px] px-4 text-sm font-bold"
              >
                Open {det.tool}
                <kbd className="rounded-[5px] bg-[rgba(26,26,24,.1)] px-1.5 py-px font-mono text-[11px]">
                  ↵
                </kbd>
              </Link>
            </div>

            <div className="grid min-h-0 flex-[1_1_0] grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] sm:grid-rows-[minmax(0,1fr)]">
              <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] content-start gap-x-4 gap-y-2.5 border-b border-border-subtle px-[18px] py-4 text-[13px] sm:border-r sm:border-b-0">
                {det.facts.map((f) => (
                  <div key={f.k} className="contents">
                    <dt className="text-text-faint">{f.k}</dt>
                    <dd className="m-0 font-mono text-[12.5px] text-text [overflow-wrap:anywhere]">
                      {f.v}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="flex min-h-0 flex-col gap-2.5 overflow-hidden px-[18px] py-4 [mask-image:linear-gradient(to_bottom,#000_78%,transparent)]">
                <span className="text-xs text-text-faint">{det.previewLabel}</span>
                <PreviewBody det={det} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex grow items-center justify-center px-2.5 py-[30px] text-center text-sm text-text-faint">
            Paste something above, or pick an example below.
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-2.5">
        <span className={DOCK_LABEL}>{dockLabel}</span>
        <div role="group" aria-label="Try an example" className={DOCK_ROW}>
          {SAMPLES.map((s) => {
            const on = s.key === sampleKey;
            return (
              <button
                key={s.key}
                type="button"
                aria-label={`Try ${s.label}`}
                aria-pressed={on}
                onClick={() => {
                  setValue(s.value);
                  setSampleKey(s.key);
                }}
                className={cn(
                  DOCK_BTN,
                  TINT_TEXT[s.tint],
                  on &&
                    cn(
                      "outline-2! outline-offset-2! outline-solid!",
                      TINT_OUTLINE[s.tint],
                    ),
                )}
              >
                <KeyIcon icon={toolIcon(SAMPLE_SLUG[s.key])} box={38} />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function PreviewBody({ det }: { det: Detection }) {
  if (det.rows.length > 0) {
    return (
      <div className="flex flex-col font-mono text-[12.5px]">
        {det.rows.map((r) => (
          <div
            // Keys are unique except repeated URL parameters; add the value.
            key={`${r.k}\u0000${r.v}`}
            className="grid grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] gap-3 border-b border-white/5 py-1.5"
          >
            <span className="truncate text-syntax-key">{r.k}</span>
            <span className={cn("truncate", TONE_TEXT[r.tone])}>{r.v}</span>
          </div>
        ))}
      </div>
    );
  }
  if (det.swatch) {
    return (
      <span
        aria-hidden="true"
        className="block h-[72px] w-full shrink-0 rounded-[10px] border border-white/[.08]"
        style={{ background: det.swatch }}
      />
    );
  }
  return (
    <p className="m-0 text-[15px] leading-[1.55] whitespace-pre-wrap text-text-key [overflow-wrap:anywhere]">
      {det.preview}
    </p>
  );
}
