"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { RegexMode } from "../regex.lib";
import type { RegexTesterState } from "../hooks/use-regex-tester";
import { BreakdownContent } from "../desktop/breakdown-content";
import { CheatsheetContent } from "../desktop/cheatsheet-content";
import { ExtractPanel } from "../panels/extract-panel";
import { MatchPanel } from "../panels/match-panel";
import { ReplacePanel } from "../panels/replace-panel";
import { SplitPanel } from "../panels/split-panel";

type Pane = RegexMode | "explain" | "cheatsheet";

const PANES: { id: Pane; label: string }[] = [
  { id: "match", label: "Matches" },
  { id: "replace", label: "Replace" },
  { id: "split", label: "Split" },
  { id: "extract", label: "Extract" },
  { id: "explain", label: "Explain" },
  { id: "cheatsheet", label: "Cheatsheet" },
];

const isMode = (p: Pane): p is RegexMode => p === "match" || p === "replace" || p === "split" || p === "extract";

const TOKENS: [string, string][] = [
  ["\\d", "digit"],
  ["\\w", "word"],
  ["\\s", "space"],
  [".", "any"],
  ["^", "start"],
  ["$", "end"],
  ["+", "1 or more"],
  ["*", "0 or more"],
  ["?", "optional"],
  ["(…)", "group"],
  ["[a-z]", "range"],
  ["|", "or"],
];

/**
 * Right pane (mockup "Matches"): a tab strip for the other result modes,
 * the result list, then the "Insert a token" keypad.
 */
export function ResultsPane({ state }: { state: RegexTesterState }) {
  const [pane, setPane] = useState<Pane>(state.mode);

  const pick = (p: Pane) => {
    setPane(p);
    if (isMode(p)) state.setMode(p);
  };

  return (
    <div className="flex min-w-0 flex-[1_1_0%] flex-col">
      <div
        role="tablist"
        aria-label="Result view"
        className="flex min-h-11 items-center gap-0.5 overflow-x-auto border-b border-border-subtle px-2 [scrollbar-width:none]"
      >
        {PANES.map((p) => {
          const on = pane === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => pick(p.id)}
              className={cn(
                "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-[7px] px-2.5 text-[13px] transition-colors",
                on ? "bg-selected font-bold text-text shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "font-medium text-text-tertiary hover:bg-white/6 hover:text-text",
              )}
            >
              {p.label}
              {p.id === "match" && state.compiled.ok && (
                <span className="font-mono text-[11px] font-normal text-text-faint">{state.matches.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {pane === "replace" && (
        <label className="flex flex-col gap-1.5 border-b border-border-subtle px-4 py-3">
          <span className="text-xs text-text-faint">Replace with — $1, $&lt;name&gt;, $&amp;</span>
          <input
            value={state.replacement}
            onChange={(e) => state.setReplacement(e.target.value)}
            spellCheck={false}
            placeholder="e.g. [$&] or $1"
            className="min-h-10 rounded-[10px] border border-white/10 bg-[#0d0d0c] px-3 font-mono text-[13px] text-text outline-none transition-colors placeholder:text-placeholder focus:border-clay-light/50"
          />
        </label>
      )}

      <div className="flex max-h-[60vh] min-h-40 grow flex-col overflow-y-auto">
        {pane === "match" && (
          <div className="flex flex-col gap-1.5 p-2.5">
            <MatchPanel
              matches={state.matches}
              selectedMatch={state.validSelected}
              onSelect={state.setSelectedMatch}
              invalid={!state.compiled.ok}
            />
          </div>
        )}
        {pane === "replace" && <ReplacePanel replaced={state.replaced} />}
        {pane === "split" && <SplitPanel parts={state.parts} />}
        {pane === "extract" && <ExtractPanel matches={state.matches} />}
        {pane === "explain" && <BreakdownContent tokens={state.tokens} />}
        {pane === "cheatsheet" && <CheatsheetContent />}
      </div>

      <div className="border-t border-border-subtle p-3">
        <div className="mb-2 text-xs text-text-faint">Insert a token</div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5">
          {TOKENS.map(([k, title]) => (
            <button
              key={k}
              type="button"
              title={`Insert ${title}`}
              onClick={() => state.insertToken(k)}
              className="flex min-h-11 flex-col items-center justify-center rounded-[9px] border border-white/9 bg-white/2 text-text-key transition-colors hover:border-clay-light/55 hover:text-white"
            >
              <span className="font-mono text-[13px] text-clay-cream">{k}</span>
              <span className="text-[10.5px] text-text-faint">{title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
