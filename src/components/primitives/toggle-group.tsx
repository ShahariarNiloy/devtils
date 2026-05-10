"use client";

import * as Radix from "@radix-ui/react-toggle-group";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const ToggleGroup = forwardRef<
  HTMLDivElement,
  Radix.ToggleGroupSingleProps | Radix.ToggleGroupMultipleProps
>(({ className, ...rest }, ref) => (
  <Radix.Root
    ref={ref}
    className={cn(
      "inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-1",
      className,
    )}
    {...rest}
  />
));
ToggleGroup.displayName = "ToggleGroup";

export const ToggleGroupItem = forwardRef<HTMLButtonElement, Radix.ToggleGroupItemProps>(
  ({ className, ...rest }, ref) => (
    <Radix.Item
      ref={ref}
      className={cn(
        "inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md px-2 font-mono text-sm text-text-muted transition-colors",
        "hover:text-text hover:bg-surface-3",
        "data-[state=on]:bg-brand data-[state=on]:text-charcoal data-[state=on]:hover:bg-brand-glow",
        className,
      )}
      {...rest}
    />
  ),
);
ToggleGroupItem.displayName = "ToggleGroupItem";
