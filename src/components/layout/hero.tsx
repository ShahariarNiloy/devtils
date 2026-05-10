"use client";

import { CATEGORIES, TIER_COUNTS } from "@/lib/tools-registry";
import { HeroLeft, type StatItem } from "./hero-left";
import { HeroToolbox } from "./hero-toolbox";

/**
 * Hero section — search-first, two-column layout on desktop.
 *
 * Left:  headline, subtitle, two CTAs, stat row (free/pro/ai/categories).
 * Right: big search trigger (opens ⌘K palette) + 2×2 quick-jump tool grid.
 *
 * No doodles, no decorative patterns. The sage-olive 4px strip at the top
 * is the only brand decoration. Clay never appears here — it is reserved
 * for premium tier accents elsewhere.
 */
export function Hero() {
  // const [shortcut] = useState(() => (isMac() ? "⌘ K" : "Ctrl K"));
  // const { setOpen } = useCommandPalette();

  const stats: StatItem[] = [
    {
      value: TIER_COUNTS.free,
      label: "Free tools",
      dotColor: "var(--color-tier-free-text)",
    },
    {
      value: TIER_COUNTS.pro,
      label: "Pro tools",
      dotColor: "var(--color-tier-pro-text)",
    },
    {
      value: CATEGORIES.length,
      label: "Categories",
      dotColor: "var(--color-text-faint)",
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

      <div className="mx-auto max-w-8xl px-6 sm:px-10 pt-16 pb-20 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2  items-center">
          <HeroLeft stats={stats} />
          <div className="hidden lg:block lg:col-span-1 w-2/3 px-10 mx-auto">
            <HeroToolbox />
          </div>
        </div>
      </div>
    </section>
  );
}
