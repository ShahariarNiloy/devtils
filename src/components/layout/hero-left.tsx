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

export function HeroLeft({ stats }: HeroLeftProps) {
  return (
    <div>
      {/* Eyebrow badge */}
      <span
        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold uppercase tracking-eyebrow"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          color: "var(--color-text-muted)",
        }}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--color-sage-olive)" }}
          aria-hidden
        />
        v0.0.1 · {TOOL_COUNT} utilities, all client-side
      </span>

      {/* Headline */}
      <h1 className="display mt-7 text-hero-md sm:text-6xl lg:text-hero-lg font-bold leading-hero tracking-tight">
        <span className="block">Every tool you need,</span>
        <span className="block text-brand">Not one you don&apos;t.</span>
        <span className="block text-clay">Free at the core.</span>
      </h1>

      {/* Subtitle */}
      <p
        className="mt-7 text-lg leading-desc max-w-xl"
        style={{ color: "var(--color-text-muted)" }}
      >
        Free online developer tools for JSON, PDF, regex, images, colors,
        encoding and more, all running in your browser. No sign-up, no
        uploads, nothing leaves your machine.{" "}
      </p>

      {/* CTAs */}
      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Link
          href="/tools"
          className="group inline-flex items-center gap-2 rounded-button px-5 h-btn-lg text-sm font-semibold transition-all hover:-translate-y-px active:translate-y-0"
          style={{
            background: "var(--color-brand)",
            color: "var(--color-text-on-sage)",
            boxShadow: "0 6px 18px -10px rgba(61,68,53,0.55)",
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
          className="inline-flex items-center gap-2 rounded-button border border-border bg-transparent px-5 h-btn-lg text-sm font-semibold text-text transition-colors hover:border-border-strong hover:bg-surface"
        >
          Try JSON formatter
        </Link>
      </div>

      {/* Stat row — sits below CTAs, separated by a top border */}
      <div className="mt-9 pt-7 border-t border-border flex flex-wrap items-center gap-6">
        {stats.map((stat, i) => (
          <Fragment key={stat.label}>
            <div>
              <div
                className="text-2xl font-semibold tabular-nums tracking-tight"
                style={{ color: "var(--color-text)" }}
              >
                {stat.value}
              </div>
              <div
                className="text-sm uppercase tracking-tag mt-0.5 flex items-center gap-1.5"
                style={{ color: "var(--color-text-faint)" }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: stat.dotColor }}
                  aria-hidden
                />
                {stat.label}
              </div>
            </div>
            {/* Vertical divider between stats — not after last */}
            {i < stats.length - 1 && (
              <div
                className="hidden sm:block w-px self-stretch"
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
