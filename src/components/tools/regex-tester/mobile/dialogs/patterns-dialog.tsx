"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { PATTERN_LIBRARY } from "../../regex.lib";
import { MobileSheet } from '../mobile-sheet';
import type { MobileState } from "../types";

interface PatternsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: MobileState;
}

export function PatternsDialog({ open, onOpenChange, state }: PatternsDialogProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PATTERN_LIBRARY;
    return PATTERN_LIBRARY
      .map((c) => ({
        ...c,
        patterns: c.patterns.filter(
          (p) => p.label.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.patterns.length > 0);
  }, [query]);

  function applyPattern(pattern: string, flags: string) {
    state.setPattern(pattern);
    state.setFlags(flags.split("").filter(Boolean));
    state.setSelectedMatch(null);
    setQuery("");
    onOpenChange(false);
  }

  return (
    <MobileSheet open={open} onOpenChange={onOpenChange} title="Pattern library">
      <div className="px-4 pt-3 pb-2 sticky top-0 bg-surface z-10 border-b border-border-subtle">
        <div className="flex items-center gap-2 rounded-md border border-border bg-bg px-2 h-10">
          <Search size={16} className="text-text-faint shrink-0" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patterns…"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 bg-transparent text-base outline-none text-text placeholder:text-text-faint"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-text-faint hover:text-text cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        {filtered.map((cat) => (
          <div key={cat.category}>
            <div className="text-sm uppercase tracking-wide font-semibold text-text-faint mb-2">
              {cat.category}
            </div>
            <div className="space-y-1.5">
              {cat.patterns.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPattern(p.pattern, p.flags)}
                  className="w-full text-left rounded-lg border border-border-subtle bg-bg hover:border-border hover:bg-surface-soft/50 p-3 transition-colors cursor-pointer"
                >
                  <div className="text-sm font-medium text-text">{p.label}</div>
                  <div className="text-sm text-text-faint">{p.hint}</div>
                  <code className="mt-1.5 block font-mono text-sm text-text-muted truncate">
                    /{p.pattern}/{p.flags}
                  </code>
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-text-faint">No patterns matched</p>
        )}
      </div>
    </MobileSheet>
  );
}
