"use client";

import { useState } from "react";

export interface ToolUseCase {
  title: string;
  description: string;
  /** Short mono tag on the card ("API", "fix"), v2. */
  tag?: string;
  tint?: "clay" | "teal" | "sage" | "rose";
}

export interface ToolFaqEntry {
  question: string;
  answer: string;
}

export interface ToolContentProps {
  /** One-paragraph intro. Shown under the use-case heading unless `usesNote` is set. */
  intro: string;
  /** Use-case heading (default "What it's good for"). */
  usesTitle?: string;
  /** One-line subline under the use-case heading (v2 mockup copy). */
  usesNote?: string;
  /** 3-5 representative use cases, each one line. */
  useCases: readonly ToolUseCase[];
  /** 5-8 FAQ entries, plain prose answers. */
  faqs: readonly ToolFaqEntry[];
  /**
   * Related tool slugs. Rendered by ToolShell's related-tools section (pass
   * them as `relatedSlugs`); kept here because seoData is the source.
   */
  relatedSlugs?: readonly string[];
}

const FAQ_PREVIEW = 4;
/** Hiding a single question behind "All 5 questions" costs a click for one
 *  line of content, so collapse only when at least two would be hidden. */
const collapsible = (n: number) => n > FAQ_PREVIEW + 1;

const TAG_TINT = {
  clay: "text-cat-clay",
  teal: "text-cat-teal",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
} as const;

/**
 * v2 below-the-tool block: use cases + FAQ, side by side. Every FAQ answer
 * stays in the DOM (real <details>) so it's indexable without JS; only the
 * entries past the first four are visually collapsed until asked for.
 */
export function ToolContent({ intro, usesTitle, usesNote, useCases, faqs }: ToolContentProps) {
  const [allFaqs, setAllFaqs] = useState(false);

  return (
    <section
      data-full-window-hide
      aria-label="About this tool"
      className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-start gap-x-14 gap-y-10 sm:mt-[72px]"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="m-0 font-sans text-[22px] font-bold tracking-[-0.02em]">{usesTitle ?? "What it’s good for"}</h2>
          <p className="m-0 text-[15px] text-text-faint">{usesNote ?? intro}</p>
        </div>
        {useCases.length > 0 && (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-2.5 p-0">
            {useCases.map((u) => (
              <li key={u.title} className={`surface-panel flex flex-col rounded-[14px] p-4 ${u.tag ? "gap-2" : "gap-1.5"}`}>
                {u.tag && <span className={`font-mono text-xs ${TAG_TINT[u.tint ?? "clay"]}`}>{u.tag}</span>}
                <span className="text-sm font-bold">{u.title}</span>
                <span className="text-[13px] text-text-tertiary">{u.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {faqs.length > 0 && (
        <div id="faq" className="flex scroll-mt-6 flex-col gap-4">
          <div>
            <h2 className="m-0 font-sans text-[22px] font-bold tracking-[-0.02em]">Questions</h2>
            <p className="m-0 text-[15px] text-text-faint">The short answers.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            {faqs.map((f, i) => (
              <details
                key={f.question}
                open={i === 0}
                className={
                  !allFaqs && collapsible(faqs.length) && i >= FAQ_PREVIEW
                    ? "hidden"
                    : "group surface-panel rounded-xl px-4"
                }
              >
                <summary className="flex min-h-[50px] cursor-pointer list-none items-center gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="grow">{f.question}</span>
                  <span aria-hidden="true" className="text-text-faint transition-transform duration-200 group-open:rotate-45">+</span>
                </summary>
                <p className="m-0 mb-3.5 text-sm text-text-tertiary">{f.answer}</p>
              </details>
            ))}
            {collapsible(faqs.length) && (
              <button
                type="button"
                onClick={() => setAllFaqs((v) => !v)}
                aria-expanded={allFaqs}
                className="self-start px-0.5 py-1.5 text-sm text-clay-light hover:text-clay-cream"
              >
                {allFaqs ? "Show fewer" : `All ${faqs.length} questions →`}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
