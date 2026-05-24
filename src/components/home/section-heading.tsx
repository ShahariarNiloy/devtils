import { ArrowRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import { cn } from "@/lib/cn";

export interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  hint?: React.ReactNode;
  cta?: { href: string; label: string };
  /** Two-digit chapter index, e.g. "01". Renders an editorial section marker. */
  index?: string;
  /** Style for placement on a dark (olive-ink) band. */
  onDark?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  hint,
  cta,
  index,
  onDark = false,
}: SectionHeadingProps) {
  return (
    <div className="mb-10 flex items-end justify-between gap-5 flex-wrap">
      <div className="max-w-2xl">
        {/* Chaptered kicker — sage bar, a clay index numeral (the one spark of
            the reserved accent), then the eyebrow label. */}
        <span
          className={cn(
            "inline-flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-eyebrow",
            onDark ? "text-mist-sage" : "text-text-faint",
          )}
        >
          <span
            className="h-3.5 w-[3px] rounded-full"
            style={{ background: "var(--color-sage-olive)" }}
            aria-hidden
          />
          {index && (
            <>
              <span className="text-clay">{index}</span>
              <span aria-hidden className={onDark ? "text-mist-sage/40" : "text-text-faint/40"}>
                /
              </span>
            </>
          )}
          {eyebrow}
        </span>
        <h2
          className={cn(
            "display mt-3.5 text-balance text-h2 font-semibold tracking-tight sm:text-page",
            onDark ? "text-bone-cream" : "text-text",
          )}
        >
          {title}
        </h2>
        {hint && (
          <p
            className={cn(
              "mt-2.5 text-sm leading-snug-2",
              onDark ? "text-mist-sage/80" : "text-text-faint",
            )}
          >
            {hint}
          </p>
        )}
      </div>
      {cta && (
        <Link
          href={cta.href}
          className={cn(
            "group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-button border px-3.5 text-sm font-semibold transition-all duration-150 ease-out-strong hover:-translate-y-px",
            onDark
              ? "border-bone-cream/25 text-bone-cream hover:border-bone-cream/50"
              : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text",
          )}
        >
          {cta.label}
          <ArrowRight
            size={13}
            aria-hidden
            className="transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </div>
  );
}
