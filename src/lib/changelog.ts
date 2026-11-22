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
  /** Badge on the landing "Always shipping" list. */
  kind?: "new" | "improved";
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-11-22",
    title: "PDF tools",
    kind: "new",
    highlights: [
      "Six new tools: Merge PDF, Split PDF, Compress PDF, Sign PDF, Image to PDF and PDF to image — all in your browser, nothing uploaded.",
      "Built for big files: a 3,000-page PDF opens in under a second, and a 280 MB PDF merges, splits and signs without freezing the page.",
      "Sign with a drawn, typed or uploaded signature, plus initials, dates and ticks; drag-to-reveal comparison before you download a compressed PDF.",
      "Image to PDF takes JPG, PNG, WebP and iPhone HEIC in any browser, turns sideways photos upright, and keeps colour profiles and screenshot sharpness.",
      "PDF to image exports PNG, JPG or WebP at 72–300 DPI, with transparent backgrounds and a size estimate from a real render.",
    ],
  },
  {
    date: "2026-11-22",
    title: "cURL converter",
    kind: "new",
    highlights: [
      "Turn any curl command into fetch, axios, Python requests, Go net/http or PHP Guzzle.",
      "cURL generator builds a command from a form, for bash, cmd or PowerShell.",
      "Handles the awkward flags — -G, --data-urlencode, -u, file uploads, cookies — and says what it can't translate.",
    ],
  },
  {
    date: "2026-11-22",
    title: "Blog, RSS and blur placeholders",
    kind: "new",
    highlights: [
      "A blog with deep dives on image formats, JSON, timestamps, URL encoding, hreflang and more — with an RSS feed.",
      "Blur placeholder tool: LQIP data URLs for next/image and CSS, plus ThumbHash and BlurHash.",
      "Search-friendly titles and descriptions for every tool and post.",
    ],
  },
  {
    date: "2026-11-21",
    title: "New look and 19 new tools",
    kind: "new",
    highlights: [
      "Ten developer tools: UUID/ULID, cron parser, password generator, YAML → JSON, CSV → JSON, Markdown preview, word counter, URL encoder, HTML entities and URL parser.",
      "Nine SEO tools: three hreflang tools, canonical URLs, robots.txt, sitemap validator, Open Graph, meta preview and JSON-LD.",
      "JSON formatter v2: lossless big-number formatting, JSON Schema validation, and a problem banner with one-click repair.",
      "A new ⌘K palette with scopes, recents and actions, and a shortcuts sheet that only lists shortcuts that work.",
    ],
  },
  {
    date: "2026-06-05",
    title: "Safer JSON repair",
    kind: "improved",
    highlights: [
      "Repairs are previewed with a risk rating before they're applied, and can be applied inline.",
      "Image compressor spots CMYK JPEGs and warns before their colours could shift.",
    ],
  },
  {
    date: "2026-06-01",
    title: "JSON diff",
    kind: "new",
    highlights: [
      "Compare two JSON documents as a tree, side by side, or as a JSON Patch.",
      "Differences are structural, so key order and formatting don't count as changes.",
    ],
  },
  {
    date: "2026-05-31",
    title: "CSS unit converter",
    kind: "new",
    highlights: [
      "Convert between px, rem, em, %, vw, vh and pt.",
      "A clamp() builder for fluid type and spacing.",
      "Large JSON is now parsed and transformed off the main thread.",
    ],
  },
  {
    date: "2026-05-30",
    title: "utilyx, and code tools",
    kind: "new",
    highlights: [
      "devtils is now utilyx.",
      "New tools: code formatter, XML formatter, SQL formatter and diff checker, each with shareable links.",
      "Social preview images for every tool.",
    ],
  },
  {
    date: "2026-05-29",
    title: "Catalogue browser + SEO foundation",
    kind: "improved",
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
    kind: "new",
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
    kind: "improved",
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
