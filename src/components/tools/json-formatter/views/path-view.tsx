"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { getAllPaths, queryJsonPath } from "@/components/tools/json-formatter/json-formatter.lib";
import { highlightJson } from "../json-highlighter";
import { useVirtualList } from "./use-virtual-list";

export interface PathViewProps {
  value: unknown;
}

const ROW_HEIGHT = 34;
// Hard cap so a huge document can't build millions of path strings on the
// main thread. The list is virtualized, so this is plenty.
const PATH_CAP = 20_000;
/** Matches rendered at most — the count stays honest. */
const MATCH_CAP = 500;

/**
 * v2 Path view: a live JSONPath box, the match count, and the matches. With
 * no query it lists every path in the document (click to copy).
 */
export function PathView({ value }: PathViewProps) {
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query).trim();

  const result = useMemo(() => {
    if (!q) return null;
    try {
      return { matches: queryJsonPath(value, q), error: null };
    } catch (err) {
      return { matches: [], error: err instanceof Error ? err.message : "Invalid JSONPath" };
    }
  }, [value, q]);

  const html = useMemo(
    () =>
      result && !result.error
        ? highlightJson(
            result.matches
              .slice(0, MATCH_CAP)
              .map((m) => JSON.stringify(m, null, 2) ?? "undefined")
              .join("\n"),
          )
        : "",
    [result],
  );

  return (
    <div className="flex h-full flex-col gap-3.5 overflow-hidden p-4">
      <label className="flex shrink-0 items-center gap-2.5 rounded-[10px] border border-border bg-[#0d0d0c] px-3 py-2.5 font-mono text-[13px] focus-within:border-white/20">
        <span className="text-text-faint">JSONPath</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="$.users[*].email"
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 grow border-0 bg-transparent text-text outline-none placeholder:text-text-faint"
        />
      </label>

      {result ? (
        <>
          <div className="shrink-0 text-xs text-text-faint">
            {result.error
              ? result.error
              : `${result.matches.length} match${result.matches.length === 1 ? "" : "es"}${result.matches.length > MATCH_CAP ? ` · showing ${MATCH_CAP}` : ""}`}
          </div>
          {!result.error && result.matches.length > 0 && (
            <pre className="m-0 min-h-0 flex-1 overflow-auto font-mono text-[13px] leading-[1.75] whitespace-pre-wrap text-text">
              <code dangerouslySetInnerHTML={{ __html: html }} />
            </pre>
          )}
        </>
      ) : (
        <AllPaths value={value} />
      )}
    </div>
  );
}

function AllPaths({ value }: { value: unknown }) {
  const paths = useMemo(() => getAllPaths(value, "$", PATH_CAP), [value]);
  const { scrollRef, onScroll, totalHeight, offsetY, startIndex, endIndex } = useVirtualList(paths.length, ROW_HEIGHT);
  const copy = async (path: string) => {
    await navigator.clipboard.writeText(path);
    toast.success("Path copied");
  };
  return (
    <>
      <div className="shrink-0 text-xs text-text-faint">
        {paths.length} paths{paths.length >= PATH_CAP ? ` · first ${PATH_CAP}` : ""} · type a query, or click a path to copy it
      </div>
      <div ref={scrollRef} onScroll={onScroll} className="-mx-2 min-h-0 flex-1 overflow-auto">
        <div style={{ height: totalHeight, position: "relative" }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {paths.slice(startIndex, endIndex).map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => void copy(path)}
                style={{ height: ROW_HEIGHT }}
                className="flex w-full items-center truncate rounded-md px-2 text-left font-mono text-[13px] text-syntax-key hover:bg-white/[.04]"
              >
                {path}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
