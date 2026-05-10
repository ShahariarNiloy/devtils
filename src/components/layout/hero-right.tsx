"use client";

import { TOOL_COUNT } from "@/lib/tools-registry";
import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { ToolIcon } from "../shared/tool-icon";

interface QuickTool {
  slug: string;
  name: string;
  hint: string;
  icon: string;
  decoration: string;
  chipBg: string;
  chipColor: string;
}

const QUICK_TOOLS: QuickTool[] = [
  {
    slug: "json-formatter",
    name: "JSON formatter",
    hint: "Format · validate · repair",
    icon: "braces",
    decoration: "{}",
    chipBg: "var(--color-surface-soft)",
    chipColor: "var(--color-olive-ink)",
  },
  {
    slug: "regex-tester",
    name: "Regex tester",
    hint: "Live match highlight",
    icon: "regex",
    decoration: "/re/",
    chipBg: "var(--color-accent-soft)",
    chipColor: "var(--color-clay)",
  },
  {
    slug: "base64",
    name: "Base64",
    hint: "Encode & decode",
    icon: "binary",
    decoration: "==",
    chipBg: "var(--color-surface-soft)",
    chipColor: "var(--color-olive-ink)",
  },
  {
    slug: "color-converter",
    name: "Color converter",
    hint: "HEX · RGB · HSL · OKLCH",
    icon: "pipette",
    decoration: "#hex",
    chipBg: "var(--color-accent-soft)",
    chipColor: "var(--color-clay)",
  },
];

interface HeroRightProps {
  shortcut: string;
  onOpenSearch: () => void;
}

export function HeroRight({ shortcut, onOpenSearch }: HeroRightProps) {
  return (
    <div className="relative hidden lg:flex flex-col gap-4">

      {/* Search trigger */}
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label={`Search ${TOOL_COUNT} developer tools`}
        className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 text-left transition-all hover:border-border-strong hover:-translate-y-px"
        style={{ boxShadow: "0 10px 28px -18px rgba(26,26,24,0.22)" }}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-button shrink-0"
          style={{ background: "var(--color-mist-sage)", color: "var(--color-olive-ink)" }}
          aria-hidden
        >
          <Search size={16} />
        </span>

        <span className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="text-sm font-medium text-text truncate">
            Search {TOOL_COUNT} tools…
          </span>
          <span className="text-xs truncate" style={{ color: "var(--color-text-faint)" }}>
            JSON, regex, base64, colors and more
          </span>
        </span>

        <kbd
          className="mono text-xs border border-border bg-bg px-2 h-6 rounded-md shrink-0 inline-flex items-center"
          style={{ color: "var(--color-text-muted)" }}
        >
          {shortcut}
        </kbd>
      </button>

      {/* Section divider */}
      <div className="flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1" style={{ background: "var(--color-border)" }} />
        <span
          className="text-[10.5px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--color-text-faint)" }}
        >
          quick access
        </span>
        <div className="h-px flex-1" style={{ background: "var(--color-border)" }} />
      </div>

      {/* 2×2 quick-tool cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {QUICK_TOOLS.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-strong hover:-translate-y-px"
            style={{ minHeight: "100px" }}
          >
            {/* Icon row */}
            <div className="flex items-start justify-between">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                style={{ background: tool.chipBg }}
                aria-hidden
              >
                <ToolIcon name={tool.icon} size={14} style={{ color: tool.chipColor }} />
              </span>
              <ArrowRight
                size={12}
                className="mt-0.5 translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-60"
                style={{ color: "var(--color-text-faint)" }}
                aria-hidden
              />
            </div>

            {/* Name + hint */}
            <div className="mt-auto pt-3">
              <p className="text-sm font-semibold leading-tight text-text">
                {tool.name}
              </p>
              <p
                className="mt-0.5 text-[11px] leading-snug"
                style={{ color: "var(--color-text-faint)" }}
              >
                {tool.hint}
              </p>
            </div>

            {/* Faint decorative symbol */}
            <span
              className="pointer-events-none select-none absolute right-3 top-1.5 font-mono text-2xl font-bold leading-none"
              style={{ color: tool.chipColor, opacity: 0.07 }}
              aria-hidden
            >
              {tool.decoration}
            </span>
          </Link>
        ))}
      </div>

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10 inset-x-8 -bottom-2 h-2 rounded-full blur-lg"
        style={{ background: "var(--color-mist-sage)", opacity: 0.6 }}
      />
    </div>
  );
}
