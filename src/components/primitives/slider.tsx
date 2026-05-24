"use client";

import * as Radix from "@radix-ui/react-slider";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Single-handle numeric slider built on Radix. Used for quality (1–100),
 * PNG optimization level (1–6), and any other discrete/continuous knob.
 */
export const Slider = forwardRef<HTMLSpanElement, Radix.SliderProps>(
  ({ className, ...rest }, ref) => (
    <Radix.Root
      ref={ref}
      className={cn(
        "relative flex h-5 w-full touch-none select-none items-center",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...rest}
    >
      <Radix.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-soft border border-border-subtle">
        <Radix.Range className="absolute h-full bg-brand" />
      </Radix.Track>
      <Radix.Thumb
        aria-label="Value"
        className={cn(
          "block h-4 w-4 rounded-full border-2 border-bg bg-brand shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          "transition-transform hover:scale-110",
        )}
      />
    </Radix.Root>
  ),
);
Slider.displayName = "Slider";
