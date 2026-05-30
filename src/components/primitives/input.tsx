import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Text input matching the site's visual language. Add `font-mono` for
 * code-style inputs (regex, base64, hex).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full h-11 rounded-xl border-1.5 border-border bg-surface px-3.5 py-3 text-base text-text placeholder:text-text-faint",
        "transition-[border-color,box-shadow,background] hover:border-border-strong",
        "focus:border-brand focus:shadow-focus focus:bg-surface",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = "Input";
