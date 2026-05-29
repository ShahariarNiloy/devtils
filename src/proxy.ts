import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Markdown content negotiation. When a client (typically an AI agent)
 * sends `Accept: text/markdown`, we rewrite the request to the markdown
 * handler at `/api/markdown` and forward the original pathname via the
 * `?path=` query. The user's URL stays unchanged in the browser address
 * bar; only the response body and Content-Type differ.
 *
 * Browsers send `Accept: text/html,…` and never match this branch, so
 * the existing HTML pages are unaffected. Curl / agent tooling can opt in
 * with a single header:
 *
 *   curl -H "Accept: text/markdown" https://devtils.com/tools/json-to-zod
 *
 * The Cloudflare "Markdown for Agents" reference doc lays out the same
 * pattern: same URL, content negotiated via Accept.
 *
 * Note for Next.js 16+: this file is `proxy.ts`, not `middleware.ts`. The
 * latter is the deprecated alias — same behaviour, but the Next.js team
 * is moving to `proxy` to signal the network-boundary nature of the
 * convention and discourage Express-style overuse.
 */
export function proxy(req: NextRequest) {
  // Pass through API and Next.js internals immediately. Markdown
  // negotiation only makes sense for human-facing routes.
  const pathname = req.nextUrl.pathname;
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/.well-known/") ||
    /\.(?:xml|txt|json|webmanifest|ico|svg|png|jpg|jpeg|webp|avif|css|js|map)$/.test(
      pathname,
    )
  ) {
    return NextResponse.next();
  }

  // Parse the Accept header and look for `text/markdown` with q > 0. A
  // request with `Accept: text/markdown, text/html;q=0.9` is asking for
  // Markdown first — honour that. A request with no preference (or one
  // that prefers HTML) takes the default branch.
  const accept = req.headers.get("accept") ?? "";
  if (!prefersMarkdown(accept)) return NextResponse.next();

  // Rewrite to the markdown route handler, forwarding the original path.
  const url = req.nextUrl.clone();
  url.pathname = "/api/markdown";
  url.searchParams.set("path", pathname);
  return NextResponse.rewrite(url);
}

/**
 * Returns true if the Accept header signals a preference for
 * `text/markdown` over HTML. Implements RFC 7231 q-value resolution at
 * the level of detail this negotiation needs.
 */
function prefersMarkdown(accept: string): boolean {
  const entries = accept.split(",").map(parseAcceptEntry);
  let markdownQ = 0;
  let htmlQ = 0;
  let starQ = 0;
  for (const e of entries) {
    if (e.type === "text/markdown") markdownQ = Math.max(markdownQ, e.q);
    else if (e.type === "text/html") htmlQ = Math.max(htmlQ, e.q);
    else if (e.type === "*/*" || e.type === "text/*") starQ = Math.max(starQ, e.q);
  }
  // Explicit ask for Markdown wins unless the same client also wants HTML
  // at a higher q. Wildcard (`*/*`) doesn't trigger negotiation — a browser
  // sending `Accept: text/html,application/xhtml+xml,*/*;q=0.8` still
  // means "I want HTML".
  if (markdownQ === 0) return false;
  if (htmlQ > markdownQ) return false;
  if (starQ > markdownQ && htmlQ === 0) return false;
  return true;
}

function parseAcceptEntry(raw: string): { type: string; q: number } {
  const [type, ...params] = raw.trim().split(";");
  let q = 1;
  for (const p of params) {
    const [k, v] = p.split("=").map((s) => s.trim());
    if (k === "q") {
      const parsed = Number.parseFloat(v);
      if (Number.isFinite(parsed)) q = parsed;
    }
  }
  return { type: type.toLowerCase(), q };
}

export const config = {
  /**
   * Skip Next.js framework paths + asset URLs + the API route the rewrite
   * targets. Everything else flows through the negotiation. The matcher
   * runs before the body of `proxy()`, so an early opt-out here
   * saves a per-request function call.
   */
  matcher: [
    "/((?!api/|_next/|.well-known/|.*\\.(?:xml|txt|json|webmanifest|ico|svg|png|jpg|jpeg|webp|avif|css|js|map)$).*)",
  ],
};
