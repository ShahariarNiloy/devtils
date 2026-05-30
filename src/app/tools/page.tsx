import { Header } from '@/components/layout/header';
import { HomeFooter } from '@/components/layout/home-footer';
import { ToolsIndex } from '@/components/layout/tools-index';
import { parseTierParam } from '@/components/layout/tools-index/params';
import { SHOWCASE_TOOLS, CATEGORIES, TOOL_COUNT, type ToolCategory } from "@/lib/tools-registry";
import { SITE_NAME } from "@/lib/site";

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

interface PageSearchParams {
  cat?: string;
  q?: string;
  tier?: string;
}

const validCats: ReadonlySet<string> = new Set<ToolCategory>(CATEGORIES);

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const sp = await searchParams;
  const initialCat = sp?.cat && validCats.has(sp.cat) ? (sp.cat as ToolCategory) : null;
  const initialQuery = typeof sp?.q === "string" ? sp.q : "";
  const initialTier = parseTierParam(sp?.tier);

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main" className="flex-1 bg-bg">
        <ToolsIndex
          tools={SHOWCASE_TOOLS}
          initialCategory={initialCat}
          initialQuery={initialQuery}
          initialTier={initialTier}
        />
        <HomeFooter />
      </main>
    </div>
  );
}
