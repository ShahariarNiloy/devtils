"use client";

import { useId } from "react";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";

/**
 * v2 converter toolbar controls (mockup "conv" family): a labelled mono
 * text field, a segmented picker and a pill switch. Each is a real form
 * control with an accessible name; sizes keep 38–44px touch targets.
 */

interface ToolbarFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Accessible name when the visible label is terse ("Root"). */
  ariaLabel?: string;
  className?: string;
  maxLength?: number;
}

export function ToolbarField({ label, value, onChange, ariaLabel, className, maxLength }: ToolbarFieldProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-11 min-w-0 flex-[0_1_220px] items-center gap-2 rounded-[10px] border border-white/10 bg-[#0d0d0c] px-3 text-[13px] text-text-faint transition-colors focus-within:border-clay-light/50",
        className,
      )}
    >
      {label}
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        maxLength={maxLength}
        aria-label={ariaLabel}
        className="min-w-0 grow border-0 bg-transparent font-mono text-sm text-syntax-key outline-none"
      />
    </label>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-0.5 rounded-[11px] border border-border-subtle bg-[#0d0d0c] p-[3px]"
    >
      {options.map(([v, text]) => {
        const on = v === value;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(v)}
            className={cn(
              "min-h-[38px] rounded-lg px-3.5 font-mono text-[13px] font-medium transition-colors",
              on
                ? "bg-selected text-text shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
                : "text-text-tertiary hover:bg-white/6 hover:text-text",
            )}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

interface ToggleChipProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Longer description (title + accessible description). */
  hint?: string;
}

export function ToggleChip({ label, checked, onChange, hint }: ToggleChipProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={hint}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 items-center gap-2.5 rounded-[10px] border border-border px-3 text-[13px] font-semibold text-text-key transition-colors hover:border-border-strong"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-block h-5 w-[34px] shrink-0 rounded-full motion-safe:transition-colors",
          checked ? "bg-accent" : "bg-[#3a3833]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-text motion-safe:transition-[left]",
            checked ? "left-4" : "left-0.5",
          )}
        />
      </span>
      {label}
    </button>
  );
}

interface MenuCheckProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}

/** ⋯ menu toggle for options the mockup's toolbar doesn't show. */
export function MenuCheck({ label, checked, onChange, hint }: MenuCheckProps) {
  return (
    <DropdownMenuCheckboxItem
      checked={checked}
      onCheckedChange={(v) => onChange(v === true)}
      onSelect={(e) => e.preventDefault()}
      className="flex-col items-start gap-0 text-text-muted"
    >
      <span>{label}</span>
      {hint && <span className="text-xs text-text-faint">{hint}</span>}
    </DropdownMenuCheckboxItem>
  );
}

interface MenuChoiceProps<T extends string> {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}

/** ⋯ menu single-choice group (checkbox items with one checked). */
export function MenuChoice<T extends string>({ label, value, options, onChange }: MenuChoiceProps<T>) {
  return (
    <>
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      {options.map(([v, text]) => (
        <DropdownMenuCheckboxItem
          key={v}
          checked={v === value}
          onCheckedChange={() => onChange(v)}
          onSelect={(e) => e.preventDefault()}
          className="text-text-muted"
        >
          {text}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );
}
