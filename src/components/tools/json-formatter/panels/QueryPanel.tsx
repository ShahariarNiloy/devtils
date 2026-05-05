"use client";

import { Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/primitives/Button";
import type { JsonFormatterState } from "../useJsonFormatter";

interface QueryPanelProps {
  state: JsonFormatterState;
}

export function QueryPanel({ state }: QueryPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-card">
      {/* Input row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
        <span className="text-sm text-text-faint font-medium shrink-0">JSONPath query:</span>
        <input
          type="text"
          value={state.queryPath}
          onChange={(e) => state.setQueryPath(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "q") {
              e.preventDefault();
              state.runQuery();
            }
          }}
          placeholder="$.employees[*].firstName"
          className={cn(
            "flex-1 h-9 rounded-lg border border-border-subtle bg-surface-soft px-3 text-sm font-mono text-text",
            "placeholder:text-text-faint outline-none transition-[border-color] focus:border-brand",
          )}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={state.runQuery}
          className="gap-1.5 shrink-0"
        >
          <Play size={12} />
          Run
          <span className="text-sm text-text-faint font-mono">⌘⇧Q</span>
        </Button>
      </div>

      {/* Results */}
      {state.queryResults.length > 0 ? (
        <div className="px-4 py-3 max-h-48 overflow-auto">
          <p className="text-sm text-text-faint mb-2">
            {state.queryResults.length} match{state.queryResults.length !== 1 ? "es" : ""}
          </p>
          <ul className="space-y-1 font-mono text-sm">
            {state.queryResults.map((result, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-text-faint shrink-0">[{i}]</span>
                <span className="text-text break-all">
                  {JSON.stringify(result)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : state.queryPath && state.queryPath !== "$" ? (
        <div className="px-4 py-3">
          <p className="text-sm text-text-faint">No results</p>
        </div>
      ) : null}
    </div>
  );
}
