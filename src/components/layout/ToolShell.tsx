"use client";

import { pushRecent } from "@/components/primitives/CommandPalette";
import { ToolCard } from "@/components/shared/ToolCard";
import { ToolIcon } from "@/components/shared/ToolIcon";
import { cn } from "@/lib/cn";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import {
  getCategoryMeta,
  getRelatedTools,
  type Tool,
} from "@/lib/tools-registry";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";

interface Props {
  tool: Tool;
  /** Optional sticky bottom action row (rendered inside a styled container). */
  actions?: ReactNode;
  children: ReactNode;
  classNames?: {
    header?: string;
    body?: string;
  };
}

/**
 * Per-tool page chrome. Top bar with breadcrumb + back link, a hero row
 * with icon chip + name + tier/availability pills, then the tool body
 * (children), an optional sticky action bar, and a related-tools strip.
 * Tracks the visit so the palette's Recents stays useful.
 */
export function ToolShell({ tool, actions, children, classNames }: Props) {
  const meta = getCategoryMeta(tool.category);
  const isLive = IMPLEMENTED_TOOL_SLUGS.has(tool.slug);
  const related = getRelatedTools(tool.slug, 3);

  useEffect(() => {
    pushRecent(tool.slug);
  }, [tool.slug]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* ─── Tool header band ─────────────────────────── */}
        <section className="border-b border-border bg-bg">
          <div className="mx-auto max-w-8xl px-5 sm:px-8 pt-7 pb-9 sm:pt-9">
            {/* Breadcrumb + back link */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1.5 text-xs text-text-faint min-w-0"
              >
                <Link
                  href="/tools"
                  className="hover:text-text-muted transition-colors shrink-0"
                >
                  Tools
                </Link>
                <ChevronRight size={11} aria-hidden className="shrink-0" />
                <Link
                  href={`/tools?cat=${encodeURIComponent(tool.category)}`}
                  className="hover:text-text-muted transition-colors shrink-0"
                >
                  {tool.category}
                </Link>
                <ChevronRight size={11} aria-hidden className="shrink-0" />
                <span className="text-text-muted truncate">{tool.name}</span>
              </nav>
              <Link
                href="/tools"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-md px-2 h-7 text-xs font-semibold text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
              >
                <ArrowLeft size={12} />
                All tools
              </Link>
            </div>

            {/* Title row */}
            <div className="flex items-start gap-4 sm:gap-5">
              <div
                className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl"
                style={{ background: meta.iconBg }}
              >
                <ToolIcon
                  name={tool.icon}
                  size={22}
                  style={{ color: meta.iconColor }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="rounded-md px-2 h-5 inline-flex items-center text-2xs font-semibold uppercase tracking-tag bg-tier-free-bg text-tier-free-text">
                    {tool.tier}
                  </span>
                  <span className="text-2xs font-bold uppercase tracking-eyebrow text-text-faint">
                    {tool.category}
                  </span>
                  {isLive ? (
                    <span
                      className="inline-flex items-center gap-1 text-2xs font-semibold uppercase tracking-tag"
                      style={{ color: "var(--color-success)" }}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ background: "var(--color-success)" }}
                        aria-hidden
                      />
                      Live
                    </span>
                  ) : (
                    <span className="rounded-md px-2 h-5 inline-flex items-center text-2xs font-semibold uppercase tracking-tag text-text-faint bg-surface-soft">
                      Soon
                    </span>
                  )}
                  {tool.wasm && (
                    <span
                      className="text-2xs font-medium uppercase tracking-tag text-text-faint"
                      title="Lazy-loads a WASM binary on first use"
                    >
                      wasm
                    </span>
                  )}
                </div>

                <h1 className="display text-h2 sm:text-page-lg font-semibold text-text leading-heading tracking-tight">
                  {tool.name}
                </h1>

                <p className="mt-2 text-sm leading-snug-2 max-w-prose text-text-muted">
                  {tool.description}
                </p>

                {tool.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {tool.tags.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-md border border-border bg-surface px-2 h-badge mono text-2xs font-medium text-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Tool body ────────────────────────────────── */}
        <section className="bg-bg">
          <div
            className={cn(
              "mx-auto max-w-8xl px-5 sm:px-8 py-6 sm:py-8",
              classNames?.body
            )}
          >
            <div className="space-y-4">{children}</div>
          </div>
        </section>
      </motion.div>

      {/* ─── Sticky action bar ──────────────────────────── */}
      {actions ? (
        <div
          className="sticky bottom-0 z-20 border-t border-border-subtle"
          style={{
            background: "color-mix(in oklab, var(--color-bg) 92%, transparent)",
            backdropFilter: "saturate(140%) blur(10px)",
          }}
        >
          <div className="mx-auto max-w-8xl px-5 sm:px-8 py-3 flex flex-wrap items-center gap-2">
            {actions}
          </div>
        </div>
      ) : null}

      {/* ─── Related tools ──────────────────────────────── */}
      {related.length > 0 && (
        <section className="border-t border-border bg-surface-soft">
          <div className="mx-auto max-w-8xl px-5 sm:px-8 py-12">
            <div className="mb-5 flex items-end justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-bold uppercase tracking-eyebrow text-text-faint">
                  Same category
                </p>
                <h2 className="display mt-1 text-xl font-semibold tracking-tight text-text">
                  More {tool.category} tools
                </h2>
              </div>
              <Link
                href={`/tools?cat=${encodeURIComponent(tool.category)}`}
                className="inline-flex items-center gap-1.5 text-xs-plus font-semibold transition-colors hover:text-text text-text-muted"
              >
                See all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {related.map((t, i) => (
                <ToolCard
                  key={t.slug}
                  tool={t}
                  index={i}
                  available={IMPLEMENTED_TOOL_SLUGS.has(t.slug)}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
