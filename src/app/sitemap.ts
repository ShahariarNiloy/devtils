import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { CATEGORIES, SHOWCASE_TOOLS, TOOLS } from "@/lib/tools-registry";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { POSTS, postHref } from "@/lib/blog";

/**
 * Sitemap. Only live (`implemented-tools`) routes are listed — unbuilt
 * tools render a coming-soon placeholder and would be flagged as thin
 * content if surfaced here. Static legal routes and the index pages get a
 * higher priority since they're the natural entry points.
 *
 * `lastModified` only where we know the real date (blog posts, and the blog
 * index = newest post). Stamping every URL with the build time on each deploy
 * teaches search engines to ignore our dates altogether.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const newestPost = POSTS.reduce((d, p) => (p.date > d ? p.date : d), "1970-01-01");
  const live = TOOLS.filter((t) => IMPLEMENTED_TOOL_SLUGS.has(t.slug));

  return [
    { url: SITE_URL, priority: 1, changeFrequency: "weekly" },
    {
      url: `${SITE_URL}/tools`,
      priority: 0.9,
      changeFrequency: "weekly",
    },
    { url: `${SITE_URL}/blog`, lastModified: new Date(`${newestPost}T00:00:00Z`), priority: 0.6, changeFrequency: "weekly" },
    // Published posts only (planned / draft posts aren't routable).
    ...POSTS.map((p) => ({
      url: `${SITE_URL}${postHref(p.slug)}`,
      lastModified: new Date(`${p.date}T00:00:00Z`),
      priority: 0.6,
      changeFrequency: "monthly" as const,
    })),
    { url: `${SITE_URL}/changelog`, priority: 0.5, changeFrequency: "weekly" },
    { url: `${SITE_URL}/faq`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${SITE_URL}/request`, priority: 0.4, changeFrequency: "monthly" },
    // Category landings (only categories that have catalogue tools).
    { url: `${SITE_URL}/tools/category`, priority: 0.6, changeFrequency: "weekly" },
    ...CATEGORIES.filter((c) => SHOWCASE_TOOLS.some((t) => t.category === c)).map((c) => ({
      url: `${SITE_URL}/tools/category/${c.toLowerCase().replace(/\./g, "-")}`,
      priority: 0.6,
      changeFrequency: "weekly" as const,
    })),
    { url: `${SITE_URL}/privacy`, priority: 0.3 },
    { url: `${SITE_URL}/terms`, priority: 0.3 },
    { url: `${SITE_URL}/contact`, priority: 0.3 },
    ...live.map((t) => ({
      url: `${SITE_URL}/tools/${t.slug}`,
      priority: 0.7,
      changeFrequency: "monthly" as const,
    })),
  ];
}
