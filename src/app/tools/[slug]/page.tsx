/* eslint-disable react-hooks/static-components */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";
import { ComingSoon } from "@/components/layout/coming-soon";
import { ToolJsonLd } from "@/components/shared/tool-jsonld";
import { getToolComponent, IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { getToolBySlug, TOOLS } from "@/lib/tools-registry";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Statically pre-render only the LIVE tools. The other 151 registry
 * entries are unbuilt placeholders — pre-generating them would hand
 * crawlers thin / doorway content. Showcase-but-unbuilt entries still
 * render on-demand and get `robots: { index: false }` so any crawler
 * that does reach them stops following.
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
  if (!tool) return { title: "Not found" };

  const isLive = IMPLEMENTED_TOOL_SLUGS.has(slug);
  const canonical = `/tools/${slug}`;
  const suffix = isLive ? "" : " (coming soon)";
  const title = `${tool.name}${suffix}`;
  // Pad the description with the tool's tags so a generated OG card has
  // body text; the registry's `description` field is the short blurb used
  // for cards and meta-description.
  const description = tool.description;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: tool.tags,
    openGraph: {
      type: "website",
      url: `${SITE_URL}${canonical}`,
      title: `${tool.name} · ${SITE_NAME}`,
      description,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: `${tool.name} · ${SITE_NAME}`,
      description,
    },
    // Unbuilt tools render the ComingSoon placeholder — flag them as
    // noindex so the bare "this is coming" page doesn't compete with the
    // live tools for ranking.
    robots: isLive
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) notFound();
  const Comp = getToolComponent(slug);
  const isLive = Boolean(Comp);

  return (
    <div className="flex min-h-dvh flex-col">
      <ToolJsonLd tool={tool} isLive={isLive} />
      <Header />
      <main id="main" className="flex-1 bg-bg">
        {Comp ? <Comp tool={tool} /> : <ComingSoon tool={tool} />}
      </main>
      <HomeFooter />
    </div>
  );
}
