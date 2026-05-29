import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { TOOLS } from "@/lib/tools-registry";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";

/**
 * Sitemap. Only live (`implemented-tools`) routes are listed — unbuilt
 * tools render a coming-soon placeholder and would be flagged as thin
 * content if surfaced here. Static legal routes and the index pages get a
 * higher priority since they're the natural entry points.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const live = TOOLS.filter((t) => IMPLEMENTED_TOOL_SLUGS.has(t.slug));

  return [
    { url: SITE_URL, lastModified: now, priority: 1, changeFrequency: "weekly" },
    {
      url: `${SITE_URL}/tools`,
      lastModified: now,
      priority: 0.9,
      changeFrequency: "weekly",
    },
    { url: `${SITE_URL}/changelog`, lastModified: now, priority: 0.5, changeFrequency: "weekly" },
    { url: `${SITE_URL}/privacy`, lastModified: now, priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, priority: 0.3 },
    { url: `${SITE_URL}/contact`, lastModified: now, priority: 0.3 },
    ...live.map((t) => ({
      url: `${SITE_URL}/tools/${t.slug}`,
      lastModified: now,
      priority: 0.7,
      changeFrequency: "monthly" as const,
    })),
  ];
}
