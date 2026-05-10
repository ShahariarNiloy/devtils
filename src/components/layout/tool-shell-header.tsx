"use client";

import { ToolIcon } from '@/components/shared/tool-icon';
import { getCategoryMeta, getRelatedTools, type Tool } from "@/lib/tools-registry";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface ToolShellHeaderProps {
  tool: Tool;
  classNames?: { header?: string };
}

export function ToolShellHeader({ tool, classNames }: ToolShellHeaderProps) {
  const meta = getCategoryMeta(tool.category);
  const isLive = IMPLEMENTED_TOOL_SLUGS.has(tool.slug);
  const related = getRelatedTools(tool.slug, 20);

  return (
    <section className={cn("border-b border-border bg-bg", classNames?.header)}>
      <div className="mx-auto max-w-8xl px-5 sm:px-8 pt-7 pb-9 sm:pt-9">

        {/* Breadcrumb — full width */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-sm text-text-faint mb-7"
        >
          <Link href="/tools" className="hover:text-text-muted transition-colors shrink-0">
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

        {/* Two-column: intro left, chips right */}
        <div className="flex items-stretch gap-8 xl:gap-16">

          {/* Left — icon + title + description + tags */}
          <div className="flex-1 min-w-0 flex items-start gap-4 sm:gap-5">
            <div
              className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl"
              style={{ background: meta.iconBg }}
            >
              <ToolIcon name={tool.icon} size={22} style={{ color: meta.iconColor }} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="rounded-md px-2 h-5 inline-flex items-center text-sm font-semibold uppercase tracking-tag bg-tier-free-bg text-tier-free-text">
                  {tool.tier}
                </span>
                <span className="text-sm font-bold uppercase tracking-eyebrow text-text-faint">
                  {tool.category}
                </span>
                {isLive ? (
                  <span
                    className="inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-tag"
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
                  <span className="rounded-md px-2 h-5 inline-flex items-center text-sm font-semibold uppercase tracking-tag text-text-faint bg-surface-soft">
                    Soon
                  </span>
                )}
                {tool.wasm && (
                  <span
                    className="text-sm font-medium uppercase tracking-tag text-text-faint"
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
                      className="inline-flex items-center rounded-md border border-border bg-surface px-2 h-badge mono text-sm font-medium text-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — related tools chips panel */}
          {related.length > 0 && (
            <div className="hidden lg:flex flex-col w-[46%] xl:w-[44%] shrink-0 border-l border-border-subtle pl-8 xl:pl-12">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <p className="text-sm font-bold uppercase tracking-eyebrow text-text-faint">
                  More in {tool.category}
                </p>
                <Link
                  href={`/tools?cat=${encodeURIComponent(tool.category)}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-text-faint hover:text-text-muted transition-colors"
                >
                  See all <ChevronRight size={10} />
                </Link>
              </div>
              <div className="flex flex-wrap gap-1.5 content-start max-h-[96px] overflow-hidden">
                {related.map((t) => {
                  const m = getCategoryMeta(t.category);
                  return (
                    <Link
                      key={t.slug}
                      href={`/tools/${t.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 h-7 text-sm font-medium text-text-muted transition-[border-color,background,color,box-shadow] duration-150 hover:border-border-strong hover:bg-surface-soft hover:text-text hover:shadow-card"
                    >
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                        style={{ background: m.iconBg }}
                      >
                        <ToolIcon name={t.icon} size={10} style={{ color: m.iconColor }} />
                      </span>
                      <span>{t.name}</span>
                    </Link>
                  );
                })}
              </div>
              {related.length > 9 && (
                <Link
                  href={`/tools?cat=${encodeURIComponent(tool.category)}`}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-text-faint hover:text-text-muted transition-colors"
                >
                  +{related.length - 9} more tools <ChevronRight size={10} />
                </Link>
              )}
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
