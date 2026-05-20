"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ToolIcon } from "@/components/shared/tool-icon";
import { getRelatedTools, type Tool } from "@/lib/tools-registry";

interface Props {
  tool: Tool;
}

/**
 * Bottom-of-page footer: a grid of related tools in the same category. A
 * different design from the old in-header chip strip — proper cards with
 * icon + name + one-line description, click-to-navigate.
 */
export function RelatedToolsFooter({ tool }: Props) {
  const related = getRelatedTools(tool.slug, 8);
  if (related.length === 0) return null;

  return (
    <section className="border-t border-border-subtle bg-bg">
      <div className="mx-auto max-w-8xl px-5 py-8 sm:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            More in {tool.category}
          </h2>
          <Link
            href={`/tools?cat=${encodeURIComponent(tool.category)}`}
            className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
          >
            See all
            <ArrowUpRight size={13} aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((t) => (
            <Link
              key={t.slug}
              href={`/tools/${t.slug}`}
              className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-border-strong/60 hover:bg-surface-soft"
            >
              <span
                aria-hidden
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-soft text-text-muted transition-colors group-hover:bg-bg"
              >
                <ToolIcon name={t.icon} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text">
                  {t.name}
                </div>
                <div className="line-clamp-2 text-[12px] text-text-muted">
                  {t.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
