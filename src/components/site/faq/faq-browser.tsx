"use client";

import Link from "next/link";
import { useState } from "react";
import { type FaqGroup, filterFaq } from "./faq-data";

/** Search box + grouped disclosure list for /faq. */
export function FaqBrowser({ groups }: { groups: FaqGroup[] }) {
  const [query, setQuery] = useState("");
  const shown = filterFaq(groups, query);
  const searching = query.trim().length > 0;
  const count = shown.reduce((n, g) => n + g.items.length, 0);

  return (
    <>
      <label className="mb-7 flex min-h-[52px] items-center gap-2.5 rounded-xl border border-white/10 bg-toolbar px-4 transition-[border-color,box-shadow] focus-within:border-clay-light/60 focus-within:shadow-[0_0_0_3px_rgba(224,160,114,.15)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-text-faint">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="sr-only">Search questions</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions — try “tokens” or “free”"
          className="min-w-0 grow border-0 bg-transparent text-base text-text outline-none placeholder:text-placeholder [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
      <p aria-live="polite" className="sr-only">
        {searching ? `${count} ${count === 1 ? "question" : "questions"} match` : ""}
      </p>

      <div className="flex flex-col gap-8">
        {shown.map((g, gi) => (
          <section key={g.id} aria-labelledby={`faq-${g.id}`} className="flex flex-col gap-2">
            <h2 id={`faq-${g.id}`} className="m-0 mb-1 text-[13px] font-bold text-text-faint">
              {g.title}
            </h2>
            {g.items.map((item, qi) => (
              <details
                // Remount when search starts/stops so the default open state applies.
                key={`${item.q}-${searching ? "s" : "d"}`}
                open={searching || (gi === 0 && qi === 0)}
                className="group surface-panel rounded-xl px-[18px]"
              >
                <summary className="flex min-h-[54px] cursor-pointer list-none items-center gap-3 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="grow">{item.q}</span>
                  <span aria-hidden="true" className="text-lg text-text-faint transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="m-0 mb-4 text-[15px] text-text-muted">{item.a}</p>
              </details>
            ))}
          </section>
        ))}
        {shown.length === 0 && (
          <p className="m-0 text-text-tertiary">
            No questions match.{" "}
            <Link href="/contact" className="text-clay-light hover:text-clay-cream">
              Ask us directly →
            </Link>
          </p>
        )}
      </div>
    </>
  );
}
