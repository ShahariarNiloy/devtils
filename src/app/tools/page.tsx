import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { CollectionJsonLd } from "@/components/shared/tool-jsonld";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { OG_HEIGHT, OG_WIDTH, ogPagePath } from "@/lib/og/url";
import { HomeFooter } from "@/components/layout/home-footer";
import {
  JSON_SECTION,
  LIVE,
  MOST_USED,
  OTHER_SECTIONS,
  ROADMAP,
  TOTAL,
} from "@/components/tools-catalogue/catalogue-data";
import { CatalogueView, ToolsCatalogue } from "@/components/tools-catalogue/tools-catalogue";
import { SITE_NAME } from "@/lib/site";
import { DISTINCT_LIVE_TOOL_COUNT } from "@/lib/implemented-tools";
import { TOOLS } from "@/lib/tools-registry";

export const metadata = {
  title: "All tools",
  description: `All ${DISTINCT_LIVE_TOOL_COUNT} ${SITE_NAME} tools for JSON, PDFs, images, SEO and text — none of them upload your files. Search by name, tag, or category.`,
  alternates: { canonical: "/tools" },
  openGraph: {
    images: [
      { url: ogPagePath("tools.png"), width: OG_WIDTH, height: OG_HEIGHT },
    ],
    type: "website",
    url: "/tools",
    title: `All tools · ${SITE_NAME}`,
    description: `All ${DISTINCT_LIVE_TOOL_COUNT} ${SITE_NAME} tools for JSON, PDFs, images, SEO and text — none of them upload your files.`,
    siteName: SITE_NAME,
  },
  twitter: {
    images: [ogPagePath("tools.png")],
    card: "summary_large_image",
    title: `All tools · ${SITE_NAME}`,
    description: `All ${DISTINCT_LIVE_TOOL_COUNT} ${SITE_NAME} tools for JSON, PDFs, images, SEO and text — none of them upload your files.`,
  },
  robots: { index: true, follow: true },
};

/*
 * Static on purpose: reading `searchParams` here would render the page on
 * every request and stop it being prefetched. `?q=` is read in the browser
 * by <ToolsCatalogue>; the prebuilt HTML is the full catalogue unfiltered.
 */
export default function ToolsPage() {
  const catalogue = {
    json: JSON_SECTION,
    sections: OTHER_SECTIONS,
    featured: MOST_USED,
    roadmap: ROADMAP,
    total: TOTAL,
    live: LIVE,
  };
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip text-base leading-[1.55]">
      <Header variant="catalogue" />
      <Suspense fallback={<CatalogueView {...catalogue} initialQuery="" />}>
        <ToolsCatalogue {...catalogue} />
      </Suspense>
      <HomeFooter variant="compact" />
      <CollectionJsonLd
        name="All tools"
        path="/tools"
        description={`${LIVE} free developer tools that run in your browser, grouped by category.`}
        items={TOOLS.filter(
          (t) => t.showcase && IMPLEMENTED_TOOL_SLUGS.has(t.slug),
        ).map((t) => ({ name: t.name, path: `/tools/${t.slug}` }))}
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Tools", path: "/tools" },
        ]}
      />
    </div>
  );
}
