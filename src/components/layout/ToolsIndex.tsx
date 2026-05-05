"use client";

import { ToolCard } from "@/components/shared/ToolCard";
import { cn } from "@/lib/cn";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import {
  CATEGORIES,
  CATEGORY_COUNTS,
  getCategoryMeta,
  type Tool,
  type ToolCategory,
} from "@/lib/tools-registry";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

interface Props {
  tools: Tool[];
  initialCategory: ToolCategory | null;
  initialQuery: string;
}

/**
 * Full tools index. Live search across name + description + tags +
 * category, with category filter chips. Synchronizes `?cat=` and `?q=`
 * to the URL (replaceState, no scroll) so the page is shareable.
 */
export function ToolsIndex({ tools, initialCategory, initialQuery }: Props) {
  const router = useRouter();
  const [cat, setCat] = useState<ToolCategory | null>(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const params = new URLSearchParams();
    if (cat) params.set("cat", cat);
    if (query.trim()) params.set("q", query.trim());
    const qs = params.toString();
    const url = qs ? `/tools?${qs}` : "/tools";
    router.replace(url, { scroll: false });
  }, [cat, query, router]);

  const isAvailable = (slug: string) => IMPLEMENTED_TOOL_SLUGS.has(slug);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return tools.filter((t) => {
      if (cat && t.category !== cat) return false;
      if (!q) return true;
      const haystack = `${t.name} ${t.description} ${t.category} ${t.tags.join(
        " "
      )}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [tools, cat, deferredQuery]);

  const total = filtered.length;
  const liveCount = filtered.filter((t) => isAvailable(t.slug)).length;

  return (
    <>
      {/* ─── Page header / control bar ──────────────── */}
      <section className="border-b border-border bg-bg">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 pt-12 pb-8 sm:pt-14">
          <p className="text-xs font-bold uppercase tracking-ultra text-text-faint">
            Index
          </p>
          <h1
            className="display mt-2 text-page-lg sm:text-hero-sm font-semibold"
            style={{ letterSpacing: "-0.03em" }}
          >
            All tools
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {total} {total === 1 ? "tool" : "tools"}
            {cat ? ` in ${cat}` : ""}
            {query.trim() ? ` matching "${query.trim()}"` : ""}
            {" · "}
            <span className="text-text-faint">{liveCount} live</span>
          </p>

          {/* Search */}
          <div className="mt-6 max-w-search">
            <SearchField
              value={query}
              onChange={setQuery}
              onClear={() => setQuery("")}
            />
          </div>

          {/* Category chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Chip
              active={cat === null}
              onClick={() => setCat(null)}
              pip="var(--color-sage-olive)"
            >
              All
              <ChipCount active={cat === null}>{tools.length}</ChipCount>
            </Chip>
            {CATEGORIES.map((c) => {
              const meta = getCategoryMeta(c);
              const active = cat === c;
              return (
                <Chip
                  key={c}
                  active={active}
                  onClick={() => setCat(active ? null : c)}
                  pip={meta.iconColor}
                >
                  {c}
                  <ChipCount active={active}>{CATEGORY_COUNTS[c]}</ChipCount>
                </Chip>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Grid ────────────────────────────────────── */}
      <section className="bg-bg">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 py-12 sm:py-14">
          {filtered.length === 0 ? (
            <EmptyState
              hasQuery={Boolean(query.trim())}
              onReset={() => {
                setQuery("");
                setCat(null);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((tool, i) => (
                <ToolCard
                  key={tool.slug}
                  tool={tool}
                  index={i}
                  available={isAvailable(tool.slug)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

interface SearchFieldProps {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}

function SearchField({ value, onChange, onClear }: SearchFieldProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 h-search transition-colors focus-within:border-border-strong"
      style={{ boxShadow: "0 6px 20px -16px rgba(26,26,24,0.18)" }}
    >
      <Search size={16} className="text-text-faint" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name, tag, or category…"
        className="flex-1 bg-transparent text-sm text-text placeholder:text-text-faint outline-none"
        autoFocus
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

interface ChipProps {
  active: boolean;
  pip: string;
  onClick: () => void;
  children: React.ReactNode;
}

function Chip({ active, pip, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs-plus font-semibold whitespace-nowrap transition-colors border",
        active
          ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-[color:var(--color-text-on-sage)]"
          : "border-border bg-surface text-text hover:border-border-strong hover:bg-[color:var(--color-mist-sage)]"
      )}
    >
      <span
        className="h-2 w-2 rounded-sm"
        style={{ background: active ? "var(--color-mist-sage)" : pip }}
        aria-hidden
      />
      {children}
    </button>
  );
}

function ChipCount({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className="text-xs"
      style={{
        color: active
          ? "color-mix(in oklab, var(--color-text-on-sage) 75%, transparent)"
          : "var(--color-text-faint)",
      }}
    >
      {children}
    </span>
  );
}

function EmptyState({
  hasQuery,
  onReset,
}: {
  hasQuery: boolean;
  onReset: () => void;
}) {
  return (
    <div className="rounded-xl border border-border p-12 text-center bg-surface">
      <p className="display text-lg font-semibold tracking-tight text-text-muted">
        {hasQuery ? "Nothing matches that search." : "No tools in this view."}
      </p>
      <p className="mt-2 text-xs-plus text-text-faint">
        Try a different keyword or clear the filter.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 h-9 text-xs-plus font-semibold text-text transition-colors hover:border-border-strong"
      >
        Reset filters
      </button>
    </div>
  );
}
