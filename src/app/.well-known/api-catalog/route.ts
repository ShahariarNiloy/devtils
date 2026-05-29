import { SITE_URL } from "@/lib/site";

/**
 * /.well-known/api-catalog per RFC 9727. The body is an RFC 9264 linkset
 * (Content-Type: application/linkset+json) describing the machine-readable
 * surfaces this site exposes.
 *
 * Honest note: devtils doesn't have a callable REST API — every tool runs
 * client-side. The catalog therefore lists the discovery / content
 * endpoints that exist (agent-index, markdown negotiation, llms.txt)
 * rather than fabricating "API" entries that wouldn't be callable. The
 * RFC allows linkset entries to use whichever link relations are
 * appropriate; service-desc / service-doc / status are recommended but
 * not required, and `describedby` covers the case where a resource is
 * documented but not formally specified.
 *
 * Cache aggressively: this changes at deploy boundaries only.
 */
export const dynamic = "force-static";

export function GET(): Response {
  const linkset = {
    linkset: [
      // ── Agent discovery index — the master catalog of what's
      // machine-readable on the site. The DNS-AID HTTPS record points
      // at the same JSON, so this is a primary entry point.
      {
        anchor: `${SITE_URL}/.well-known/agent-index.json`,
        "service-doc": [
          {
            href: `${SITE_URL}/llms.txt`,
            type: "text/markdown",
            title:
              "Markdown summary of the site + every live tool — human and agent readable",
          },
        ],
        describedby: [
          {
            href: "https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/",
            type: "text/html",
            title: "DNS-AID draft (describes the agent-index schema)",
          },
        ],
        author: [{ href: SITE_URL, title: "devtils" }],
      },

      // ── Markdown content negotiation surface. Any HTML route on the
      // site doubles as a Markdown resource when the request carries
      // `Accept: text/markdown`. The catalog entry documents the
      // contract (request, headers, response shape) so an agent can
      // discover it without trial-and-error fetches.
      {
        anchor: `${SITE_URL}/`,
        alternate: [
          {
            href: `${SITE_URL}/`,
            type: "text/markdown",
            title:
              "Same URL returns Markdown when the client sends Accept: text/markdown",
            hreflang: "en",
          },
        ],
        "service-doc": [
          {
            href: "https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/",
            type: "text/html",
            title:
              "Cloudflare 'Markdown for Agents' — explains the Accept-based content negotiation",
          },
        ],
      },

      // ── llms.txt — the agent-friendly Markdown catalog. Tagged with
      // the conventional `describedby` so a client following an HTML
      // page can find its Markdown twin.
      {
        anchor: `${SITE_URL}/llms.txt`,
        "service-doc": [
          {
            href: "https://llmstxt.org/",
            type: "text/html",
            title: "llms.txt convention spec",
          },
        ],
        describedby: [
          {
            href: `${SITE_URL}/.well-known/agent-index.json`,
            type: "application/json",
            title: "Machine-readable mirror of the catalog this file lists",
          },
        ],
      },

      // ── Sitemap — registered IANA relation `sitemap`. Listed in the
      // catalog so an agent that doesn't speak Link-header discovery can
      // still find it through the linkset.
      {
        anchor: `${SITE_URL}/sitemap.xml`,
        "service-doc": [
          {
            href: "https://www.sitemaps.org/protocol.html",
            type: "text/html",
            title: "Sitemaps protocol",
          },
        ],
      },

      // ── PWA manifest. Same shape — descriptor + service-doc link to
      // the formal spec.
      {
        anchor: `${SITE_URL}/manifest.webmanifest`,
        "service-doc": [
          {
            href: "https://www.w3.org/TR/appmanifest/",
            type: "text/html",
            title: "W3C Web App Manifest spec",
          },
        ],
      },
    ],
  };

  return new Response(JSON.stringify(linkset, null, 2), {
    headers: {
      // RFC 9264 — `application/linkset+json` is the dedicated media
      // type for linkset documents. Generic `application/json` would
      // technically work but is less specific.
      "Content-Type": "application/linkset+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
