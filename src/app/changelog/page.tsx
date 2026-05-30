import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";
import { CHANGELOG } from "@/lib/changelog";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    `What's new in ${SITE_NAME} — recent releases, tools shipped, and notable improvements.`,
  alternates: { canonical: "/changelog" },
  openGraph: {
    type: "article",
    title: `Changelog · ${SITE_NAME}`,
    description: "Recent releases and tool launches.",
  },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * /changelog. Static reverse-chronological list of release notes. Acts as
 * a recurring freshness signal for crawlers and a returning-visitor
 * surface for "what shipped recently". Adds zero JS — pure render of a
 * data file.
 */
export default function ChangelogPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="flex-1 bg-bg">
        <article className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-text-faint">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-sage-olive)]"
            />
            Changelog
          </span>
          <h1 className="display mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-text">
            What&apos;s new.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-text-muted">
            Recent releases and tool launches. Listed newest-first.
          </p>

          <div className="mt-10 space-y-12">
            {CHANGELOG.map((entry) => (
              <section key={entry.date} className="relative pl-6">
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-[color:var(--color-clay)]"
                />
                <div className="text-sm font-medium uppercase tracking-[0.08em] text-text-faint">
                  <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                </div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-text">
                  {entry.title}
                </h2>
                <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-text-muted">
                  {entry.highlights.map((h, i) => (
                    <li key={i} className="relative pl-5">
                      <span
                        aria-hidden
                        className="absolute left-0 top-2 h-1 w-1 rounded-full bg-text-faint"
                      />
                      {h}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </article>
      </main>
      <HomeFooter />
    </div>
  );
}
