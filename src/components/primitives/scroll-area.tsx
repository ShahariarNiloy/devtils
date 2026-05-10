"use client";

import * as Radix from "@radix-ui/react-scroll-area";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

interface ScrollAreaProps extends Radix.ScrollAreaProps {
  /** Pass-through className for the inner viewport (where the actual scroll happens). */
  viewportClassName?: string;
}

/**
 * Custom-styled scroll container. The viewport accepts arbitrary children;
 * we render a thin chartreuse-tinted thumb on demand.
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, viewportClassName, children, ...rest }, ref) => (
    <Radix.Root
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      type="hover"
      {...rest}
    >
      <Radix.Viewport className={cn("h-full w-full", viewportClassName)}>
        {children}
      </Radix.Viewport>
      <Radix.Scrollbar
        orientation="vertical"
        className="flex w-2 touch-none select-none p-0.5 transition-colors hover:bg-surface-2/50"
      >
        <Radix.Thumb className="relative flex-1 rounded-full bg-border-strong" />
      </Radix.Scrollbar>
      <Radix.Scrollbar
        orientation="horizontal"
        className="flex h-2 touch-none select-none p-0.5"
      >
        <Radix.Thumb className="relative flex-1 rounded-full bg-border-strong" />
      </Radix.Scrollbar>
      <Radix.Corner />
    </Radix.Root>
  ),
);
ScrollArea.displayName = "ScrollArea";
