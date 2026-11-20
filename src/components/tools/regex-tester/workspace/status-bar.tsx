"use client";

import type { RegexTesterState } from "../hooks/use-regex-tester";

/** v2 status bar: ● 3 matches · flags /gim · 120 chars … Local-only. */
export function RegexStatusBar({ state }: { state: RegexTesterState }) {
  const { compiled, matches, flags, text, execMsDisplay, tokens, lineCount } = state;
  const n = matches.length;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
      {compiled.ok ? (
        <span className="text-success">● {n} {n === 1 ? "match" : "matches"}</span>
      ) : (
        <span className="text-error">● Invalid pattern</span>
      )}
      {compiled.ok && (
        <span>
          flags /{flags.join("")} · {text.length.toLocaleString()} chars
          <span className="max-sm:hidden"> · {lineCount} {lineCount === 1 ? "line" : "lines"} · {tokens.length} tokens</span>
          {execMsDisplay && <span className="max-sm:hidden"> · {execMsDisplay}</span>}
        </span>
      )}
      <span className="grow" />
      <span className="text-success-text">Local-only</span>
    </div>
  );
}
