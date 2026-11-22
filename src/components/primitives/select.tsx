"use client";

import * as Radix from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { forwardRef, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Dropdowns. Use <Dropdown> — it draws the open list in the site's own
 * style (Radix Select) for mouse and trackpad users, and hands touch screens
 * the phone's native picker, which is easier to use there. The lower-level
 * Select* parts stay exported for anything that needs groups or custom items.
 */

export const Select = Radix.Root;
export const SelectGroup = Radix.Group;
export const SelectValue = Radix.Value;

interface SelectTriggerProps extends Radix.SelectTriggerProps {
  size?: "sm" | "md";
}

/** Styled trigger button for the Select primitive. */
const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, size = "md", children, ...rest }, ref) => (
    <Radix.Trigger
      ref={ref}
      className={cn(
        "inline-flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-surface-soft px-3 text-left text-text outline-none",
        "hover:border-border-strong focus-visible:border-border-strong data-[placeholder]:text-text-faint data-[state=open]:border-border-strong",
        size === "sm" ? "h-7 text-sm" : "h-8 text-sm",
        className,
      )}
      {...rest}
    >
      {children}
      <Radix.Icon asChild>
        <ChevronDown
          size={14}
          aria-hidden
          className="shrink-0 text-text-faint"
        />
      </Radix.Icon>
    </Radix.Trigger>
  ),
);
SelectTrigger.displayName = "SelectTrigger";

/** Floating list for the Select primitive. */
const SelectContent = forwardRef<HTMLDivElement, Radix.SelectContentProps>(
  (
    { className, position = "popper", sideOffset = 6, children, ...rest },
    ref,
  ) => (
    <Radix.Portal>
      <Radix.Content
        ref={ref}
        position={position}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-32 overflow-hidden rounded-[10px] border border-white/10 bg-surface-soft p-1 text-text shadow-float",
          "data-[state=open]:animate-scale-in",
          position === "popper" &&
            "max-h-[min(340px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)]",
          className,
        )}
        {...rest}
      >
        <Radix.ScrollUpButton className="flex h-6 cursor-default items-center justify-center text-text-faint">
          <ChevronDown size={14} aria-hidden className="rotate-180" />
        </Radix.ScrollUpButton>
        <Radix.Viewport className="p-0">{children}</Radix.Viewport>
        <Radix.ScrollDownButton className="flex h-6 cursor-default items-center justify-center text-text-faint">
          <ChevronDown size={14} aria-hidden />
        </Radix.ScrollDownButton>
      </Radix.Content>
    </Radix.Portal>
  ),
);
SelectContent.displayName = "SelectContent";

/** One option inside SelectContent. */
const SelectItem = forwardRef<HTMLDivElement, Radix.SelectItemProps>(
  ({ className, children, ...rest }, ref) => (
    <Radix.Item
      ref={ref}
      className={cn(
        "relative flex min-h-8 cursor-pointer items-center rounded-md py-1.5 pr-3 pl-7 text-[13px] text-text-tertiary outline-none select-none",
        "data-[highlighted]:bg-white/6 data-[highlighted]:text-text data-[state=checked]:text-text",
        "data-[disabled]:cursor-default data-[disabled]:opacity-40",
        className,
      )}
      {...rest}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <Radix.ItemIndicator>
          <Check size={12} aria-hidden className="text-brand" />
        </Radix.ItemIndicator>
      </span>
      <Radix.ItemText>{children}</Radix.ItemText>
    </Radix.Item>
  ),
);
SelectItem.displayName = "SelectItem";

export { SelectTrigger, SelectContent, SelectItem };

/* ------------------------------------------------------------ Dropdown */

const COARSE = "(pointer: coarse)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(COARSE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
/** Touch-first device? Server and first paint assume a mouse, then settle. */
function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COARSE).matches,
    () => false,
  );
}

export interface DropdownOption<T extends string> {
  /** Must not be "" (Radix reserves it); map an "empty" choice to a sentinel. */
  value: T;
  label: ReactNode;
  /** Plain text for the native picker when `label` isn't a string. */
  text?: string;
  disabled?: boolean;
}

export interface DropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly DropdownOption<T>[];
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /**
   * Trigger classes. `bare` drops the border and fill, for a dropdown that
   * sits inside a field that already draws them.
   */
  className?: string;
  bare?: boolean;
  /** Extra classes for the open list. */
  contentClassName?: string;
  disabled?: boolean;
}

/**
 * A dropdown in the site's style. Same props as a controlled <select>,
 * typed to its option values.
 */
export function Dropdown<T extends string>({
  value,
  onChange,
  options,
  id,
  className,
  bare,
  contentClassName,
  disabled,
  ...aria
}: DropdownProps<T>) {
  const coarse = useCoarsePointer();
  const look = cn(
    "inline-flex min-w-0 cursor-pointer items-center justify-between gap-2 text-left outline-none disabled:cursor-default disabled:opacity-50",
    bare
      ? "border-0 bg-transparent p-0"
      : "h-8 rounded-lg border border-border bg-surface-soft px-3 text-sm text-text hover:border-border-strong focus-visible:border-border-strong",
    className,
  );

  if (coarse) {
    return (
      <span className={cn(look, "relative p-0")}>
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const next = options.find((o) => o.value === e.target.value);
            if (next) onChange(next.value);
          }}
          {...aria}
          className={cn(
            "h-full w-full min-w-0 cursor-pointer appearance-none border-0 bg-transparent pr-6 text-inherit outline-none",
            !bare && "pl-3",
          )}
        >
          {options.map((o) => (
            <option
              key={o.value}
              value={o.value}
              disabled={o.disabled}
              className="bg-surface text-text"
            >
              {o.text ?? (typeof o.label === "string" ? o.label : o.value)}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          aria-hidden
          className={cn(
            "pointer-events-none absolute shrink-0 text-text-faint",
            bare ? "right-0" : "right-2.5",
          )}
        />
      </span>
    );
  }

  return (
    <Radix.Root
      value={value}
      onValueChange={(v) => {
        const next = options.find((o) => o.value === v);
        if (next) onChange(next.value);
      }}
      disabled={disabled}
    >
      <Radix.Trigger id={id} {...aria} className={look}>
        <span className="min-w-0 truncate">
          <Radix.Value />
        </span>
        <Radix.Icon asChild>
          <ChevronDown
            size={14}
            aria-hidden
            className="shrink-0 text-text-faint"
          />
        </Radix.Icon>
      </Radix.Trigger>
      <SelectContent className={contentClassName}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Radix.Root>
  );
}
