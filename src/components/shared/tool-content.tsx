"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ToolIcon } from "@/components/shared/tool-icon";
import { getToolBySlug } from "@/lib/tools-registry";

export interface ToolUseCase {
  title: string;
  description: string;
}

export interface ToolFaqEntry {
  question: string;
  answer: string;
}

export interface ToolContentProps {
  /** One-paragraph intro shown right under the editor. */
  intro: string;
  /** 3-5 representative use cases, each one line. */
  useCases: ToolUseCase[];
  /** 5-8 FAQ entries, plain prose answers. */
  faqs: ToolFaqEntry[];
  /** Related tool slugs to cross-link at the bottom. */
  relatedSlugs?: string[];
}

/**
 * SEO + discoverability block rendered below the editor on each converter
 * tool page. Crawlers find this content under the heading hierarchy that
 * matches the page's intent ("JSON to TypeScript"), and visitors who scroll
 * past the editor get a clear map of related tools to try next.
 *
 * The FAQ block uses real `<details>` / `<summary>` so the answers are
 * indexable without client JavaScript.
 */
export function ToolContent({
  intro,
  useCases,
  faqs,
  relatedSlugs = [],
}: ToolContentProps) {
  const related = relatedSlugs
    .map((slug) => getToolBySlug(slug))
    .filter((t): t is NonNullable<ReturnType<typeof getToolBySlug>> => Boolean(t));

  return (
    <section
      aria-label="About this tool"
      className="rounded-xl border border-border bg-surface shadow-card overflow-hidden"
    >
      <div className="grid gap-8 px-5 py-6 md:px-8 md:py-10 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <p className="text-[13.5px] leading-relaxed text-text-muted">
            {intro}
          </p>

          {useCases.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-[15px] font-medium tracking-tight text-text">
                Common use cases
              </h2>
              <ul className="space-y-2.5">
                {useCases.map((u) => (
                  <li
                    key={u.title}
                    className="text-[13px] leading-relaxed text-text-muted"
                  >
                    <span className="font-medium text-text">{u.title}.</span>{" "}
                    {u.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-[15px] font-medium tracking-tight text-text">
            Frequently asked
          </h2>
          <div className="space-y-1">
            {faqs.map((f) => (
              <details
                key={f.question}
                className="group rounded-lg px-3 py-2 hover:bg-surface-soft transition-colors"
              >
                <summary className="flex cursor-pointer items-start gap-2 text-[13px] font-medium text-text [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    size={14}
                    className="mt-0.5 shrink-0 text-text-faint transition-transform group-open:rotate-90"
                    aria-hidden
                  />
                  <span>{f.question}</span>
                </summary>
                <p className="pl-6 pt-2 text-[12.5px] leading-relaxed text-text-muted">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="border-t border-border-subtle bg-surface-soft/30 px-5 py-5 md:px-8">
          <h2 className="mb-3 text-[12px] uppercase tracking-wider font-semibold text-text-faint">
            Related converters
          </h2>
          <div className="flex flex-wrap gap-2">
            {related.map((t) => (
              <Link
                key={t.slug}
                href={`/tools/${t.slug}`}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] text-text hover:border-border-strong hover:bg-surface-soft transition-colors"
              >
                <ToolIcon name={t.icon} size={13} className="text-text-faint" />
                <span>{t.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
