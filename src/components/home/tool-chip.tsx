"use client";

import { ToolIcon } from "@/components/shared/tool-icon";
import { getCategoryMeta, type Tool } from "@/lib/tools-registry";
import { motion } from "framer-motion";
import Link from "next/link";

export interface ToolChipProps {
  tool: Tool;
  index: number;
  available: boolean;
}

export function ToolChip({ tool, index, available }: ToolChipProps) {
  const meta = getCategoryMeta(tool.category);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.18,
        delay: Math.min(index, 14) * 0.025,
        ease: "easeOut",
      }}
    >
      <Link
        href={`/tools/${tool.slug}`}
        className="group inline-flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 h-11 cursor-pointer transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-[0_4px_14px_-6px_rgba(26,26,24,0.13)]"
      >
        {/* Icon */}
        <div
          className="h-6 w-6 shrink-0 rounded-md flex items-center justify-center"
          style={{ background: meta.iconBg }}
        >
          <ToolIcon name={tool.icon} size={12} style={{ color: meta.iconColor }} />
        </div>

        {/* Name */}
        <span className="text-sm font-semibold text-text group-hover:text-brand transition-colors duration-150 leading-none whitespace-nowrap">
          {tool.name}
        </span>

        {/* Badges */}
        {!available && (
          <span
            className="rounded px-1.5 h-4 inline-flex items-center text-sm font-semibold uppercase tracking-widest shrink-0"
            style={{
              background: "var(--color-surface-soft)",
              color: "var(--color-text-faint)",
            }}
          >
            Soon
          </span>
        )}
        {tool.isNew && available && (
          <span
            className="rounded px-1.5 h-4 inline-flex items-center text-sm font-bold uppercase tracking-widest shrink-0"
            style={{
              background: "var(--color-tier-pro-bg)",
              color: "var(--color-tier-pro-text)",
            }}
          >
            New
          </span>
        )}
      </Link>
    </motion.div>
  );
}
