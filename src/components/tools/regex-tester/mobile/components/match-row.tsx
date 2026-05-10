"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RegexMatch } from "../../regex.lib";

interface MatchRowProps {
  match: RegexMatch;
  index: number;
  onClick: (i: number) => void;
}

export function MatchRow({ match, index, onClick }: MatchRowProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(index)}
      className={cn(
        "w-full text-left flex items-center gap-2.5 p-3 rounded-lg cursor-pointer",
        "border border-border-subtle bg-surface hover:border-border hover:bg-surface-soft/50 transition-colors",
      )}
    >
      <span className="font-mono text-sm text-text-muted min-w-7">#{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-base text-text truncate">
          {match.match || "(empty)"}
        </div>
        <div className="font-mono text-sm text-text-faint mt-0.5">
          line {match.line} · col {match.index}–{match.end}
        </div>
      </div>
      <ChevronRight size={16} className="text-text-faint shrink-0" aria-hidden />
    </button>
  );
}
