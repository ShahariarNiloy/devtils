import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";

export const metadata = {
  title: "Page not found",
  description: "The page you were looking for doesn't exist.",
  robots: { index: false, follow: false },
};

/**
 * Catch-all for unmatched routes and the `notFound()` calls in `/tools/[slug]`.
 * Keeps the header + footer so a visitor lands somewhere navigable instead
 * of Next's bare default 404, which carries no path back to the catalogue.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main
        id="main"
        className="flex-1 bg-bg flex items-center justify-center px-6"
      >
        <div className="max-w-md text-center">
          <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-text-faint">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-clay)]"
            />
            404 · Not found
          </div>
          <h1 className="display mt-4 text-4xl font-semibold tracking-tight text-text">
            We couldn&apos;t find that page.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            The link may be stale, the tool may have moved, or it may not
            exist yet. Try the catalogue — every shipped tool is in there.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/tools"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--color-brand)] px-4 text-sm font-medium text-[color:var(--color-on-brand)] hover:opacity-90 transition-opacity"
            >
              Browse all tools <ArrowRight size={14} aria-hidden />
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-text hover:border-border-strong transition-colors"
            >
              Back home
            </Link>
          </div>
        </div>
      </main>
      <HomeFooter />
    </div>
  );
}
