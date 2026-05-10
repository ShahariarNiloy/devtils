import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "neutral" | "brand" | "info" | "success" | "warning" | "danger";

/** Maps each variant to Tailwind utility classes using the live token set. */
const variants: Record<BadgeVariant, string> = {
  neutral: "bg-surface-soft text-text-muted border-border",
  brand:   "bg-accent-soft text-brand border-border",
  info:    "bg-accent-soft text-text-muted border-border",
  success: "bg-mist-sage text-brand border-border",
  warning: "bg-accent-soft text-text-muted border-border",
  danger:  "bg-[color:color-mix(in_oklab,var(--color-danger),transparent_85%)] text-danger border-[color:color-mix(in_oklab,var(--color-danger),transparent_70%)]",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Renders uppercase text with extra tracking for tier/status badges. */
  uppercase?: boolean;
}

/**
 * Tiny tag chip. Use `uppercase` for tier badges; leave default for tag pills.
 * Danger variant keeps an inline color-mix because there is no danger-tint token.
 */
export function Badge({
  className,
  variant = "neutral",
  uppercase = false,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 h-5 leading-none whitespace-nowrap",
        uppercase
          ? "text-sm font-semibold uppercase tracking-eyebrow"
          : "text-sm font-medium",
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
}
