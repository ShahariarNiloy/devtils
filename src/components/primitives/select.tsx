"use client";

import * as Radix from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

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
        "inline-flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-soft px-3 text-text",
        "hover:border-border-strong data-[state=open]:border-brand data-[placeholder]:text-text-faint",
        size === "sm" ? "h-7 text-sm" : "h-8 text-sm",
        className,
      )}
      {...rest}
    >
      {children}
      <Radix.Icon asChild>
        <ChevronDown size={12} className="text-text-muted" />
      </Radix.Icon>
    </Radix.Trigger>
  ),
);
SelectTrigger.displayName = "SelectTrigger";

/** Floating content panel for the Select primitive. */
const SelectContent = forwardRef<HTMLDivElement, Radix.SelectContentProps>(
  ({ className, position = "popper", sideOffset = 4, ...rest }, ref) => (
    <Radix.Portal>
      <Radix.Content
        ref={ref}
        position={position}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-32 overflow-hidden rounded-lg border border-border bg-surface-soft p-1 shadow-2xl",
          "data-[state=open]:animate-[scale-in_140ms_ease-out]",
          position === "popper" && "min-w-[var(--radix-select-trigger-width)]",
          className,
        )}
        {...rest}
      >
        <Radix.Viewport className="p-0">{rest.children as ReactNode}</Radix.Viewport>
      </Radix.Content>
    </Radix.Portal>
  ),
);
SelectContent.displayName = "SelectContent";

/** Individual option inside SelectContent. */
const SelectItem = forwardRef<HTMLDivElement, Radix.SelectItemProps>(
  ({ className, children, ...rest }, ref) => (
    <Radix.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-7 pr-2 text-sm text-text-muted outline-none",
        "data-[highlighted]:bg-surface-sage data-[highlighted]:text-text",
        "data-[state=checked]:text-text",
        className,
      )}
      {...rest}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <Radix.ItemIndicator>
          <Check size={11} className="text-brand" />
        </Radix.ItemIndicator>
      </span>
      <Radix.ItemText>{children}</Radix.ItemText>
    </Radix.Item>
  ),
);
SelectItem.displayName = "SelectItem";

export { SelectTrigger, SelectContent, SelectItem };
