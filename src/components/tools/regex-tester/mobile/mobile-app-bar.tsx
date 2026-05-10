"use client";

import Link from "next/link";
import { ChevronLeft, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { cn } from "@/lib/cn";
import type { MobileState } from "./types";

interface MobileAppBarProps {
  title: string;
  state: MobileState;
  onOpenPatterns: () => void;
  onOpenCheatsheet: () => void;
  onOpenSamples: () => void;
}

export function MobileAppBar({
  title,
  state,
  onOpenPatterns,
  onOpenCheatsheet,
  onOpenSamples,
}: MobileAppBarProps) {
  const { compiled, matches } = state;

  let sublabel: { text: string; tone: "danger" | "muted" } | null = null;
  if (!compiled.ok) {
    sublabel = { text: "Invalid", tone: "danger" };
  } else if (matches.length > 0) {
    sublabel = {
      text: `${matches.length} ${matches.length === 1 ? "match" : "matches"}`,
      tone: "muted",
    };
  }

  return (
    <header
      className="sticky top-0 z-40 flex items-center h-12 px-2 border-b border-border-subtle bg-bg/95 backdrop-blur"
      role="toolbar"
      aria-label="Regex tester app bar"
    >
      <Link
        href="/tools"
        aria-label="Back to tools"
        className="inline-flex items-center justify-center h-10 w-10 rounded-md text-text-muted hover:text-text hover:bg-surface-soft transition-colors"
      >
        <ChevronLeft size={20} aria-hidden />
      </Link>

      <div className="flex-1 min-w-0 flex flex-col items-center justify-center leading-none">
        <span className="text-base font-semibold text-text truncate">{title}</span>
        {sublabel && (
          <span
            className={cn(
              "mt-0.5 inline-flex items-center gap-1 text-sm",
              sublabel.tone === "danger" ? "text-danger" : "text-text-faint",
            )}
          >
            <span
              className={cn(
                "inline-block w-1.5 h-1.5 rounded-full",
                sublabel.tone === "danger" ? "bg-danger" : "bg-text-faint",
              )}
              aria-hidden
            />
            {sublabel.text}
          </span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            className="inline-flex items-center justify-center h-10 w-10 rounded-md text-text-muted hover:text-text hover:bg-surface-soft transition-colors cursor-pointer"
          >
            <MoreVertical size={20} aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={onOpenSamples}>
            Sample matches
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenPatterns}>
            Pattern library
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenCheatsheet}>
            Cheatsheet
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => state.setActiveView("editor")}>
            Editor
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => state.setActiveView("explain")}>
            Explain
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
