import type { Metadata } from "next";
import { CollectionJsonLd } from "@/components/shared/tool-jsonld";
import {
  buildCategoryView,
  categoryHref,
  NON_EMPTY_CATEGORIES,
} from "@/components/site/category/category-data";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";
import { CategoriesIndex } from "@/components/site/category/categories-index";
import { OG_HEIGHT, OG_WIDTH, ogPagePath } from "@/lib/og/url";
import { SITE_NAME } from "@/lib/site";

const description =
  "Every utilyx tool, grouped by what it's for: JSON, text, encoding, images, code, design, time and IDs, security and SEO.";

export const metadata: Metadata = {
  title: "Browse by category",
  description,
  alternates: { canonical: "/tools/category" },
  openGraph: {
    type: "website",
    url: "/tools/category",
    title: `Browse by category · ${SITE_NAME}`,
    description,
    siteName: SITE_NAME,
    images: [
      {
        url: ogPagePath("categories.png"),
        width: OG_WIDTH,
        height: OG_HEIGHT,
        alt: "Browse by category",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Browse by category · ${SITE_NAME}`,
    description,
    images: [ogPagePath("categories.png")],
  },
  robots: { index: true, follow: true },
};

export default function CategoriesRoute() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip text-base leading-[1.6]">
      <Header variant="site" />
      <CategoriesIndex />
      <HomeFooter variant="compact" />
      <CollectionJsonLd
        name="Browse by category"
        path="/tools/category"
        description={description}
        items={NON_EMPTY_CATEGORIES.map((c) => ({
          name: buildCategoryView(c).title,
          path: categoryHref(c),
        }))}
        breadcrumbs={[
          { name: "Tools", path: "/tools" },
          { name: "Categories", path: "/tools/category" },
        ]}
      />
    </div>
  );
}
