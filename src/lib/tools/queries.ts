/**
 * Derived constants + query helpers over the tools registry. Pure
 * functions of TOOLS + CATEGORY_META — no state, no side effects.
 */

import { CATEGORY_META } from "./category-meta";
import { TOOLS } from "./data";
import type { CategoryMeta, Tool, ToolCategory, ToolTier } from "./types";

/** Tools in the curated launch set — the only ones shown in the app UI. */
export const SHOWCASE_TOOLS: Tool[] = TOOLS
  .filter((t) => t.showcase)
  .sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return 0;
  });

/** Total showcased catalogue size — what the index page surfaces. */
export const TOOL_COUNT = SHOWCASE_TOOLS.length;

/** All categories present, ordered by CATEGORY_META.order (drives sidebar). */
export const CATEGORIES: ToolCategory[] = (
  Object.keys(CATEGORY_META) as ToolCategory[]
).sort((a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order);

/** Counts per category for sidebar badges (showcase tools only). */
export const CATEGORY_COUNTS: Record<ToolCategory, number> = CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat] = SHOWCASE_TOOLS.filter((t) => t.category === cat).length;
    return acc;
  },
  {} as Record<ToolCategory, number>,
);

/** Counts per tier for stats and pricing page (showcase tools only). */
export const TIER_COUNTS: Record<ToolTier, number> = {
  free: SHOWCASE_TOOLS.filter((t) => t.tier === "free").length,
  pro: SHOWCASE_TOOLS.filter((t) => t.tier === "pro").length,
  ai: SHOWCASE_TOOLS.filter((t) => t.tier === "ai").length,
};

/** Find a tool by its URL slug. Searches all tools (including non-showcase). */
export function getToolBySlug(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

/** Showcase tools in a given category, preserving alphabetical order. */
export function getToolsByCategory(category: ToolCategory): Tool[] {
  return SHOWCASE_TOOLS.filter((t) => t.category === category);
}

/** Showcase tools in a given tier. */
export function getToolsByTier(tier: ToolTier): Tool[] {
  return SHOWCASE_TOOLS.filter((t) => t.tier === tier);
}

/** Showcase tools flagged as new — for the "Recently added" section on home. */
export function getNewTools(): Tool[] {
  return SHOWCASE_TOOLS.filter((t) => t.isNew);
}

/** Featured tools for the homepage "Popular this week" grid. */
export function getFeaturedTools(): Tool[] {
  return SHOWCASE_TOOLS.filter((t) => t.featured);
}

/** Visual metadata (icon colors + doodle component) for a category. */
export function getCategoryMeta(category: ToolCategory): CategoryMeta {
  return CATEGORY_META[category];
}

/**
 * Tools related to the given one — same category, excluding itself.
 * Used on tool pages for cross-promotion / "you might also like".
 */
export function getRelatedTools(slug: string, limit = 4): Tool[] {
  const tool = getToolBySlug(slug);
  if (!tool) return [];
  return SHOWCASE_TOOLS.filter(
    (t) => t.slug !== slug && t.category === tool.category,
  ).slice(0, limit);
}

/**
 * Fuzzy search across name, description, and tags. Case-insensitive.
 * Searches showcase tools only — used by the cmdk command palette.
 */
export function searchTools(query: string): Tool[] {
  const q = query.toLowerCase().trim();
  if (!q) return SHOWCASE_TOOLS;
  return SHOWCASE_TOOLS.filter((t) => {
    if (t.name.toLowerCase().includes(q)) return true;
    if (t.description.toLowerCase().includes(q)) return true;
    if (t.category.toLowerCase().includes(q)) return true;
    if (t.tags.some((tag) => tag.toLowerCase().includes(q))) return true;
    return false;
  });
}

/** Group showcase tools by first letter — for the A-Z explorer view. */
export function groupToolsAlphabetically(): Record<string, Tool[]> {
  return SHOWCASE_TOOLS.reduce(
    (acc, tool) => {
      const letter = tool.name[0].toUpperCase();
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(tool);
      return acc;
    },
    {} as Record<string, Tool[]>,
  );
}
