"use client";

import * as Radix from "@radix-ui/react-toggle";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

interface ToggleProps extends Radix.ToggleProps {
  size?: "sm" | "md";
}

/**
 * Pressable single toggle. For a set of mutually-styled toggles use ToggleGroup.
 */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, size = "md", ...rest }, ref) => (
    <Radix.Root
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-border bg-surface-2 text-text-muted transition-colors",
        "hover:bg-surface-3 hover:text-text",
        "data-[state=on]:bg-brand-dim data-[state=on]:text-brand data-[state=on]:border-brand/40",
        size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-2.5 text-xs",
        className,
      )}
      {...rest}
    />
  ),
);
Toggle.displayName = "Toggle";
