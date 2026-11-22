"use client";

import Link from "next/link";
import { memo } from "react";
import { cn } from "@/lib/cn";
import { getRelatedTools, getToolBySlug, type Tool } from "@/lib/tools-registry";
import { CATEGORY_TINT, TOOL_PRESENTATION, type Tint } from "@/lib/tools/presentation";
import { categoryAnchor } from "@/lib/tools/category-url";
import { KeyIcon, toolIcon } from "@/components/shared/key-icon";

const TINT_TEXT: Record<Tint, string> = {
  clay: "text-cat-clay",
  teal: "text-cat-teal",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
};

interface Props {
  tool: Tool;
  /** Curated related slugs (from the tool's seoData); falls back to same-category tools. */
  slugs?: readonly string[];
}

/** "More JSON tools" / "Related tools" — four keycap cards under the tool. */
export const RelatedToolsFooter = memo(function RelatedToolsFooter({ tool, slugs }: Props) {
  const curated = (slugs ?? [])
    .map((s) => getToolBySlug(s))
    .filter((t): t is Tool => Boolean(t) && t?.slug !== tool.slug);
  const related = (curated.length > 0 ? curated : getRelatedTools(tool.slug, 4)).slice(0, 4);
  if (related.length === 0) return null;

  const sameCategory = related.every((t) => t.category === tool.category);
  return (
    <section className="mt-14 sm:mt-16" aria-labelledby="related-tools">
      <div className="mb-3.5 flex items-baseline gap-3">
        <h2 id="related-tools" className="m-0 font-sans text-base font-bold tracking-normal">
          {sameCategory ? `More ${categoryWord(tool.category)} tools` : "Related tools"}
        </h2>
        <span className="grow" />
        <Link href={sameCategory ? categoryAnchor(tool.category) : "/tools"} className="text-sm text-text-tertiary hover:text-text">
          See all →
        </Link>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-2.5">
        {related.map((t) => {
          const p = TOOL_PRESENTATION[t.slug];
          return (
            <Link
              key={t.slug}
              href={`/tools/${t.slug}`}
              className="surface-panel flex items-center gap-3 rounded-[14px] p-3.5 text-text transition-colors hover:border-white/18 hover:text-text"
            >
              <span aria-hidden="true" className={cn("surface-key flex size-[34px] shrink-0 items-center justify-center rounded-[9px] font-mono text-xs", TINT_TEXT[p?.tint ?? CATEGORY_TINT[t.category]])}>
                <KeyIcon icon={toolIcon(t.slug)} box={32} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-bold">{p?.label ?? t.name}</span>
                <span className="truncate text-xs text-text-faint">{p?.card ?? p?.desc ?? t.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
});

/** "Security" → "security", but acronyms like "JSON" / "SEO" stay as written. */
function categoryWord(category: string): string {
  return category === category.toUpperCase() ? category : category.toLowerCase();
}
