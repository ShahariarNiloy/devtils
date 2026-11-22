import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * ARD (Agentic Resource Discovery) capability manifest, ai-catalog data
 * model: https://agenticresourcediscovery.org/
 *
 * Lists only resources that exist and are public. Each entry has exactly one
 * of `url`/`data` (spec §3.4) and 2–5 representative queries drawn from what
 * the resource really does (the MCP tool list in src/lib/mcp/tools.ts).
 */
export const dynamic = "force-static";

export function GET(): Response {
  const host = new URL(SITE_URL).host;
  const urn = (ns: string, name: string) => `urn:air:${host}:${ns}:${name}`;

  const body = {
    specVersion: "1.0",
    host: { displayName: SITE_NAME, identifier: `did:web:${host}` },
    entries: [
      {
        identifier: urn("server", "devtools"),
        displayName: `${SITE_NAME} developer tools (MCP server)`,
        type: "application/mcp-server-card+json",
        url: `${SITE_URL}/.well-known/mcp/server-card.json`,
        representativeQueries: [
          "convert this JSON payload to TypeScript types",
          "decode a JWT and show its claims",
          "base64 encode a string",
          "format a SQL query",
          "convert a Unix timestamp to a date",
        ],
      },
      {
        identifier: urn("skills", "index"),
        displayName: `${SITE_NAME} agent skills`,
        type: "application/json",
        url: `${SITE_URL}/.well-known/agent-skills/index.json`,
        representativeQueries: [
          "generate a Zod schema from sample JSON",
          "compare two texts and show the diff",
          "convert JSON to YAML",
        ],
      },
      {
        identifier: urn("docs", "llms-txt"),
        displayName: `${SITE_NAME} site guide for language models`,
        type: "text/markdown",
        url: `${SITE_URL}/llms.txt`,
        representativeQueries: [
          "what developer tools does utilyx offer",
          "an online JSON formatter that runs in the browser",
          "free tool to compress images without uploading",
        ],
      },
      {
        identifier: urn("catalog", "api"),
        displayName: `${SITE_NAME} API catalog`,
        type: "application/linkset+json",
        url: `${SITE_URL}/.well-known/api-catalog`,
        representativeQueries: [
          "list the machine-readable endpoints of utilyx",
          "where is the utilyx MCP endpoint",
        ],
      },
    ],
  };

  return Response.json(body, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
