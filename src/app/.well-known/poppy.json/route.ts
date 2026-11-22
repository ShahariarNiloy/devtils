import { SITE_DOMAIN, SITE_NAME } from "@/lib/site";

/**
 * Personal Agent Protocol (draft 0.1) discovery, website-only form:
 * https://personalagentprotocol.org/docs/spec#3-discovery
 *
 * Declares only what exists — a public website. No `agent`/`apis` entries
 * and no `auth`: those require an OAuth issuer with sessions, and the site
 * deliberately has no sign-in (the MCP API at /api/mcp is public). Add them
 * only alongside a working authorization server.
 */
export const dynamic = "force-static";

export function GET(): Response {
  return Response.json(
    {
      protocol_version: "0.1",
      organization: { name: SITE_NAME, domain: SITE_DOMAIN },
      web: {},
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
