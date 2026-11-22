/**
 * Static content for the v2 landing page. Pure data — no React.
 *
 * The showcase tools use the short marketing labels and code samples from
 * the v2 mockup, but every entry links to a real registry slug and is
 * validated against the registry at module load, so a renamed or removed
 * tool fails the build instead of shipping a dead link.
 */

import { CATEGORIES, getToolBySlug, TOOL_COUNT, TOOLS } from "@/lib/tools-registry";
import { DISTINCT_LIVE_TOOL_COUNT, IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import type { ToolCategory } from "@/lib/tools-registry";

export type { Tint } from "@/lib/tools/presentation";
export { CATEGORY_TINT } from "@/lib/tools/presentation";
import { CATEGORY_TINT, type Tint } from "@/lib/tools/presentation";

export type ShowcaseGroup = "code" | "text" | "design";

export interface ShowcaseTool {
  slug: string;
  name: string;
  glyph: string;
  cat: string;
  group: ShowcaseGroup;
  tint: Tint;
  desc: string;
  sample: string;
}

const SHOWCASE: ShowcaseTool[] = [
  {
    slug: "json-formatter", name: "JSON Formatter", glyph: "{}", cat: "JSON", group: "code", tint: "clay",
    desc: "Format, validate, query",
    sample: '{\n  "tool": "utilyx",\n  "private": true,\n  "tools": 23,\n  "server": null\n}',
  },
  {
    slug: "json-to-typescript", name: "JSON → TypeScript", glyph: "TS", cat: "Code", group: "code", tint: "teal",
    desc: "Infer types from JSON",
    sample: "interface Tool {\n  tool: string;\n  private: boolean;\n  tools: number;\n  server: null;\n}",
  },
  {
    slug: "regex-tester", name: "Regex Tester", glyph: ".*", cat: "Text", group: "text", tint: "sage",
    desc: "Live match highlighting",
    sample: "/^(\\w+)@(\\w+)\\.dev$/gm\n\nhello@utilyx.dev   ✓ match\nteam@utilyx.dev    ✓ match\nnot-an-email       ✗",
  },
  {
    slug: "base64", name: "Base64", glyph: "64", cat: "Encoding", group: "text", tint: "rose",
    desc: "Encode and decode",
    sample: "in   hello, utilyx\nout  aGVsbG8sIHV0aWx5eA==\n\n↺ decode  ·  copy ⌘C",
  },
  {
    slug: "jwt-decoder", name: "JWT Decoder", glyph: "JWT", cat: "Security", group: "design", tint: "clay",
    desc: "Header, payload, signature",
    sample: 'header   { alg: HS256 }\npayload  { sub: "1234",\n           name: "Ada" }\nsig      not verified\nsent     0 bytes',
  },
  {
    slug: "color-converter", name: "Color Converter", glyph: "#", cat: "Design", group: "design", tint: "teal",
    desc: "HEX, RGB, HSL, OKLCH",
    sample: "HEX    #C58E5E\nRGB    197 142 94\nHSL    28 47% 57%\nOKLCH  0.69 0.08 60",
  },
];

for (const t of SHOWCASE) {
  if (!getToolBySlug(t.slug) || !IMPLEMENTED_TOOL_SLUGS.has(t.slug)) {
    throw new Error(`Landing showcase references "${t.slug}", which is not a live tool.`);
  }
}

export const SHOWCASE_TOOLS_V2: readonly ShowcaseTool[] = SHOWCASE;

/**
 * Honest counts. "Live" counts real implemented tools — the SEO alias
 * routes (px-to-rem, rem-to-px, …) share one component and aren't extra
 * tools, so they're excluded by keeping only showcase registry entries.
 */
const liveTools = TOOLS.filter((t) => t.showcase && IMPLEMENTED_TOOL_SLUGS.has(t.slug));
export const LIVE_COUNT = DISTINCT_LIVE_TOOL_COUNT;
export const CATALOGUE_COUNT = TOOL_COUNT;
export const CATEGORY_COUNT = CATEGORIES.length;

/** Categories with nothing shipped yet → the "Coming next" panel. */
const COMING_META: Partial<Record<ToolCategory, { glyph: string; blurb: string }>> = {
  PDF: { glyph: "¶", blurb: "Merge, split, compress — locally" },
  Data: { glyph: "▦", blurb: "CSV and data wrangling" },
  "Next.js": { glyph: "▲", blurb: "Framework helpers" },
  React: { glyph: "⚛", blurb: "Component utilities" },
};
/**
 * Only categories with a written blurb are featured (the panel is a 2×2
 * grid), and a category drops out automatically once it has a live tool.
 */
export const COMING_NEXT = CATEGORIES.flatMap((c) => {
  const meta = COMING_META[c];
  if (!meta || liveTools.some((t) => t.category === c)) return [];
  return [{ name: c, tint: CATEGORY_TINT[c], glyph: meta.glyph, blurb: meta.blurb }];
});

export const LANDING_FAQ: { q: string; a: string }[] = [
  {
    q: "Is my data really private?",
    a: "Yes. Every tool runs entirely in your browser. Nothing you paste is uploaded, logged or stored.",
  },
  { q: "Is it free?", a: "The core tools are free, forever." },
  { q: "Do I need an account?", a: "No. Open a tool and use it." },
  {
    q: "Does it work offline?",
    a: "Yes. Once a tool has loaded, it keeps working without a connection.",
  },
  {
    q: "Can I paste tokens or keys?",
    a: "That's what it's built for. Processing happens locally, so secrets stay on your machine.",
  },
];

export const GHOST_KEYS = ["esc", "1", "2", "3", "4", "5", "⇥", "Q", "W", "E", "R", "T", "⇪", "A", "S", "D", "F", "G", "⇧", "Z", "X", "C", "V", "B"];
