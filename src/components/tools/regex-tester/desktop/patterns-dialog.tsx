"use client";

import { BookOpen, Search, X } from "lucide-react";
import { Button } from "@/components/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";

interface PatternCategory {
  category: string;
  patterns: Array<{ label: string; hint: string; pattern: string; flags: string }>;
}

interface PatternsDialogProps {
  patternsOpen: boolean;
  setPatternsOpen: (v: boolean) => void;
  patternSearch: string;
  setPatternSearch: (v: string) => void;
  filteredLibrary: PatternCategory[];
  setPattern: (v: string) => void;
  setFlags: (v: string[]) => void;
  setSelectedMatch: (v: number | null) => void;
}

export function PatternsDialog({
  patternsOpen,
  setPatternsOpen,
  patternSearch,
  setPatternSearch,
  filteredLibrary,
  setPattern,
  setFlags,
  setSelectedMatch,
}: PatternsDialogProps) {
  return (
    <DropdownMenu
      open={patternsOpen}
      onOpenChange={(v) => {
        setPatternsOpen(v);
        if (!v) setPatternSearch("");
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <BookOpen size={15} />
          Patterns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-[460px] overflow-y-auto">
        <div className="px-2 pt-2 pb-1">
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 h-8">
            <Search size={15} className="text-text-faint shrink-0" />
            <input
              value={patternSearch}
              onChange={(e) => setPatternSearch(e.target.value)}
              placeholder="Search patterns…"
              className="flex-1 bg-transparent text-sm outline-none text-text placeholder:text-text-faint"
              onKeyDown={(e) => e.stopPropagation()}
            />
            {patternSearch && (
              <button
                onClick={() => setPatternSearch("")}
                className="text-text-faint hover:text-text cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
        {filteredLibrary.map((cat) => (
          <div key={cat.category}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{cat.category}</DropdownMenuLabel>
            {cat.patterns.map((p) => (
              <DropdownMenuItem
                key={p.label}
                onSelect={() => {
                  setPattern(p.pattern);
                  setFlags(p.flags.split("").filter(Boolean));
                  setSelectedMatch(null);
                }}
                className="flex flex-col items-start gap-0.5 py-2"
              >
                <span className="text-sm text-text">{p.label}</span>
                <span className="text-sm text-text-faint">{p.hint}</span>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
        {filteredLibrary.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-text-faint">
            No patterns matched
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
