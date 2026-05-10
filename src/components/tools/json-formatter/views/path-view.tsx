"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
  getAllPaths,
  queryJsonPath,
} from "@/components/tools/json-formatter/json-formatter.lib";

export interface PathViewProps {
  value: unknown;
}

function serializeValue(v: unknown): string {
  if (v === undefined) return "";
  const str = JSON.stringify(v);
  if (!str) return "";
  return str.length > 50 ? str.slice(0, 50) + "…" : str;
}

export function PathView({ value }: PathViewProps) {
  const [filter, setFilter] = useState("");

  const allPaths = useMemo(() => getAllPaths(value), [value]);

  const filteredPaths = useMemo(() => {
    if (!filter.trim()) return allPaths;
    const q = filter.toLowerCase();
    return allPaths.filter((p) => p.toLowerCase().includes(q));
  }, [allPaths, filter]);

  const handleCopy = async (path: string) => {
    await navigator.clipboard.writeText(path);
    toast.success("Path copied to clipboard");
  };

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
        </span>
      </div>

      {/* Path list */}
      <div className="flex-1 overflow-auto">
        {filteredPaths.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-text-faint">
            No paths found
          </div>
        ) : (
          <ul>
            {filteredPaths.map((path) => {
              const pathValue = queryJsonPath(value, path)[0];
              const displayValue = serializeValue(pathValue);

              return (
                <li key={path}>
                  <button
                    type="button"
                    onClick={() => handleCopy(path)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-4 py-2.5",
                      "text-left border-b border-border-subtle last:border-0",
                      "hover:bg-surface-soft transition-colors group",
                    )}
                    title="Click to copy path"
                  >
                    <code className="text-sm font-mono text-text group-hover:text-brand transition-colors truncate">
                      {path}
                    </code>
                    {displayValue && (
                      <span className="text-sm font-mono text-text-faint truncate max-w-48 shrink-0">
                        {displayValue}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
