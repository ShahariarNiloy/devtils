import { ToolIcon } from "@/components/shared/tool-icon";
import { getCategoryMeta, type Tool } from "@/lib/tools-registry";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { TIER_STYLE } from "./tier-style";

export interface ToolDetailPanelProps {
  tool: Tool;
  available: boolean;
}

export function ToolDetailPanel({ tool, available }: ToolDetailPanelProps) {
  const meta = getCategoryMeta(tool.category);
  const tier = TIER_STYLE[tool.tier];

  return (
    <>
      {/* Tinted header with large icon */}
      <div
        className="h-36 flex items-center justify-center"
        style={{ background: meta.iconBg }}
      >
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center border border-white/25"
          style={{ background: "rgba(255,255,255,0.3)" }}
        >
          <ToolIcon name={tool.icon} size={28} style={{ color: meta.iconColor }} />
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="display text-lg font-semibold tracking-tight text-text leading-snug mb-1">
          {tool.name}
        </h3>
        <p className="text-sm leading-relaxed text-text-faint mb-4">
          {tool.description}
        </p>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span
            className="rounded px-2 h-5 inline-flex items-center text-sm font-semibold uppercase tracking-widest"
            style={{ background: tier.bg, color: tier.color }}
          >
            {tier.label}
          </span>
          <span className="text-sm font-medium uppercase tracking-widest text-text-faint">
            {tool.category}
          </span>
          {!available && (
            <span
              className="rounded px-2 h-5 inline-flex items-center text-sm font-semibold uppercase tracking-widest"
              style={{
                background: "var(--color-surface-soft)",
                color: "var(--color-text-faint)",
              }}
            >
              Coming soon
            </span>
          )}
        </div>

        <Link
          href={`/tools/${tool.slug}`}
          className="flex items-center justify-between w-full rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors duration-150 cursor-pointer"
          style={{
            background: "var(--color-brand)",
            color: "var(--color-bg)",
          }}
        >
          Open {tool.name}
          <ArrowRight size={13} />
        </Link>
      </div>
    </>
  );
}
