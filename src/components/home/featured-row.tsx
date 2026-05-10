"use client";

import { ToolIcon } from "@/components/shared/tool-icon";
import { cn } from "@/lib/cn";
import { getCategoryMeta, type Tool } from "@/lib/tools-registry";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { TIER_STYLE } from "./tier-style";

export interface FeaturedRowProps {
  tool: Tool;
  index: number;
  available: boolean;
  active: boolean;
  onHover: (slug: string) => void;
}

export function FeaturedRow({ tool, index, available, active, onHover }: FeaturedRowProps) {
  const meta = getCategoryMeta(tool.category);
  const tier = TIER_STYLE[tool.tier];

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group flex items-center gap-4 py-4 border-b border-border-subtle last:border-b-0 first:border-t first:border-border-subtle"
      onMouseEnter={() => onHover(tool.slug)}
    >
      <span className={cn("font-mono text-sm w-5 shrink-0 transition-colors duration-200 select-none", active ? "text-brand font-bold" : "text-text-faint/35")}>
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border border-border-subtle" style={{ background: meta.iconBg }}>
        <ToolIcon name={tool.icon} size={15} style={{ color: meta.iconColor }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn("text-[15px] font-semibold transition-colors duration-150 leading-snug", active ? "text-brand" : "text-text group-hover:text-brand")}>
            {tool.name}
          </span>
          {!available && (
            <span className="rounded px-1.5 h-4 inline-flex items-center text-sm font-semibold uppercase tracking-widest shrink-0" style={{ background: "var(--color-surface-soft)", color: "var(--color-text-faint)" }}>
              Soon
            </span>
          )}
          {tool.isNew && available && (
            <span className="rounded px-1.5 h-4 inline-flex items-center text-sm font-semibold uppercase tracking-widest shrink-0" style={{ background: "var(--color-tier-pro-bg)", color: "var(--color-tier-pro-text)" }}>
              New
            </span>
          )}
        </div>
        <p className="text-sm text-text-faint truncate">{tool.description}</p>
      </div>

      <div className="hidden md:flex items-center gap-2 shrink-0">
        <span className="rounded px-2 h-5 inline-flex items-center text-sm font-semibold uppercase tracking-widest" style={{ background: tier.bg, color: tier.color }}>
          {tier.label}
        </span>
        <span className="hidden xl:block text-sm font-medium uppercase tracking-widest text-text-faint">
          {tool.category}
        </span>
      </div>

      <ArrowUpRight
        size={13}
        className={cn("shrink-0 transition-all duration-150 text-text-muted", active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0")}
        aria-hidden
      />
    </Link>
  );
}
