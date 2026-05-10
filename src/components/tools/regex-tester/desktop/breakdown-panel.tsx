"use client";

import { cn } from "@/lib/cn";
import { TOKEN_STYLE } from "../cheatsheet-data";
import type { ExplainToken } from "../regex.lib";

interface BreakdownPanelProps {
  tokens: ExplainToken[];
  hoveredToken: number | null;
  setHoveredToken: (v: number | null) => void;
  breakdownRef: React.RefObject<HTMLDivElement | null>;
}

export function BreakdownPanel({
  tokens,
  hoveredToken,
  setHoveredToken,
  breakdownRef,
}: BreakdownPanelProps) {
  return (
    <div
      ref={breakdownRef}
      className="rounded-xl border border-border bg-surface overflow-hidden scroll-mt-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-12 border-b border-border-subtle">
        <span className="text-sm font-semibold text-text">Pattern breakdown</span>
        {tokens.length > 0 && (
          <span className="rounded-full bg-surface-soft px-2 py-0.5 font-mono text-sm text-text-muted">
            {tokens.length} {tokens.length === 1 ? "token" : "tokens"}
          </span>
        )}
      </div>

      {tokens.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-text-faint">
          Write a pattern to see how it breaks down.
        </div>
      ) : (
        <>
          {/* At-a-glance: visual chip strip */}
          <div className="bg-surface-soft/30 px-4 py-3">
            <div className="text-sm uppercase tracking-[0.08em] font-medium text-text-faint mb-2">
              At a glance
            </div>
            <div className="flex flex-wrap gap-1.5" onMouseLeave={() => setHoveredToken(null)}>
              {tokens.map((t, i) => {
                const s = TOKEN_STYLE[t.type];
                const active = hoveredToken === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setHoveredToken(i)}
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
            className="border-t border-border-subtle divide-y divide-border-subtle max-h-80 overflow-y-auto"
            onMouseLeave={() => setHoveredToken(null)}
          >
            {tokens.map((t, i) => {
              const s = TOKEN_STYLE[t.type];
              const active = hoveredToken === i;
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredToken(i)}
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
                      <span className="text-sm font-semibold text-text">{t.label}</span>
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
        </>
      )}
    </div>
  );
}
