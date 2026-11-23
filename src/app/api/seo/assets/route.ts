/**
 * POST /api/seo/assets  { urls: string[] }  →  { assets: AssetInfo[] }
 *
 * Headers-only checks of up to 4 images a page points to (share image,
 * favicon), for the SEO checker. Same locked-down fetcher and shared rate
 * limit as /api/seo/fetch; nothing is stored or logged.
 */

import type { RobotsRule } from "@/components/tools/robots-txt-generator/robots-txt-generator.lib";
import { inspectAsset } from "@/lib/seo-fetch/inspect-asset";
import { clientIp, rateLimited } from "@/lib/seo-fetch/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX = 4;
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } });

export async function POST(req: Request): Promise<Response> {
  if (rateLimited(clientIp(req))) return json({ error: "Too many checks in a minute. Wait a moment and try again." }, 429);
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Send { urls } as JSON." }, 400);
  }
  const list: unknown = raw && typeof raw === "object" && "urls" in raw ? raw.urls : null;
  if (!Array.isArray(list)) return json({ error: "Send { urls } as JSON." }, 400);
  const urls = [...new Set(list.filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u) && u.length <= 2048))].slice(0, MAX);
  const robots = new Map<string, Promise<RobotsRule[] | null>>();
  return json({ assets: await Promise.all(urls.map((u) => inspectAsset(u, robots))) });
}
