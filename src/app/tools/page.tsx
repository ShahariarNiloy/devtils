import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { HomeFooter } from "@/components/layout/HomeFooter";
import { ToolsIndex } from "@/components/layout/ToolsIndex";
import { TOOLS, CATEGORIES, TOOL_COUNT, type ToolCategory } from "@/lib/tools-registry";

export const metadata = {
  title: "All tools — DevToolbox",
  description: `Browse all ${TOOL_COUNT} DevToolbox utilities. Search by name, tag, or category.`,
};

interface PageSearchParams {
  cat?: string;
  q?: string;
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

  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main id="main" className="flex-1 bg-bg">
        <ToolsIndex
          tools={TOOLS}
          initialCategory={initialCat}
          initialQuery={initialQuery}
        />
        <HomeFooter />
      </main>
    </div>
  );
}
