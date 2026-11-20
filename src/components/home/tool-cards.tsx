"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { ShowcaseGroup, ShowcaseTool, Tint } from "./landing-data";
import { KeyIcon, toolIcon } from "@/components/shared/key-icon";

const CHIPS: { id: ShowcaseGroup | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "code", label: "JSON & Code" },
  { id: "text", label: "Text & Encoding" },
  { id: "design", label: "Security & Design" },
];

const ACCENT: Record<Tint, string> = {
  clay: "text-cat-clay",
  teal: "text-cat-teal",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
};
const CODE: Record<Tint, string> = {
  clay: "text-code-clay",
  teal: "text-code-teal",
  sage: "text-code-sage",
  rose: "text-code-rose",
};

export function ToolCards({
  tools,
  categoryCount,
  catalogueCount,
}: {
  tools: readonly ShowcaseTool[];
  categoryCount: number;
  catalogueCount: number;
}) {
  const [group, setGroup] = useState<ShowcaseGroup | "all">("all");
  const cards = tools.filter((t) => group === "all" || t.group === group);

  return (
    <section id="categories" className="mx-auto flex max-w-[1100px] scroll-mt-6 flex-col gap-9 px-6 pt-10 pb-[120px]">
      <div className="flex flex-wrap items-end gap-5">
        <div className="flex-[1_1_360px]">
          <h2 className="m-0 font-sans text-[22px] font-bold tracking-[-0.02em]">There&apos;s a tool for that.</h2>
          <p className="m-0 text-[22px] font-semibold tracking-[-0.02em] text-text-faint">
            {categoryCount} categories, from JSON to colors.
          </p>
        </div>
        <div role="tablist" aria-label="Filter tools" className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
          {CHIPS.map((c) => {
            const on = c.id === group;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setGroup(c.id)}
                className={cn(
                  "min-h-9 rounded-[9px] px-3.5 text-[13px] font-semibold transition-colors hover:text-text",
                  on ? "bg-selected text-text shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "text-text-faint",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-[18px]">
        {cards.map((c) => (
          <Link
            key={c.slug}
            href={`/tools/${c.slug}`}
            className={cn(
              "surface-tint flex min-h-[300px] flex-col gap-[18px] rounded-[18px] p-5 text-text transition-transform duration-200 hover:-translate-y-1 hover:text-text",
              `tint-${c.tint}`,
            )}
          >
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className={cn("surface-key flex size-[38px] items-center justify-center rounded-[10px] font-mono text-xs font-medium", ACCENT[c.tint])}>
                <KeyIcon icon={toolIcon(c.slug)} box={36} />
              </span>
              <span className="grow text-[17px] font-bold tracking-[-0.01em]">{c.name}</span>
              <span aria-hidden="true" className="surface-key flex size-[30px] items-center justify-center rounded-lg text-text-muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
              </span>
            </div>
            <p className="m-0 text-sm text-text-muted">{c.desc}</p>
            <pre className={cn("m-0 mt-auto overflow-hidden rounded-xl border border-border-subtle bg-[rgba(11,11,10,.55)] p-3.5 font-mono text-[12.5px] leading-[1.6] whitespace-pre", CODE[c.tint])}>
              {c.sample}
            </pre>
          </Link>
        ))}
      </div>
      <Link href="/tools" className="inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] text-text-muted hover:text-text">
        Browse all {catalogueCount} tools
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </Link>
    </section>
  );
}
