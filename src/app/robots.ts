import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt. Allows everything by default; explicitly invites the major
 * search engines and AI crawlers to index public pages, and points them at
 * the sitemap. Faceted-navigation URLs on /tools (search query, tier
 * filter) are disallowed so crawl budget doesn't fragment across
 * permutations — the canonical landing page is `/tools` itself.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/tools?", "/api/"],
      },
      // Named AI crawlers — listed explicitly to make our posture obvious in
      // automated audits, even though they'd fall through to "*" anyway.
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "CCBot", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
