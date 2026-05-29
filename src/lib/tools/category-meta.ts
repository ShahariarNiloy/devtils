/**
 * Visual + design-system metadata per category. Drives:
 *  - Icon chip background color on tool cards
 *  - Lucide icon stroke color inside the chip
 *  - Corner doodle stroke color
 *  - Which doodle component to render (stringly-typed name resolved by
 *    `doodle-registry.ts` — a planned tightening is to move that lookup
 *    into typed references)
 *  - Sidebar / category strip ordering
 *
 * All color values are CSS variable references — defined in globals.css.
 */

import type { CategoryMeta, ToolCategory } from "./types";

export const CATEGORY_META: Record<ToolCategory, CategoryMeta> = {
  JSON: {
    iconBg: 'var(--color-surface-tint)',
    iconColor: 'var(--color-terracotta)',
    doodleColor: 'var(--color-terracotta)',
    doodleComponent: 'JsonDoodle',
    order: 1,
  },
  Text: {
    iconBg: 'var(--color-cream)',
    iconColor: 'var(--color-terracotta-deep)',
    doodleColor: 'var(--color-terracotta-deep)',
    doodleComponent: 'TextDoodle',
    order: 2,
  },
  Encoding: {
    iconBg: 'var(--color-surface-tint)',
    iconColor: 'var(--color-terracotta)',
    doodleColor: 'var(--color-terracotta)',
    doodleComponent: 'EncodingDoodle',
    order: 3,
  },
  Image: {
    iconBg: 'var(--color-cream)',
    iconColor: 'var(--color-terracotta-deep)',
    doodleColor: 'var(--color-amber)',
    doodleComponent: 'ImageDoodle',
    order: 4,
  },
  PDF: {
    iconBg: 'var(--color-cream)',
    iconColor: 'var(--color-terracotta-deep)',
    doodleColor: 'var(--color-terracotta-deep)',
    doodleComponent: 'PdfDoodle',
    order: 5,
  },
  Code: {
    iconBg: 'var(--color-sage)',
    iconColor: 'var(--color-sage-deep)',
    doodleColor: 'var(--color-sage-deep)',
    doodleComponent: 'CodeDoodle',
    order: 6,
  },
  Design: {
    iconBg: 'var(--color-sage)',
    iconColor: 'var(--color-sage-deep)',
    doodleColor: 'var(--color-sage-deep)',
    doodleComponent: 'DesignDoodle',
    order: 7,
  },
  Calc: {
    iconBg: 'var(--color-surface-tint)',
    iconColor: 'var(--color-terracotta)',
    doodleColor: 'var(--color-terracotta)',
    doodleComponent: 'CalcDoodle',
    order: 8,
  },
  Network: {
    iconBg: 'var(--color-cream)',
    iconColor: 'var(--color-terracotta-deep)',
    doodleColor: 'var(--color-terracotta-deep)',
    doodleComponent: 'NetworkDoodle',
    order: 9,
  },
  Security: {
    iconBg: 'var(--color-surface-tint)',
    iconColor: 'var(--color-terracotta)',
    doodleColor: 'var(--color-terracotta)',
    doodleComponent: 'SecurityDoodle',
    order: 10,
  },
  Data: {
    iconBg: 'var(--color-cream)',
    iconColor: 'var(--color-terracotta-deep)',
    doodleColor: 'var(--color-terracotta-deep)',
    doodleComponent: 'DataDoodle',
    order: 11,
  },
  'Next.js': {
    iconBg: 'var(--color-surface-tint)',
    iconColor: 'var(--color-terracotta)',
    doodleColor: 'var(--color-terracotta)',
    doodleComponent: 'NextDoodle',
    order: 12,
  },
  React: {
    iconBg: 'var(--color-sage)',
    iconColor: 'var(--color-sage-deep)',
    doodleColor: 'var(--color-sage-deep)',
    doodleComponent: 'ReactDoodle',
    order: 13,
  },
};

/** All categories present, ordered by CATEGORY_META.order (drives sidebar) */
export const CATEGORIES: ToolCategory[] = (
  Object.keys(CATEGORY_META) as ToolCategory[]
).sort((a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order);
