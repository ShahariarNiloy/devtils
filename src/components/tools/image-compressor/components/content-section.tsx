"use client";

import { cn } from "@/lib/cn";
import { memo, useState } from "react";
import { seoData } from "../content";
import { STARTING_POINTS, type StartingPoint } from "../image-compressor.starts";
import { mergeSettings, useCompressorStore } from "../image-compressor.store";
import type { CompressionSettings } from "../image-compressor.types";
import { settingsFingerprint } from "../image-compressor.view";

const TAG_TINT = {
  clay: "text-cat-clay",
  teal: "text-cat-teal",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
} as const;

const FAQ_PREVIEW = 4;

/** Does the column currently show exactly this starting point? */
function isActive(settings: CompressionSettings, p: StartingPoint): boolean {
  const a = settingsFingerprint(settings);
  const b = settingsFingerprint(mergeSettings(settings, p.patch));
  return Object.keys(a).every((k) => a[k] === b[k]);
}

/**
 * Below the tool: the four starting points (each applies its settings) and
 * the FAQ. Every answer stays in the DOM (real <details>) so it's
 * indexable; only the ones past the first four are visually collapsed.
 */
export const ImageCompressorContent = memo(function ImageCompressorContent({ onApply }: { onApply: (p: StartingPoint) => void }) {
  const settings = useCompressorStore((s) => s.draftSettings);
  const [allFaqs, setAllFaqs] = useState(false);
  const faqs = seoData.faqs;

  return (
    <section
      data-full-window-hide
      aria-label="About this tool"
      className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-start gap-x-14 gap-y-10 sm:mt-[72px]"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="m-0 font-sans text-[22px] font-bold tracking-[-0.02em]">{seoData.usesTitle}</h2>
          <p className="m-0 text-[15px] text-text-faint">{seoData.usesNote}</p>
        </div>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5 p-0">
          {STARTING_POINTS.map((p) => {
            const on = isActive(settings, p);
            return (
              <li key={p.id} className="flex">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onApply(p)}
                  className={cn(
                    "surface-panel flex w-full cursor-pointer flex-col items-start gap-2 rounded-[14px] p-4 text-left transition-colors hover:border-clay-light/45! hover:bg-white/3",
                    on && "border-clay-light/45!",
                  )}
                >
                  <span className={cn("font-mono text-xs", TAG_TINT[p.tint])}>{p.chip}</span>
                  <span className="text-[15px] font-bold text-text">{p.title}</span>
                  <span className="text-[13px] leading-normal text-text-tertiary">{p.body}</span>
                  <span className="mt-auto pt-1 text-xs font-semibold text-text-faint">{on ? "In use" : "Use these settings →"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div id="faq" className="flex scroll-mt-6 flex-col gap-4">
        <div>
          <h2 className="m-0 font-sans text-[22px] font-bold tracking-[-0.02em]">Questions</h2>
          <p className="m-0 text-[15px] text-text-faint">The short answers.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          {faqs.map((f, i) => (
            <details key={f.question} open={i === 0} className={!allFaqs && i >= FAQ_PREVIEW ? "hidden" : "group surface-panel rounded-xl px-4"}>
              <summary className="flex min-h-[50px] cursor-pointer list-none items-center gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                <span className="grow">{f.question}</span>
                <span aria-hidden="true" className="font-mono text-text-faint transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="m-0 mb-3.5 text-sm leading-relaxed text-text-tertiary">{f.answer}</p>
            </details>
          ))}
          <button
            type="button"
            onClick={() => setAllFaqs((v) => !v)}
            aria-expanded={allFaqs}
            className="self-start px-0.5 py-1.5 text-sm text-clay-light hover:text-clay-cream"
          >
            {allFaqs ? "Show fewer" : `All ${faqs.length} questions →`}
          </button>
        </div>
      </div>
    </section>
  );
});
