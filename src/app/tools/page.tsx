import { Suspense } from "react";
import { Header } from '@/components/layout/header';
import { HomeFooter } from '@/components/layout/home-footer';
import { ToolsIndex } from '@/components/layout/tools-index';
import { parseTierParam } from '@/components/layout/tools-index/params';
import { SHOWCASE_TOOLS, CATEGORIES, TOOL_COUNT, type ToolCategory } from "@/lib/tools-registry";

export const metadata = {
  title: "All tools | devtils",
  description: `Browse all ${TOOL_COUNT} devtils utilities. Search by name, tag, or category.`,
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
      <Suspense fallback={null}>
        <Header />
      </Suspense>
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
