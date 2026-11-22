"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Tint } from "@/lib/tools/presentation";

export interface BrowseTool {
  name: string;
  glyph: string;
  desc: string;
  live: boolean;
}

export interface BrowseCategory {
  key: string;
  name: string;
  desc: string;
  href: string;
  tint: Tint;
  tools: BrowseTool[];
  badge: "New" | "Soon" | null;
}

const TINT_HEX: Record<Tint, { solid: string; glow: string }> = {
  clay: { solid: "#e0a072", glow: "rgba(224,160,114,.16)" },
  teal: { solid: "#6fa6af", glow: "rgba(111,166,175,.16)" },
  sage: { solid: "#adb99a", glow: "rgba(173,185,154,.16)" },
  rose: { solid: "#d08070", glow: "rgba(208,128,112,.16)" },
};

interface Built {
  cat: BrowseCategory;
  hits: Set<BrowseTool>;
  /** Matching tools first, then live before coming soon. */
  ordered: BrowseTool[];
}

function build(cat: BrowseCategory, q: string): Built | null {
  const catHit =
    !q || `${cat.name} ${cat.key} ${cat.desc}`.toLowerCase().includes(q);
  const hits = new Set(
    q
      ? cat.tools.filter((t) => `${t.name} ${t.desc}`.toLowerCase().includes(q))
      : [],
  );
  if (!catHit && hits.size === 0) return null;
  const rest = cat.tools
    .filter((t) => !hits.has(t))
    .sort((a, b) => Number(b.live) - Number(a.live));
  return {
    cat,
    hits,
    ordered: [...cat.tools.filter((t) => hits.has(t)), ...rest],
  };
}

function Chip({
  tool,
  hit,
  glyph,
}: {
  tool: BrowseTool;
  hit: boolean;
  glyph?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[7px] rounded-[7px] border px-[9px] text-[12.5px]",
        glyph ? "min-h-[30px] rounded-lg px-2.5 text-[13px]" : "min-h-[26px]",
        hit
          ? "border-[rgba(224,160,114,.45)] bg-[rgba(224,160,114,.14)] text-text"
          : "border-white/7 bg-white/[.04] text-[#d6d2c6]",
        !tool.live && "opacity-60",
      )}
    >
      {glyph ? (
        <span className="font-mono text-[10.5px] text-clay-light">
          {tool.glyph}
        </span>
      ) : null}
      {tool.name}
    </span>
  );
}

/**
 * The filterable part of /tools/category: search box, featured JSON card and
 * the category grid. Drawings arrive pre-rendered from the server (`art`),
 * so this island ships only the filter logic.
 */
export function CategoriesBrowser({
  categories,
  art,
}: {
  categories: BrowseCategory[];
  art: Record<string, ReactNode>;
}) {
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query).trim().toLowerCase();
  const all = useMemo(
    () =>
      categories.map((c) => build(c, q)).filter((b): b is Built => b !== null),
    [categories, q],
  );
  const feat = all.find((b) => b.cat.key === "JSON");
  const rest = all.filter((b) => b.cat.key !== "JSON");
  const hitCount = all.reduce((n, b) => n + b.hits.size, 0);
  const summary = q
    ? `${hitCount} ${hitCount === 1 ? "tool" : "tools"} in ${all.length} ${all.length === 1 ? "category" : "categories"}`
    : `${categories.length} categories`;

  return (
    <>
      <div className="-mt-2 mb-7 flex flex-wrap items-center gap-3">
        <label className="flex min-h-12 max-w-[560px] flex-[1_1_360px] items-center gap-2.5 rounded-xl border border-white/10 bg-[#121211] px-3.5 focus-within:border-white/20">
          <Search size={16} className="shrink-0 text-text-faint" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter categories and tools"
            placeholder="Filter categories and tools…"
            className="min-w-0 grow border-0 bg-transparent text-[15px] text-text outline-none placeholder:text-placeholder [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="min-h-8 cursor-pointer text-[13px] text-text-faint hover:text-text"
            >
              Clear
            </button>
          ) : null}
        </label>
        <span className="text-[13px] text-text-faint" aria-live="polite">
          {summary}
        </span>
      </div>

      {feat ? (
        <Link
          href={feat.cat.href}
          className="surface-panel relative mb-3.5 grid items-center gap-x-9 gap-y-6 overflow-hidden rounded-[22px] [background:radial-gradient(70%_120%_at_100%_0%,rgba(197,142,94,.16),transparent_60%),#121211] p-5 text-text transition-colors duration-[140ms] hover:border-clay-light/40 hover:text-text sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] sm:px-8 sm:py-7"
        >
          <div className="flex min-w-0 flex-col gap-3.5">
            <div className="flex items-center gap-2.5">
              <span className="rounded-full bg-[rgba(224,160,114,.14)] px-2.5 py-[3px] text-xs font-bold text-clay-cream">
                Most used
              </span>
              <span className="font-mono text-xs text-text-faint">
                {feat.cat.tools.length} tools ·{" "}
                {feat.cat.tools.filter((t) => t.live).length} live
              </span>
            </div>
            <h2 className="m-0 text-[30px] leading-[1.05] text-text sm:text-[40px]">
              JSON tools
            </h2>
            <p className="m-0 max-w-[520px] text-base text-text-muted">
              {feat.cat.desc}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {feat.ordered.slice(0, 11).map((t, i) => (
                <span
                  key={t.name}
                  className={cn(i >= 6 && "max-sm:hidden", "contents")}
                >
                  <Chip tool={t} hit={feat.hits.has(t)} glyph />
                </span>
              ))}
            </div>
            <span className="text-sm font-bold text-clay-light">
              Open JSON tools →
            </span>
          </div>
          <div
            aria-hidden="true"
            className="w-full max-w-[340px] justify-self-center max-sm:hidden"
          >
            {art.JSON}
          </div>
        </Link>
      ) : null}

      <ul
        role="list"
        className="m-0 grid list-none grid-cols-1 gap-3.5 p-0 sm:grid-cols-2 lg:grid-cols-3"
      >
        {rest.map(({ cat, hits, ordered }) => {
          const tint = TINT_HEX[cat.tint];
          const shown = ordered.slice(0, 4);
          return (
            <li key={cat.key}>
              <Link
                href={cat.href}
                className="surface-panel flex h-full flex-col overflow-hidden rounded-[18px] text-text transition-colors duration-[140ms] hover:border-clay-light/40 hover:text-text"
              >
                <div
                  aria-hidden="true"
                  className="flex h-[132px] items-center justify-center border-b border-white/5 px-10 py-3.5"
                  style={{
                    background: `radial-gradient(80% 100% at 50% 100%, ${tint.glow}, transparent 70%), #0d0d0c`,
                  }}
                >
                  <div className="w-full max-w-[210px]">{art[cat.key]}</div>
                </div>
                <div className="flex grow flex-col gap-2.5 px-[18px] pt-4 pb-[18px]">
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="size-2 rotate-45 rounded-[2px]"
                      style={{ background: tint.solid }}
                    />
                    <h2 className="m-0 grow text-lg text-text">{cat.name}</h2>
                    {cat.badge ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-bold",
                          cat.badge === "New"
                            ? "bg-[rgba(111,166,175,.16)] text-[#9fcbd2]"
                            : "bg-white/7 text-text-tertiary",
                        )}
                      >
                        {cat.badge}
                      </span>
                    ) : null}
                    <span className="font-mono text-xs text-text-faint">
                      {cat.tools.length}{" "}
                      {cat.tools.length === 1 ? "tool" : "tools"}
                    </span>
                  </div>
                  <p className="m-0 text-sm leading-normal text-text-tertiary">
                    {cat.desc}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {shown.map((t, i) => (
                      <span
                        key={t.name}
                        className={cn(i >= 3 && "max-sm:hidden", "contents")}
                      >
                        <Chip tool={t} hit={hits.has(t)} />
                      </span>
                    ))}
                    {cat.tools.length > shown.length ? (
                      <span className="inline-flex min-h-[26px] items-center px-1.5 text-[12.5px] text-text-faint max-sm:hidden">
                        +{cat.tools.length - shown.length} more
                      </span>
                    ) : null}
                    {cat.tools.length > 3 ? (
                      <span className="inline-flex min-h-[26px] items-center px-1.5 text-[12.5px] text-text-faint sm:hidden">
                        +{cat.tools.length - 3} more
                      </span>
                    ) : null}
                  </div>
                  <span
                    className="mt-auto pt-1.5 text-[13.5px] font-bold"
                    style={{ color: tint.solid }}
                  >
                    Open {cat.name} tools →
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {all.length === 0 ? (
        <div className="surface-panel flex flex-col items-center gap-3 rounded-[18px] px-5 py-10 text-center">
          <div className="text-[17px] font-bold">Nothing matches “{query}”</div>
          <div className="text-sm text-text-tertiary">
            Try a shorter word, or ask us to build it.
          </div>
          <Link
            href="/request"
            className="btn-action inline-flex min-h-[42px] items-center rounded-[10px] px-4 text-sm font-bold"
          >
            Request a tool
          </Link>
        </div>
      ) : null}
    </>
  );
}
