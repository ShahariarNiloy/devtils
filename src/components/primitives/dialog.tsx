"use client";

import * as Radix from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Dialog = Radix.Root;
export const DialogTrigger = Radix.Trigger;
export const DialogPortal = Radix.Portal;
export const DialogClose = Radix.Close;

const DialogOverlay = forwardRef<HTMLDivElement, Radix.DialogOverlayProps>(
  ({ className, ...rest }, ref) => (
    <Radix.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm",
        "data-[state=open]:animate-[fade-in_180ms_ease-out] data-[state=closed]:animate-[fade-out_120ms_ease-in]",
        className,
      )}
      {...rest}
    />
  ),
);
DialogOverlay.displayName = "DialogOverlay";

interface DialogContentProps extends Radix.DialogContentProps {
  /** When true, suppress the close-X (used by the command palette which uses Esc only). */
  hideClose?: boolean;
}

const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, hideClose = false, ...rest }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <Radix.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-[20%] z-50 w-[min(540px,calc(100vw-32px))] -translate-x-1/2 rounded-xl border border-border bg-surface shadow-[0_4px_12px_-6px_rgba(164,114,81,0.2)]",
          "data-[state=open]:animate-[scale-in_200ms_cubic-bezier(0.2,0.9,0.4,1)] data-[state=closed]:animate-[scale-out_120ms_ease-in]",
          className,
        )}
        {...rest}
      >
        {children}
        {!hideClose && (
          <Radix.Close
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-warm hover:text-text"
            aria-label="Close dialog"
          >
            <X size={14} />
          </Radix.Close>
        )}
      </Radix.Content>
    </DialogPortal>
  ),
);
DialogContent.displayName = "DialogContent";

const DialogTitle = forwardRef<HTMLHeadingElement, Radix.DialogTitleProps>(
  ({ className, ...rest }, ref) => (
    <Radix.Title
      ref={ref}
      className={cn("text-sm font-medium tracking-tight", className)}
      {...rest}
    />
  ),
);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = forwardRef<HTMLParagraphElement, Radix.DialogDescriptionProps>(
  ({ className, ...rest }, ref) => (
    <Radix.Description
      ref={ref}
      className={cn("text-sm text-text-muted", className)}
      {...rest}
    />
  ),
);
DialogDescription.displayName = "DialogDescription";

interface DialogHeaderProps {
  children: ReactNode;
  className?: string;
}

function DialogHeader({ children, className }: DialogHeaderProps) {
  return <div className={cn("flex flex-col gap-1 px-5 pt-5 pb-3", className)}>{children}</div>;
}

export {
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
};
