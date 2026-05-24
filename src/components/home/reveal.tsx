import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
}

/**
 * Scroll-reveal wrapper — fades + rises its children as they enter the
 * viewport via CSS scroll-driven animation (`animation-timeline: view()`).
 *
 * Robust by design: the hiding lives inside `@supports` + a
 * `prefers-reduced-motion: no-preference` query (see globals.css), so any
 * browser without scroll-timeline support, and any user who opts out of
 * motion, gets the content fully visible. No JS, no hydration flash, and no
 * blank sections if scripting is unavailable — unlike a JS `whileInView`.
 *
 * Don't wrap a subtree that relies on `position: sticky`; the settled
 * animation transform becomes the sticky containing block.
 */
export function Reveal({ children, className }: RevealProps) {
  return (
    <div className={className ? `reveal-on-scroll ${className}` : "reveal-on-scroll"}>
      {children}
    </div>
  );
}
