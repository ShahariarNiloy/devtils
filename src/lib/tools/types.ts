/**
 * Core types for the tools registry. Kept in a separate module so the
 * type-only graph doesn't pull in the 1,600-line TOOLS data array.
 *
 * Tier definitions:
 *  - 'free'  : Pure client-side, runs forever at $0 cost.
 *  - 'pro'   : Gated behind Pro subscription ($7/mo). Heavier tools or premium UX.
 *  - 'ai'    : Uses Anthropic API. Free tier gets 5/day; Pro gets unlimited.
 *
 * The `wasm` flag indicates the tool downloads a WASM binary on first use
 * (e.g. ffmpeg.wasm, pdf-lib heavy ops). Lazy-load these per-tool, never
 * upfront in the app shell.
 *
 * The `isNew` flag adds a "new" badge to the tool card — flip to false
 * after launch + 30 days.
 */

export type ToolCategory =
  | 'JSON'
  | 'Text'
  | 'Encoding'
  | 'Image'
  | 'PDF'
  | 'Code'
  | 'Design'
  | 'Calc'
  | 'Network'
  | 'Security'
  | 'Data'
  | 'Next.js'
  | 'React';

export type ToolTier = 'free' | 'pro' | 'ai';

export interface Tool {
  /** URL slug, kebab-case, used as /tools/[slug] */
  slug: string;
  /** Display name shown in cards, breadcrumbs, command palette */
  name: string;
  /** One-line description (≤80 chars), used on cards and SEO meta */
  description: string;
  /** Top-level category for sidebar grouping */
  category: ToolCategory;
  /** Pricing tier */
  tier: ToolTier;
  /** Lucide React icon name (kebab-case, will be camelCased on import) */
  icon: string;
  /** Searchable tags surfaced via the command palette */
  tags: string[];
  /** True if tool lazy-loads a WASM binary on first use */
  wasm?: boolean;
  /** True for tools added since the previous release */
  isNew?: boolean;
  /** True if tool should appear on the homepage "Popular this week" grid */
  featured?: boolean;
  /** Optional keyboard shortcut to open the tool (e.g. "g j") */
  shortcut?: string;
  /**
   * True if this tool is part of the curated launch set shown in the app.
   * Tools without this flag are registered but hidden from all listings,
   * browse pages, and the command palette until they are ready to ship.
   */
  showcase?: boolean;
  /**
   * Display rank within the showcase (1 = first). Each showcase tool must
   * have a unique value — gaps are fine, just keep numbers distinct so the
   * sort order is unambiguous and easy to adjust in one place.
   */
  order?: number;
}

/**
 * Visual metadata per category — drives the icon chip color, the corner
 * doodle stroke color, and which doodle component to render. All color
 * fields reference CSS variables defined in src/styles/globals.css.
 */
export interface CategoryMeta {
  /** Background color for the icon chip on tool cards */
  iconBg: string;
  /** Stroke color for the Lucide icon inside the chip */
  iconColor: string;
  /** Stroke color for the corner doodle SVG */
  doodleColor: string;
  /** Component name in src/components/doodles/ — must match the file's default export */
  doodleComponent: string;
  /** Display order in the sidebar / category strip */
  order: number;
}
