"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/primitives/dialog";
import { PATTERN_LIBRARY } from "../regex.lib";
import { formatRelative, type HistoryEntry } from "../hooks/use-regex-state";

interface LibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (pattern: string, flags: string) => void;
}

/** Searchable library of common patterns (⌘⇧L). */
export function PatternLibraryDialog({ open, onOpenChange, onPick }: LibraryProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PATTERN_LIBRARY;
    return PATTERN_LIBRARY.map((c) => ({
      ...c,
      patterns: c.patterns.filter((p) => p.label.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q)),
    })).filter((c) => c.patterns.length > 0);
  }, [query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setQuery("");
      }}
    >
      <DialogContent className="top-[10%] flex max-h-[80dvh] flex-col overflow-hidden">
        <div className="border-b border-border-subtle px-4 pt-4 pb-3">
          <DialogTitle className="text-[15px] font-bold">Pattern library</DialogTitle>
          <DialogDescription className="text-[13px] text-text-faint">Pick one to load it into the pattern field.</DialogDescription>
          <div className="mt-3 flex min-h-10 items-center gap-2 rounded-[10px] border border-white/10 bg-[#0d0d0c] px-3 focus-within:border-clay-light/50">
            <Search size={15} aria-hidden className="shrink-0 text-text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patterns…"
              aria-label="Search patterns"
              spellCheck={false}
              className="min-w-0 grow bg-transparent text-[13px] text-text outline-none placeholder:text-placeholder"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-text-faint hover:text-text">
                <X size={14} aria-hidden />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-3">
          {filtered.map((cat) => (
            <div key={cat.category}>
              <div className="mb-1.5 text-[11px] font-bold tracking-[.06em] text-text-faint uppercase">{cat.category}</div>
              <div className="flex flex-col gap-1.5">
                {cat.patterns.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      onPick(p.pattern, p.flags);
                      onOpenChange(false);
                      setQuery("");
                    }}
                    className="surface-panel flex flex-col gap-0.5 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:border-white/14"
                  >
                    <span className="text-[13px] font-semibold text-text">{p.label}</span>
                    <span className="text-xs text-text-faint">{p.hint}</span>
                    <code className="mt-1 truncate font-mono text-xs text-clay-cream">/{p.pattern}/{p.flags}</code>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="py-6 text-center text-[13px] text-text-faint">No patterns matched.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface HistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: HistoryEntry[];
  onPick: (entry: HistoryEntry) => void;
  onClear: () => void;
}

/** Recent valid patterns (stored in this browser only). */
export function HistoryDialog({ open, onOpenChange, history, onPick, onClear }: HistoryProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[12%] flex max-h-[76dvh] flex-col overflow-hidden">
        <div className="flex items-end gap-3 border-b border-border-subtle px-4 pt-4 pb-3 pr-12">
          <div className="grow">
            <DialogTitle className="text-[15px] font-bold">Recent patterns</DialogTitle>
            <DialogDescription className="text-[13px] text-text-faint">Saved in this browser only.</DialogDescription>
          </div>
          {history.length > 0 && (
            <button type="button" onClick={onClear} className="min-h-8 rounded-md px-2 text-xs font-semibold text-text-faint hover:bg-white/6 hover:text-error-text">
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1.5 overflow-y-auto p-3">
          {history.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-text-faint">No history yet. Valid patterns you type show up here.</p>
          ) : (
            history.map((h) => (
              <button
                key={`${h.pattern}/${h.flags}`}
                type="button"
                onClick={() => onPick(h)}
                className="surface-panel flex flex-col gap-0.5 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:border-white/14"
              >
                <code className="break-all font-mono text-[13px] text-clay-cream">/{h.pattern}/{h.flags}</code>
                <span className="text-xs text-text-faint">{formatRelative(h.ts)}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
