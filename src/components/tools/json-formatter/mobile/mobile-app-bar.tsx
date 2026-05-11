"use client";

import Link from "next/link";
import { ChevronLeft, MoreVertical } from "lucide-react";
import { cn } from "@/lib/cn";

interface MobileAppBarProps {
  title: string;
  tier: string;
  /** "Valid" / "Invalid" / "Empty" — short status to surface near the title. */
  status: { text: string; tone: "valid" | "invalid" | "muted" } | null;
  onOpenMore: () => void;
}

export function MobileAppBar({ title, tier, status, onOpenMore }: MobileAppBarProps) {
  return (
    <header
      className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-bg/95 px-1 backdrop-blur"
      role="toolbar"
      aria-label="JSON formatter app bar"
    >
      <Link
        href="/tools"
        aria-label="Back to tools"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
      >
        <ChevronLeft size={20} aria-hidden />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center leading-none">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-base font-semibold text-text">{title}</span>
          <span className="rounded-sm bg-tier-free-bg px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-wider text-tier-free-text">
            {tier}
          </span>
        </div>
        {status && (
          <span
            className={cn(
              "mt-0.5 inline-flex items-center gap-1 text-[11px]",
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

      <button
        type="button"
        onClick={onOpenMore}
        aria-label="More actions"
        className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
      >
        <MoreVertical size={20} aria-hidden />
      </button>
    </header>
  );
}
