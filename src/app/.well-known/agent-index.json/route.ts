import { TOOLS } from "@/lib/tools-registry";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { SITE_URL } from "@/lib/site";

/**
 * Agent index endpoint that DNS-AID SVCB / HTTPS records point at.
 *
 *   _index._agents.devtils.com.  IN  HTTPS  1 devtils.com.
 *     alpn=h2 endpoint=/.well-known/agent-index.json
 *
 * Per draft-mozleywilliams-dnsop-dnsaid, the resolver follows the SVCB
 * pointer to this JSON document, which advertises every machine-readable
 * surface the site exposes. The format is loose by design — the draft
 * doesn't pin a schema yet, so we publish a small, well-known set of
 * fields that current agents (ChatGPT browsing, Claude, Perplexity) can
 * parse without specific support for the spec.
 *
 * Kept static (no query parsing, no auth) so the response can be aggressively
 * cached at the edge — agents poll this on first visit and rarely re-fetch.
 */
export const dynamic = "force-static";

export function GET(): Response {
  const live = TOOLS.filter((t) => IMPLEMENTED_TOOL_SLUGS.has(t.slug));

  const body = {
    name: "devtils",
    description:
      "Handcrafted developer utilities — JSON, encoding, text, image, regex, and more. Every tool runs entirely in the browser.",
    url: SITE_URL,
    publisher: { name: "devtils", url: SITE_URL },

    // Agent-readable map. `type` strings follow common convention: the
    // llms.txt + sitemap + manifest set is what current AI crawlers look
    // for. `llms-txt` is the convention from llmstxt.org.
    endpoints: [
      {
        type: "llms-txt",
        url: `${SITE_URL}/llms.txt`,
        contentType: "text/markdown",
        description: "Markdown summary of the site + every live tool.",
      },
      {
        type: "sitemap",
        url: `${SITE_URL}/sitemap.xml`,
        contentType: "application/xml",
        description: "Standard XML sitemap of live routes.",
      },
      {
        type: "manifest",
        url: `${SITE_URL}/manifest.webmanifest`,
        contentType: "application/manifest+json",
        description: "PWA web app manifest.",
      },
      {
        type: "robots",
        url: `${SITE_URL}/robots.txt`,
        contentType: "text/plain",
        description: "Crawler directives and AI-bot allow rules.",
      },
    ],

    // Tools surfaced as discrete capabilities. Lets an agent know what the
    // site can DO for a user, not just where to crawl. Lives client-side
    // only — no callable API behind these URLs.
    capabilities: live.map((t) => ({
      id: t.slug,
      name: t.name,
      description: t.description,
      url: `${SITE_URL}/tools/${t.slug}`,
      category: t.category,
      tags: t.tags,
      // Each tool runs in the browser; there is no callable invocation
      // protocol. Surface that explicitly so an agent doesn't mistake the
      // URL for an API endpoint.
      invocation: "browser",
    })),

    // Privacy posture — useful for agents deciding whether to route user
    // data through the site.
    dataProcessing: {
      location: "client",
      retention: "none",
      thirdParty: false,
      humanReview: false,
    },

    // Versioning so a future schema change can be detected by clients.
    schemaVersion: "1.0",
    generatedAt: "static",
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // One hour at the edge, day-long stale-while-revalidate — agents
      // polling this should always get a near-current snapshot without
      // hitting origin.
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
