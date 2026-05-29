/**
 * MCP resources surfaced by the server. Resources are URL-addressable
 * content blobs (in contrast to tools, which are callable functions). For
 * devtils, the discovery surfaces — llms.txt, the agent index, the
 * Markdown per-page representation — fit naturally.
 *
 * `read()` fetches the same payload the HTTP route handler serves so the
 * MCP resource and the public URL stay in lockstep automatically.
 */

import { SITE_URL } from "@/lib/site";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { TOOLS } from "@/lib/tools-registry";
import { renderToolMarkdown } from "@/lib/markdown-render";
import type { Resource } from "./protocol";

function staticResources(): Resource[] {
  return [
    {
      uri: `${SITE_URL}/llms.txt`,
      name: "llms.txt — site + tool catalogue",
      description:
        "Markdown catalogue of every live tool with one-line descriptions and absolute URLs. Conforms to the llmstxt.org convention.",
      mimeType: "text/markdown",
      read: async () => {
        const res = await fetch(`${SITE_URL}/llms.txt`);
        return res.text();
      },
    },
    {
      uri: `${SITE_URL}/.well-known/agent-index.json`,
      name: "Agent index — machine-readable surface map",
      description:
        "JSON catalogue advertising every discovery surface (llms.txt, sitemap, manifest, robots) plus a per-tool capabilities list. DNS-AID HTTPS records point here.",
      mimeType: "application/json",
      read: async () => {
        const res = await fetch(`${SITE_URL}/.well-known/agent-index.json`);
        return res.text();
      },
    },
    {
      uri: `${SITE_URL}/sitemap.xml`,
      name: "sitemap.xml",
      description: "Standard XML sitemap of live routes.",
      mimeType: "application/xml",
      read: async () => {
        const res = await fetch(`${SITE_URL}/sitemap.xml`);
        return res.text();
      },
    },
  ];
}

function toolResources(): Resource[] {
  const live = TOOLS.filter((t) => IMPLEMENTED_TOOL_SLUGS.has(t.slug));
  return live.map((t) => ({
    uri: `${SITE_URL}/tools/${t.slug}`,
    name: t.name,
    description: t.description,
    mimeType: "text/markdown",
    read: () => {
      // Render directly from the typed registry / SEO data — no HTTP round-trip
      // needed since the data lives in the same process.
      return renderToolMarkdown(t.slug) ?? `# ${t.name}\n\n${t.description}\n`;
    },
  }));
}

export function listResources(): Resource[] {
  return [...staticResources(), ...toolResources()];
}

export function findResource(uri: string): Resource | undefined {
  return listResources().find((r) => r.uri === uri);
}
