import { cn } from "@/lib/cn";
import React from "react";

export interface BandProps {
  tone?: "paper" | "soft";
  id?: string;
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}

export function Band({
  tone = "paper",
  id,
  className = "",
  children,
  ...rest
}: BandProps) {
  const isSoft = tone === "soft";
  return (
    <section
      id={id}
      className={cn(
        "relative scroll-mt-20",
        isSoft && "border-y border-border",
        className,
      )}
      style={{
        background: isSoft ? "var(--color-surface-soft)" : "var(--color-bg)",
      }}
      {...rest}
    >
      <div className="relative mx-auto max-w-8xl px-6 sm:px-10">{children}</div>
    </section>
  );
}
