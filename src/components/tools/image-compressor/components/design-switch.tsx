"use client";

import { cn } from "@/lib/cn";

/**
 * The board's 34×20 switch: clay track when on, cream knob. A real
 * `role="switch"` button. With `label` the label text sits inside the
 * button (one big target); without it, pass `aria-label`.
 */
export function DesignSwitch({
  checked,
  onCheckedChange,
  label,
  title,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label?: string;
  title?: string;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      aria-describedby={describedBy}
      title={title}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "group inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent text-[12.5px] text-text-strong outline-none focus-visible:ring-2 focus-visible:ring-brand",
        label ? "min-h-8 px-1 max-sm:min-h-11" : "max-sm:min-h-11 max-sm:min-w-11 max-sm:justify-center",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("relative h-5 w-[34px] shrink-0 rounded-full transition-colors duration-150", checked ? "bg-clay-light" : "bg-white/14")}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] size-3.5 rounded-full bg-text transition-transform duration-150",
            checked ? "translate-x-[14px]" : "translate-x-0",
          )}
        />
      </span>
      {label}
    </button>
  );
}
