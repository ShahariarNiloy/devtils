"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface OptionsRowProps {
  children: ReactNode;
  className?: string;
}

/**
 * Shared horizontal options bar used by each converter tool's optionsBar
 * slot. Tools compose the individual controls they care about — this just
 * gives them a consistent height, padding, and flex behaviour.
 */
export function OptionsRow({ children, className }: OptionsRowProps) {
  return (
    <div
      className={cn(
        "flex h-12 items-center gap-3 px-3 overflow-x-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface OptionLabelProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}

export function OptionLabel({ label, htmlFor, children }: OptionLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex shrink-0 items-center gap-1.5 text-sm text-text-faint"
    >
      <span className="whitespace-nowrap">{label}</span>
      {children}
    </label>
  );
}

interface OptionDividerProps {
  className?: string;
}

export function OptionDivider({ className }: OptionDividerProps) {
  return (
    <span
      aria-hidden
      className={cn("h-5 w-px bg-border-subtle shrink-0", className)}
    />
  );
}
