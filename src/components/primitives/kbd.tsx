import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Inline keyboard-shortcut chip. Renders one or more keycaps separated by
 * thin dividers. Pass children as the literal key combo: `<Kbd>⌘ K</Kbd>`.
 */
export function Kbd({ className, children, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-border bg-accent-soft px-1 h-kbd min-w-kbd text-sm font-mono font-medium text-charcoal leading-none tracking-tight",
        className,
      )}
      {...rest}
    >
      {children}
    </kbd>
  );
}
