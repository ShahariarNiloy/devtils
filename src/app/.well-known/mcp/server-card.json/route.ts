import { SITE_URL } from "@/lib/site";
import { listResources } from "@/lib/mcp/resources";
import { listTools } from "@/lib/mcp/tools";
import {
  MCP_PROTOCOL_VERSION,
  SERVER_NAME,
  SERVER_VERSION,
} from "@/lib/mcp/protocol";

/**
 * MCP Server Card per SEP-1649. Truthful catalogue of the MCP server's
 * identity, transport, and capabilities — generated from the same tool /
 * resource registries the live server uses, so the card and the running
 * server can never disagree.
 *
 * The schema is not yet finalised in the spec (pull request open at
 * modelcontextprotocol/modelcontextprotocol#2127). The fields below are
 * the stable subset most audit tools look for; any future required field
 * gets added with a code change rather than a manual JSON edit.
 */
export const dynamic = "force-static";

export function GET(): Response {
  const card = {
    schemaVersion: "1.0",
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      description:
        "Programmatic access to devtils' developer utilities. Every tool is a pure function that runs server-side via JSON-RPC over HTTP — no auth, no rate limits, no session state.",
      vendor: "devtils",
      homepage: SITE_URL,
    },

    // Transport: Streamable HTTP, single endpoint, JSON-RPC 2.0.
    transport: {
      type: "streamable-http",
      url: `${SITE_URL}/api/mcp`,
    },

    protocolVersion: MCP_PROTOCOL_VERSION,

    // Capability summary — high-level booleans + a count for each
    // primitive type. Detailed listings live behind tools/list and
    // resources/list on the live server.
    capabilities: {
      tools: { listChanged: false, count: listTools().length },
      resources: {
        listChanged: false,
        subscribe: false,
        count: listResources().length,
      },
      prompts: { count: 0 },
    },

    // Flat names list so an agent can match against capability without
    // having to call tools/list first. The descriptions/inputSchemas live
    // on the server only.
    tools: listTools().map((t) => ({ name: t.name, description: t.description })),
    resources: listResources().map((r) => ({
      uri: r.uri,
      name: r.name,
      mimeType: r.mimeType,
    })),

    // Auth posture — explicit so a polite client doesn't guess.
    authentication: {
      type: "none",
      note: "Endpoint is open. No tokens accepted; sending Authorization is a no-op.",
    },

    // Pointer back to the human-facing docs.
    documentation: {
      site: SITE_URL,
      agentIndex: `${SITE_URL}/.well-known/agent-index.json`,
      llmsTxt: `${SITE_URL}/llms.txt`,
      discoveryDoc: `${SITE_URL}/docs/agent-discovery`,
    },
  };

  return new Response(JSON.stringify(card, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
