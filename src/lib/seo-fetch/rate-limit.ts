/**
 * Best-effort per-instance rate limit for the SEO fetch endpoints — enough to
 * stop casual abuse. Both endpoints share one budget per IP. For real
 * protection, add a rate rule in the host's firewall.
 */

const WINDOW_MS = 60_000;
const PER_WINDOW = 30;
const seen = new Map<string, number[]>();

export function clientIp(req: Request): string {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** Records a hit; true when this IP is over the limit. */
export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (seen.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 5000) for (const [k, v] of seen) if (now - v[v.length - 1] > WINDOW_MS) seen.delete(k);
  return hits.length > PER_WINDOW;
}
