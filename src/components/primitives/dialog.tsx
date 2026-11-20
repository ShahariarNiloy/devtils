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
        "fixed inset-0 z-40 bg-[rgba(8,8,7,.62)] backdrop-blur-[6px]",
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
          "fixed left-1/2 top-[20%] z-50 w-[min(540px,calc(100vw-32px))] -translate-x-1/2 rounded-[18px] bg-[rgba(26,26,24,.97)] shadow-[inset_0_1px_0_rgba(255,255,255,.07),0_0_0_1px_rgba(255,255,255,.09),0_40px_80px_-30px_rgba(0,0,0,.9)]",
          "data-[state=open]:animate-[scale-in_200ms_cubic-bezier(0.2,0.9,0.4,1)] data-[state=closed]:animate-[scale-out_120ms_ease-in]",
          className,
        )}
        {...rest}
      >
        {children}
        {!hideClose && (
          <Radix.Close
            className="surface-key absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-[9px] text-text-muted hover:text-text"
            aria-label="Close dialog"
          >
            <X size={16} />
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

/**
 * Full-screen sheet (mobile menu). No overlay or centring — it covers the
 * viewport; Radix still provides focus trapping, Esc and scroll lock.
 */
const DialogSheetContent = forwardRef<HTMLDivElement, Radix.DialogContentProps>(
  ({ className, ...rest }, ref) => (
    <DialogPortal>
      <Radix.Content
        ref={ref}
        className={cn("fixed inset-0 z-50 flex flex-col data-[state=open]:animate-[fade-in_160ms_ease-out]", className)}
        {...rest}
      />
    </DialogPortal>
  ),
);
DialogSheetContent.displayName = "DialogSheetContent";

export {
  DialogOverlay,
  DialogContent,
  DialogSheetContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
};
