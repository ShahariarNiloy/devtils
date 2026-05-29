"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CATEGORIES } from "@/lib/tools-registry";
import { LIVE_TOOL_COUNT } from "@/lib/implemented-tools";
import { ToolIcon } from "@/components/shared/tool-icon";
import { HeroLeft, type StatItem } from "./hero-left";
import { HeroPreview } from "./hero-preview";

// Mobile-only quick jumps — the deck is desktop-only, so phones/tablets
// would otherwise see a bare text hero.
const MOBILE_QUICK = [
  { slug: "json-formatter", name: "JSON Formatter", icon: "braces" },
  { slug: "regex-tester", name: "Regex Tester", icon: "regex" },
  { slug: "base64", name: "Base64", icon: "binary" },
  { slug: "color-converter", name: "Color Converter", icon: "pipette" },
];

/**
 * Hero — two-panel layout.
 *
 * Left:  a clearly segmented surface card (eyebrow → headline → CTAs →
 *        stats). Right: a floating product preview of the JSON formatter
 *        over an on-brand olive→sage gradient.
 *
 * The sage-olive 4px strip is the only top decoration. Clay stays reserved
 * for premium-tier accents elsewhere.
 */
export function Hero() {
  const stats: StatItem[] = [
    {
      value: LIVE_TOOL_COUNT,
      label: "Tools live",
      dotColor: "var(--color-tier-free-text)",
    },
    {
      value: CATEGORIES.length,
      label: "Categories",
      dotColor: "var(--color-text-faint)",
    },
    {
      value: "$0",
      label: "Forever",
      dotColor: "var(--color-success)",
    },
  ];

  return (
    <section className="relative border-b border-border bg-bg">
      {/* Top brand accent strip — sage olive, 4px, full width */}
      <div
        aria-hidden
        className="h-1 w-full"
        style={{ background: "var(--color-sage-olive)" }}
      />

      <div className="mx-auto max-w-8xl px-6 sm:px-10 py-14 lg:py-20">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-10">
          {/* Left — plain content, no card chrome */}
          <div className="lg:pr-8">
            <HeroLeft stats={stats} />
          </div>

          {/* Right — product preview, inset with padding so it reads
              "zoomed out" inside the 50% column (desktop only) */}
          <div className="hidden lg:block lg:px-8 xl:px-12">
            <HeroPreview />
          </div>

          {/* Mobile/tablet — quick jumps in place of the desktop deck */}
          <div className="grid grid-cols-2 gap-2.5 lg:hidden">
            {MOBILE_QUICK.map((t) => (
              <Link
                key={t.slug}
                href={`/tools/${t.slug}`}
                className="group flex items-center gap-2.5 rounded-xl border border-border bg-surface p-3.5 transition-all hover:-translate-y-px hover:border-border-strong"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: "var(--color-mist-sage)",
                    color: "var(--color-olive-ink)",
                  }}
                  aria-hidden
                >
                  <ToolIcon name={t.icon} size={15} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
                  {t.name}
                </span>
                <ArrowUpRight
                  size={13}
                  aria-hidden
                  className="shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-70"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
