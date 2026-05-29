/**
 * Renders the site's pages as Markdown for the agent-content-negotiation
 * path (Accept: text/markdown). The body of each page is reconstructed
 * from the same typed sources the HTML views read from — tools registry,
 * `tool-seo`, changelog — so the Markdown response stays in lockstep with
 * the visible content automatically. No DOM scraping, no headless browser.
 *
 * The functions return raw Markdown strings; the caller wraps them in a
 * `Response` with the right `Content-Type` + `x-markdown-tokens` headers.
 */

import { CHANGELOG } from "./changelog";
import {
  IMPLEMENTED_TOOL_SLUGS,
  LIVE_TOOL_COUNT,
} from "./implemented-tools";
import { SITE_URL } from "./site";
import { getToolSeoData } from "./tool-seo";
import {
  CATEGORIES,
  getToolBySlug,
  TOOLS,
  type Tool,
} from "./tools-registry";

/** Estimate token count for the `x-markdown-tokens` header. */
export function estimateTokens(text: string): number {
  // Rough: ~4 chars per token across English Markdown. Good enough as a
  // budgeting hint for agents — not a billing-accurate count.
  return Math.ceil(text.length / 4);
}

function fmt(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Tool page → Markdown. */
export function renderToolMarkdown(slug: string): string | null {
  const tool = getToolBySlug(slug);
  if (!tool) return null;
  const isLive = IMPLEMENTED_TOOL_SLUGS.has(slug);
  const seo = getToolSeoData(slug);
  const url = `${SITE_URL}/tools/${slug}`;

  const lines: string[] = [];
  lines.push(`# ${tool.name}`);
  lines.push("");
  lines.push(`> ${fmt(tool.description)}`);
  lines.push("");

  // Frontmatter-ish key/value block in a code fence so it stays
  // machine-readable but doesn't clutter prose readers.
  lines.push("```");
  lines.push(`url:         ${url}`);
  lines.push(`category:    ${tool.category}`);
  lines.push(`tier:        ${tool.tier}`);
  lines.push(`status:      ${isLive ? "live" : "coming-soon"}`);
  lines.push(`tags:        ${tool.tags.join(", ")}`);
  if (tool.wasm) lines.push(`runtime:     WebAssembly`);
  lines.push(`processing:  client-side (browser only)`);
  lines.push("```");
  lines.push("");

  if (seo?.intro) {
    lines.push("## About");
    lines.push("");
    lines.push(seo.intro);
    lines.push("");
  }

  if (seo?.useCases && seo.useCases.length > 0) {
    lines.push("## Common use cases");
    lines.push("");
    for (const u of seo.useCases) {
      lines.push(`### ${u.title}`);
      lines.push("");
      lines.push(u.description);
      lines.push("");
    }
  }

  if (seo?.faqs && seo.faqs.length > 0) {
    lines.push("## Frequently asked");
    lines.push("");
    for (const f of seo.faqs) {
      lines.push(`### ${f.question}`);
      lines.push("");
      lines.push(f.answer);
      lines.push("");
    }
  }

  if (seo?.relatedSlugs && seo.relatedSlugs.length > 0) {
    lines.push("## Related tools");
    lines.push("");
    for (const related of seo.relatedSlugs) {
      const rt = getToolBySlug(related);
      if (!rt) continue;
      lines.push(
        `- [${rt.name}](${SITE_URL}/tools/${related}) — ${fmt(rt.description)}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

/** /tools index → Markdown. */
export function renderToolsIndexMarkdown(): string {
  const lines: string[] = [];
  lines.push("# All tools");
  lines.push("");
  lines.push(
    `> Browse the full devtils catalogue. ${LIVE_TOOL_COUNT} live, ${
      TOOLS.filter((t) => t.showcase).length - LIVE_TOOL_COUNT
    } coming soon. Every tool runs entirely in the browser.`,
  );
  lines.push("");
  lines.push(`Catalogue URL: ${SITE_URL}/tools`);
  lines.push("");

  const byCat = new Map<string, Tool[]>();
  for (const t of TOOLS) {
    if (!t.showcase) continue;
    const arr = byCat.get(t.category) ?? [];
    arr.push(t);
    byCat.set(t.category, arr);
  }

  for (const category of CATEGORIES) {
    const list = byCat.get(category);
    if (!list?.length) continue;
    lines.push(`## ${category}`);
    lines.push("");
    for (const t of list) {
      const isLive = IMPLEMENTED_TOOL_SLUGS.has(t.slug);
      const status = isLive ? "live" : "soon";
      lines.push(
        `- [${t.name}](${SITE_URL}/tools/${t.slug}) (${status}) — ${fmt(t.description)}`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

/** Homepage → Markdown summary. */
export function renderHomeMarkdown(): string {
  const lines: string[] = [];
  lines.push("# devtils — handcrafted developer utilities");
  lines.push("");
  lines.push(
    "> Format JSON, convert text cases, encode Base64, test regex, convert colors, and more. Every tool runs entirely in your browser. Nothing leaves your device.",
  );
  lines.push("");
  lines.push(`Site: ${SITE_URL}`);
  lines.push(`Catalogue: ${SITE_URL}/tools`);
  lines.push(`Live tools: ${LIVE_TOOL_COUNT}`);
  lines.push("");

  lines.push("## What's here");
  lines.push("");
  lines.push(
    `- ${LIVE_TOOL_COUNT} working developer utilities across categories: ${CATEGORIES.join(", ")}.`,
  );
  lines.push("- Per-tool documentation with intro, use cases, FAQ.");
  lines.push(
    "- Static-generated pages, syntax-highlighted overlay editor, off-main-thread conversion for large inputs.",
  );
  lines.push("");

  lines.push("## Privacy");
  lines.push("");
  lines.push(
    "Every tool runs client-side. Inputs and outputs never reach our servers, never appear in logs, never leave your device.",
  );
  lines.push("");

  lines.push("## Discovery");
  lines.push("");
  lines.push("- [llms.txt — full machine-readable catalogue](" + SITE_URL + "/llms.txt)");
  lines.push("- [Sitemap](" + SITE_URL + "/sitemap.xml)");
  lines.push("- [Agent index (JSON)](" + SITE_URL + "/.well-known/agent-index.json)");
  lines.push("- [Changelog](" + SITE_URL + "/changelog)");
  lines.push("");

  return lines.join("\n");
}

/** /changelog → Markdown. */
export function renderChangelogMarkdown(): string {
  const lines: string[] = [];
  lines.push("# Changelog");
  lines.push("");
  lines.push("> Recent devtils releases, newest first.");
  lines.push("");
  for (const entry of CHANGELOG) {
    lines.push(`## ${entry.date} — ${entry.title}`);
    lines.push("");
    for (const h of entry.highlights) {
      lines.push(`- ${h}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** Generic page → Markdown (privacy / terms / contact / not-found). */
export function renderGenericPageMarkdown(path: string): string | null {
  switch (path) {
    case "/privacy":
      return [
        "# Privacy",
        "",
        "> Every tool runs in your browser. Nothing you paste, type, or upload reaches our servers.",
        "",
        "## What we don't collect",
        "",
        "- Tool inputs (JSON you paste, regex patterns, images, etc.)",
        "- Tool outputs",
        "- Behavioural tracking (no analytics, no cookies, no third-party tags)",
        "",
        "## What we do collect",
        "",
        "Standard web-server access logs (request path, status code, user agent, IP). Retained 30 days, never linked to identity.",
        "",
        "## Third parties",
        "",
        "Hosting provider + Google Fonts for typography. No analytics, no ads, no behavioural profilers.",
        "",
        `Canonical: ${SITE_URL}/privacy`,
        "",
      ].join("\n");

    case "/terms":
      return [
        "# Terms of service",
        "",
        "> devtils is provided as-is. The tools work as documented to the best of our ability, but we make no warranty of fitness for any particular purpose.",
        "",
        "## Use",
        "",
        "Use the site lawfully. Don't use the tools to process data you don't have the right to process. Don't use automated scrapers to exfiltrate the catalogue.",
        "",
        "## Liability",
        "",
        "To the extent permitted by law, we're not liable for damages arising from use of the site.",
        "",
        `Canonical: ${SITE_URL}/terms`,
        "",
      ].join("\n");

    case "/contact":
      return [
        "# Contact",
        "",
        "> Bug reports, feature requests, and ideas for the catalogue are all welcome.",
        "",
        "- Email: hello@devtils.com",
        "- Issue tracker: https://github.com/devtils/devtils/issues",
        "",
        `Canonical: ${SITE_URL}/contact`,
        "",
      ].join("\n");

    default:
      return null;
  }
}
