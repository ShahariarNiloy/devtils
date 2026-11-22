"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Warning } from "../curl-parse.lib";

export const SECTION =
  "text-[11.5px] font-bold tracking-[.05em] text-text-faint";
export const FIELD =
  "min-h-[34px] w-full min-w-0 rounded-lg border border-white/10 bg-[#0d0d0c] px-2.5 font-mono text-[12.5px] text-text-key outline-none placeholder:text-placeholder focus-visible:border-border-strong max-sm:min-h-11";
export const DASHED =
  "min-h-7 cursor-pointer rounded-[7px] border border-dashed border-white/16 bg-transparent px-2.5 text-xs text-text-tertiary hover:text-text max-sm:min-h-11";

/** Method colours (board): GET sage-green, POST clay, PUT teal… */
export const METHOD_TEXT: Record<string, string> = {
  GET: "text-syntax-string",
  POST: "text-cat-clay",
  PUT: "text-cat-teal",
  PATCH: "text-syntax-boolean",
  DELETE: "text-cat-rose",
};
export const methodText = (m: string) => METHOD_TEXT[m] ?? "text-text-tertiary";

export function Switch({
  checked,
  onChange,
  label,
  note,
  small,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  note?: string;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left text-text-key max-sm:min-h-11",
        small ? "min-h-[30px] text-[12.5px]" : "min-h-8",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative h-5 w-[34px] shrink-0 rounded-full transition-colors",
          checked ? "bg-cat-clay" : "bg-white/14",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] size-3.5 rounded-full bg-text transition-transform",
            checked && "translate-x-3.5",
          )}
        />
      </span>
      {note === undefined ? (
        label
      ) : (
        <span className="flex flex-col">
          <span className="text-[13px] font-semibold">{label}</span>
          <span className="text-[11.5px] text-text-faint">{note}</span>
        </span>
      )}
    </button>
  );
}

/** Segmented control (auth, body type, shell, language). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  tabs,
  size = "sm",
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  /** Render as a tablist (language switcher). */
  tabs?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div
      role={tabs ? "tablist" : "group"}
      aria-label={label}
      className={cn(
        "flex w-fit flex-wrap gap-0.5 border border-white/7 bg-[#0d0d0c]",
        size === "md" ? "rounded-[10px] p-[3px]" : "rounded-lg p-0.5",
      )}
    >
      {options.map(([id, text]) => {
        const on = id === value;
        return (
          <button
            key={id}
            type="button"
            role={tabs ? "tab" : undefined}
            aria-selected={tabs ? on : undefined}
            aria-pressed={tabs ? undefined : on}
            onClick={() => onChange(id)}
            className={cn(
              "cursor-pointer border-0 font-semibold transition-colors max-sm:min-h-11",
              size === "md"
                ? "min-h-[30px] rounded-[7px] px-3 text-[13px]"
                : "min-h-7 rounded-md px-2.5 text-xs",
              on
                ? "bg-selected text-text"
                : "bg-transparent text-text-tertiary hover:text-text",
            )}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

export function Warnings({ items }: { items: readonly Warning[] }) {
  if (!items.length) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {items.map((w) => {
        const warn = w.level === "warn";
        return (
          <li
            key={w.text}
            className={cn(
              "flex gap-[9px] rounded-[9px] border px-2.5 py-2",
              warn
                ? "border-[rgba(224,160,114,.25)] bg-[rgba(224,160,114,.08)] text-tier-pro-text"
                : "border-white/6 bg-white/3 text-text-tertiary",
            )}
          >
            <span
              aria-hidden="true"
              className="flex size-4 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold"
            >
              {warn ? "!" : "i"}
            </span>
            <span className="text-[12.5px] leading-[1.45]">
              <span className="sr-only">{warn ? "Warning: " : "Note: "}</span>
              {w.text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function Section({
  title,
  children,
  gap = "gap-1.5",
}: {
  title: ReactNode;
  children: ReactNode;
  gap?: string;
}) {
  return (
    <div className={cn("flex flex-col", gap)}>
      <span className={SECTION}>{title}</span>
      {children}
    </div>
  );
}

/** Key/value table rows used by the parsed view. */
export function KvTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-white/6">
      {children}
    </div>
  );
}
