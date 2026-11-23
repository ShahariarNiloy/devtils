/**
 * POST /api/seo/fetch  { url }  →  the page (and its robots.txt) as seen by a
 * crawler, for the SEO checker. With /api/seo/assets, the only endpoints where
 * utilyx fetches a URL for a user; see `fetch-page.ts` for how it's locked down.
 *
 * A POST body, not ?url=, so the address never lands in request logs. Nothing
 * here is stored or logged.
 */

import { checkTarget, FetchError, fetchPublicPage, type FetchedPage } from "@/lib/seo-fetch/fetch-page";
import { clientIp, rateLimited } from "@/lib/seo-fetch/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } });

export interface SeoFetchResponse {
  page: FetchedPage;
  /** robots.txt of the final origin; null when there isn't one or it failed. */
  robots: { url: string; status: number; text: string } | null;
}

async function robotsFor(origin: string): Promise<SeoFetchResponse["robots"]> {
  const url = `${origin}/robots.txt`;
  try {
    const r = await fetchPublicPage(checkTarget(url), { maxBytes: 512 * 1024, timeoutMs: 5000, maxRedirects: 3 });
    return { url, status: r.status, text: r.status === 200 ? r.body : "" };
  } catch {
    return null;
  }
}

export async function POST(req: Request): Promise<Response> {
  if (rateLimited(clientIp(req))) return json({ error: "Too many checks in a minute. Wait a moment and try again." }, 429);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Send { url } as JSON." }, 400);
  }
  const input = raw && typeof raw === "object" && "url" in raw && typeof raw.url === "string" ? raw.url : "";
  if (!input.trim() || input.length > 2048) return json({ error: "Enter a URL to check." }, 400);

  try {
    const start = checkTarget(input);
    // robots.txt for the starting origin in parallel; again if a redirect changed origin.
    const early = robotsFor(start.origin);
    const page = await fetchPublicPage(start);
    const finalOrigin = new URL(page.finalUrl).origin;
    const robots = finalOrigin === start.origin ? await early : await robotsFor(finalOrigin);
    return json({ page, robots } satisfies SeoFetchResponse);
  } catch (e) {
    if (e instanceof FetchError) return json({ error: e.message }, e.status);
    return json({ error: "The page couldn't be checked." }, 502);
  }
}
