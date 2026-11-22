"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A settings choice: one row of mutually exclusive options. */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  cols,
}: {
  label: string;
  value: T;
  options: readonly {
    id: T;
    label: string;
    sub?: string;
    disabled?: boolean;
  }[];
  onChange: (v: T) => void;
  /** Grid template, e.g. "grid-cols-3". */
  cols: string;
}) {
  const enabled = options.filter((o) => !o.disabled);
  // Arrow keys move between options, as a radio group should.
  const onKey = (e: KeyboardEvent) => {
    const dir =
      (
        { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<
          string,
          number
        >
      )[e.key] ?? 0;
    if (!dir || !enabled.length) return;
    e.preventDefault();
    const i = enabled.findIndex((o) => o.id === value);
    const next = enabled[(i + dir + enabled.length) % enabled.length];
    onChange(next.id);
    const el = e.currentTarget.querySelector<HTMLElement>(
      `[data-id="${String(next.id)}"]`,
    );
    el?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
      className={cn(
        "grid gap-1 rounded-[10px] border border-white/7 bg-[#0d0d0c] p-[3px]",
        cols,
      )}
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={String(o.id)}
            type="button"
            role="radio"
            aria-checked={on}
            data-id={String(o.id)}
            tabIndex={on ? 0 : -1}
            disabled={o.disabled}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex min-h-8 cursor-pointer flex-col items-center justify-center gap-px rounded-lg border-0 px-1 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 max-sm:min-h-11",
              o.sub ? "py-[7px]" : "",
              on
                ? "bg-selected text-text"
                : "bg-transparent text-text-tertiary hover:text-text",
            )}
          >
            <span className={cn("text-[12.5px]", o.sub && "font-bold")}>
              {o.label}
            </span>
            {o.sub && (
              <span className="text-[10.5px] font-normal text-text-faint">
                {o.sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** One block of the settings column. */
export function Setting({
  title,
  hint,
  children,
  first,
}: {
  title: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  first?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3.5",
        !first && "border-t border-border-subtle",
      )}
    >
      <span className="text-[13px] font-bold">{title}</span>
      {children}
      {hint && (
        <span className="text-xs leading-normal text-text-faint">{hint}</span>
      )}
    </div>
  );
}

export const PREVIEW_SIZES = [
  {
    px: 150,
    short: "S",
    name: "Small",
    cols: "sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]",
  },
  {
    px: 200,
    short: "M",
    name: "Medium",
    cols: "sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]",
  },
  {
    px: 260,
    short: "L",
    name: "Large",
    cols: "sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]",
  },
] as const;
export type PreviewSize = (typeof PREVIEW_SIZES)[number]["short"];

export function SizePicker({
  value,
  onChange,
  label,
}: {
  value: PreviewSize;
  onChange: (v: PreviewSize) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-0.5 rounded-lg border border-white/7 bg-[#0d0d0c] p-0.5 max-sm:hidden"
    >
      {PREVIEW_SIZES.map((z) => (
        <button
          key={z.short}
          type="button"
          aria-pressed={value === z.short}
          aria-label={z.name}
          title={z.name}
          onClick={() => onChange(z.short)}
          className={cn(
            "min-h-[26px] w-7 cursor-pointer rounded-md border-0 text-[11.5px] font-semibold",
            value === z.short
              ? "bg-selected text-text"
              : "bg-transparent text-text-tertiary hover:text-text",
          )}
        >
          {z.short}
        </button>
      ))}
    </div>
  );
}

/** Full-screen workspace: Escape leaves it, and the page behind doesn't scroll. */
export function useFullScreen(on: boolean, setOn: (v: boolean) => void) {
  useEffect(() => {
    if (!on) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOn(false);
    };
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [on, setOn]);
}

export function FullScreenButton({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  const Icon = on ? Minimize2 : Maximize2;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className="inline-flex min-h-[30px] cursor-pointer items-center gap-1.5 rounded-lg border border-white/12 bg-transparent px-2.5 text-[12.5px] text-text-strong hover:border-white/25 max-sm:hidden"
    >
      <Icon size={13} aria-hidden />
      {on ? "Exit full screen" : "Full screen"}
    </button>
  );
}

/** Classes for the tool window, normal or full screen. */
export const windowClass = (full: boolean) =>
  cn(
    "relative overflow-hidden bg-[#101010]",
    full
      ? "fixed inset-0 z-[60] flex flex-col rounded-none"
      : "rounded-[18px] shadow-window-tool",
  );
