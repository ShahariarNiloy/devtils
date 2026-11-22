import { LIVE_SLUGS } from "./tools/live";
import { TOOLS } from "./tools/data";

/**
 * Which registry tools are live. Components are NOT imported here: this
 * module is used by server code (pages, llms.txt, MCP), and the per-tool
 * client code is loaded on demand by `components/tool-loaders.tsx` so each
 * tool page downloads only its own tool.
 */
export const IMPLEMENTED_TOOL_SLUGS: ReadonlySet<string> = new Set(LIVE_SLUGS);

/**
 * Live tool count — the number that user-facing badges should show so the
 * headline figure matches working capability (vs. the catalogue-wide
 * SHOWCASE / TOOL_COUNT, which includes coming-soon entries).
 */
export const LIVE_TOOL_COUNT = IMPLEMENTED_TOOL_SLUGS.size;

/**
 * Honest headline count for marketing copy: distinct live tools only. The
 * SEO alias routes (px-to-rem, rem-to-px, …) share one component, so they
 * count toward LIVE_TOOL_COUNT but aren't extra tools for a reader.
 */
export const DISTINCT_LIVE_TOOL_COUNT = TOOLS.filter(
  (t) => t.showcase && IMPLEMENTED_TOOL_SLUGS.has(t.slug),
).length;
