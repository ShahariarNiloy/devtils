"use client";

import { TOOL_COUNT } from "@/lib/tools-registry";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

export interface StatItem {
  value: string | number;
  label: string;
  dotColor: string;
}

interface HeroLeftProps {
  stats: StatItem[];
}

/**
 * Hero left panel content. Four clear segments — live badge, headline,
 * subtitle + CTAs, and a stat row — each visually separated so the panel
 * reads as structured rather than a wall of text. The privacy/free promise
 * is carried by the badge and stats (and the "The difference" section
 * below), so there's no separate trust strip repeating it a third time.
 */
export function HeroLeft({ stats }: HeroLeftProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Segment 1 — live status badge */}
      <div className="inline-flex w-fit items-center gap-2 rounded-pill border border-border bg-surface py-1.5 pl-2.5 pr-3.5 font-mono text-[11px] font-semibold uppercase tracking-eyebrow text-text-muted shadow-search">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ background: "var(--color-sage-olive)" }}
          />
          <span
            className="relative inline-flex h-2 w-2 rounded-full"
            style={{ background: "var(--color-sage-olive)" }}
          />
        </span>
        {TOOL_COUNT} tools · 100% client-side
      </div>

      {/* Segment 2 — headline + subtitle */}
      <h1 className="display mt-6 text-balance text-hero-md font-bold leading-hero tracking-tight sm:text-6xl lg:text-hero-lg">
        <span className="block">Every tool you need,</span>
        <span className="block text-brand">not one you don&apos;t.</span>
        <span className="block text-clay">Free at the core.</span>
      </h1>

      <p className="mt-6 max-w-xl text-pretty text-lg leading-desc text-text-muted">
        Developer tools for JSON, PDF, regex, images, colors, and encoding — all
        running in your browser. No sign-up, no uploads, nothing leaves your
        machine.
      </p>

      {/* Segment 3 — CTAs */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/tools"
          className="group inline-flex h-btn-lg items-center gap-2 rounded-button px-5 text-sm font-semibold transition-all duration-150 ease-out-strong hover:-translate-y-px active:translate-y-0"
          style={{
            background: "var(--color-brand)",
            color: "var(--color-text-on-sage)",
            boxShadow: "var(--shadow-btn-primary)",
          }}
        >
          Browse all tools
          <ArrowRight
            size={15}
            aria-hidden
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>

        <Link
          href="/tools/json-formatter"
          className="inline-flex h-btn-lg items-center gap-2 rounded-button border border-border bg-surface px-5 text-sm font-semibold text-text transition-all duration-150 ease-out-strong hover:-translate-y-px hover:border-border-strong hover:bg-surface-soft"
        >
          Try JSON formatter
        </Link>
      </div>

      {/* Segment 4 — stat row */}
      <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-border pt-7 sm:gap-8">
        {stats.map((stat, i) => (
          <Fragment key={stat.label}>
            <div>
              <div className="text-2xl font-semibold tabular-nums tracking-tight text-text">
                {stat.value}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm uppercase tracking-tag text-text-faint">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: stat.dotColor }}
                  aria-hidden
                />
                {stat.label}
              </div>
            </div>
            {i < stats.length - 1 && (
              <div
                className="hidden h-9 w-px self-center sm:block"
                style={{ background: "var(--color-border)" }}
                aria-hidden
              />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
