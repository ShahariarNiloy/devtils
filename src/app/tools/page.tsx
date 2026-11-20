import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";
import {
  JSON_SECTION,
  LIVE,
  MOST_USED,
  OTHER_SECTIONS,
  ROADMAP,
  TOTAL,
} from "@/components/tools-catalogue/catalogue-data";
import { ToolsCatalogue } from "@/components/tools-catalogue/tools-catalogue";
import { SITE_NAME } from "@/lib/site";
import { TOOL_COUNT } from "@/lib/tools-registry";

export const metadata = {
  title: "All tools",
  description: `Browse the full ${SITE_NAME} catalogue of ${TOOL_COUNT} client-side developer utilities. Search by name, tag, or category.`,
  alternates: { canonical: "/tools" },
  openGraph: {
    type: "website",
    url: "/tools",
    title: `All tools · ${SITE_NAME}`,
    description: `Browse the full ${SITE_NAME} catalogue of ${TOOL_COUNT} client-side developer utilities.`,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `All tools · ${SITE_NAME}`,
    description: `Browse the full ${SITE_NAME} catalogue of ${TOOL_COUNT} client-side developer utilities.`,
  },
  robots: { index: true, follow: true },
};

export default async function ToolsPage({ searchParams }: PageProps<"/tools">) {
  const { q } = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip text-base leading-[1.55]">
      <Header variant="catalogue" />
      <ToolsCatalogue
        json={JSON_SECTION}
        sections={OTHER_SECTIONS}
        featured={MOST_USED}
        roadmap={ROADMAP}
        total={TOTAL}
        live={LIVE}
        initialQuery={typeof q === "string" ? q : ""}
      />
      <HomeFooter variant="compact" />
    </div>
  );
}
