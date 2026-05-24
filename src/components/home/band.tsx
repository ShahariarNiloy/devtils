import { cn } from "@/lib/cn";
import React from "react";

export interface BandProps {
  /** "paper" = base bg, "soft" = raised surface, "dark" = olive-ink color block. */
  tone?: "paper" | "soft" | "dark";
  id?: string;
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}

const TONE_BG: Record<NonNullable<BandProps["tone"]>, string> = {
  paper: "var(--color-bg)",
  soft: "var(--color-surface-soft)",
  dark: "var(--color-olive-ink)",
};

export function Band({
  tone = "paper",
  id,
  className = "",
  children,
  ...rest
}: BandProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative scroll-mt-20",
        tone === "soft" && "border-y border-border",
        tone === "dark" && "border-y border-olive-ink",
        className,
      )}
      style={{ background: TONE_BG[tone] }}
      {...rest}
    >
      <div className="relative mx-auto max-w-8xl px-6 sm:px-10">{children}</div>
    </section>
  );
}
