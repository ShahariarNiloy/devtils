"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { TOKEN_STYLE } from "../cheatsheet-data";
import type { ExplainToken } from "../regex.lib";

/**
 * Pattern breakdown, embeddable in the right-rail tab (no outer card chrome).
 * Hover state is local — it used to live in the page hook only to coordinate
 * a separate breakdown card that no longer exists.
 */
export function BreakdownContent({ tokens }: { tokens: ExplainToken[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (tokens.length === 0) {
    return (
      <div className="flex-1 px-4 py-10 text-center text-sm text-text-faint">
        Write a pattern to see how it breaks down.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* At a glance — chip strip */}
      <div className="bg-surface-soft/30 px-4 py-3">
        <div className="text-sm uppercase tracking-[0.08em] font-medium text-text-faint mb-2">
          At a glance
        </div>
        <div
          className="flex flex-wrap gap-1.5"
          onMouseLeave={() => setHovered(null)}
        >
          {tokens.map((t, i) => {
            const s = TOKEN_STYLE[t.type];
            const active = hovered === i;
            return (
              <button
                key={t.startIndex}
                type="button"
                onMouseEnter={() => setHovered(i)}
                title={`${s.label}: ${t.label}`}
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-1 font-mono text-sm font-medium whitespace-nowrap",
                  "border transition-all duration-100 cursor-default",
                  s.bg,
                  s.text,
                  active
                    ? "border-current ring-2 ring-current/25 -translate-y-px"
                    : "border-transparent",
                )}
              >
                {t.raw}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail rows */}
      <div
        className="border-t border-border-subtle divide-y divide-border-subtle"
        onMouseLeave={() => setHovered(null)}
      >
        {tokens.map((t, i) => {
          const s = TOKEN_STYLE[t.type];
          const active = hovered === i;
          return (
            <div
              key={t.startIndex}
              onMouseEnter={() => setHovered(i)}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors cursor-default",
                active ? "bg-surface-soft" : "hover:bg-surface-soft/40",
              )}
            >
              <code
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1.5 font-mono text-sm font-semibold min-w-[3rem] text-center",
                  s.bg,
                  s.text,
                )}
              >
                {t.raw.length > 12 ? t.raw.slice(0, 11) + "…" : t.raw}
              </code>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-text">
                    {t.label}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-sm font-medium uppercase tracking-[0.06em]",
                      s.bg,
                      s.text,
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                <div className="text-sm text-text-faint mt-0.5">{t.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
