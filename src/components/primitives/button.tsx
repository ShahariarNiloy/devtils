"use client";

import { Slot } from "@radix-ui/react-slot";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Render as another element (using Radix Slot). */
  asChild?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-bg hover:bg-brand-hover hover:shadow-btn-primary active:scale-[0.98] disabled:bg-surface-soft disabled:text-text-faint disabled:shadow-none",
  secondary:
    "bg-transparent text-text border border-border hover:bg-surface-soft hover:border-border-strong active:scale-[0.98] disabled:opacity-50",
  ghost:
    "bg-transparent text-text-muted hover:text-text hover:bg-surface-soft active:scale-[0.98]",
  danger:
    "bg-[color:color-mix(in_oklab,var(--color-danger),transparent_85%)] text-danger border border-[color:color-mix(in_oklab,var(--color-danger),transparent_70%)] hover:bg-[color:color-mix(in_oklab,var(--color-danger),transparent_75%)] active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4.5 text-sm gap-2 rounded-button",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

/**
 * Button primitive. Defaults to a styled `<button>`; pass `asChild` to
 * delegate rendering to a child element while retaining classes and the
 * forwarded ref.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "secondary", size = "md", asChild = false, type, ...rest },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const inferredType = asChild ? undefined : (type ?? "button");
    return (
      <Comp
        ref={ref}
        type={inferredType}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap font-sans font-semibold transition-[background,color,border-color,transform,box-shadow] duration-150 ease-out disabled:pointer-events-none select-none cursor-pointer",
          variants[variant],
          sizes[size],
          className,
        )}
        {...rest}
      />
    );
  },
);
Button.displayName = "Button";
