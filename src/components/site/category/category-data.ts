/**
 * Data for the v2 category landing pages (/tools/category/[category]).
 * Pure — no React. The registry decides which tools exist and which
 * category they're in; LIVE_SLUGS decides "live" vs "soon". This module
 * only adds per-category copy (eyebrow, lede, guide) and shapes the view.
 */

import { CATEGORIES, SHOWCASE_TOOLS, type Tool, type ToolCategory } from "@/lib/tools-registry";
import { LIVE_SLUGS } from "@/lib/tools/live";
import { CATEGORY_GLYPH, CATEGORY_TINT, TOOL_PRESENTATION, type Tint } from "@/lib/tools/presentation";

/** URL slug for a category: lowercased, "." → "-" ("Next.js" → "next-js"). */
export function categorySlug(cat: ToolCategory): string {
  return cat.toLowerCase().replace(/\./g, "-");
}

export const categoryHref = (cat: ToolCategory) => `/tools/category/${categorySlug(cat)}`;

interface CategoryCopy {
  /** Short task summary appended to the tool count in the eyebrow. */
  eyebrow?: string;
  lede: string;
  guideTitle?: string;
  guide: { t: string; d: string }[];
}

const COPY: Partial<Record<ToolCategory, CategoryCopy>> = {
  JSON: {
    eyebrow: "format, convert, compare",
    lede: "Format, validate, compare and convert JSON to the types and formats your code needs. All in your browser.",
    guideTitle: "Which tool do I need?",
    guide: [
      { t: "Messy or minified JSON", d: "Start with the JSON formatter. It validates and repairs as it formats." },
      { t: "Types for your code", d: "Use JSON → TypeScript, Zod, Go, Python or Rust with a real sample payload." },
      { t: "Two versions that differ", d: "JSON diff shows exactly which fields changed." },
    ],
  },
  SEO: {
    eyebrow: "hreflang, canonicals, sitemaps",
    lede: "Hreflang, canonicals, robots.txt, sitemaps, share cards and structured data — checked as you type, without crawling anything.",
    guide: [
      { t: "Launching in new languages", d: "Hreflang generator, then validate each page's tags." },
      { t: "Duplicate URLs in search", d: "Canonical generator, then check robots.txt isn't blocking the canonical." },
      { t: "Links look bad when shared", d: "Open Graph generator and Meta preview." },
    ],
  },
  Text: {
    eyebrow: "convert, compare, count",
    lede: "Convert naming styles, compare drafts, test regular expressions, count words and preview Markdown — as you type.",
    guide: [
      { t: "Renaming keys or variables", d: "Case converter shows camelCase, snake_case, kebab-case and more at once." },
      { t: "Two drafts that differ", d: "Diff checker compares them line by line, unified or side by side." },
      { t: "A pattern that won't match", d: "Regex tester highlights every match and capture group live." },
    ],
  },
  Encoding: {
    eyebrow: "encode and decode",
    lede: "Encode and decode Base64, URL components and HTML entities. What you paste stays in your browser.",
    guide: [
      { t: "Opaque or binary strings", d: "Base64 encodes and decodes text and files, with a URL-safe mode." },
      { t: "Query strings and paths", d: "URL encoder percent-encodes text, or decodes it back." },
      { t: "Markup showing up as text", d: "HTML entity escapes and unescapes characters for HTML." },
    ],
  },
  Calc: {
    eyebrow: "time, schedules, IDs",
    lede: "Convert Unix timestamps, read cron schedules, generate UUIDs and work out file permissions.",
    guide: [
      { t: "A number that should be a date", d: "Timestamp converter handles seconds and milliseconds, in any time zone." },
      { t: "A cron line you didn't write", d: "Cron parser explains it in plain English and lists the next runs." },
      { t: "IDs for fixtures or records", d: "UUID generator makes v4, v7 and ULIDs in bulk." },
    ],
  },
  Code: {
    eyebrow: "format and tidy",
    lede: "Pretty-print JavaScript, CSS, HTML, SQL and XML so it's readable and easy to review.",
    guide: [
      { t: "A one-line query", d: "SQL formatter breaks it into readable clauses." },
      { t: "Minified scripts or styles", d: "Code formatter beautifies JavaScript, CSS and HTML." },
      { t: "XML that won't parse", d: "XML formatter indents it and points at unclosed tags." },
    ],
  },
  Design: {
    eyebrow: "colors and units",
    lede: "Convert colors between HEX, RGB, HSL and OKLCH, and CSS lengths between px, rem, em and more.",
    guide: [
      { t: "A color in the wrong format", d: "Color converter shows HEX, RGB, HSL and OKLCH together, with contrast." },
      { t: "Pixel values from a design file", d: "CSS unit converter turns px into rem, em, vw and back." },
    ],
  },
  Security: {
    eyebrow: "tokens and passwords",
    lede: "Decode JSON Web Tokens and generate strong passwords, entirely on your device.",
    guide: [
      { t: "A token you need to read", d: "JWT decoder shows the header, claims and expiry without sending the token anywhere." },
      { t: "A new credential", d: "Password generator makes passwords and passphrases with your browser's cryptographic randomness." },
    ],
  },
  Image: {
    eyebrow: "compress locally",
    lede: "Compress PNG, JPEG, WebP and AVIF images in your browser. Files are never uploaded.",
    guide: [
      { t: "Images too heavy for the web", d: "Image compressor shrinks them and lets you compare before and after." },
    ],
  },
  Network: {
    eyebrow: "URLs",
    lede: "Break URLs into their parts and clean up query strings.",
    guide: [
      { t: "A long URL full of parameters", d: "URL parser splits it into parts so you can read, edit or drop query params." },
    ],
  },
};

export interface CategoryToolCard {
  slug: string;
  name: string;
  glyph: string;
  desc: string;
  live: boolean;
}

export interface OtherCategory {
  name: ToolCategory;
  href: string;
  count: number;
  tint: Tint;
}

export interface CategoryView {
  name: ToolCategory;
  slug: string;
  title: string;
  glyph: string;
  tint: Tint;
  eyebrow: string;
  lede: string;
  stats: string[];
  tools: CategoryToolCard[];
  guideTitle: string;
  guide: { t: string; d: string }[];
  others: OtherCategory[];
}

const LIVE = new Set(LIVE_SLUGS);

const toolsIn = (cat: ToolCategory): Tool[] => SHOWCASE_TOOLS.filter((t) => t.category === cat);

/** Categories that have at least one showcase tool, in registry order. */
export const NON_EMPTY_CATEGORIES: ToolCategory[] = CATEGORIES.filter((c) => toolsIn(c).length > 0);

export function categoryFromSlug(slug: string): ToolCategory | undefined {
  return NON_EMPTY_CATEGORIES.find((c) => categorySlug(c) === slug);
}

function toCard(t: Tool): CategoryToolCard {
  const m = TOOL_PRESENTATION[t.slug];
  return {
    slug: t.slug,
    name: m?.label ?? t.name,
    glyph: m?.glyph ?? t.name.slice(0, 2),
    desc: m?.desc ?? t.description,
    live: LIVE.has(t.slug),
  };
}

export function buildCategoryView(cat: ToolCategory): CategoryView {
  const tools = toolsIn(cat).map(toCard);
  const copy = COPY[cat];
  const live = tools.filter((t) => t.live).length;
  const soon = tools.length - live;
  const n = tools.length;
  const countLabel = `${n} ${n === 1 ? "tool" : "tools"}`;

  return {
    name: cat,
    slug: categorySlug(cat),
    title: `${cat} tools`,
    glyph: CATEGORY_GLYPH[cat] ?? cat.slice(0, 2),
    tint: CATEGORY_TINT[cat],
    eyebrow: copy?.eyebrow ? `${countLabel} · ${copy.eyebrow}` : countLabel,
    lede: copy?.lede ?? `${cat} utilities that run in your browser. Nothing you paste is uploaded.`,
    stats: [
      `${live} live`,
      ...(soon > 0 ? [`${soon} coming soon`] : []),
      "No sign-up",
      "Runs locally",
    ],
    tools,
    guideTitle: copy?.guideTitle ?? "Where to start",
    guide:
      copy?.guide ??
      toolsIn(cat)
        .slice(0, 3)
        .map((t) => ({ t: t.name, d: TOOL_PRESENTATION[t.slug]?.tagline ?? t.description })),
    others: NON_EMPTY_CATEGORIES.filter((c) => c !== cat).map((c) => ({
      name: c,
      href: categoryHref(c),
      count: toolsIn(c).length,
      tint: CATEGORY_TINT[c],
    })),
  };
}
