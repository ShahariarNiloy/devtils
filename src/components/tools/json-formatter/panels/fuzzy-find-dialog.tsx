"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/primitives/dialog";
import { Kbd } from "@/components/primitives/kbd";
import { cn } from "@/lib/cn";
import {
  buildFuzzyIndex,
  FUZZY_MAX_ENTRIES,
  searchFuzzy,
  type FuzzyResult,
} from "../fuzzy-search";

interface FuzzyFindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Parsed JSON document. The dialog won't open productively when this is null. */
  value: unknown;
  /** Called when the user picks a result. We just hand back the path. */
  onPick: (path: string) => void;
}

const RESULT_LIMIT = 60;

export function FuzzyFindDialog({ open, onOpenChange, value, onPick }: FuzzyFindDialogProps) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Reset query/selection on every open→close→open transition. Derived
  // state instead of a useEffect — avoids the set-state-in-effect cascade
  // and the extra render it would cause when the dialog opens.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setQuery("");
      setSelectedIdx(0);
    }
  }

  // Defer the query so a fast typer never blocks on the scorer between
  // keystrokes — React keeps the input responsive while scoring catches up.
  const deferredQuery = useDeferredValue(query);

  // Build the index lazily and only while the dialog is open. The dialog is
  // unmounted when closed (via Radix Portal lifecycle), so this useMemo
  // doesn't hold the index in memory once the user dismisses.
  const index = useMemo(() => {
    if (!open || value === null || value === undefined) return [];
    return buildFuzzyIndex(value);
  }, [open, value]);

  const results = useMemo(
    () => searchFuzzy(index, deferredQuery, { limit: RESULT_LIMIT }),
    [index, deferredQuery],
  );

  // Clamp the selection at read-time so a shrinking result list never points
  // past the end. Stored state remains the user's intent; the effective
  // index is just the clamped read.
  const effectiveIdx = Math.min(
    selectedIdx,
    Math.max(0, results.length - 1),
  );

  const pick = (r: FuzzyResult) => {
    onPick(r.entry.path);
    void navigator.clipboard.writeText(r.entry.path).catch(() => {});
    toast.success(`Path copied · ${r.entry.path}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-[12%] -translate-y-0 w-[min(640px,calc(100vw-32px))] p-0 overflow-hidden"
        // Stop Radix from auto-focusing the close button when there's no
        // input rendered yet — we focus the input ourselves below.
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Find anything</DialogTitle>
          <DialogDescription>
            Fuzzy search across keys, paths, and values in the loaded document.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b border-border-subtle px-4 h-12">
          <Search size={15} className="text-text-faint shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIdx(Math.min(effectiveIdx + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIdx(Math.max(effectiveIdx - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const r = results[effectiveIdx];
                if (r) pick(r);
              }
            }}
            placeholder="Search keys, paths, values…"
            autoFocus
            spellCheck={false}
            className="flex-1 h-full bg-transparent text-base text-text placeholder:text-text-faint outline-none border-0 font-mono tracking-tight"
          />
          <span className="text-sm text-text-faint shrink-0 font-mono">
            {deferredQuery
              ? `${results.length}${results.length === RESULT_LIMIT ? "+" : ""}`
              : index.length >= FUZZY_MAX_ENTRIES
                ? `${FUZZY_MAX_ENTRIES.toLocaleString()} indexed (capped)`
                : `${index.length.toLocaleString()} indexed`}
          </span>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {results.length === 0 ? (
            <EmptyMessage hasQuery={Boolean(deferredQuery)} indexSize={index.length} />
          ) : (
            <ul className="py-1">
              {results.map((r, i) => (
                <ResultRow
                  key={r.entry.path}
                  result={r}
                  query={deferredQuery}
                  active={i === effectiveIdx}
                  onMouseEnter={() => setSelectedIdx(i)}
                  onClick={() => pick(r)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border-subtle px-4 h-9 text-sm text-text-faint">
          <span className="inline-flex items-center gap-2">
            <Kbd className="px-1">↑</Kbd>
            <Kbd className="px-1">↓</Kbd>
            to navigate
          </span>
          <span className="inline-flex items-center gap-2">
            <Kbd className="px-1"><CornerDownLeft size={10} /></Kbd>
            copy path
          </span>
          <span className="inline-flex items-center gap-2">
            <Kbd className="px-1">esc</Kbd>
            close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Result row ───────────────────────────────────────────────────────────────

interface ResultRowProps {
  result: FuzzyResult;
  query: string;
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

function ResultRow({ result, query, active, onMouseEnter, onClick }: ResultRowProps) {
  const { entry, matchedField } = result;
  return (
    <li>
      <button
        type="button"
        onMouseEnter={onMouseEnter}
        onClick={onClick}
        className={cn(
          "w-full text-left px-4 py-2 flex items-start gap-3 transition-colors",
          active ? "bg-surface-soft" : "hover:bg-surface-soft/60",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="font-mono text-base text-text truncate tracking-tight">
            {matchedField === "key"
              ? <HighlightedSpan text={entry.key} query={query} />
              : matchedField === "value"
                ? entry.key || "[root]"
                : <HighlightedSpan text={entry.path} query={query} />}
          </div>
          <div className="mt-0.5 font-mono text-sm text-text-faint truncate tracking-tight">
            {matchedField === "value" && entry.value ? (
              <HighlightedSpan text={entry.value} query={query} />
            ) : matchedField === "path" ? (
              entry.value || ""
            ) : (
              entry.path
            )}
          </div>
        </div>
        <span className="text-sm text-text-faint font-mono uppercase tracking-wide shrink-0 mt-0.5">
          {matchedField}
        </span>
      </button>
    </li>
  );
}

// ── Highlight helper ─────────────────────────────────────────────────────────

function HighlightedSpan({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  // Prefer substring match for visual highlight; fall back to subsequence.
  const idx = t.indexOf(q);
  if (idx !== -1) {
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-brand/30 text-text rounded-sm not-italic">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  }
  // Subsequence highlight — mark each matched char individually.
  const out: React.ReactNode[] = [];
  let qi = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (qi < q.length && t.charCodeAt(i) === q.charCodeAt(qi)) {
      out.push(
        <mark key={i} className="bg-brand/30 text-text rounded-sm not-italic">
          {text[i]}
        </mark>,
      );
      qi += 1;
    } else {
      out.push(text[i]);
    }
  }
  return <>{out}</>;
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyMessage({ hasQuery, indexSize }: { hasQuery: boolean; indexSize: number }) {
  if (indexSize === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-text-faint">
        Load some JSON to search through it.
      </div>
    );
  }
  return (
    <div className="px-4 py-8 text-center text-sm text-text-faint">
      {hasQuery ? "No matches" : "Start typing to fuzzy-find keys, paths, or values."}
    </div>
  );
}
