"use client";

import {
  CATEGORIES,
  CATEGORY_COUNTS,
  getCategoryMeta,
  type Tool,
  type ToolCategory,
} from "@/lib/tools-registry";
import { AnimatePresence, motion } from "framer-motion";
import { CategoryTab } from "./tools-index/category-tab";
import { EmptyState } from "./tools-index/empty-state";
import { LiveCard } from "./tools-index/live-card";
import { SearchBar } from "./tools-index/search-bar";
import { SectionLabel } from "./tools-index/section-label";
import { SoonCard } from "./tools-index/soon-card";
import { useToolsFilter } from "./tools-index/use-tools-filter";

const fadeAnim = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18, ease: "easeOut" },
} as const;

interface Props {
  tools: Tool[];
  initialCategory: ToolCategory | null;
  initialQuery: string;
}

export function ToolsIndex({ tools, initialCategory, initialQuery }: Props) {
  const { cat, setCat, query, setQuery, live, soon, filtered, isFiltering } =
    useToolsFilter(tools, initialCategory, initialQuery);

  const activeCats = CATEGORIES.filter((c) => CATEGORY_COUNTS[c] > 0);

  return (
    <div className="flex flex-col min-h-0">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        className="border-b border-border"
        style={{ background: "var(--color-bg)" }}
      >
        <div className="mx-auto max-w-8xl px-6 sm:px-10 pt-14 sm:pt-16 pb-10">
          <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-text-faint">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--color-sage-olive)] inline-block"
              aria-hidden
            />
            Developer tools
          </span>
          <h1
            className="display mt-3 font-semibold leading-[1.04] text-text"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
              letterSpacing: "-0.04em",
            }}
          >
            {tools.length} curated tools
            <br />
            <span style={{ color: "var(--color-sage-olive)" }}>
              built for devs.
            </span>
          </h1>
          <p className="mt-4 text-sm text-text-muted">
            {live.length + soon.length === tools.length ? (
              <>
                <span className="text-[var(--color-success)] font-semibold">
                  {live.length} live
                </span>{" "}
                · {soon.length} in the works
              </>
            ) : (
              <>
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} ·{" "}
                <span className="text-[var(--color-success)] font-semibold">
                  {live.length} available now
                </span>
              </>
            )}
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
        <div className="mx-auto max-w-8xl px-6 sm:px-10 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
          <SearchBar
            value={query}
            onChange={setQuery}
            onClear={() => setQuery("")}
          />
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0 shrink-0">
            <CategoryTab active={cat === null} onClick={() => setCat(null)}>
              All <span className="opacity-55">{tools.length}</span>
            </CategoryTab>
            {activeCats.map((c) => {
              const meta = getCategoryMeta(c);
              return (
                <CategoryTab
                  key={c}
                  active={cat === c}
                  onClick={() => setCat(cat === c ? null : c)}
                  pip={meta.iconColor}
                >
                  {c} <span className="opacity-55">{CATEGORY_COUNTS[c]}</span>
                </CategoryTab>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div
        className="flex-1 mx-auto max-w-8xl w-full px-6 sm:px-10 py-12"
        style={{ background: "var(--color-bg)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {filtered.length === 0 ? (
            <motion.div key="empty" {...fadeAnim}>
              <EmptyState
                onReset={() => {
                  setQuery("");
                  setCat(null);
                }}
              />
            </motion.div>
          ) : isFiltering ? (
            <motion.div
              key="flat"
              {...fadeAnim}
              className="flex flex-col gap-10"
            >
              {live.length > 0 && (
                <div>
                  <SectionLabel live count={live.length} />
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {live.map((t, i) => (
                      <LiveCard key={t.slug} tool={t} index={i} />
                    ))}
                  </div>
                </div>
              )}
              {soon.length > 0 && (
                <div>
                  <SectionLabel live={false} count={soon.length} />
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {soon.map((t, i) => (
                      <SoonCard key={t.slug} tool={t} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="default"
              {...fadeAnim}
              className="flex flex-col gap-16"
            >
              {live.length > 0 && (
                <div>
                  <SectionLabel live count={live.length} />
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {live.map((t, i) => (
                      <LiveCard key={t.slug} tool={t} index={i} />
                    ))}
                  </div>
                </div>
              )}
              {live.length > 0 && soon.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="flex-1 border-t border-border-subtle" />
                  <span className="text-sm font-medium text-text-faint uppercase tracking-[0.12em]">
                    On the roadmap
                  </span>
                  <div className="flex-1 border-t border-border-subtle" />
                </div>
              )}
              {soon.length > 0 && (
                <div className="-mt-8">
                  <SectionLabel live={false} count={soon.length} />
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {soon.map((t, i) => (
                      <SoonCard key={t.slug} tool={t} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
