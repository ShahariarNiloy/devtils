"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { TOKEN_STYLE } from "../../cheatsheet-data";
import type { MobileState } from "../types";

interface ExplainViewProps {
  state: MobileState;
}

export function ExplainView({ state }: ExplainViewProps) {
  const { tokens, pattern, compiled } = state;

  if (!pattern) {
    return (
      <EmptyState
        title="No pattern yet"
        subtitle="Write a regex above to see how each token works."
      />
    );
  }
  if (!compiled.ok) {
    return (
      <EmptyState
        title="Pattern is invalid"
        subtitle="Fix the pattern to see its breakdown."
      />
    );
  }
  if (tokens.length === 0) {
    return (
      <EmptyState
        title="Nothing to break down"
        subtitle="This pattern has no recognised tokens."
      />
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-3.5 py-3 bg-surface-soft/40 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm uppercase tracking-wide font-semibold text-text-faint">
            At a glance
          </span>
          <span className="font-mono text-sm text-text-faint">
            {tokens.length} {tokens.length === 1 ? "token" : "tokens"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tokens.map((t, i) => {
            const s = TOKEN_STYLE[t.type];
            return (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-1 font-mono text-sm font-medium whitespace-nowrap",
                  s.bg,
                  s.text,
                )}
              >
                {t.raw}
              </span>
            );
          })}
        </div>
      </div>

      <table className="w-full border-collapse">
        <tbody>
          {tokens.map((t, i) => {
            const s = TOKEN_STYLE[t.type];
            return (
              <tr key={i} className="border-b border-border-subtle last:border-b-0">
                <td className="align-top px-3.5 py-3 whitespace-nowrap">
                  <code
                    className={cn(
                      "inline-flex justify-center rounded-md px-2 py-1 font-mono text-sm font-semibold min-w-16 text-center",
                      s.bg,
                      s.text,
                    )}
                  >
                    {t.raw.length > 12 ? t.raw.slice(0, 11) + "…" : t.raw}
                  </code>
                </td>
                <td className="align-top px-3.5 py-3 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-text">{t.label}</span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-sm font-medium uppercase tracking-wide",
                        s.bg,
                        s.text,
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div className="text-sm text-text-faint mt-0.5">{t.detail}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-3">
      <AlertCircle size={36} className="text-text-faint opacity-50" aria-hidden />
      <p className="text-base font-medium text-text">{title}</p>
      <p className="text-sm text-text-faint max-w-xs">{subtitle}</p>
    </div>
  );
}
