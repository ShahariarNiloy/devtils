"use client";

import { cn } from "@/lib/cn";
import { CHEATSHEET, TOKEN_STYLE } from "../cheatsheet-data";

/** Regex cheatsheet, embeddable in the right-rail tab (no dialog chrome). */
export function CheatsheetContent() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
      {CHEATSHEET.map((group) => {
        const s = TOKEN_STYLE[group.type];
        return (
          <div key={group.section}>
            <div className="text-sm font-semibold text-text-muted uppercase tracking-[0.07em] mb-2">
              {group.section}
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              {group.rows.map(([token, desc]) => (
                <div
                  key={token}
                  className="flex items-start gap-4 px-3 py-2 border-b border-border-subtle last:border-b-0 hover:bg-surface-soft/50 transition-colors"
                >
                  <code
                    className={cn(
                      "font-mono text-sm rounded px-2 py-0.5 shrink-0 min-w-[6.5rem] text-center",
                      s.bg,
                      s.text,
                    )}
                  >
                    {token}
                  </code>
                  <span className="text-sm text-text-muted pt-0.5">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
