"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Level } from "../jwt-checks";
import type { JsonLine, JsonTone } from "../jwt-decoder.lib";

/** Small shared pieces of the JWT workspace (mockup v8 styling). */

export const SEG_TONE = {
  header: { text: "text-cat-rose", bg: "bg-cat-rose" },
  payload: { text: "text-clay-light", bg: "bg-clay-light" },
  signature: { text: "text-cat-teal", bg: "bg-cat-teal" },
} as const;

/** Soft clay-cream used for warnings in this tool (mockup #f0c9a0). */
export const WARN_TEXT = "text-[#f0c9a0]";

export const LEVEL_TONE: Record<Level, { text: string; bg: string; icon: string }> = {
  ok: { text: "text-success-text", bg: "bg-success/14", icon: "✓" },
  warn: { text: WARN_TEXT, bg: "bg-clay-light/14", icon: "!" },
  bad: { text: "text-error-text", bg: "bg-error/14", icon: "✕" },
  neutral: { text: "text-text-tertiary", bg: "bg-white/6", icon: "–" },
};

export const JSON_TONE: Record<JsonTone, string> = {
  key: "text-syntax-key",
  string: "text-syntax-string",
  number: "text-syntax-number",
  boolean: "text-syntax-boolean",
  null: "text-syntax-punctuation",
  punct: "text-syntax-punctuation",
  plain: "text-syntax-plain",
};

/** The 8px category square in section headers and legends. */
export function Swatch({ className }: { className: string }) {
  return <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-[2px]", className)} />;
}

export function JsonLines({ lines, className }: { lines: readonly JsonLine[]; className?: string }) {
  return (
    <div className={cn("bg-[#0d0d0c] px-3.5 py-2.5 font-mono text-xs leading-[1.65] md:text-[12.5px]", className)}>
      {lines.map((line) => (
        <div key={line.n} className="break-words whitespace-pre-wrap [overflow-wrap:anywhere]">
          {line.segs.map((s) => (
            <span key={s.o} className={JSON_TONE[s.t]}>
              {s.v}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export interface SegOption<T extends string | number> {
  value: T;
  label: ReactNode;
}

/**
 * Segmented control. `tabs` renders an ARIA tablist (arrow keys move and
 * select); otherwise a group of aria-pressed toggle buttons.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  tabs = false,
  size = "md",
  mono = false,
  className,
  itemClassName,
}: {
  options: readonly SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  tabs?: boolean;
  size?: "xs" | "sm" | "md";
  mono?: boolean;
  className?: string;
  itemClassName?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (!tabs) return;
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % options.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  const sizes = {
    xs: "min-h-[26px] rounded-md px-2 text-[11px]",
    sm: "min-h-[26px] rounded-md px-2.5 text-xs",
    md: "min-h-8 rounded-[7px] px-[13px] text-[13px]",
  } as const;
  return (
    <div
      role={tabs ? "tablist" : "group"}
      aria-label={label}
      className={cn(
        "flex gap-0.5 bg-[#0d0d0c]",
        size === "md" ? "rounded-[10px] border border-white/7 p-[3px]" : "rounded-lg p-0.5",
        className,
      )}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role={tabs ? "tab" : undefined}
            aria-selected={tabs ? on : undefined}
            aria-pressed={tabs ? undefined : on}
            tabIndex={tabs && !on ? -1 : undefined}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "cursor-pointer border-0 transition-colors max-md:min-h-11",
              sizes[size],
              mono ? "font-mono" : "font-semibold",
              on ? "bg-selected text-text" : "bg-transparent text-text-tertiary hover:text-text",
              itemClassName,
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Pill switch with its label inside the button (mockup's b64 toggle). */
export function InlineSwitch({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-[30px] cursor-pointer items-center gap-2 self-start border-0 bg-transparent p-0 text-xs text-text-tertiary hover:text-text max-md:min-h-11"
    >
      <span aria-hidden="true" className={cn("relative h-4 w-[30px] rounded-full transition-colors", checked ? "bg-clay-light" : "bg-white/14")}>
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-3 rounded-full bg-text transition-transform",
            checked ? "translate-x-[14px]" : "translate-x-0",
          )}
        />
      </span>
      {children}
    </button>
  );
}

/** Outline button used for secondary actions (Fetch, Check it, quick actions). */
export function OutlineButton({
  children,
  onClick,
  disabled,
  mono = false,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-8 cursor-pointer items-center justify-center rounded-lg border border-white/14 bg-transparent px-3 text-xs text-text-key transition-colors hover:bg-white/6 hover:text-text disabled:cursor-default disabled:opacity-60 max-md:min-h-11",
        mono ? "font-mono" : "font-semibold",
        className,
      )}
    >
      {children}
    </button>
  );
}
