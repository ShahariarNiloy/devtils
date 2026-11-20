import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";
import { CategoryPage } from "@/components/site/category/category-page";
import {
  buildCategoryView,
  categoryFromSlug,
  categorySlug,
  NON_EMPTY_CATEGORIES,
} from "@/components/site/category/category-data";
import { SITE_NAME } from "@/lib/site";

type CategoryRouteProps = { params: Promise<{ category: string }> };

/** Only categories with at least one showcase tool get a page. */
export const dynamicParams = false;

export function generateStaticParams() {
  return NON_EMPTY_CATEGORIES.map((c) => ({ category: categorySlug(c) }));
}

export async function generateMetadata({ params }: CategoryRouteProps): Promise<Metadata> {
  const { category } = await params;
  const cat = categoryFromSlug(category);
  if (!cat) return { title: "Not found" };

  const view = buildCategoryView(cat);
  const canonical = `/tools/category/${view.slug}`;
  const title = view.title;
  const description = view.lede;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: `${title} · ${SITE_NAME}`,
      description,
      siteName: SITE_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE_NAME}`,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function CategoryRoute({ params }: CategoryRouteProps) {
  const { category } = await params;
  const cat = categoryFromSlug(category);
  if (!cat) notFound();

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip text-base leading-[1.6]">
      <Header variant="catalogue" />
      <CategoryPage view={buildCategoryView(cat)} />
      <HomeFooter variant="compact" />
    </div>
  );
}
