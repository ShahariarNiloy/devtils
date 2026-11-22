import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Wrapper for every brand line illustration (see the "Illustration library"
 * board in the design canvas). Pure SVG, server-renderable, no JS.
 *
 * Inside, draw with these strokes only (globals.css `--illus-*`):
 *   stroke="var(--illus-strong)"  main shapes        (cream 55%)
 *   stroke="var(--illus-mid)"     secondary shapes   (cream 28%)
 *   stroke="var(--illus-faint)"   background detail  (cream 14%)
 *   stroke="var(--illus-accent)"  EXACTLY ONE clay accent per drawing
 *   text: fill="var(--illus-text)" (or the accent), mono font is automatic
 * Connector lines may take className="illus-flow" (slow dash, off for
 * reduced motion). Strokes are 1.5px at every size (non-scaling).
 *
 * Decorative by default (aria-hidden). Pass `label` only when the drawing
 * carries meaning not stated in nearby text.
 */
export function LineArt({
  viewBox,
  children,
  className,
  label,
}: {
  viewBox: string;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      className={cn("line-art", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {children}
    </svg>
  );
}
