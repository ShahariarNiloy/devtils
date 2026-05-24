"use client";

import * as Radix from "@radix-ui/react-popover";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Popover = Radix.Root;
export const PopoverTrigger = Radix.Trigger;
export const PopoverAnchor = Radix.Anchor;
export const PopoverClose = Radix.Close;

const PopoverContent = forwardRef<HTMLDivElement, Radix.PopoverContentProps>(
  ({ className, sideOffset = 8, align = "center", ...rest }, ref) => (
    <Radix.Portal>
      <Radix.Content
        ref={ref}
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 w-72 rounded-xl border border-border bg-surface-soft p-3.5 text-sm shadow-float outline-none",
          "data-[state=open]:animate-[scale-in_140ms_ease-out] data-[state=closed]:animate-[fade-out_100ms_ease-in]",
          className,
        )}
        {...rest}
      />
    </Radix.Portal>
  ),
);
PopoverContent.displayName = "PopoverContent";

export { PopoverContent };
