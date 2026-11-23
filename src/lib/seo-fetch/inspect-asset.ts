/**
 * What a crawler sees when it fetches an image a page points to — status,
 * type, size, redirects, and whether robots.txt lets the crawlers that
 * matter fetch it. Headers only: the file itself isn't downloaded.
 */

import { parseRobotsTxt, testPath, type RobotsRule } from "@/components/tools/robots-txt-generator/robots-txt-generator.lib";
import type { AssetInfo } from "./asset-types";
import { checkTarget, FetchError, fetchPublicPage } from "./fetch-page";

export type { AssetInfo };

/** Crawlers that fetch each kind of image, in fallback order (most specific group wins). */
export const CRAWLERS = {
  googleImage: ["Googlebot-Image", "Googlebot"],
  twitter: ["Twitterbot"],
} as const;

/** Is `path` blocked for a crawler that obeys the first of `agents` that has its own group (else `*`)? */
export function blockedFor(rules: readonly RobotsRule[], agents: readonly string[], path: string): boolean {
  const own = agents.find((a) => rules.some((r) => r.ua.toLowerCase() === a.toLowerCase()));
  return !testPath(rules, own ?? "*", path).allowed;
}

function sizeOf(headers: Record<string, string>): number | null {
  const total = /\/(\d+)\s*$/.exec(headers["content-range"] ?? "")?.[1];
  const n = Number(total ?? headers["content-length"]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function inspectAsset(raw: string, robotsCache: Map<string, Promise<RobotsRule[] | null>>): Promise<AssetInfo> {
  try {
    const url = checkTarget(raw);
    let r = await fetchPublicPage(url, { method: "HEAD", timeoutMs: 6000, maxRedirects: 4 });
    // Some servers refuse HEAD; a ranged GET reads one byte and still reports the size.
    if (r.status === 405 || r.status === 501 || r.status === 403) {
      r = await fetchPublicPage(url, { method: "GET", range: true, timeoutMs: 6000, maxRedirects: 4, maxBytes: 64 * 1024 });
    }
    const final = new URL(r.finalUrl);
    let rules = robotsCache.get(final.origin);
    if (!rules) {
      rules = fetchPublicPage(checkTarget(`${final.origin}/robots.txt`), { maxBytes: 512 * 1024, timeoutMs: 5000, maxRedirects: 3 })
        .then((x) => (x.status === 200 ? parseRobotsTxt(x.body).rules : []))
        .catch(() => null);
      robotsCache.set(final.origin, rules);
    }
    const parsed = await rules;
    const path = final.pathname + final.search;
    return {
      url: raw,
      finalUrl: r.finalUrl,
      // 206 is the ranged fallback's normal answer.
      status: r.status === 206 ? 200 : r.status,
      redirects: r.hops.length - 1,
      contentType: (r.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase(),
      bytes: sizeOf(r.headers),
      blocked: parsed
        ? { "Googlebot-Image": blockedFor(parsed, CRAWLERS.googleImage, path), Twitterbot: blockedFor(parsed, CRAWLERS.twitter, path) }
        : undefined,
    };
  } catch (e) {
    return { url: raw, error: e instanceof FetchError ? e.message : "It couldn't be fetched." };
  }
}
