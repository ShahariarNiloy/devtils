import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";
import { NotFound404 } from "@/components/illustrations/not-found-404";
import { GlyphField } from "@/components/site/not-found/glyph-field";
import { ToolSearch, type NotFoundTool } from "@/components/site/not-found/tool-search";
import { SHOWCASE_TOOLS } from "@/lib/tools-registry";
import { LIVE_SLUGS } from "@/lib/tools/live";
import { CATEGORY_GLYPH, CATEGORY_TINT, TOOL_PRESENTATION } from "@/lib/tools/presentation";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for doesn't exist.",
  robots: { index: false, follow: false },
};

const POPULAR = ["json-formatter", "regex-tester", "jwt-decoder", "base64", "color-converter", "timestamp-converter"];

/** Live tools only, flattened to what the client-side search needs. */
const LIVE_TOOLS: NotFoundTool[] = SHOWCASE_TOOLS.filter((t) => LIVE_SLUGS.includes(t.slug)).map((t) => {
  const p = TOOL_PRESENTATION[t.slug];
  const name = p?.label ?? t.name;
  const desc = p?.desc ?? t.description;
  return {
    slug: t.slug,
    name,
    glyph: p?.glyph ?? CATEGORY_GLYPH[t.category] ?? "·",
    desc,
    tint: p?.tint ?? CATEGORY_TINT[t.category],
    haystack: [name, t.name, t.category, desc, ...t.tags].join(" ").toLowerCase(),
  };
});

/**
 * Catch-all for unmatched routes and the `notFound()` calls in
 * `/tools/[slug]`. Keeps the site chrome and offers a real search over
 * the live tools so a stale link still lands somewhere useful.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-bg">
      <Header variant="landing" />
      <main id="main" className="mx-auto w-full max-w-[1160px] flex-1 px-4 pt-10 pb-[72px] sm:px-6 sm:pt-[72px] sm:pb-24">
        <div className="relative flex flex-col items-center gap-4 pt-10 pb-5 text-center">
          <GlyphField />
          {/* Knock-out disc so the glyph field doesn't run through the drawing. */}
          <div
            aria-hidden="true"
            className="relative w-full max-w-[320px] bg-[radial-gradient(closest-side,var(--color-bg)_72%,rgba(11,11,10,0))] px-6 pt-[18px] pb-2.5 sm:max-w-[460px]"
          >
            <NotFound404 className="mx-auto w-full max-w-[420px]" />
          </div>
          <h1 className="relative m-0 text-[36px] leading-[1.1] font-bold tracking-[-0.04em] sm:text-[clamp(40px,5vw,60px)]">
            <span className="sr-only">404: </span>This page took a wrong turn.
          </h1>
          <p className="relative m-0 max-w-[460px] text-[17px] text-text-muted">
            The link may be old, or the tool may have moved. Search for what you need:
          </p>
          <ToolSearch tools={LIVE_TOOLS} popular={POPULAR} />
          <div className="relative mt-3 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/"
              className="btn-action inline-flex min-h-[46px] items-center rounded-[11px] px-[18px] text-[15px] font-bold"
            >
              Go home
            </Link>
            <Link
              href="/tools"
              className="inline-flex min-h-[46px] items-center rounded-[11px] border border-border-strong px-[18px] text-[15px] font-semibold text-text hover:text-text"
            >
              All tools
            </Link>
          </div>
        </div>
      </main>
      <HomeFooter variant="compact" />
    </div>
  );
}
