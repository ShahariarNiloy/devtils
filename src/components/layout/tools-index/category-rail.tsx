"use client";

import { cn } from "@/lib/cn";
import {
  getCategoryMeta,
  type ToolCategory,
} from "@/lib/tools-registry";

interface CategoryRailProps {
  /** Categories that have at least one matching tool in the current filter. */
  activeCategories: ToolCategory[];
  /** All registered categories (used to show empty/disabled entries dimmed). */
  allCategories: readonly ToolCategory[];
  /** Per-category counts of matching tools (zero for filtered-out cats). */
  counts: Record<ToolCategory, number>;
  /** Currently-active section as the user scrolls; null when above the first. */
  activeSection: ToolCategory | null;
}

/**
 * Sticky left-rail category navigation for the sectioned tools index.
 * Each entry is an in-page anchor link to the matching `<section id>` — no
 * smooth-scroll override beyond what the browser's native behaviour gives,
 * which respects `prefers-reduced-motion` automatically. Empty categories
 * (zero matches in the current filter) appear dimmed so the user still
 * knows the category exists.
 */
export function CategoryRail({
  activeCategories,
  allCategories,
  counts,
  activeSection,
}: CategoryRailProps) {
  const activeSet = new Set(activeCategories);
  return (
    <nav aria-label="Tool categories" className="flex flex-col gap-0.5">
      <div className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-faint">
        Jump to
      </div>
      {allCategories.map((c) => {
        const meta = getCategoryMeta(c);
        const enabled = activeSet.has(c);
        const isActive = activeSection === c;
        return (
          <a
            key={c}
            href={enabled ? `#section-${c.toLowerCase().replace(/\./g, "-")}` : undefined}
            aria-disabled={!enabled}
            className={cn(
              "group flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
              enabled
                ? "text-text-muted hover:bg-surface-soft hover:text-text"
                : "pointer-events-none text-text-faint/45",
              isActive && enabled && "bg-surface-soft text-text",
            )}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  background: enabled ? meta.iconColor : "var(--color-text-faint)",
                  opacity: enabled ? 1 : 0.35,
                }}
              />
              <span className="truncate">{c}</span>
            </span>
            <span className="mono text-[10.5px] text-text-faint shrink-0">
              {counts[c] ?? 0}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
