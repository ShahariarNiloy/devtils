"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { queryJsonPath } from "../json-formatter.lib";
import {
  buildFuzzyIndex,
  FUZZY_MAX_ENTRIES,
  searchFuzzy,
  type FuzzyResult,
} from "../fuzzy-search";

interface SearchPanelProps {
  /** Parsed JSON document (output if present, else parsed input). */
  value: unknown;
  onClose: () => void;
}

const RESULT_LIMIT = 60;

/** A JSONPath expression always starts with the `$` root selector. */
function isJsonPath(q: string): boolean {
  return q.trim().startsWith("$");
}

/**
 * One intelligent search for everything. The user types into a single box;
 * if the query starts with `$` it's run as a JSONPath, otherwise it's a
 * fuzzy match across keys / paths / values. No mode toggle — intent is
 * detected from the input itself.
 */
export function SearchPanel({ value, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const deferredQuery = useDeferredValue(query);

  const trimmed = deferredQuery.trim();
  const jsonPathMode = trimmed.length > 0 && isJsonPath(trimmed);

  const fuzzyIndex = useMemo(() => {
    if (jsonPathMode || value === null || value === undefined) return [];
    return buildFuzzyIndex(value);
  }, [jsonPathMode, value]);

  const fuzzyResults = useMemo(
    () =>
      jsonPathMode
        ? []
        : searchFuzzy(fuzzyIndex, deferredQuery, { limit: RESULT_LIMIT }),
    [jsonPathMode, fuzzyIndex, deferredQuery],
  );

  const jsonPathResults = useMemo(
    () => (jsonPathMode ? queryJsonPath(value, trimmed) : []),
    [jsonPathMode, value, trimmed],
  );

  const effectiveIdx = Math.min(
    selectedIdx,
    Math.max(0, fuzzyResults.length - 1),
  );

  const pick = (r: FuzzyResult) => {
    void navigator.clipboard.writeText(r.entry.path).catch(() => {});
    toast.success(`Path copied · ${r.entry.path}`);
  };

  const badge = badgeLabel({
    trimmed,
    jsonPathMode,
    indexed: Math.min(fuzzyIndex.length, FUZZY_MAX_ENTRIES),
    jsonPathCount: jsonPathResults.length,
    fuzzyCount: fuzzyResults.length,
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
        <Search size={15} className="shrink-0 text-text-faint" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (jsonPathMode) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelectedIdx(
                Math.min(effectiveIdx + 1, fuzzyResults.length - 1),
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelectedIdx(Math.max(effectiveIdx - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const r = fuzzyResults[effectiveIdx];
              if (r) pick(r);
            }
          }}
          placeholder="Search keys & values… or a JSONPath like $.users[*].email"
          spellCheck={false}
          className={cn(
            "h-9 flex-1 rounded-lg border border-border-subtle bg-silver px-3 font-mono text-base text-text",
            "placeholder:text-text-faint outline-none transition-[border-color] focus:border-brand",
          )}
        />
        <span className="shrink-0 font-mono text-sm text-text-faint">
          {badge}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search panel"
          className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-faint transition-colors hover:bg-silver hover:text-text"
        >
          <X size={14} />
        </button>
      </div>

      <SearchResults
        jsonPathMode={jsonPathMode}
        query={trimmed}
        hasQuery={trimmed.length > 0}
        indexEmpty={value === null || value === undefined}
        fuzzyResults={fuzzyResults}
        effectiveIdx={effectiveIdx}
        jsonPathResults={jsonPathResults}
        onHover={setSelectedIdx}
        onPick={pick}
      />
    </div>
  );
}

function SearchResults({
  jsonPathMode,
  query,
  hasQuery,
  indexEmpty,
  fuzzyResults,
  effectiveIdx,
  jsonPathResults,
  onHover,
  onPick,
}: {
  jsonPathMode: boolean;
  query: string;
  hasQuery: boolean;
  indexEmpty: boolean;
  fuzzyResults: FuzzyResult[];
  effectiveIdx: number;
  jsonPathResults: unknown[];
  onHover: (i: number) => void;
  onPick: (r: FuzzyResult) => void;
}) {
  if (indexEmpty) {
    return (
      <div className="px-4 py-6 text-center text-sm text-text-faint">
        Load some JSON to search through it.
      </div>
    );
  }

  if (jsonPathMode) {
    if (jsonPathResults.length === 0) {
      return (
        <div className="px-4 py-6 text-center text-sm text-text-faint">
          No JSONPath matches.
        </div>
      );
    }
    const seen = new Map<string, number>();
    return (
      <div className="max-h-48 overflow-auto px-4 py-3">
        <ul className="space-y-1 font-mono text-sm">
          {jsonPathResults.map((result, i) => {
            const json = JSON.stringify(result);
            const n = (seen.get(json) ?? 0) + 1;
            seen.set(json, n);
            return (
              <li key={`${json}#${n}`} className="flex gap-3">
                <span className="shrink-0 text-text-faint">[{i}]</span>
                <span className="break-all text-text">{json}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (fuzzyResults.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-text-faint">
        {hasQuery
          ? "No matches"
          : "Start typing to fuzzy-find keys, paths, or values — or paste a JSONPath."}
      </div>
    );
  }

  return (
    <FuzzyResultList
      results={fuzzyResults}
      effectiveIdx={effectiveIdx}
      query={query}
      onHover={onHover}
      onPick={onPick}
    />
  );
}

function FuzzyResultList({
  results,
  effectiveIdx,
  query,
  onHover,
  onPick,
}: {
  results: FuzzyResult[];
  effectiveIdx: number;
  query: string;
  onHover: (i: number) => void;
  onPick: (r: FuzzyResult) => void;
}) {
  // Keyboard-friendly: keep the active row in view as ↑/↓ moves it.
  const activeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [effectiveIdx]);

  return (
    <div className="max-h-56 overflow-auto">
      {/* Split header — Key | Value */}
      <div className="sticky top-0 z-10 grid grid-cols-2 border-b border-border bg-silver px-4 py-1.5 font-mono text-sm font-semibold uppercase tracking-wide text-text-faint">
        <span>Key</span>
        <span className="border-l border-border-subtle pl-3">Value</span>
      </div>
      <ul className="divide-y divide-border-subtle">
        {results.map((r, i) => {
          const active = i === effectiveIdx;
          return (
            <li key={r.entry.path}>
              <button
                ref={active ? activeRef : null}
                type="button"
                onMouseEnter={() => onHover(i)}
                onClick={() => onPick(r)}
                className={cn(
                  "grid w-full grid-cols-2 gap-0 px-4 py-2 text-left outline-none transition-colors",
                  active
                    ? "bg-silver ring-1 ring-inset ring-border"
                    : "hover:bg-silver/60",
                )}
              >
                {/* Key column */}
                <div className="min-w-0 pr-3">
                  <div className="truncate font-mono text-sm tracking-tight text-text">
                    <Highlight text={r.entry.key || "[root]"} q={query} />
                  </div>
                  <div className="mt-0.5 truncate font-mono text-sm tracking-tight text-text-faint">
                    <Highlight text={r.entry.path} q={query} />
                  </div>
                </div>
                {/* Value column */}
                <div className="min-w-0 border-l border-border-subtle pl-3">
                  <div className="break-all font-mono text-sm tracking-tight text-text-muted">
                    {r.entry.value ? (
                      <Highlight text={r.entry.value} q={query} />
                    ) : (
                      <span className="text-text-faint">—</span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Case-insensitive substring highlight of the active query. */
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-transparent font-bold not-italic text-inherit underline decoration-2 underline-offset-2">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function badgeLabel({
  trimmed,
  jsonPathMode,
  indexed,
  jsonPathCount,
  fuzzyCount,
}: {
  trimmed: string;
  jsonPathMode: boolean;
  indexed: number;
  jsonPathCount: number;
  fuzzyCount: number;
}): string {
  if (!trimmed) return `${indexed.toLocaleString()} indexed`;
  if (jsonPathMode) return `JSONPath · ${jsonPathCount}`;
  const more = fuzzyCount === RESULT_LIMIT ? "+" : "";
  return `Fuzzy · ${fuzzyCount}${more}`;
}
