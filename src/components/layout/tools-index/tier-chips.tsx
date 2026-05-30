"use client";

import { cn } from "@/lib/cn";
import type { ToolTier } from "@/lib/tools-registry";

const TIER_LABEL: Record<ToolTier, string> = {
  free: "Free",
  pro: "Pro",
  ai: "AI",
};

const TIER_DOT: Record<ToolTier, string> = {
  free: "var(--color-tier-free-text)",
  pro: "var(--color-tier-pro-text)",
  ai: "var(--color-tier-ai-text)",
};

interface TierChipsProps {
  value: ToolTier | null;
  onChange: (next: ToolTier | null) => void;
  counts: Record<ToolTier, number>;
  totalCount: number;
}

/**
 * Filter chips for the All/Free/Pro/AI tier filter. Clicking the active chip
 * clears the filter — same as toggling. Per-tier counts come from the
 * registry so visitors see what's there before clicking.
 */
export function TierChips({
  value,
  onChange,
  counts,
  totalCount,
}: TierChipsProps) {
  // Only surface tier chips that have at least one tool in the current catalogue.
  // The catalogue is currently all-free, so Pro / AI would otherwise show empty
  // chips that filter to nothing — pure noise. They reappear automatically once
  // a Pro or AI tool is added to the showcase set.
  const allChips: {
    tier: ToolTier | null;
    label: string;
    count: number;
    dot?: string;
  }[] = [
    { tier: null, label: "All", count: totalCount },
    {
      tier: "free",
      label: TIER_LABEL.free,
      count: counts.free,
      dot: TIER_DOT.free,
    },
    {
      tier: "pro",
      label: TIER_LABEL.pro,
      count: counts.pro,
      dot: TIER_DOT.pro,
    },
    { tier: "ai", label: TIER_LABEL.ai, count: counts.ai, dot: TIER_DOT.ai },
  ];
  const chips = allChips.filter((c) => c.tier === null || c.count > 0);

  // With only the All chip remaining there's nothing to filter on. Render
  // nothing so the controls bar stays clean.
  if (chips.length <= 1) return null;

  return (
    <div
      role="group"
      aria-label="Filter by tier"
      className="flex items-center gap-1.5 shrink-0"
    >
      {chips.map((c) => {
        const isActive = value === c.tier;
        return (
          <button
            key={c.label}
            type="button"
            onClick={() => onChange(isActive ? null : c.tier)}
            aria-pressed={isActive}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
              isActive
                ? "border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-text-on-sage"
                : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text"
            )}
          >
            {c.dot && (
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: isActive ? "currentColor" : c.dot }}
              />
            )}
            <span>{c.label}</span>
            <span
              className={cn(
                "mono text-[10.5px]",
                isActive ? "opacity-80" : "text-text-faint"
              )}
            >
              {c.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
