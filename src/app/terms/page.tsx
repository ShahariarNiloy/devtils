import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms of service for the devtils developer utilities.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
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
            Terms of service
          </span>
          <h1 className="display mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-text">
            The deal.
          </h1>
          <div className="prose prose-sm mt-8 space-y-5 text-[15px] leading-relaxed text-text-muted">
            <p>
              devtils is provided as-is. The tools work as documented to
              the best of our ability, but we make no warranty of fitness
              for any particular purpose.
            </p>

            <h2 className="text-text font-semibold text-lg mt-8">Use</h2>
            <p>
              Use the site lawfully. Don&apos;t use the tools to process
              data you don&apos;t have the right to process. Don&apos;t use
              automated scrapers to exfiltrate the catalogue.
            </p>

            <h2 className="text-text font-semibold text-lg mt-8">Liability</h2>
            <p>
              To the extent permitted by law, we&apos;re not liable for any
              damages arising from the use or inability to use the site.
              Every tool runs in your browser, so the data you process
              never leaves your control — but if a tool produces an
              unexpected result, that result is yours to verify.
            </p>

            <h2 className="text-text font-semibold text-lg mt-8">Changes</h2>
            <p>
              We may update these terms; the date below tracks the last
              revision. Continued use after a change constitutes
              acceptance.
            </p>

            <p className="mt-10 text-sm text-text-faint">
              Last updated: 2026-05-29.
            </p>
          </div>
        </article>
      </main>
      <HomeFooter />
    </div>
  );
}
