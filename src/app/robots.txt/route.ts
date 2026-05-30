import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * robots.txt with Content-Signal directives (draft-romm-aipref-contentsignals,
 * contentsignals.org). Switched from the Next.js `MetadataRoute.Robots`
 * helper to a raw route because the helper's type doesn't accept arbitrary
 * directives — Content-Signal lives outside the classic crawler-rules
 * grammar and would be stripped.
 *
 * Our posture, set explicitly so it's visible in audits:
 *
 *   - `search=yes`     The site is meant to be findable. Standard search
 *                      indexing is the primary acquisition channel.
 *   - `ai-input=yes`   Agents are welcome to read the content to answer
 *                      user questions. Recommending a tool to a
 *                      user is the kind of agent behaviour the catalogue
 *                      exists to enable. The site already ships llms.txt
 *                      + /.well-known/agent-index.json explicitly for
 *                      this use case.
 *   - `ai-train=no`    The tool descriptions, FAQs, and code samples are
 *                      hand-written. We're not opting them into training
 *                      datasets — agents can read and cite the content,
 *                      they just shouldn't bake it into model weights.
 *
 * AI crawlers are also explicitly allowlisted in the classic block below
 * so a robot ignoring Content-Signal still has authorisation to fetch.
 */
export const dynamic = "force-static";

export function GET(): Response {
  const body = [
    `# ${SITE_NAME} — robots.txt`,
    "#",
    "# Content-Signal directives describe permission for distinct uses of",
    "# this content. See https://contentsignals.org/ and",
    "# draft-romm-aipref-contentsignals for the spec.",
    "",
    "Content-Signal: search=yes, ai-input=yes, ai-train=no",
    "",
    "User-agent: *",
    "Allow: /",
    "Disallow: /tools?",
    "Disallow: /api/",
    "",
    "# Named AI crawlers — listed explicitly so the posture is obvious in",
    "# automated audits, even though they'd fall through to `*` anyway.",
    "User-agent: GPTBot",
    "Content-Signal: search=yes, ai-input=yes, ai-train=no",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Content-Signal: search=yes, ai-input=yes, ai-train=no",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Content-Signal: search=yes, ai-input=yes, ai-train=no",
    "Allow: /",
    "",
    "User-agent: Google-Extended",
    "Content-Signal: search=yes, ai-input=yes, ai-train=no",
    "Allow: /",
    "",
    "User-agent: CCBot",
    "Content-Signal: search=yes, ai-input=yes, ai-train=no",
    "Allow: /",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    `Host: ${SITE_URL}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
