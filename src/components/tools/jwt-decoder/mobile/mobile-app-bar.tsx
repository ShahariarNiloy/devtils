"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";

interface MobileAppBarProps {
  title: string;
  tier: string;
  /** Short status surfaced under the title. */
  status: { text: string; tone: "valid" | "invalid" | "muted" } | null;
}

/**
 * Compact mobile header — mirrors the json-formatter pattern: back-to-tools
 * chevron, centered title + tier chip, and a short status line. Replaces
 * the desktop ToolShell header band, which is hidden below `md`.
 */
export function MobileAppBar({ title, tier, status }: MobileAppBarProps) {
  return (
    <header
      className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-bg/95 px-1 backdrop-blur"
      role="toolbar"
      aria-label="JWT decoder app bar"
    >
      <Link
        href="/tools"
        aria-label="Back to tools"
        className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
      >
        <ChevronLeft size={20} aria-hidden />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center leading-none">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-base font-semibold text-text">
            {title}
          </span>
          <span className="rounded-sm bg-tier-free-bg px-1.5 py-0.5 font-mono text-sm font-semibold uppercase tracking-wider text-tier-free-text">
            {tier}
          </span>
        </div>
        {status && (
          <span
            className={cn(
              "mt-0.5 inline-flex items-center gap-1 text-sm",
              status.tone === "invalid" && "text-danger",
              status.tone === "valid" && "text-success",
              status.tone === "muted" && "text-text-faint",
            )}
          >
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                status.tone === "invalid" && "bg-danger",
                status.tone === "valid" && "bg-success",
                status.tone === "muted" && "bg-text-faint",
              )}
              aria-hidden
            />
            {status.text}
          </span>
        )}
      </div>

      {/* Symmetry spacer so the title stays optically centered */}
      <span aria-hidden className="h-10 w-10 shrink-0" />
    </header>
  );
}
