/**
 * DevToolbox — Tools Registry (barrel).
 *
 * The registry was split into:
 *   - `tools/types.ts`         — Tool / ToolCategory / ToolTier / CategoryMeta
 *   - `tools/data.ts`          — the TOOLS data array (the big one)
 *   - `tools/category-meta.ts` — CATEGORY_META visual data
 *   - `tools/queries.ts`       — derived constants + query helpers
 *
 * Importers can continue to use `@/lib/tools-registry` unchanged — this
 * barrel exposes the same surface. New consumers should reach into the
 * specific submodule for narrower bundle graphs.
 */

export type {
  Tool,
  ToolCategory,
  ToolTier,
  CategoryMeta,
} from "./tools/types";

export { TOOLS } from "./tools/data";

export { CATEGORY_META } from "./tools/category-meta";

export {
  SHOWCASE_TOOLS,
  TOOL_COUNT,
  CATEGORIES,
  CATEGORY_COUNTS,
  TIER_COUNTS,
  getToolBySlug,
  getToolsByCategory,
  getToolsByTier,
  getNewTools,
  getFeaturedTools,
  getCategoryMeta,
  getRelatedTools,
  searchTools,
  groupToolsAlphabetically,
} from "./tools/queries";
