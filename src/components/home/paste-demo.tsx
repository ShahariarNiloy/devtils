import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { KeyIcon, toolIcon } from "@/components/shared/key-icon";
import { DOCK_BTN, DOCK_LABEL, DOCK_ROW } from "./hero-dock";
import {
  detect,
  SAMPLES,
  type DetectTint,
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

/**
 * The hero's default "Paste anything" tab: type or paste on the left, the
 * right card says what it is and links to the tool. Detection is the pure
 * `paste-detect.lib` — runs locally, nothing is sent anywhere.
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
      <div className="grid min-h-0 w-full max-w-[900px] flex-[1_1_0] grid-cols-1 grid-rows-[300px_minmax(0,1fr)] items-stretch gap-3.5 text-left sm:grid-cols-2 sm:grid-rows-[minmax(0,1fr)]">
        <div className="surface-key flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-[18px] p-[18px]">
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
            aria-describedby="paste-demo-hint"
            placeholder="Paste JSON, a JWT, Base64, a URL, a timestamp, a cron expression, a colour…"
            className="min-h-0 w-full flex-[1_1_0] resize-none rounded-xl! border border-border bg-bg p-3.5 font-mono text-[13px] leading-[1.65] text-text-key outline-none placeholder:text-placeholder focus-visible:border-border-strong"
          />
          <span
            id="paste-demo-hint"
            className="font-mono text-[11px] text-text-faint"
          >
            Detected in your browser as you type
          </span>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden rounded-[18px] border border-white/[.07] bg-surface p-5">
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {det ? `Looks like ${det.type}` : "Nothing to detect yet"}
          </p>
          {det ? (
            <>
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "surface-key flex size-11 shrink-0 items-center justify-center rounded-[11px]",
                    TINT_TEXT[det.tint],
                  )}
                >
                  <KeyIcon icon={toolIcon(det.slug)} box={44} />
                </span>
                <div className="flex min-w-0 grow flex-col">
                  <span className="text-xs text-text-faint">Looks like</span>
                  <span className="text-xl font-bold tracking-[-0.02em] text-text">
                    {det.type}
                  </span>
                </div>
                <span className="rounded-full bg-[rgba(132,179,106,.14)] px-[9px] py-[3px] text-[11px] font-bold text-success-text">
                  {det.confidence}
                </span>
              </div>
              <dl className="m-0 grid h-[72px] shrink-0 auto-rows-[20px] grid-cols-[max-content_1fr] content-start gap-x-4 gap-y-1.5 overflow-hidden text-[13px]">
                {det.facts.map((f) => (
                  <div key={f.k} className="contents">
                    <dt className="text-text-faint">{f.k}</dt>
                    <dd className="m-0 font-mono text-text [overflow-wrap:anywhere]">
                      {f.v}
                    </dd>
                  </div>
                ))}
              </dl>
              <pre className="m-0 min-h-0 flex-[1_1_0] overflow-hidden rounded-xl border border-border-subtle bg-bg px-3.5 py-3 font-mono text-xs leading-[1.6] break-all whitespace-pre-wrap text-text-strong">
                {det.preview}
              </pre>
              <Link
                href={`/tools/${det.slug}`}
                className="btn-action inline-flex min-h-11 shrink-0 items-center gap-2.5 self-start rounded-[11px] px-[18px] text-[15px] font-semibold"
              >
                Open in {det.tool}
                <kbd className="rounded-[5px] bg-[rgba(26,26,24,.1)] px-1.5 py-px font-mono text-xs text-[#3d4435]">
                  ↵
                </kbd>
              </Link>
            </>
          ) : (
            <div className="flex grow flex-col items-center justify-center gap-2 px-2.5 py-[30px] text-center text-sm text-text-faint">
              <span
                aria-hidden="true"
                className="surface-key flex size-11 items-center justify-center rounded-[11px] font-mono text-clay-light"
              >
                ⌘V
              </span>
              Paste something on the left, or pick an example.
            </div>
          )}
        </div>
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
