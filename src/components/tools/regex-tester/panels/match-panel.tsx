"use client";

import { memo } from "react";
import { cn } from "@/lib/cn";
import type { RegexMatch } from "../regex.lib";
import { matchTint } from "../hooks/build-highlighted";

const SHOW_MAX = 200;

interface MatchPanelProps {
  matches: RegexMatch[];
  selectedMatch: number | null;
  onSelect: (i: number | null) => void;
  /** True while the pattern doesn't compile — the banner explains it. */
  invalid: boolean;
}

/** Match cards (mockup): #n · value · index, then capture-group chips. */
export const MatchPanel = memo(function MatchPanel({ matches, selectedMatch, onSelect, invalid }: MatchPanelProps) {
  if (matches.length === 0) {
    return (
      <p className="mx-1.5 my-2 text-sm text-text-faint">
        {invalid ? "Fix the pattern to see matches." : "No matches yet. Edit the pattern or the test string."}
      </p>
    );
  }
  return (
    <>
      {matches.slice(0, SHOW_MAX).map((m, i) => {
        const selected = selectedMatch === i;
        const named = Object.entries(m.named);
        return (
          <button
            key={m.index}
            type="button"
            aria-pressed={selected}
            title={selected ? "Click to un-highlight" : "Click to highlight in the test string"}
            onClick={() => onSelect(selected ? null : i)}
            className={cn(
              "surface-panel flex w-full flex-col gap-1.5 rounded-[10px] px-3 py-2.5 text-left transition-colors",
              selected ? "border-clay-light/55" : "hover:border-white/14",
            )}
          >
            <span className="flex w-full items-center gap-2.5 text-xs text-text-faint">
              <span className={cn("font-mono", matchTint(i))}>#{i + 1}</span>
              <span className="grow break-all font-mono text-[13px] text-text">
                {m.match === "" ? <span className="text-text-faint italic">(empty match)</span> : m.match}
              </span>
              <span className="shrink-0">index {m.index}</span>
            </span>
            {(m.groups.length > 0 || named.length > 0) && (
              <span className="flex flex-wrap gap-1.5">
                {m.groups.map((g, j) => (
                  <span key={`g${j + 1}`} className="break-all rounded-md bg-white/5 px-2 py-0.5 text-xs text-text-muted">
                    <span className="text-text-faint">group {j + 1}</span> {g === "" ? "—" : g}
                  </span>
                ))}
                {named.map(([k, v]) => (
                  <span key={k} className="break-all rounded-md bg-clay-light/10 px-2 py-0.5 text-xs text-text-muted">
                    <span className="text-clay-light">{k}</span> {v === "" ? "—" : v}
                  </span>
                ))}
              </span>
            )}
          </button>
        );
      })}
      {matches.length > SHOW_MAX && (
        <p className="m-0 py-1 text-center text-xs text-text-faint">
          Showing {SHOW_MAX} of {matches.length.toLocaleString()} — copy them all from the ⋯ menu.
        </p>
      )}
    </>
  );
});
