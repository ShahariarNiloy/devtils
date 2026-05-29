import {
  estimateTokens,
  renderChangelogMarkdown,
  renderGenericPageMarkdown,
  renderHomeMarkdown,
  renderToolMarkdown,
  renderToolsIndexMarkdown,
} from "@/lib/markdown-render";

export const dynamic = "force-static";

/**
 * Markdown content-negotiation endpoint. Middleware rewrites any request
 * carrying `Accept: text/markdown` to this handler with the original
 * pathname forwarded in `?path=`. The browser session sees the rewrite
 * via Next.js' internal mechanics; the user's URL stays unchanged
 * (`https://devtils.com/tools/json-to-typescript` returns Markdown if the
 * Accept header asks for it).
 *
 *   GET /api/markdown?path=/tools/json-to-typescript
 *   Accept: text/markdown
 *   Content-Type: text/markdown; charset=utf-8
 *   x-markdown-tokens: 1342
 *
 * Returns 404 (still as Markdown) for unknown paths so the negotiation
 * stays semantically consistent — agents never get HTML when they asked
 * for Markdown.
 */
export function GET(req: Request): Response {
  const url = new URL(req.url);
  const path = url.searchParams.get("path") ?? "/";
  const md = renderForPath(path);

  if (md === null) {
    const body =
      `# Not found\n\n> No Markdown representation is available for \`${path}\`. The page may exist as HTML — drop the \`Accept: text/markdown\` header to fetch it.\n`;
    return new Response(body, {
      status: 404,
      headers: markdownHeaders(body),
    });
  }

  return new Response(md, {
    status: 200,
    headers: markdownHeaders(md),
  });
}

function markdownHeaders(body: string): HeadersInit {
  return {
    "Content-Type": "text/markdown; charset=utf-8",
    "x-markdown-tokens": String(estimateTokens(body)),
    // Long edge cache — Markdown is generated from the same static data
    // the HTML pages use, so it changes at deploy boundaries only.
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    // Tell agents the same URL has an HTML alternative — both the
    // negotiated and explicit paths surface here.
    Vary: "Accept",
  };
}

function renderForPath(path: string): string | null {
  // Normalise: strip a trailing slash (except root) so /tools and /tools/
  // produce the same lookup.
  const normalized = path.length > 1 ? path.replace(/\/$/, "") : path;

  if (normalized === "/") return renderHomeMarkdown();
  if (normalized === "/tools") return renderToolsIndexMarkdown();
  if (normalized === "/changelog") return renderChangelogMarkdown();

  // /tools/<slug>
  const toolMatch = normalized.match(/^\/tools\/([a-z0-9-]+)$/);
  if (toolMatch) return renderToolMarkdown(toolMatch[1]);

  // Generic page (privacy, terms, contact). Returns null for unmatched.
  return renderGenericPageMarkdown(normalized);
}
