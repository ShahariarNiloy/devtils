"use client";

import * as Radix from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface MobileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Sheet height as a max-h class. Defaults to ~85% of dynamic viewport. */
  className?: string;
  children: ReactNode;
}

/**
 * Bottom-anchored sheet wrapping Radix Dialog. Slides up from the bottom edge,
 * has a drag-handle indicator + sticky title bar with close, and respects the
 * iOS safe-area inset.
 */
export function MobileSheet({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
}: MobileSheetProps) {
  return (
    <Radix.Root open={open} onOpenChange={onOpenChange}>
      <Radix.Portal>
        <Radix.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm",
            "data-[state=open]:animate-[fade-in_180ms_ease-out]",
            "data-[state=closed]:animate-[fade-out_120ms_ease-in]",
          )}
        />
        <Radix.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex flex-col",
            "max-h-[calc(100dvh-3rem)]",
            "rounded-t-2xl border-t border-border bg-surface",
            "pb-[env(safe-area-inset-bottom)]",
            "data-[state=open]:animate-[sheet-up-in_220ms_cubic-bezier(0.2,0.9,0.4,1)]",
            "data-[state=closed]:animate-[sheet-down-out_160ms_ease-in]",
            className,
          )}
        >
          {/* Drag handle */}
          <div className="pt-2 pb-1 flex justify-center shrink-0">
            <span className="block w-9 h-1 rounded-full bg-border-subtle" aria-hidden />
          </div>

          {/* Title bar */}
          <div className="flex items-center justify-between gap-3 px-4 pb-3 border-b border-border-subtle shrink-0">
            <div className="min-w-0">
              <Radix.Title className="text-base font-semibold text-text">
                {title}
              </Radix.Title>
              {description && (
                <Radix.Description className="text-sm text-text-faint">
                  {description}
                </Radix.Description>
              )}
            </div>
            <Radix.Close
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-soft hover:text-text transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} aria-hidden />
            </Radix.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">{children}</div>
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}
