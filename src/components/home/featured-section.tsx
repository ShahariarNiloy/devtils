"use client";

import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { TOOL_COUNT, getFeaturedTools, type Tool } from "@/lib/tools-registry";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Band } from "./band";
import { FeaturedRow } from "./featured-row";
import { SectionHeading } from "./section-heading";
import { ToolDetailPanel } from "./tool-detail-panel";

export function FeaturedSection() {
  const featured = getFeaturedTools();
  const liveCount = featured.filter((t: Tool) =>
    IMPLEMENTED_TOOL_SLUGS.has(t.slug),
  ).length;
  const isAvailable = (slug: string) => IMPLEMENTED_TOOL_SLUGS.has(slug);

  const [activeSlug, setActiveSlug] = useState<string>(
    featured[0]?.slug ?? "",
  );
  const activeTool =
    featured.find((t: Tool) => t.slug === activeSlug) ?? featured[0];

  if (featured.length === 0) return null;

  return (
    <Band id="featured" className="pt-14 pb-16">
      <SectionHeading
        eyebrow="Editor's picks"
        title="Popular this week"
        hint={
          <>
            {liveCount} of {featured.length} live · {TOOL_COUNT} tools total
          </>
        }
        cta={{ href: "/tools", label: `Browse all ${TOOL_COUNT}` }}
      />

      <div className="flex items-start gap-8 xl:gap-14">
        {/* Numbered tool list */}
        <div className="flex-1 min-w-0">
          {featured.map((tool: Tool, i: number) => (
            <FeaturedRow
              key={tool.slug}
              tool={tool}
              index={i}
              available={isAvailable(tool.slug)}
              active={activeSlug === tool.slug}
              onHover={setActiveSlug}
            />
          ))}
        </div>

        {/* Sticky detail panel — desktop only */}
        {activeTool && (
          <div className="hidden lg:block w-60 xl:w-68 shrink-0 sticky top-[calc(var(--spacing-header)+2rem)] self-start">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTool.slug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="rounded-2xl border border-border bg-surface overflow-hidden"
              >
                <ToolDetailPanel
                  tool={activeTool}
                  available={isAvailable(activeTool.slug)}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </Band>
  );
}
