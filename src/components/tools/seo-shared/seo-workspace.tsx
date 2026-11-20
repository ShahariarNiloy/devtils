"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { statusOf, type CheckCounts } from "./seo.lib";
import { LEVEL_DOT } from "./seo-tones";

interface SeoWorkspaceProps {
  /** Optional top bar (presets / type segments). */
  top?: ReactNode;
  /** Left column: the form. */
  form: ReactNode;
  /** Right column: checks, previews, tables, code. */
  results: ReactNode;
  /** Drives the status bar's "● 2 errors / All good". */
  counts: CheckCounts;
  /** Status-bar detail (the mockup shows the tool name). */
  detail: string;
}

/**
 * v2 SEO window: optional top bar, form ‖ results (wrapping to a stack on
 * narrow screens), then the mono status bar.
 */
export function SeoWorkspace({ top, form, results, counts, detail }: SeoWorkspaceProps) {
  const status = statusOf(counts);
  return (
    <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px] md:flex md:h-[max(var(--ws-min,580px),calc(100dvh-var(--chrome-top,165px)-24px))] md:flex-col">
      {top && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-toolbar p-3">{top}</div>
      )}
      <div className="flex min-h-[520px] flex-wrap md:min-h-0 md:flex-1 md:flex-nowrap md:[&>*]:min-h-0 md:[&>*]:overflow-auto">
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5 border-r border-border-subtle p-4">{form}</div>
        <div className="flex min-w-0 flex-[1.1_1_380px] flex-col">{results}</div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
        <span className={LEVEL_DOT[status.level]}>● {status.text}</span>
        <span>{detail}</span>
        <span className="grow" />
        <span className="text-success-text">Local-only</span>
      </div>
    </div>
  );
}

/** "Start from" + preset pills for the top bar. */
export function SeoPresets<T extends string>({
  presets,
  onPick,
}: {
  presets: readonly { id: T; label: string }[];
  onPick: (id: T) => void;
}) {
  return (
    <>
      <span className="mr-0.5 text-xs text-text-faint">Start from</span>
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onPick(p.id)}
          className="min-h-9 cursor-pointer rounded-full border border-white/12 px-3 text-xs font-semibold text-text-strong transition-colors hover:border-border-strong hover:text-text"
        >
          {p.label}
        </button>
      ))}
    </>
  );
}

/** Segmented type picker for the top bar (JSON-LD types etc.). */
export function SeoSegmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-0.5 rounded-[11px] border border-border-subtle bg-[#0d0d0c] p-[3px]">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={cn(
              "min-h-[38px] cursor-pointer rounded-lg px-3 text-[13px] font-semibold transition-colors",
              on ? "bg-selected text-text shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "text-text-tertiary hover:text-text",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Bordered panel inside the form column (e.g. the robots.txt path tester). */
export function SeoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="surface-panel flex flex-col gap-2.5 rounded-xl p-3.5">
      <span className="text-[13px] font-bold">{title}</span>
      {children}
    </section>
  );
}
