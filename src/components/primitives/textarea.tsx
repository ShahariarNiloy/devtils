import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * Multi-line input. Defaults to a code-friendly mono font. Resize is
 * disabled because tools embed it in fixed panels.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...rest }, ref) => (
    <textarea
      ref={ref}
      spellCheck={false}
      className={cn(
        "w-full rounded-xl border-1.5 border-border bg-surface px-4 py-3 font-mono text-sm leading-relaxed text-text placeholder:text-text-faint",
        "resize-none transition-[border-color,box-shadow] hover:border-border-strong",
        "focus:border-brand focus:shadow-focus",
        "disabled:opacity-50",
        className,
      )}
      {...rest}
    />
  ),
);
Textarea.displayName = "Textarea";
