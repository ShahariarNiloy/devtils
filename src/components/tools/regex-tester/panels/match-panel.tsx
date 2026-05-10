"use client";

import { memo } from "react";
import { ClipboardCopy } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import type { matchAll} from "../regex.lib";
import type { CopyFormat } from "../regex.lib";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MatchPanelProps {
  matches: ReturnType<typeof matchAll>;
  selectedMatch: number | null;
  onSelect: (i: number | null) => void;
  onCopy: (f: CopyFormat) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const MatchPanel = memo(function MatchPanel({
  matches,
  selectedMatch,
  onSelect,
  onCopy,
}: MatchPanelProps) {
  return (
    <>
      <div className="flex items-center justify-between px-4 h-10 border-b border-border-subtle shrink-0">
        <span className="text-sm font-semibold text-text">
          Matches <span className="text-text-faint font-normal">· {matches.length}</span>
        </span>
        {matches.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-[0.08em] text-text-muted hover:text-text transition-colors cursor-pointer">
                <ClipboardCopy size={15} /> Copy all
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => onCopy("lines")}>Newline-separated</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onCopy("json")}>JSON array</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onCopy("csv")}>CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-2">
        {matches.length === 0 ? (
          <div className="py-10 text-center text-sm text-text-faint">
            No matches. Adjust the pattern or test string.
          </div>
        ) : (
          <>
            {matches.slice(0, 200).map((m, i) => {
              const isSelected = selectedMatch === i;
              return (
                <button
                  key={`m-${i}`}
                  type="button"
                  onClick={() => onSelect(isSelected ? null : i)}
                  className={cn(
                    "w-full text-left rounded-lg border px-3 py-2.5 transition-all duration-150 cursor-pointer",
                    isSelected
                      ? "border-[color:var(--color-clay)] bg-[color:color-mix(in_oklab,var(--color-accent-soft),transparent_40%)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-clay),transparent_40%)]"
                      : "border-border bg-surface hover:border-border-strong/60 hover:bg-surface-soft/40",
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm font-semibold text-text-muted">#{i + 1}</span>
                    <span className="text-sm text-text-faint font-mono">
                      L{m.line} · {m.index}–{m.end}
                    </span>
                  </div>
                  <code className="font-mono text-sm text-text break-all block">{m.match || "(empty)"}</code>
                  {(m.groups.length > 0 || Object.keys(m.named).length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.groups.map((g, j) => (
                        <span key={j} className="inline-flex items-center gap-1 font-mono text-sm bg-surface-soft rounded px-1.5 py-0.5">
                          <span className="text-text-faint">${j + 1}</span>
                          <span className="text-text">{g || "∅"}</span>
                        </span>
                      ))}
                      {Object.entries(m.named).map(([k, v]) => (
                        <span key={k} className="inline-flex items-center gap-1 font-mono text-sm bg-accent-soft rounded px-1.5 py-0.5">
                          <span className="text-accent">{k}</span>
                          <span className="text-text">{v || "∅"}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
            {matches.length > 200 && (
              <div className="py-2 text-sm text-text-faint text-center">
                Showing 200 of {matches.length}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
});
