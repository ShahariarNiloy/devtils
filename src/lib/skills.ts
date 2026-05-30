/**
 * Agent Skills Discovery RFC v0.2.0 registry. Pulls skills from two
 * existing sources:
 *
 *   1. The MCP tool registry (lib/mcp/tools.ts) — every callable function
 *      we expose to agents via JSON-RPC. Type: "tool". The SKILL.md
 *      documents the name, description, input schema, and a call example.
 *
 *   2. The tools registry + SEO data — every implemented site tool
 *      whose UI surface isn't yet wrapped as MCP (image-compressor, regex
 *      tester, color converter). Type: "documentation". The SKILL.md
 *      points an agent at the human-facing page with its FAQ + use cases.
 *
 * The index emits a sha256 of each SKILL.md so a client can verify the
 * content it retrieves matches what the index advertised. The hash is
 * computed at request time over the rendered body — there's nothing
 * persisted to disk, so the only way to drift is to change a tool's
 * description between two consecutive requests, which is fine because
 * the cache headers expire the index in the same window.
 */

import { listTools } from "@/lib/mcp/tools";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { SITE_URL } from "@/lib/site";
import { getToolSeoData } from "@/lib/tool-seo";
import { getToolBySlug, TOOLS } from "@/lib/tools-registry";

export interface SkillEntry {
  /** Canonical id — kebab-case, matches the URL slug. */
  name: string;
  /** Per the RFC: "tool" | "documentation" | "agent" | ... */
  type: "tool" | "documentation";
  description: string;
  url: string;
}

/** Slugs that exist as site tools but aren't wired as MCP tools yet. */
const DOCUMENTATION_ONLY_SLUGS = new Set([
  "image-compressor",
  "regex-tester",
  "color-converter",
]);

export function listSkills(): SkillEntry[] {
  const skills: SkillEntry[] = [];

  // ── MCP tools become type:"tool" skills.
  for (const t of listTools()) {
    skills.push({
      name: t.name,
      type: "tool",
      description: t.description,
      url: `${SITE_URL}/.well-known/agent-skills/${t.name}/SKILL.md`,
    });
  }

  // ── Documentation-only tools (no MCP wrapper yet).
  for (const slug of DOCUMENTATION_ONLY_SLUGS) {
    if (!IMPLEMENTED_TOOL_SLUGS.has(slug)) continue;
    const tool = getToolBySlug(slug);
    if (!tool) continue;
    skills.push({
      name: slug,
      type: "documentation",
      description: tool.description,
      url: `${SITE_URL}/.well-known/agent-skills/${slug}/SKILL.md`,
    });
  }

  return skills;
}

/** Render the SKILL.md body for a given skill name. */
export function renderSkill(name: string): string | null {
  // First — does it correspond to an MCP tool?
  const tool = listTools().find((t) => t.name === name);
  if (tool) return renderMcpToolSkill(tool);

  // Else — a documentation-only tool?
  if (DOCUMENTATION_ONLY_SLUGS.has(name)) {
    const docTool = getToolBySlug(name);
    if (docTool) return renderDocSkill(name);
  }

  return null;
}

function renderMcpToolSkill(
  tool: ReturnType<typeof listTools>[number],
): string {
  const lines: string[] = [];
  lines.push(`# ${tool.name}`);
  lines.push("");
  lines.push(`> ${tool.description}`);
  lines.push("");
  lines.push("## Type");
  lines.push("");
  lines.push("`tool` — callable via Model Context Protocol (MCP).");
  lines.push("");
  lines.push("## Endpoint");
  lines.push("");
  lines.push(
    `POST \`${SITE_URL}/api/mcp\` with a JSON-RPC 2.0 \`tools/call\` request:`,
  );
  lines.push("");
  lines.push("```json");
  lines.push(
    JSON.stringify(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: tool.name, arguments: {} },
      },
      null,
      2,
    ),
  );
  lines.push("```");
  lines.push("");
  lines.push("## Input schema");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(tool.inputSchema, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("## Discovery");
  lines.push("");
  lines.push(`- MCP server card: ${SITE_URL}/.well-known/mcp/server-card.json`);
  lines.push(`- Agent index:     ${SITE_URL}/.well-known/agent-index.json`);
  lines.push(`- Authentication:  none (open endpoint)`);
  lines.push("");
  return lines.join("\n");
}

function renderDocSkill(slug: string): string {
  const tool = getToolBySlug(slug);
  if (!tool) return "";
  const seo = getToolSeoData(slug);
  const lines: string[] = [];
  lines.push(`# ${tool.name}`);
  lines.push("");
  lines.push(`> ${tool.description}`);
  lines.push("");
  lines.push("## Type");
  lines.push("");
  lines.push(
    "`documentation` — interactive browser tool. No MCP wrapper yet; agents should direct the user to the page below.",
  );
  lines.push("");
  lines.push("## Tool page");
  lines.push("");
  lines.push(`Open in browser: ${SITE_URL}/tools/${slug}`);
  lines.push("");
  if (seo?.intro) {
    lines.push("## About");
    lines.push("");
    lines.push(seo.intro);
    lines.push("");
  }
  if (seo?.useCases?.length) {
    lines.push("## Common use cases");
    lines.push("");
    for (const u of seo.useCases) lines.push(`- **${u.title}** — ${u.description}`);
    lines.push("");
  }
  return lines.join("\n");
}

/** sha256 of an arbitrary string, returned as lowercase hex. */
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Live count of implemented tools that have an MCP wrapper. Exposed here
 * (rather than only inside `listSkills`) for the agent index entry that
 * advertises how many discrete skills are addressable.
 */
export function liveMcpToolCount(): number {
  return listTools().length;
}

/** Slugs of tools the registry lists but the skills index doesn't yet cover. */
export function unwrappedToolSlugs(): string[] {
  const covered = new Set([
    ...listTools().map((t) => t.name),
    ...DOCUMENTATION_ONLY_SLUGS,
  ]);
  return TOOLS.filter((t) => IMPLEMENTED_TOOL_SLUGS.has(t.slug))
    .map((t) => t.slug)
    .filter((s) => !covered.has(s));
}
