"use client";

import { cn } from "@/lib/cn";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import {
  CATEGORIES,
  type Tool,
  type ToolCategory,
  type ToolTier,
} from "@/lib/tools-registry";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryRail } from "./tools-index/category-rail";
import { EmptyState } from "./tools-index/empty-state";
import { TierChips } from "./tools-index/tier-chips";
import { TileCard } from "./tools-index/tile-card";
import { useToolsFilter } from "./tools-index/use-tools-filter";
import { ViewToggle, type ViewMode } from "./tools-index/view-toggle";

const VIEW_MODE_KEY = "devtils:tools-view-mode";

interface Props {
  tools: Tool[];
  initialCategory: ToolCategory | null;
  initialQuery: string;
  initialTier: ToolTier | null;
}

/**
 * /tools — sectioned-by-category browser. Sticky left rail with scroll-spy
 * tracks the user's position across 100+ tiles; tier chips + search apply
 * cross-section filters; a grid/list view toggle (persisted in localStorage)
 * lets power users browse densely. URL state covers cat / tier / query so
 * shared links restore exactly what the sender saw.
 *
 * Mobile (<lg): rail collapses into a horizontal scrolling chip strip that
 * sits inside the sticky controls bar. No information is lost — visitors on
 * narrow viewports can still jump to a category.
 */
export function ToolsIndex({
  tools,
  initialCategory,
  initialQuery,
  initialTier,
}: Props) {
  const { setCat, tier, setTier, query, setQuery, filtered, isFiltering } =
    useToolsFilter(tools, initialCategory, initialQuery, initialTier);

  // Per-category and per-tier counts derived from the *post-filter* set so
  // the chip / rail counts reflect what the current view will actually
  // contain. Total counts come from the full `tools` array — those are the
  // baseline "what's in the catalog" numbers shown in the All chip etc.
  const baseTierCounts = useMemo<Record<ToolTier, number>>(() => {
    const t: Record<ToolTier, number> = { free: 0, pro: 0, ai: 0 };
    for (const tool of tools) t[tool.tier]++;
    return t;
  }, [tools]);

  // After applying everything *except* the category filter, count per
  // category — that way picking "Free" still shows the rail's Free totals
  // per category instead of post-category-collapse numbers.
  const categoryCounts = useMemo<Record<ToolCategory, number>>(() => {
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<
      ToolCategory,
      number
    >;
    const q = query.trim().toLowerCase();
    for (const t of tools) {
      if (tier && t.tier !== tier) continue;
      if (q) {
        const hay =
          `${t.name} ${t.description} ${t.category} ${t.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      counts[t.category]++;
    }
    return counts;
  }, [tools, tier, query]);

  // Group the filtered list by category so each section renders its own
  // sub-list. Insertion order follows the canonical CATEGORIES array — no
  // alphabetisation, which would scramble the deliberate sidebar order.
  const sections = useMemo(() => {
    const byCat = new Map<ToolCategory, Tool[]>();
    for (const t of filtered) {
      const arr = byCat.get(t.category) ?? [];
      arr.push(t);
      byCat.set(t.category, arr);
    }
    return CATEGORIES.filter((c) => byCat.has(c)).map((c) => ({
      category: c,
      tools: byCat.get(c) ?? [],
    }));
  }, [filtered]);

  // Scroll-spy: track which section is centred in the viewport so the rail
  // can highlight it. IntersectionObserver beats a scroll handler — no
  // throttling needed, and it only fires when boundaries cross.
  const [activeSection, setActiveSection] = useState<ToolCategory | null>(
    sections[0]?.category ?? null
  );
  const sectionRefs = useRef(new Map<ToolCategory, HTMLElement>());

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sections.length === 0) {
      // Sections collapsed by an empty filter — reset the rail's active state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveSection(null);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport that's
        // intersecting. Sorting beats picking the first entry since the
        // observer fires for multiple sections during a fast scroll.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const next = visible[0].target.getAttribute(
            "data-cat"
          ) as ToolCategory;
          setActiveSection(next);
        }
      },
      {
        // Activate when a section's heading sits in the top third of the
        // viewport — feels right for "what am I currently reading".
        rootMargin: "-15% 0px -70% 0px",
      }
    );
    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // View mode (grid / list) lives in localStorage so a returning visitor
  // lands in their preference. SSR-safe: starts as "grid", swaps to the
  // stored value after mount.
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(VIEW_MODE_KEY);
    // Mount-time external-state pull from localStorage — same pattern as the
    // URL-state hook in @/components/json-converter/use-url-state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "grid" || stored === "list") setViewMode(stored);
  }, []);
  const handleViewChange = (next: ViewMode) => {
    setViewMode(next);
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, next);
    } catch {
      // QuotaExceeded / private mode — no big deal, just don't persist.
    }
  };

  const liveCount = useMemo(
    () => tools.filter((t) => IMPLEMENTED_TOOL_SLUGS.has(t.slug)).length,
    [tools]
  );

  return (
    <div className="flex flex-col min-h-0">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        className="border-b border-border"
        style={{ background: "var(--color-bg)" }}
      >
        <div className="mx-auto max-w-8xl px-6 sm:px-10 pt-12 sm:pt-14 pb-8">
          <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-text-faint">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-sage-olive)] inline-block"
              aria-hidden
            />
            The full catalogue
          </span>
          <h1
            className="display mt-3 font-semibold leading-[1.04] text-text"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
              letterSpacing: "-0.04em",
            }}
          >
            All tools <span className="text-text-faint">· {tools.length}</span>
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            Every utility, grouped by category.{" "}
            <span className="text-[color:var(--color-success)] font-semibold">
              {liveCount} live
            </span>
            {" · "}
            {tools.length - liveCount} on the roadmap.
          </p>
        </div>
      </section>

      {/* ── Sticky controls ──────────────────────────────────────── */}
      <div
        className="sticky top-[var(--spacing-header)] z-20 border-b border-border"
        style={{
          background: "color-mix(in oklab, var(--color-bg) 92%, transparent)",
          backdropFilter: "blur(12px) saturate(140%)",
        }}
      >
        <div className="mx-auto max-w-8xl px-6 sm:px-10 py-3 flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <label className="relative flex-1 min-w-[200px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${tools.length} tools by name, tag, or category…`}
              className="w-full h-10 pl-9 pr-9 rounded-lg border border-border bg-surface text-sm text-text placeholder:text-text-faint outline-none focus:border-border-strong"
              aria-label="Search tools"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded text-text-faint hover:text-text hover:bg-surface-soft"
                aria-label="Clear search"
              >
                <X size={13} aria-hidden />
              </button>
            )}
          </label>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <TierChips
              value={tier}
              onChange={setTier}
              counts={baseTierCounts}
              totalCount={tools.length}
            />
            <ViewToggle value={viewMode} onChange={handleViewChange} />
          </div>
        </div>

        {/* Mobile category chip strip — replaces the rail on narrow viewports. */}
        <div className="lg:hidden mx-auto max-w-8xl px-6 sm:px-10 pb-2.5 flex gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.filter((c) => categoryCounts[c] > 0).map((c) => (
            <a
              key={c}
              href={`#section-${c.toLowerCase().replace(/\./g, "-")}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 h-8 text-sm font-medium text-text-muted hover:border-border-strong hover:text-text"
            >
              {c}
              <span className="mono text-[10.5px] text-text-faint">
                {categoryCounts[c]}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Body grid: sticky rail + sectioned content ───────────── */}
      <div
        className="flex-1 mx-auto max-w-8xl w-full px-6 sm:px-10 py-8 lg:py-10"
        style={{ background: "var(--color-bg)" }}
      >
        <div className="grid gap-8 lg:grid-cols-[208px_1fr]">
          {/* Rail (desktop only) */}
          <aside className="hidden lg:block">
            <div
              className="sticky"
              style={{ top: "calc(var(--spacing-header) + 90px)" }}
            >
              <CategoryRail
                activeCategories={sections.map((s) => s.category)}
                allCategories={CATEGORIES}
                counts={categoryCounts}
                activeSection={activeSection}
              />
            </div>
          </aside>

          {/* Content */}
          <main>
            {sections.length === 0 ? (
              <EmptyState
                onReset={() => {
                  setQuery("");
                  setCat(null);
                  setTier(null);
                }}
              />
            ) : (
              <div className="flex flex-col gap-8">
                {sections.map(({ category, tools: catTools }) => {
                  const id = `section-${category.toLowerCase().replace(/\./g, "-")}`;
                  return (
                    <section
                      key={category}
                      id={id}
                      data-cat={category}
                      ref={(el) => {
                        if (el) sectionRefs.current.set(category, el);
                        else sectionRefs.current.delete(category);
                      }}
                      style={{
                        scrollMarginTop: "calc(var(--spacing-header) + 110px)",
                      }}
                    >
                      <header
                        className="sticky z-10 flex items-baseline gap-3 py-2"
                        style={{
                          top: "calc(var(--spacing-header) + 65px)",
                          background:
                            "color-mix(in oklab, var(--color-bg) 90%, transparent)",
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        <h2 className="text-[15px] font-semibold tracking-tight text-text">
                          {category}
                        </h2>
                        <span className="mono text-[10.5px] text-text-faint">
                          {catTools.length}
                        </span>
                        <span
                          aria-hidden
                          className="flex-1 h-px bg-border-subtle"
                        />
                      </header>

                      <div
                        className={cn(
                          viewMode === "list"
                            ? "mt-2 rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border-subtle"
                            : "mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
                        )}
                      >
                        {catTools.map((t) => (
                          <TileCard
                            key={t.slug}
                            tool={t}
                            isLive={IMPLEMENTED_TOOL_SLUGS.has(t.slug)}
                            compact={viewMode === "list"}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {isFiltering && sections.length > 0 && (
              <div className="mt-8 text-sm text-text-faint">
                Showing {filtered.length} of {tools.length}.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCat(null);
                    setTier(null);
                  }}
                  className="text-text-muted hover:text-text underline underline-offset-2"
                >
                  Clear filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
