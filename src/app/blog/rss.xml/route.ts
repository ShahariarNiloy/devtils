import { buildRss } from "@/lib/blog/rss";

/** RSS 2.0 feed of published posts, generated once at build time. */
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(buildRss(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
