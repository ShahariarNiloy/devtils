import type { NextConfig } from "next";
import path from "node:path";

/**
 * Baseline security headers applied to every route. Aligned with the
 * "polished, client-side, privacy-respecting" positioning:
 *
 *  - X-Frame-Options DENY everywhere except /embed/* (those routes exist
 *    precisely to be framed; everywhere else, refusing frames blocks
 *    clickjacking).
 *  - Strict-Transport-Security with a year + includeSubDomains + preload —
 *    safe for an HTTPS-only deployment.
 *  - Referrer-Policy strict-origin-when-cross-origin avoids leaking full
 *    URLs across origins.
 *  - X-Content-Type-Options nosniff prevents the browser from second-
 *    guessing our declared MIME types.
 *  - Permissions-Policy denies sensors / payments / etc. — we use none.
 *  - Cross-Origin-Opener-Policy gives top-level browsing contexts
 *    isolation; combined with COEP would unlock SharedArrayBuffer if we
 *    ever needed it.
 *  - No CSP yet: Next.js's runtime needs nonced scripts to work without
 *    breaking inline framework code; adding a strict CSP correctly is a
 *    larger follow-up that needs middleware-based nonce wiring.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const FRAME_DENY = { key: "X-Frame-Options", value: "DENY" };

/**
 * Discoverability `Link` headers per RFC 8288. Advertised on every route so
 * that an agent (or any HTTP client doing a HEAD on the site root) finds the
 * machine-readable maps of the site without parsing HTML:
 *
 *   - `llms.txt`   — Markdown summary of the site + every live tool,
 *                    the convention from llmstxt.org. Tagged
 *                    `rel="describedby"` because the file describes
 *                    the resource at the requested URL.
 *   - `sitemap`    — XML sitemap (registered IANA relation).
 *   - `manifest`   — PWA web app manifest.
 *   - `canonical`  — points at the absolute canonical for the site root;
 *                    per-route canonicals already ship via Next.js
 *                    `Metadata.alternates.canonical`, so this header is
 *                    just belt-and-braces for crawler tools that read
 *                    headers but not <link rel="canonical">.
 *
 * HTTP allows multiple `Link` headers in a response — we emit each as its
 * own array entry rather than comma-separating them, which is more robust
 * against intermediate proxies that fold headers incorrectly.
 */
const DISCOVERY_LINK_HEADERS = [
  {
    key: "Link",
    value: '</llms.txt>; rel="describedby"; type="text/markdown"',
  },
  {
    key: "Link",
    value: '</sitemap.xml>; rel="sitemap"; type="application/xml"',
  },
  {
    key: "Link",
    value:
      '</manifest.webmanifest>; rel="manifest"; type="application/manifest+json"',
  },
  {
    // RFC 9727: `rel="api-catalog"` points at the linkset that enumerates
    // the site's machine-readable surfaces. An agent doing a HEAD on
    // any page finds the catalog without parsing HTML.
    key: "Link",
    value:
      '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  },
  {
    // MCP server card (SEP-1649). No registered IANA relation yet, so
    // we use the spec-conventional `mcp-server-card` extension relation.
    // Agents that speak MCP find /api/mcp from here without scraping.
    key: "Link",
    value:
      '</.well-known/mcp/server-card.json>; rel="mcp-server-card"; type="application/json"',
  },
  {
    // Agent Skills Discovery RFC v0.2.0. Extension relation since the RFC
    // is still pre-IANA. Index lists every callable + documented skill
    // the site exposes; each entry has a sha256 of the SKILL.md body.
    key: "Link",
    value:
      '</.well-known/agent-skills/index.json>; rel="agent-skills"; type="application/json"',
  },
];

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this app — otherwise it walks up to a
  // parent monorepo's lockfile.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The icon resolver imports `* as LucideIcons` so any registry entry can
  // resolve dynamically. This flag rewrites that into per-icon imports
  // during build so we don't ship the entire library.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        // Everything outside /embed gets framing denial.
        source: "/((?!embed).*)",
        headers: [...SECURITY_HEADERS, FRAME_DENY, ...DISCOVERY_LINK_HEADERS],
      },
      {
        // Embed routes are explicitly designed to be framed — drop the
        // frame-deny header but keep everything else, including the
        // discovery Link headers so an agent following an embed URL still
        // finds llms.txt / sitemap.
        source: "/embed/:path*",
        headers: [...SECURITY_HEADERS, ...DISCOVERY_LINK_HEADERS],
      },
    ];
  },
  async redirects() {
    return [
      // `/llms.txt` is the spec (llmstxt.org). The singular form is a near-
      // universal typo — accept it and forward to the canonical URL so an
      // agent or human typing one letter wrong doesn't hit the 404 page.
      { source: "/llm.txt", destination: "/llms.txt", permanent: true },
      // The tool launched as `code-beautifier`; renamed to the more
      // accurate `code-formatter` (the underlying engine — Prettier — is
      // a formatter, and every modern tooling surface matches that
      // verb). 308 preserves the method (irrelevant for GET-only pages
      // but mandatory for the spec) and tells crawlers the new URL is
      // canonical so the link equity transfers.
      { source: "/tools/code-beautifier", destination: "/tools/code-formatter", permanent: true },
    ];
  },
};

export default nextConfig;
