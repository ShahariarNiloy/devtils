import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";
import { CategoriesIndex } from "@/components/site/category/categories-index";
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
  },
  twitter: {
    card: "summary_large_image",
    title: `Browse by category · ${SITE_NAME}`,
    description,
  },
  robots: { index: true, follow: true },
};

export default function CategoriesRoute() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip text-base leading-[1.6]">
      <Header variant="site" />
      <CategoriesIndex />
      <HomeFooter variant="compact" />
    </div>
  );
}
