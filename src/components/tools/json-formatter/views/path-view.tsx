"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
  getAllPaths,
  queryJsonPath,
} from "@/components/tools/json-formatter/json-formatter.lib";
import { useVirtualList } from "./use-virtual-list";

export interface PathViewProps {
  value: unknown;
}

const ROW_HEIGHT = 40;
// Hard cap so a huge document can't build millions of path strings on the
// main thread. The list is virtualized + filterable, so this is plenty.
const PATH_CAP = 20_000;

function serializeValue(v: unknown): string {
  if (v === undefined) return "";
  return JSON.stringify(v) ?? "";
}

export function PathView({ value }: PathViewProps) {
  const [filter, setFilter] = useState("");

  const allPaths = useMemo(
    () => getAllPaths(value, "$", PATH_CAP),
    [value],
  );
  const truncated = allPaths.length >= PATH_CAP;

  const filteredPaths = useMemo(() => {
    if (!filter.trim()) return allPaths;
    const q = filter.toLowerCase();
    return allPaths.filter((p) => p.toLowerCase().includes(q));
  }, [allPaths, filter]);

  const { scrollRef, onScroll, totalHeight, offsetY, startIndex, endIndex } =
    useVirtualList(filteredPaths.length, ROW_HEIGHT);

  const handleCopy = async (path: string) => {
    await navigator.clipboard.writeText(path);
    toast.success("Path copied to clipboard");
  };

  const slice = filteredPaths.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header / filter bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle bg-surface shrink-0">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter paths…"
          className={cn(
            "flex-1 h-9 rounded-lg border border-border-subtle bg-surface-soft px-3 text-sm text-text",
            "placeholder:text-text-faint outline-none transition-[border-color] focus:border-brand",
          )}
        />
        <span className="text-sm text-text-faint font-mono shrink-0">
          {filteredPaths.length} paths
          {truncated && (
            <span className="text-text-faint/70"> · first {PATH_CAP}</span>
          )}
        </span>
      </div>

      {/* Path list — virtualized: queryJsonPath only runs for visible rows. */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-auto">
        {filteredPaths.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-text-faint">
            No paths found
          </div>
        ) : (
          <div style={{ height: totalHeight, position: "relative" }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {slice.map((path) => {
                const pathValue = queryJsonPath(value, path)[0];
                const displayValue = serializeValue(pathValue);

                return (
                  <button
                    key={path}
                    type="button"
                    onClick={() => handleCopy(path)}
                    style={{ height: ROW_HEIGHT }}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-4 box-border",
                      "text-left border-b border-border-subtle",
                      "hover:bg-surface-soft transition-colors group",
                    )}
                    title="Click to copy path"
                  >
                    <code className="text-base font-mono text-text group-hover:text-brand transition-colors truncate tracking-tight">
                      {path}
                    </code>
                    {displayValue && (
                      <span className="text-base font-mono text-text-faint truncate max-w-64 shrink-0 tracking-tight">
                        {displayValue}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
