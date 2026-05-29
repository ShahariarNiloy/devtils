import { TOOLS } from "@/lib/tools-registry";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { SITE_URL } from "@/lib/site";

/**
 * llms.txt — emerging convention for AI-agent-readable site descriptions.
 * One Markdown document at /llms.txt that summarises the site and lists
 * the live tools with one-line descriptions and canonical URLs. Easier
 * for an assistant to summarise than scraping HTML, and direct evidence
 * of our posture toward AI integrations.
 *
 * Spec: https://llmstxt.org/
 */
export const dynamic = "force-static";

export function GET(): Response {
  const live = TOOLS.filter((t) => IMPLEMENTED_TOOL_SLUGS.has(t.slug));

  // Group live tools by category so the document mirrors the catalogue's
  // mental model rather than dumping a flat slug list.
  const byCategory = new Map<string, typeof live>();
  for (const t of live) {
    const arr = byCategory.get(t.category) ?? [];
    arr.push(t);
    byCategory.set(t.category, arr);
  }

  const lines: string[] = [
    "# devtils",
    "",
    "> Handcrafted developer utilities — JSON, encoding, text, image, regex, and more.",
    "> Every tool runs entirely in the browser. Nothing leaves your device.",
    "",
    "## About",
    "",
    `- Canonical origin: ${SITE_URL}`,
    `- Tool catalogue: ${SITE_URL}/tools`,
    `- Live tools: ${live.length}`,
    "- Stack: Next.js 16, React 19, TypeScript, Tailwind v4",
    "- Privacy: all conversions are local; no payload data leaves the browser.",
    "",
    "## Tools",
    "",
  ];

  for (const [category, tools] of byCategory) {
    lines.push(`### ${category}`, "");
    for (const t of tools) {
      lines.push(`- [${t.name}](${SITE_URL}/tools/${t.slug}): ${t.description}`);
    }
    lines.push("");
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // 1 hour cache + serve-stale-while-revalidate to keep edges warm.
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
