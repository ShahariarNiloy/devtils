/**
 * Client for /api/seo/fetch and /api/seo/assets: a public page (and its site's robots.txt) as a
 * crawler sees it. Used by the SEO checker and the tools' "Load from URL".
 */

import type { AssetInfo } from "@/lib/seo-fetch/asset-types";

export interface LoadedPage {
  page: {
    hops: { url: string; status: number }[];
    finalUrl: string;
    status: number;
    headers: Record<string, string>;
    contentType: string;
    body: string;
    truncated: boolean;
    ms: number;
  };
  robots: { url: string; status: number; text: string } | null;
}

/** The endpoint's success shape, checked rather than assumed. */
function isLoaded(d: unknown): d is LoadedPage {
  if (!d || typeof d !== "object" || !("page" in d)) return false;
  const p: unknown = d.page;
  return !!p && typeof p === "object" && "finalUrl" in p && typeof p.finalUrl === "string" && "body" in p && typeof p.body === "string";
}

/** Headers-only crawler checks of up to 4 image URLs. Resolves to [] on any failure — it's a bonus check. */
export async function inspectAssets(urls: readonly string[]): Promise<AssetInfo[]> {
  if (!urls.length) return [];
  try {
    const res = await fetch("/api/seo/assets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ urls }) });
    const data: unknown = await res.json();
    const list: unknown = data && typeof data === "object" && "assets" in data ? data.assets : null;
    return Array.isArray(list) ? list.filter((a): a is AssetInfo => !!a && typeof a === "object" && "url" in a && typeof a.url === "string") : [];
  } catch {
    return [];
  }
}

/** Fetch a public URL through utilyx's server. Throws an Error with a readable message. */
export async function loadPage(url: string): Promise<LoadedPage> {
  const res = await fetch("/api/seo/fetch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
  const data: unknown = await res.json().catch(() => null);
  if (res.ok && isLoaded(data)) return data;
  const msg = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "The page couldn't be loaded.";
  throw new Error(msg);
}
