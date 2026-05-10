"use client";

import { Clock, Link2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import type { RegexMatch, CopyFormat } from "../regex.lib";
import type { HistoryEntry } from "../hooks/use-regex-state";
import { formatRelative } from "../hooks/use-regex-state";

interface MatchActionsProps {
  matches: RegexMatch[];
  history: HistoryEntry[];
  historyOpen: boolean;
  setHistoryOpen: (v: boolean) => void;
  copyOpen: boolean;
  setCopyOpen: (v: boolean) => void;
  applyHistoryEntry: (h: HistoryEntry) => void;
  clearHistory: () => void;
  handleShare: () => void;
  handleCopyMatches: (fmt: CopyFormat) => void;
}

export function MatchActions({
  matches,
  history,
  historyOpen,
  setHistoryOpen,
  copyOpen,
  setCopyOpen,
  applyHistoryEntry,
  clearHistory,
  handleShare,
  handleCopyMatches,
}: MatchActionsProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* History dropdown */}
      <DropdownMenu open={historyOpen} onOpenChange={setHistoryOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text transition-colors cursor-pointer"
          >
            <Clock size={15} /> History
            {history.length > 0 && (
              <span className="text-sm text-text-faint">({history.length})</span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
          {history.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-text-faint">
              No history yet. Patterns you type will appear here.
            </div>
          ) : (
            <>
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Recent patterns</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearHistory();
                  }}
                  className="text-sm text-text-faint hover:text-danger transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {history.map((h, i) => (
                <DropdownMenuItem
                  key={`${h.pattern}-${h.flags}-${i}`}
                  onSelect={() => applyHistoryEntry(h)}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <code className="font-mono text-sm text-text break-all w-full">
                    /{h.pattern}/{h.flags}
                  </code>
                  <span className="text-sm text-text-faint">{formatRelative(h.ts)}</span>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={handleShare}
        className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text transition-colors cursor-pointer"
      >
        <Link2 size={15} /> Share
      </button>

      {/* Copy dropdown */}
      <DropdownMenu open={copyOpen} onOpenChange={setCopyOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text transition-colors cursor-pointer"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            </svg>{" "}
            Copy
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {matches.length === 0 ? (
            <div className="px-3 py-3 text-center text-sm text-text-faint">
              No matches to copy
            </div>
          ) : (
            <>
              <DropdownMenuLabel>
                Copy {matches.length} {matches.length === 1 ? "match" : "matches"} as
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleCopyMatches("lines")}>
                Newline-separated
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleCopyMatches("json")}>
                JSON array
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleCopyMatches("csv")}>
                CSV
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
