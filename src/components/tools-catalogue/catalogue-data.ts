/**
 * Data for the v2 /tools catalogue. Pure — no React. Runs on the server;
 * the client component receives the plain, serializable result.
 *
 * The registry stays the source of truth for which tools exist, their
 * category and whether they're live. This module adds the presentation the
 * v2 mockup defines per tool: a short glyph, a task tag for the filter
 * pills, a one-line description, and (for JSON converters) a short label.
 * A tool added to the registry without an entry here still shows up, with
 * a derived glyph and its registry description.
 */

import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { SHOWCASE_TOOLS, type Tool, type ToolCategory } from "@/lib/tools-registry";
import { COMING_NEXT } from "@/components/home/landing-data";
import { CATEGORY_TINT, type Tint } from "@/lib/tools/presentation";

import type { Task } from "./catalogue-types";
import { CATEGORY_GLYPH, TOOL_PRESENTATION as META } from "@/lib/tools/presentation";

export type { Task };

/** Panel order and header glyphs (JSON is the full-width panel). */
const PANEL_ORDER: ToolCategory[] = ["Text", "Calc", "Code", "Encoding", "Security", "Design", "SEO", "Image", "Network"];

export interface CatalogueRow {
  slug: string;
  name: string;
  glyph: string;
  desc: string;
  task: Task | null;
  live: boolean;
  /** Lower-cased text the search box matches against. */
  haystack: string;
  conv?: { dir: "out" | "in"; short: string };
}

export interface CatalogueSection {
  id: string;
  name: ToolCategory;
  glyph: string;
  tint: Tint;
  rows: CatalogueRow[];
}

function toRow(t: Tool): CatalogueRow {
  const m = META[t.slug];
  const desc = m?.desc ?? (m?.conv ? "" : t.description);
  return {
    slug: t.slug,
    name: t.name,
    glyph: m?.glyph ?? t.name.slice(0, 2),
    desc,
    task: m?.task ?? null,
    live: IMPLEMENTED_TOOL_SLUGS.has(t.slug),
    haystack: `${t.name} ${desc} ${t.category} ${m?.conv?.short ?? ""} ${t.tags.join(" ")}`.toLowerCase(),
    conv: m?.conv,
  };
}

const sectionFor = (cat: ToolCategory): CatalogueSection => ({
  id: cat.toLowerCase().replace(/\./g, "-"),
  name: cat,
  glyph: CATEGORY_GLYPH[cat] ?? cat.slice(0, 2),
  tint: CATEGORY_TINT[cat],
  rows: SHOWCASE_TOOLS.filter((t) => t.category === cat).map(toRow),
});

/** Converter chips follow META's order (most-used targets first). */
const META_ORDER = Object.keys(META);
const jsonBase = sectionFor("JSON");
export const JSON_SECTION: CatalogueSection = {
  ...jsonBase,
  // Plain rows keep registry order; converters come after, in META order.
  rows: jsonBase.rows
    .map((r, i) => ({ r, key: r.conv ? 1000 + META_ORDER.indexOf(r.slug) : i }))
    .sort((a, b) => a.key - b.key)
    .map(({ r }) => r),
};

/** Remaining categories with at least one catalogued tool, in mockup order. */
const extraCats = [...new Set(SHOWCASE_TOOLS.map((t) => t.category))].filter(
  (c) => c !== "JSON" && !PANEL_ORDER.includes(c),
);
export const OTHER_SECTIONS: CatalogueSection[] = [...PANEL_ORDER, ...extraCats]
  .map(sectionFor)
  .filter((s) => s.rows.length > 0);

export const TOTAL = SHOWCASE_TOOLS.length;
export const LIVE = SHOWCASE_TOOLS.filter((t) => IMPLEMENTED_TOOL_SLUGS.has(t.slug)).length;

export interface FeaturedCard {
  slug: string;
  name: string;
  glyph: string;
  desc: string;
  tint: Tint;
}
export const MOST_USED: FeaturedCard[] = [
  { slug: "json-formatter", name: "JSON formatter", glyph: "{}", desc: "Format and validate", tint: "clay" },
  { slug: "json-to-typescript", name: "JSON → TypeScript", glyph: "TS", desc: "Types from any payload", tint: "teal" },
  { slug: "regex-tester", name: "Regex tester", glyph: ".*", desc: "Live match highlighting", tint: "sage" },
  { slug: "jwt-decoder", name: "JWT decoder", glyph: "JWT", desc: "Decode tokens safely", tint: "rose" },
];

export const ROADMAP = COMING_NEXT.map((c) => c.name);
