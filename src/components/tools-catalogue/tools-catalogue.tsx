"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { cn } from "@/lib/cn";
import { Keycap } from "@/components/layout/brand/brand-mark";
import type { Tint } from "@/components/home/landing-data";
import type { ToolCategory } from "@/lib/tools/types";
import type { CatalogueRow, CatalogueSection, FeaturedCard } from "./catalogue-data";
import { TASKS, type Task } from "./catalogue-types";
import { categoryIcon, KeyIcon, toolIcon } from "@/components/shared/key-icon";

const TEXT: Record<Tint, string> = {
  clay: "text-cat-clay",
  teal: "text-cat-teal",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
};
const TILE: Record<Tint, string> = {
  clay: "bg-cat-clay/8 border-cat-clay/22 text-cat-clay",
  teal: "bg-cat-teal/8 border-cat-teal/22 text-cat-teal",
  sage: "bg-cat-sage/8 border-cat-sage/22 text-cat-sage",
  rose: "bg-cat-rose/8 border-cat-rose/22 text-cat-rose",
};

interface Props {
  json: CatalogueSection;
  sections: CatalogueSection[];
  featured: FeaturedCard[];
  roadmap: string[];
  total: number;
  live: number;
  initialQuery: string;
}

export function ToolsCatalogue({ json, sections, featured, roadmap, total, live, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [task, setTask] = useState<Task | "all">("all");
  const q = useDeferredValue(query).toLowerCase().trim();

  const match = (r: CatalogueRow) => (task === "all" || r.task === task) && (!q || r.haystack.includes(q));
  const jsonRows = json.rows.filter(match);
  const shownSections = sections
    .map((s) => ({ ...s, rows: s.rows.filter(match) }))
    .filter((s) => s.rows.length > 0);
  const shown = jsonRows.length + shownSections.reduce((n, s) => n + s.rows.length, 0);

  const jsonPlain = jsonRows.filter((r) => !r.conv);
  const jsonOut = jsonRows.filter((r) => r.conv?.dir === "out");
  const jsonIn = jsonRows.filter((r) => r.conv?.dir === "in");

  return (
    <main id="main" className="mx-auto w-full max-w-[1160px] flex-1 px-6 pb-24">
      {/* HEADER */}
      <div className="relative flex flex-col items-center gap-6 pt-16 text-center">
        <div aria-hidden="true" className="pointer-events-none absolute top-2.5 left-1/2 h-[300px] w-[760px] max-w-full -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(197,142,94,.16),rgba(197,142,94,0))]" />
        <h1 className="relative m-0 font-sans text-[clamp(34px,4vw,48px)] leading-[1.06] font-bold tracking-[-0.04em]">
          All tools<span className="text-text-faint"> · {total}</span>
        </h1>
        <p className="relative -mt-3 mb-0 text-[15px] text-text-tertiary">
          {live < total ? `${live} live, ${total - live} on the way.` : `All ${total} live.`} All free, all in your browser.
        </p>

        <div className="relative flex w-full max-w-[660px] items-center gap-3 rounded-[14px] bg-[rgba(28,28,26,.96)] px-4 py-3.5 text-left shadow-search-glow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <label htmlFor="tools-q" className="sr-only">Search tools</label>
          <input
            id="tools-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools — try “typescript” or “base64”"
            autoComplete="off"
            className="min-h-[30px] min-w-0 grow border-0 bg-transparent text-[17px] text-text outline-none placeholder:text-placeholder [&::-webkit-search-cancel-button]:hidden"
          />
          <span aria-hidden="true" className="hidden gap-1 sm:flex">
            <Keycap className="text-[11px]">⌘</Keycap>
            <Keycap className="text-[11px]">K</Keycap>
          </span>
        </div>

        <div
          role="group"
          aria-label="Filter by task"
          className="relative flex max-w-full flex-wrap justify-center gap-1.5"
        >
          {TASKS.map((k) => {
            const on = k.id === task;
            return (
              <button
                key={k.id}
                type="button"
                aria-pressed={on}
                onClick={() => setTask(k.id)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  on ? "border-brand bg-brand text-on-brand" : "border-white/10 text-text-tertiary hover:text-text",
                )}
              >
                {k.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MOST USED */}
      {!q && task === "all" && (
        <section aria-label="Most used" className="mt-14">
          <h2 className="m-0 mb-3 font-sans text-[13px] font-semibold tracking-normal text-text-faint">Most used</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-3">
            {featured.map((f) => (
              <Link
                key={f.slug}
                href={`/tools/${f.slug}`}
                className={cn("surface-feat flex items-center gap-3.5 rounded-[14px] p-4 text-text transition-transform duration-[180ms] hover:-translate-y-[3px] hover:text-text", `tint-${f.tint}`)}
              >
                <span aria-hidden="true" className={cn("surface-key flex size-10 shrink-0 items-center justify-center rounded-[10px] font-mono text-xs font-medium", TEXT[f.tint])}>
                  <KeyIcon icon={toolIcon(f.slug)} box={38} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-bold">{f.name}</span>
                  <span className="text-[13px] text-text-tertiary">{f.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {shown > 0 ? (
        <div className="mt-10 flex flex-col gap-4">
          {/* JSON — full width */}
          {jsonRows.length > 0 && (
            <section id="cat-json" aria-labelledby="h-cat-json" className="surface-panel relative scroll-mt-6 overflow-hidden rounded-[18px] p-[18px]">
              <div aria-hidden="true" className="pointer-events-none absolute -top-[120px] -left-20 h-[260px] w-[360px] bg-[radial-gradient(closest-side,rgba(197,142,94,.16),rgba(197,142,94,0))]" />
              <PanelHead id="h-cat-json" tint={json.tint} name={json.name} count={jsonRows.length} className="relative mb-3" />
              {jsonPlain.length > 0 && (
                <div className="relative grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-3 gap-y-1">
                  {jsonPlain.map((r) => (
                    <ToolRow key={r.slug} row={r} tint={json.tint} tall />
                  ))}
                </div>
              )}
              {(jsonOut.length > 0 || jsonIn.length > 0) && (
                <div className={cn("relative flex flex-wrap items-center gap-2 px-2.5 pb-1", jsonPlain.length > 0 && "mt-3 border-t border-border-subtle pt-3.5")}>
                  <span className="mr-1 text-[13px] text-text-faint">Convert</span>
                  {jsonOut.length > 0 && <span className="mr-0.5 font-mono text-xs text-clay-light">JSON →</span>}
                  {jsonOut.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/tools/${r.slug}`}
                      aria-label={r.name}
                      className="surface-key inline-flex min-h-[34px] items-center gap-[7px] rounded-[9px] px-[11px] text-[13px] font-semibold text-[#ece7dc] transition-colors hover:border-clay-light/60 hover:text-[#ece7dc]"
                    >
                      <span aria-hidden="true" className="font-mono text-[10px] text-clay-light">{r.glyph}</span>
                      {r.conv?.short}
                    </Link>
                  ))}
                  {jsonIn.length > 0 && (
                    <>
                      {jsonOut.length > 0 && <span aria-hidden="true" className="mx-1.5 h-5 w-px bg-white/10" />}
                      <span className="font-mono text-xs text-text-faint">→ JSON</span>
                      {jsonIn.map((r) => (
                        <Link
                          key={r.slug}
                          href={`/tools/${r.slug}`}
                          aria-label={`${r.name} (coming soon)`}
                          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-[9px] border border-dashed border-white/16 px-[11px] text-[13px] font-semibold text-text-tertiary transition-colors hover:border-clay-light/60 hover:text-text"
                        >
                          {r.conv?.short}
                          {!r.live && <span className="text-[11px] text-text-faint">soon</span>}
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Other categories — two-column masonry */}
          <div className="[column-gap:16px] [columns:360px_2]">
            {shownSections.map((s) => (
              <section
                key={s.id}
                id={`cat-${s.id}`}
                aria-labelledby={`h-cat-${s.id}`}
                className="surface-panel mb-4 inline-block w-full scroll-mt-6 break-inside-avoid rounded-[18px] px-3.5 pt-4 pb-2.5"
              >
                <PanelHead id={`h-cat-${s.id}`} tint={s.tint} name={s.name} count={s.rows.length} className="mx-1 mb-2" />
                {s.rows.map((r) => (
                  <ToolRow key={r.slug} row={r} tint={s.tint} />
                ))}
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="surface-panel mt-12 flex flex-col items-center gap-2.5 rounded-[18px] px-6 py-10 text-center">
          <span aria-hidden="true" className="font-mono text-[26px] text-clay-light">{"{ }"}</span>
          <span className="text-[17px] font-bold">Nothing matches that yet.</span>
          <Link href="/request" className="btn-action inline-flex min-h-10 items-center rounded-[10px] px-3.5 text-sm font-semibold">
            Request this tool
          </Link>
        </div>
      )}

      {/* ROADMAP */}
      {roadmap.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-2xl border border-clay-light/22 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(197,142,94,.12),rgba(20,18,15,.5)_60%),#121110] px-[18px] py-3.5">
          <span className="text-sm font-bold">Coming next</span>
          <span className="flex flex-wrap gap-1.5">
            {roadmap.map((r) => (
              <span key={r} className="rounded-lg border border-dashed border-white/16 px-2.5 py-[3px] text-[13px] text-text-muted">{r}</span>
            ))}
          </span>
          <span className="grow" />
          <Link href="/request" className="inline-flex min-h-10 items-center text-sm font-semibold text-clay-light hover:text-clay-cream">
            Request a tool →
          </Link>
        </div>
      )}
    </main>
  );
}

function PanelHead({ id, tint, name, count, className }: { id: string; tint: Tint; name: ToolCategory; count: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span aria-hidden="true" className={cn("surface-key flex size-7 items-center justify-center rounded-lg font-mono text-[11px]", TEXT[tint])}><KeyIcon icon={categoryIcon(name)} box={26} /></span>
      <h2 id={id} className="m-0 font-sans text-base font-bold tracking-normal">
        <Link href={`/tools/category/${name.toLowerCase().replace(/\./g, "-")}`} className="text-text hover:text-clay-cream">
          {name}
        </Link>
      </h2>
      <span className="font-mono text-xs text-text-faint">{count}</span>
    </div>
  );
}

function ToolRow({ row, tint, tall }: { row: CatalogueRow; tint: Tint; tall?: boolean }) {
  return (
    <Link
      href={`/tools/${row.slug}`}
      className={cn(
        "group flex items-center gap-3 rounded-[10px] text-text transition-colors duration-[140ms] hover:bg-white/[.045] hover:text-text",
        tall ? "min-h-14 px-2.5 py-1.5" : "min-h-[52px] px-2 py-1.5",
        !row.live && "opacity-80",
      )}
    >
      <span aria-hidden="true" className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border font-mono", tall ? "text-[11px]" : "text-[10px]", TILE[tint])}>
        <KeyIcon icon={toolIcon(row.slug)} box={30} />
      </span>
      <span className="flex min-w-0 grow flex-col">
        <span className="text-sm font-semibold">{row.name}</span>
        {row.desc && <span className="text-[12.5px] text-text-faint">{row.desc}</span>}
      </span>
      {!row.live && <span className="rounded-md border border-white/10 px-[7px] py-0.5 text-[11px] text-text-tertiary">soon</span>}
      <span aria-hidden="true" className="-translate-x-1 text-text-faint opacity-0 transition-[opacity,transform] duration-[140ms] group-hover:translate-x-0 group-hover:opacity-100">
        →
      </span>
    </Link>
  );
}
