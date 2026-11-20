"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** v2 segmented control (mockup "segs"): full width on mobile. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex gap-0.5 rounded-[11px] border border-border-subtle bg-[#0d0d0c] p-[3px]", className)}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-10 flex-1 basis-0 cursor-pointer whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold transition-colors",
              on ? "bg-selected text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-text-tertiary hover:text-text",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Pill track + knob, drawn inside a pressable button (mockup "tg"). */
export function SwitchTrack({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block h-5 w-[34px] shrink-0 rounded-full transition-colors", on ? "bg-accent" : "bg-[#3a3833]")}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-text transition-[left] duration-150 motion-reduce:transition-none",
          on ? "left-4" : "left-0.5",
        )}
      />
    </span>
  );
}

export function ToggleButton({
  on,
  onToggle,
  children,
  className,
  disabled,
  title,
}: {
  on: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] border border-border px-3 text-left text-[13px] font-semibold text-text-key transition-colors hover:border-border-strong",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <SwitchTrack on={on} />
      {children}
    </button>
  );
}

/** v2 status bar: ● status · detail … Local-only. */
export function StatusBar({ tone, text, detail }: { tone: string; text: string; detail?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
      <span className={tone}>● {text}</span>
      {detail && <span>{detail}</span>}
      <span className="grow" />
      <span className="text-success-text">Local-only</span>
    </div>
  );
}
