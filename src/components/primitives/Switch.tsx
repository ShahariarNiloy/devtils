"use client";

import * as Radix from "@radix-ui/react-switch";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Pill toggle. Use for boolean tool options (e.g. JSON minify mode).
 */
export const Switch = forwardRef<HTMLButtonElement, Radix.SwitchProps>(
  ({ className, ...rest }, ref) => (
    <Radix.Root
      ref={ref}
      className={cn(
        "relative h-5 w-9 shrink-0 cursor-pointer rounded-full bg-surface-3 border border-border transition-colors",
        "data-[state=checked]:bg-brand data-[state=checked]:border-brand",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...rest}
    >
      <Radix.Thumb
        className={cn(
          "block h-3.5 w-3.5 rounded-full bg-text shadow-sm",
          "translate-x-0.5 transition-transform data-[state=checked]:translate-x-4.5",
          "data-[state=checked]:bg-charcoal",
        )}
      />
    </Radix.Root>
  ),
);
Switch.displayName = "Switch";
