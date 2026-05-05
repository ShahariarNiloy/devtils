"use client";

import * as Radix from "@radix-ui/react-tooltip";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const TooltipProvider = Radix.Provider;
export const TooltipRoot = Radix.Root;
export const TooltipTrigger = Radix.Trigger;
export const TooltipPortal = Radix.Portal;

interface TooltipContentProps extends Radix.TooltipContentProps {
  className?: string;
}

const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, sideOffset = 6, ...rest }, ref) => (
    <Radix.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 select-none rounded-lg border border-border bg-surface-warm px-2 py-2 text-xs font-medium text-terracotta-deep shadow-[0_4px_12px_-6px_rgba(164,114,81,0.25)]",
        "data-[state=delayed-open]:animate-[scale-in_140ms_ease-out] data-[state=closed]:animate-[fade-out_120ms_ease-in]",
        className,
      )}
      {...rest}
    />
  ),
);
TooltipContent.displayName = "TooltipContent";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: Radix.TooltipContentProps["side"];
  delayDuration?: number;
  /** Optional keyboard hint suffix shown in muted color, e.g. "⌘ K". */
  shortcut?: string;
}

/**
 * One-line wrapper around Radix Tooltip — wrap any element to show a styled
 * popover on hover/focus. Pass `shortcut` to append a muted hotkey suffix.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  delayDuration = 200,
  shortcut,
}: TooltipProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipRoot>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side={side}>
            <span className="flex items-center gap-2">
              {content}
              {shortcut ? (
                <span className="text-text-faint font-mono text-2xs">{shortcut}</span>
              ) : null}
            </span>
            <Radix.Arrow className="fill-[var(--color-surface-warm)]" />
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </TooltipProvider>
  );
}

export { TooltipContent };
