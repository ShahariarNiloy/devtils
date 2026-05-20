"use client";

import Link from "next/link";
import { ToolIcon } from "@/components/shared/tool-icon";
import type { Tool, ToolTier } from "@/lib/tools-registry";
import { cn } from "@/lib/cn";

interface ToolShellHeaderProps {
  tool: Tool;
  classNames?: { header?: string };
}

const TIER_PILL: Record<ToolTier, string> = {
  free: "bg-tier-free-bg text-tier-free-text",
  pro: "bg-tier-pro-bg text-tier-pro-text",
  ai: "bg-tier-ai-bg text-tier-ai-text",
};

/**
 * Compact horizontal tool header shared by every tool page.
 *
 * Layout: icon chip · title · tier pill · em-dash · description (truncates)
 *         · breadcrumb (Tools / Category) right-aligned.
 * One thin row, hairline divider below — keeps the workspace dominant.
 */
export function ToolShellHeader({ tool, classNames }: ToolShellHeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-border-subtle bg-bg",
        classNames?.header,
      )}
    >
      <div className="mx-auto flex max-w-8xl flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4 sm:px-8">
        <span
          aria-hidden
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-soft text-text-muted"
        >
          <ToolIcon name={tool.icon} size={16} />
        </span>
        <h1 className="text-base font-semibold tracking-tight text-text">
          {tool.name}
        </h1>
        <span
          className={cn(
            "rounded-sm px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-wider",
            TIER_PILL[tool.tier],
          )}
        >
          {tool.tier}
        </span>
        <span aria-hidden className="text-text-muted/50">
          —
        </span>
        <p className="min-w-0 flex-1 truncate text-sm text-text-muted">
          {tool.description}
        </p>
        <nav
          aria-label="Breadcrumb"
          className="ml-auto flex shrink-0 items-center gap-1.5 text-sm text-text-muted"
        >
          <Link href="/tools" className="transition-colors hover:text-text">
            Tools
          </Link>
          <span aria-hidden className="text-text-muted/60">
            /
          </span>
          <Link
            href={`/tools?cat=${encodeURIComponent(tool.category)}`}
            className="transition-colors hover:text-text"
          >
            {tool.category}
          </Link>
        </nav>
      </div>
    </header>
  );
}
