import { ToolIcon } from "@/components/shared/tool-icon";
import { getCategoryMeta, type Tool } from "@/lib/tools-registry";
import Link from "next/link";

const TIER_STYLE: Record<Tool["tier"], { label: string; bg: string; color: string }> = {
  free: { label: "Free", bg: "var(--color-tier-free-bg)", color: "var(--color-tier-free-text)" },
  pro:  { label: "Pro",  bg: "var(--color-tier-pro-bg)",  color: "var(--color-tier-pro-text)"  },
  ai:   { label: "AI",   bg: "var(--color-tier-ai-bg)",   color: "var(--color-tier-ai-text)"   },
};

interface SoonCardProps {
  tool: Tool;
  /** Kept for back-compat; unused now that the entrance animation is gone. */
  index?: number;
}

export function SoonCard({ tool }: SoonCardProps) {
  const meta = getCategoryMeta(tool.category);
  const tier = TIER_STYLE[tool.tier];

  return (
    <div className="h-full">
      <Link
        href={`/tools/${tool.slug}`}
        className="group flex items-start gap-3 h-full rounded-xl border border-border-subtle bg-surface p-3.5 transition-[border-color,background] duration-150 hover:border-border hover:bg-[color:var(--color-surface-soft)]"
        style={{ opacity: 0.82 }}
      >
        {/* Icon */}
        <div
          className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center mt-0.5"
          style={{ background: meta.iconBg }}
        >
          <ToolIcon name={tool.icon} size={14} style={{ color: meta.iconColor }} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm font-semibold text-text leading-snug group-hover:text-[color:var(--color-brand)] transition-colors duration-150 truncate">
              {tool.name}
            </span>
            {tool.tier !== "free" && (
              <span
                className="shrink-0 rounded px-1.5 h-4 inline-flex items-center text-sm font-semibold uppercase tracking-wider"
                style={{ background: tier.bg, color: tier.color }}
              >
                {tier.label}
              </span>
            )}
          </div>
          <p className="text-sm text-text-faint leading-snug line-clamp-2">{tool.description}</p>
        </div>

        {/* Soon badge */}
        <span className="shrink-0 mt-0.5 rounded px-1.5 h-5 inline-flex items-center text-sm font-semibold uppercase tracking-wider bg-surface-soft text-text-faint">
          Soon
        </span>
      </Link>
    </div>
  );
}
