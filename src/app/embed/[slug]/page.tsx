/* eslint-disable react-hooks/static-components */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getToolComponent, IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { getToolBySlug, TOOLS } from "@/lib/tools-registry";
import { SITE_URL, SITE_WORDMARK } from "@/lib/site";

/**
 * Statically pre-render embed routes only for live tools — there's no
 * point shipping an iframe for a coming-soon placeholder.
 */
export function generateStaticParams() {
  return TOOLS.filter((t) => IMPLEMENTED_TOOL_SLUGS.has(t.slug)).map((t) => ({
    slug: t.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return { title: "Not found", robots: { index: false } };
  return {
    title: `${tool.name} (embed)`,
    description: tool.description,
    // Embeds are intentionally not indexed — the canonical page lives at
    // /tools/[slug]. Indexing the embed would create duplicate-content risk.
    alternates: { canonical: `${SITE_URL}/tools/${slug}` },
    robots: { index: false, follow: false },
  };
}

/**
 * Embeddable view of a single tool. Renders the tool component with no
 * header, no footer, no surrounding chrome — designed for use inside an
 * `<iframe>` on third-party blog posts and docs sites. A small attribution
 * strip at the bottom links back to the canonical page so credit + traffic
 * flow back to the site.
 *
 *   <iframe src={`https://${SITE_DOMAIN}/embed/json-to-typescript`}
 *           width="100%" height="600" loading="lazy"
 *           sandbox="allow-scripts allow-same-origin allow-clipboard-write" />
 *
 * sandbox attribute is the embedder's responsibility — we don't set any
 * Content-Security-Policy here that would make embedding harder than
 * necessary.
 */
export default async function ToolEmbed({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) notFound();
  const Comp = getToolComponent(slug);
  if (!Comp) notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      {/* Stripped chrome: no global header / footer / sidebar. The tool
          renders inside ToolShell which still surrounds it, so a tool that
          owns its own h1/breadcrumb keeps that. */}
      <main id="main" className="flex-1">
        <Comp tool={tool} />
      </main>

      {/* Attribution strip — small, but unmissable. Embedders can't strip
          this without violating the iframe's sandbox; the link sends a
          referrer header so the host site gets analytics credit. */}
      <footer className="border-t border-border-subtle bg-surface">
        <div className="mx-auto max-w-8xl px-5 py-3 flex items-center justify-between text-sm">
          <span className="text-text-faint">
            {tool.name} on{" "}
            <Link
              href={`${SITE_URL}/tools/${slug}`}
              target="_top"
              rel="noopener"
              className="font-semibold text-text hover:text-[color:var(--color-brand)]"
            >
              {SITE_WORDMARK}
            </Link>
          </span>
          <Link
            href={`${SITE_URL}/tools/${slug}`}
            target="_top"
            rel="noopener"
            className="inline-flex items-center gap-1 text-text-muted hover:text-text transition-colors"
          >
            Open full version <ArrowUpRight size={12} aria-hidden />
          </Link>
        </div>
      </footer>
    </div>
  );
}
