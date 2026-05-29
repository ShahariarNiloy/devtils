import { ToolIcon } from "@/components/shared/tool-icon";
import { getCategoryMeta, type Tool } from "@/lib/tools-registry";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const TIER_STYLE: Record<Tool["tier"], { label: string; bg: string; color: string }> = {
  free: { label: "Free", bg: "var(--color-tier-free-bg)", color: "var(--color-tier-free-text)" },
  pro:  { label: "Pro",  bg: "var(--color-tier-pro-bg)",  color: "var(--color-tier-pro-text)"  },
  ai:   { label: "AI",   bg: "var(--color-tier-ai-bg)",   color: "var(--color-tier-ai-text)"   },
};

interface LiveCardProps {
  tool: Tool;
  /** Kept for back-compat with callers that pass position; unused now that
   *  the entrance animation is gone. Tools should appear instantly. */
  index?: number;
}

export function LiveCard({ tool }: LiveCardProps) {
  const meta = getCategoryMeta(tool.category);
  const tier = TIER_STYLE[tool.tier];

  return (
    <div className="h-full">
      <Link
        href={`/tools/${tool.slug}`}
        className="group flex flex-col h-full rounded-2xl border border-border bg-surface overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-[0_14px_40px_-18px_rgba(26,26,24,0.22)]"
      >
        {/* Tinted header with icon */}
        <div
          className="h-28 flex items-center justify-center relative overflow-hidden"
          style={{ background: meta.iconBg }}
        >
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "radial-gradient(circle, var(--color-charcoal) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div
            className="relative h-14 w-14 rounded-2xl flex items-center justify-center border border-white/20 transition-transform duration-200 group-hover:scale-105"
            style={{ background: "rgba(255,255,255,0.28)" }}
          >
            <ToolIcon name={tool.icon} size={24} style={{ color: meta.iconColor }} />
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-4 gap-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold tracking-tight text-text leading-snug group-hover:text-[color:var(--color-brand)] transition-colors duration-150">
              {tool.name}
            </h3>
            <span
              className="shrink-0 rounded-md px-1.5 h-5 inline-flex items-center text-sm font-bold uppercase tracking-wider mt-px"
              style={{ background: "var(--color-tier-free-bg)", color: "var(--color-success)" }}
            >
              Live
            </span>
          </div>
          <p className="text-sm text-text-faint leading-relaxed flex-1">{tool.description}</p>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-0 flex items-center gap-2">
          <span
            className="rounded-md px-2 h-5 inline-flex items-center text-sm font-semibold uppercase tracking-wider"
            style={{ background: tier.bg, color: tier.color }}
          >
            {tier.label}
          </span>
          <span className="text-sm font-medium uppercase tracking-[0.12em] text-text-faint">
            {tool.category}
          </span>
          <ArrowUpRight
            size={14}
            className="ml-auto opacity-0 -translate-x-1 text-text-muted transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0"
            aria-hidden
          />
        </div>
      </Link>
    </div>
  );
}
