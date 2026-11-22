import Link from "next/link";
import type { ComponentType } from "react";
import {
  CategoryCalc,
  CategoryEncoding,
  CategoryJson,
  CategorySecurity,
  CategorySeo,
  CategoryText,
  CategoryImage,
  CategoryCode,
  CategoryDesign,
  CategoryNetwork,
} from "@/components/illustrations";
import type { ToolCategory } from "@/lib/tools-registry";
import { cn } from "@/lib/cn";
import type { Tint } from "@/lib/tools/presentation";
import type { CategoryView } from "./category-data";
import { categoryIcon, KeyIcon, toolIcon } from "@/components/shared/key-icon";

export const TEXT: Record<Tint, string> = {
  clay: "text-cat-clay",
  teal: "text-cat-teal",
  sage: "text-cat-sage",
  rose: "text-cat-rose",
};
const DOT: Record<Tint, string> = {
  clay: "bg-cat-clay",
  teal: "bg-cat-teal",
  sage: "bg-cat-sage",
  rose: "bg-cat-rose",
};

/** Header line illustration for the categories that have one (brand
 *  "Illustration library"); the rest keep the text-only header. */
export const CATEGORY_DRAWING: Partial<
  Record<ToolCategory, ComponentType<{ className?: string }>>
> = {
  JSON: CategoryJson,
  SEO: CategorySeo,
  Encoding: CategoryEncoding,
  Security: CategorySecurity,
  Calc: CategoryCalc,
  Text: CategoryText,
  Image: CategoryImage,
  Code: CategoryCode,
  Design: CategoryDesign,
  Network: CategoryNetwork,
};

/** v2 category landing page body (mockup SitePage "category" block). */
export function CategoryPage({ view }: { view: CategoryView }) {
  const tint = TEXT[view.tint];
  const Drawing = CATEGORY_DRAWING[view.name];

  return (
    <main
      id="main"
      className="mx-auto w-full max-w-[1160px] flex-1 px-4 pt-10 pb-[72px] sm:px-6 sm:pt-[72px] sm:pb-24"
    >
      {/* PAGE HEADER */}
      <header className="mb-10 flex flex-wrap items-center justify-between gap-x-12 gap-y-6">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col items-start gap-3 text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-clay-light/35 px-3 py-1 text-xs text-clay-cream">
            <span aria-hidden="true" className={cn("flex", tint)}>
              <KeyIcon icon={categoryIcon(view.name)} box={26} />
            </span>
            {view.eyebrow}
          </span>
          <h1 className="m-0 font-sans text-[36px] leading-[1.06] font-bold tracking-[-0.045em] sm:text-[clamp(40px,5vw,60px)]">
            {view.title}
          </h1>
          <p className="m-0 max-w-[620px] text-[17px] text-text-muted">
            {view.lede}
          </p>
        </div>
        {Drawing && (
          <div
            aria-hidden="true"
            className="w-full max-w-[320px] flex-[0_1_360px] rounded-[18px] border border-white/6 bg-[#0d0d0c] bg-[radial-gradient(80%_90%_at_50%_100%,rgba(197,142,94,.12),transparent_70%)] px-[22px] py-[18px] sm:max-w-[380px]"
          >
            <Drawing className="w-full" />
          </div>
        )}
      </header>

      <nav
        aria-label="Breadcrumb"
        className="-mt-5 mb-7 text-[13px] text-text-faint"
      >
        <Link href="/tools" className="text-text-tertiary hover:text-text">
          Tools
        </Link>{" "}
        <span aria-hidden="true">/</span>{" "}
        <Link href="/tools/category" className="text-text-tertiary hover:text-text">
          Categories
        </Link>{" "}
        <span aria-hidden="true">/</span>{" "}
        <span aria-current="page">{view.title}</span>
      </nav>

      <ul
        aria-label="At a glance"
        className="m-0 mb-[18px] flex list-none flex-wrap gap-2 p-0"
      >
        {view.stats.map((s) => (
          <li
            key={s}
            className="inline-flex min-h-8 items-center rounded-full bg-white/5 px-3 text-[13px] text-text-strong"
          >
            {s}
          </li>
        ))}
      </ul>

      <ul
        aria-label={view.title}
        className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-3 p-0"
      >
        {view.tools.map((t) => (
          <li key={t.slug} className="flex">
            <Link
              href={`/tools/${t.slug}`}
              className={cn(
                "surface-panel flex min-h-[140px] w-full flex-col gap-3 rounded-2xl p-[18px] text-text transition-colors duration-[140ms] hover:border-clay-light/40 hover:text-text",
                !t.live && "opacity-85",
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "surface-key flex size-[38px] shrink-0 items-center justify-center rounded-[10px] font-mono text-[11px]",
                    tint,
                  )}
                >
                  <KeyIcon icon={toolIcon(t.slug)} box={36} />
                </span>
                <span className="grow text-base font-bold">{t.name}</span>
                {!t.live && (
                  <span className="rounded-full border border-white/12 px-2 py-0.5 text-[11px] text-text-tertiary">
                    soon
                  </span>
                )}
              </span>
              <span className="text-sm text-text-tertiary">{t.desc}</span>
              <span
                aria-hidden="true"
                className={cn("mt-auto text-[13px] font-semibold", tint)}
              >
                {t.live ? "Open →" : "Details →"}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-14 grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-x-12 gap-y-8">
        <div className="flex flex-col gap-2.5">
          <h2 className="m-0 font-sans text-xl font-bold tracking-normal">
            {view.guideTitle}
          </h2>
          {view.guide.map((g) => (
            <div key={g.t} className="surface-panel rounded-xl px-4 py-3.5">
              <div className="mb-1 text-sm font-bold">{g.t}</div>
              <div className="text-sm text-text-tertiary">{g.d}</div>
            </div>
          ))}
        </div>

        {view.others.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <h2 className="m-0 font-sans text-xl font-bold tracking-normal">
              Other categories
            </h2>
            <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
              {view.others.map((o) => (
                <li key={o.name} className="flex">
                  <Link
                    href={o.href}
                    className="surface-panel flex min-h-[46px] w-full items-center gap-2 rounded-[10px] px-3 text-sm text-text transition-colors duration-[140ms] hover:border-clay-light/40 hover:text-text"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-[7px] shrink-0 rounded-[2px]",
                        DOT[o.tint],
                      )}
                    />
                    <span className="grow">{o.name}</span>
                    <span className="font-mono text-[11px] text-text-faint">
                      {o.count}
                      <span className="sr-only">
                        {" "}
                        {o.count === 1 ? "tool" : "tools"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
