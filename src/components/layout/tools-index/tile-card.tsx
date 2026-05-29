import { ToolIcon } from "@/components/shared/tool-icon";
import { cn } from "@/lib/cn";
import { getCategoryMeta, type Tool } from "@/lib/tools-registry";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const TIER_STYLE: Record<Tool["tier"], { label: string; bg: string; color: string }> = {
  free: { label: "Free", bg: "var(--color-tier-free-bg)", color: "var(--color-tier-free-text)" },
  pro:  { label: "Pro",  bg: "var(--color-tier-pro-bg)",  color: "var(--color-tier-pro-text)"  },
  ai:   { label: "AI",   bg: "var(--color-tier-ai-bg)",   color: "var(--color-tier-ai-text)"   },
};

interface TileCardProps {
  tool: Tool;
  /** True if the tool's component is wired in `implemented-tools.ts`. */
  isLive: boolean;
  /** Single-row layout for the list view. */
  compact?: boolean;
}

/**
 * Uniform tile used by the sectioned-by-category tools index. Same shape
 * for live and soon tools — the status pill in the meta row tells them
 * apart. The compact variant collapses to a single dense row for the list
 * view. Hover lifts a subtle border + reveal arrow to keep the affordance
 * present without animation noise across 160 tiles at once.
 */
export function TileCard({ tool, isLive, compact = false }: TileCardProps) {
  const meta = getCategoryMeta(tool.category);
  const tier = TIER_STYLE[tool.tier];

  if (compact) {
    return (
      <Link
        href={`/tools/${tool.slug}`}
        className={cn(
          "group flex items-center gap-3 px-3 py-2 transition-colors",
          "hover:bg-surface-soft",
          !isLive && "opacity-70 hover:opacity-100",
        )}
      >
        <div
          className="h-7 w-7 shrink-0 rounded-md flex items-center justify-center"
          style={{ background: meta.iconBg }}
        >
          <ToolIcon name={tool.icon} size={13} style={{ color: meta.iconColor }} />
        </div>
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className="text-[13.5px] font-medium tracking-tight text-text truncate group-hover:text-[color:var(--color-brand)] transition-colors">
            {tool.name}
          </span>
          {tool.isNew && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-clay)]" aria-label="New" />
          )}
        </div>
        <span
          className="shrink-0 rounded px-1.5 h-5 inline-flex items-center text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: tier.bg, color: tier.color }}
        >
          {tier.label}
        </span>
        <span
          className={cn(
            "shrink-0 mono text-[10.5px] font-medium",
            isLive ? "text-[color:var(--color-success)]" : "text-text-faint",
          )}
        >
          {isLive ? "live" : "soon"}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5",
        "transition-[border-color,box-shadow,transform] duration-150",
        "hover:border-border-strong hover:shadow-[0_4px_14px_-4px_rgba(0,0,0,0.06)] hover:-translate-y-px",
        !isLive && "opacity-75 hover:opacity-100",
      )}
    >
      <div
        className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center"
        style={{ background: meta.iconBg }}
      >
        <ToolIcon name={tool.icon} size={17} style={{ color: meta.iconColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[13.5px] font-semibold tracking-tight text-text truncate group-hover:text-[color:var(--color-brand)] transition-colors">
            {tool.name}
          </h3>
          {tool.isNew && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-clay)]" aria-label="New" />
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span
            className="rounded px-1.5 h-4 inline-flex items-center text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: tier.bg, color: tier.color }}
          >
            {tier.label}
          </span>
          <span
            className={cn(
              "mono inline-flex items-center gap-1 text-[10.5px] font-medium",
              isLive ? "text-[color:var(--color-success)]" : "text-text-faint",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isLive ? "bg-[color:var(--color-success)]" : "bg-text-faint",
              )}
              aria-hidden
            />
            {isLive ? "live" : "soon"}
          </span>
        </div>
      </div>
      <ArrowUpRight
        size={13}
        className="shrink-0 text-text-faint opacity-0 -translate-x-0.5 transition-all duration-150 group-hover:opacity-70 group-hover:translate-x-0"
        aria-hidden
      />
    </Link>
  );
}
