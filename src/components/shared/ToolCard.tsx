"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { ToolIcon } from "@/components/shared/ToolIcon";
import { getCategoryMeta, type Tool } from "@/lib/tools-registry";
import { cn } from "@/lib/cn";

interface Props {
  tool: Tool;
  /** Stagger index for fade-in. */
  index?: number;
  /** True when the tool component is implemented; otherwise a "Soon" tag is shown. */
  available?: boolean;
  /** A larger, two-column "feature card" layout for the first popular tool. */
  variant?: "default" | "feature";
}

const tierStyle: Record<Tool["tier"], { label: string; bg: string; color: string }> = {
  free: {
    label: "Free",
    bg: "var(--color-tier-free-bg)",
    color: "var(--color-tier-free-text)",
  },
  pro: {
    label: "Pro",
    bg: "var(--color-tier-pro-bg)",
    color: "var(--color-tier-pro-text)",
  },
  ai: {
    label: "AI",
    bg: "var(--color-tier-ai-bg)",
    color: "var(--color-tier-ai-text)",
  },
};

/**
 * Tool card — clean, professional, Stripe-style. White surface, subtle
 * border, soft icon chip in the category color, sober hover state with
 * a 1px lift and a faint olive shadow. No doodles, no colored top edge,
 * nothing decorative competing with the content.
 */
export function ToolCard({
  tool,
  index = 0,
  available = true,
  variant = "default",
}: Props) {
  const meta = getCategoryMeta(tool.category);
  const tier = tierStyle[tool.tier];
  const isFeature = variant === "feature";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index, 10) * 0.02, ease: "easeOut" }}
      whileHover={{ y: -1 }}
      className={cn(isFeature && "md:col-span-2 lg:row-span-2")}
    >
      <Link
        href={`/tools/${tool.slug}`}
        className={cn(
          "group relative flex h-full flex-col rounded-xl border border-border bg-surface transition-[border-color,box-shadow,transform] duration-150",
          "hover:border-border-strong hover:shadow-card",
          isFeature ? "p-6 sm:p-7 gap-4" : "p-5 gap-3",
          !available && "opacity-85",
        )}
      >
        {/* Top row: icon chip + meta badges */}
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex items-center justify-center rounded-button shrink-0 transition-transform duration-150 group-hover:-translate-y-px",
              isFeature ? "h-11 w-11" : "h-9 w-9",
            )}
            style={{ background: meta.iconBg }}
          >
            <ToolIcon
              name={tool.icon}
              size={isFeature ? 18 : 15}
              style={{ color: meta.iconColor }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            {!available && (
              <span className="rounded-md px-2 h-5 inline-flex items-center text-2xs font-semibold uppercase tracking-widest text-text-faint bg-surface-soft">
                Soon
              </span>
            )}
            {tool.isNew && available && (
              <span
                className="rounded-md px-2 h-5 inline-flex items-center text-2xs font-semibold uppercase tracking-widest"
                style={{
                  background: "var(--color-tier-pro-bg)",
                  color: "var(--color-tier-pro-text)",
                }}
              >
                New
              </span>
            )}
            {tool.wasm && (
              <span
                className="rounded-md px-2 h-5 inline-flex items-center text-2xs font-medium uppercase tracking-widest text-text-faint"
                title="Lazy-loads a WASM binary on first use"
              >
                wasm
              </span>
            )}
          </div>
        </div>

        {/* Title + description */}
        <div className="flex flex-col gap-1.5">
          <h3
            className={cn(
              "display font-semibold leading-tight tracking-tight text-text transition-colors duration-150 group-hover:text-brand",
              isFeature ? "text-xl" : "text-base",
            )}
          >
            {tool.name}
          </h3>
          <p
            className={cn("leading-normal text-text-faint", isFeature ? "text-sm" : "text-sm-plus")}
          >
            {tool.description}
          </p>
        </div>

        {/* Footer: tier pill + category + hover arrow */}
        <div className="mt-auto flex items-center gap-2.5 pt-4 border-t border-border-subtle">
          <span
            className="rounded-md px-2 h-5 inline-flex items-center text-2xs font-semibold uppercase tracking-widest"
            style={{ background: tier.bg, color: tier.color }}
          >
            {tier.label}
          </span>
          <span className="text-2xs font-medium uppercase tracking-tag text-text-faint">
            {tool.category}
          </span>
          <ArrowUpRight
            size={15}
            className="ml-auto opacity-0 -translate-x-1 text-text-muted transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0"
            aria-hidden
          />
        </div>
      </Link>
    </motion.div>
  );
}
