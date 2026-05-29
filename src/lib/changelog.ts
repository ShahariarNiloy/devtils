/**
 * Hand-curated changelog. Each entry has a date (sortable ISO),
 * one-line headline, and 2-5 highlight bullets. Add new releases at the
 * top — the page renders them in reverse-chronological order.
 *
 * Lives as a data file rather than markdown so the rendering layer can
 * stay strict TypeScript and the structured data (Article / SoftwareApp
 * version) stays straightforward to emit per release.
 */

export interface ChangelogEntry {
  /** ISO date — the release / batch the entry covers. */
  date: string;
  /** Short title for the section heading. */
  title: string;
  /** 2–6 highlights, plain prose lines. */
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-05-29",
    title: "Catalogue browser + SEO foundation",
    highlights: [
      "New sectioned-by-category /tools layout with a sticky left rail and scroll-spy navigation.",
      "Per-tool SEO content blocks (intro + use cases + FAQ + related tools) on every implemented tool.",
      "JSON-LD: WebApplication, BreadcrumbList, FAQPage, and HowTo schemas emitted per tool.",
      "Dynamic OpenGraph images at /tools/[slug]/opengraph-image.tsx, sitemap.ts, robots.ts, llms.txt.",
      "Per-tool URL state for options so shared links restore the exact configuration.",
    ],
  },
  {
    date: "2026-05-28",
    title: "JSON converter family",
    highlights: [
      "Nine new dedicated tools: JSON → TypeScript, Zod, Go, Python, Rust, CSV, YAML, XML, Schema.",
      "Singularization for plural array names (`users: User[]`, not `users: UsersItem[]`).",
      "Bidirectional YAML ↔ JSON and CSV ↔ JSON with in-place direction swap.",
      "Worker-offloaded conversion for inputs above 50KB so typing never blocks.",
    ],
  },
  {
    date: "2026-05-26",
    title: "JSON formatter refresh",
    highlights: [
      "Children-first declaration order for TypeScript output.",
      "Codegen pipeline rebuilt on a shared schema IR with proper nullable detection and structural dedup.",
      "Per-tool keyboard shortcuts overlay (press `?` to bring it up).",
      "WCAG AA contrast pass — text-faint and clay accents darkened.",
    ],
  },
  {
    date: "2026-05-22",
    title: "Timestamp converter",
    highlights: [
      "ISO 8601, Unix epoch (s / ms / µs), and RFC 2822 in one workspace.",
      "Timezone search backed by the browser's IANA database.",
      "Code snippets per timestamp for JS / Python / Go / Rust / SQL / shell.",
    ],
  },
  {
    date: "2026-05-15",
    title: "Image compressor",
    highlights: [
      "JPEG, PNG, WebP, AVIF encoded via the original reference encoders compiled to WebAssembly.",
      "Side-by-side reveal slider so quality loss is visible at a glance.",
      "ICC profile preserved by default — output colours stay true to the source.",
    ],
  },
];
