import { Header } from "@/components/layout/Header";
import { Hero } from "@/components/layout/Hero";
import { HomeFooter } from "@/components/layout/HomeFooter";
import { ToolCard } from "@/components/shared/ToolCard";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import {
  TOOL_COUNT,
  getFeaturedTools,
  getNewTools,
} from "@/lib/tools-registry";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export default async function Home() {
  const featured = getFeaturedTools();
  const newest = getNewTools().slice(0, 8);
  const liveCount = featured.filter((t) =>
    IMPLEMENTED_TOOL_SLUGS.has(t.slug)
  ).length;
  const isAvailable = (slug: string) => IMPLEMENTED_TOOL_SLUGS.has(slug);

  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main id="main" className="flex-1">
        <Hero />

        {featured.length > 0 && (
          <Band id="featured" className="pt-14 pb-16">
            <SectionHeading
              eyebrow="Editor's picks"
              title="Popular this week"
              hint={
                <>
                  {liveCount} of {featured.length} live · {TOOL_COUNT} tools
                  total
                </>
              }
              cta={{ href: "/tools", label: `Browse all ${TOOL_COUNT}` }}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:auto-rows-fr">
              {featured.map((tool, i) => (
                <ToolCard
                  key={tool.slug}
                  tool={tool}
                  index={i}
                  available={isAvailable(tool.slug)}
                  variant={i === 0 ? "feature" : "default"}
                />
              ))}
            </div>
          </Band>
        )}

        {newest.length > 0 && (
          <Band tone="soft" aria-label="Recently added" className="pt-14 pb-16">
            <SectionHeading
              eyebrow="Hot off the press"
              title="Recently added"
              hint={`${newest.length} of ${getNewTools().length} new tools`}
              cta={{ href: "/tools", label: "All tools" }}
            />
            <div className="relative -mx-6 sm:-mx-10">
              <div
                aria-hidden
                className="pointer-events-none absolute right-0 top-0 bottom-3 w-12 z-10"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, var(--color-surface-soft) 100%)",
                }}
              />
              <div className="overflow-x-auto no-scrollbar pb-3">
                <ul className="flex w-max gap-3 px-6 sm:px-10">
                  {newest.map((tool, i) => (
                    <li key={tool.slug} className="w-card-sm shrink-0">
                      <ToolCard
                        tool={tool}
                        index={i}
                        available={isAvailable(tool.slug)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Band>
        )}

        <HomeFooter />
      </main>
    </div>
  );
}

interface BandProps {
  /** "paper" (default bg) or "soft" (warm cream band) */
  tone?: "paper" | "soft";
  id?: string;
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}

function Band({
  tone = "paper",
  id,
  className = "",
  children,
  ...rest
}: BandProps) {
  const isSoft = tone === "soft";
  return (
    <section
      id={id}
      className={`relative scroll-mt-20 ${isSoft ? "border-y border-border" : ""} ${className}`}
      style={{
        background: isSoft ? "var(--color-surface-soft)" : "var(--color-bg)",
      }}
      {...rest}
    >
      <div className="relative mx-auto max-w-8xl px-6 sm:px-10">{children}</div>
    </section>
  );
}

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  hint?: React.ReactNode;
  cta?: { href: string; label: string };
}

function SectionHeading({ eyebrow, title, hint, cta }: SectionHeadingProps) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <span className="inline-flex items-center gap-2 text-2xs font-bold uppercase tracking-eyebrow text-text-faint">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--color-sage-olive)" }}
            aria-hidden
          />
          {eyebrow}
        </span>
        <h2 className="display mt-2 text-h2 sm:text-page font-semibold tracking-tight text-text">
          {title}
        </h2>
        {hint && <p className="mt-1.5 text-sm text-text-faint">{hint}</p>}
      </div>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1.5 text-xs-plus font-semibold text-text-muted transition-colors hover:text-text"
        >
          {cta.label} <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}
