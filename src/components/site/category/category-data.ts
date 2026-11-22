/**
 * Data for the v2 category landing pages (/tools/category/[category]).
 * Pure — no React. The registry decides which tools exist and which
 * category they're in; LIVE_SLUGS decides "live" vs "soon". This module
 * only adds per-category copy (eyebrow, lede, guide) and shapes the view.
 */

import {
  CATEGORIES,
  SHOWCASE_TOOLS,
  type Tool,
  type ToolCategory,
} from "@/lib/tools-registry";
import { LIVE_SLUGS } from "@/lib/tools/live";
import {
  CATEGORY_GLYPH,
  CATEGORY_TINT,
  TOOL_PRESENTATION,
  type Tint,
} from "@/lib/tools/presentation";

/** URL slug for a category: lowercased, "." → "-" ("Next.js" → "next-js"). */
export function categorySlug(cat: ToolCategory): string {
  return cat.toLowerCase().replace(/\./g, "-");
}

export const categoryHref = (cat: ToolCategory) =>
  `/tools/category/${categorySlug(cat)}`;

interface CategoryCopy {
  /** Page title; defaults to "<Category> tools". */
  title?: string;
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
      {
        t: "Messy or minified JSON",
        d: "Start with the JSON formatter. It validates and repairs as it formats.",
      },
      {
        t: "Types for your code",
        d: "Use JSON → TypeScript, Zod, Go, Python or Rust with a real sample payload.",
      },
      {
        t: "Two versions that differ",
        d: "JSON diff shows exactly which fields changed.",
      },
    ],
  },
  SEO: {
    eyebrow: "hreflang, canonicals, sitemaps",
    lede: "Hreflang, canonicals, robots.txt, sitemaps, share cards and structured data — checked as you type, without crawling anything.",
    guide: [
      {
        t: "Launching in new languages",
        d: "Hreflang generator, then validate each page's tags.",
      },
      {
        t: "Duplicate URLs in search",
        d: "Canonical generator, then check robots.txt isn't blocking the canonical.",
      },
      {
        t: "Links look bad when shared",
        d: "Open Graph generator and Meta preview.",
      },
    ],
  },
  Text: {
    title: "Text tools",
    eyebrow: "match, compare, convert",
    lede: "Test regular expressions, compare two versions, change case and count words — as you type, right in your browser.",
    guideTitle: "Which tool do I need?",
    guide: [
      {
        t: "A pattern that won't match",
        d: "The regex tester shows every match and capture group live, with flags you can toggle.",
      },
      {
        t: "Two drafts or configs",
        d: "The diff checker highlights changed lines and words side by side.",
      },
      {
        t: "Names in the wrong style",
        d: "The case converter switches between camelCase, snake_case, kebab-case and more.",
      },
    ],
  },
  Encoding: {
    title: "Encoding tools",
    eyebrow: "encode and decode",
    lede: "Base64, URL percent-encoding and HTML entities — in either direction, with the result updating as you type.",
    guideTitle: "Which tool do I need?",
    guide: [
      {
        t: "Data inside JSON or an email",
        d: "Base64 turns binary or text into safe ASCII, and back again.",
      },
      {
        t: "Query strings and redirects",
        d: "The URL encoder escapes the characters that break links.",
      },
      {
        t: "User text inside HTML",
        d: "The HTML entity encoder escapes <, > and & so text stays text.",
      },
    ],
  },
  Calc: {
    title: "Time and ID tools",
    eyebrow: "timestamps, IDs, cron",
    lede: "Unix timestamps, UUIDs and ULIDs, cron schedules and file permissions — worked out instantly.",
    guideTitle: "Which tool do I need?",
    guide: [
      {
        t: "A number in a log line",
        d: "The timestamp converter shows the date in UTC and in your time zone.",
      },
      {
        t: "IDs for a database",
        d: "The UUID / ULID generator makes v4, v7 or sortable ULIDs in bulk.",
      },
      {
        t: "When does this cron run?",
        d: "The cron parser explains it in plain words and lists the next runs.",
      },
    ],
  },
  Code: {
    title: "Code formatters",
    eyebrow: "format and minify",
    lede: "Make SQL, XML, JavaScript, CSS and HTML readable again — or minify them for production.",
    guideTitle: "Which tool do I need?",
    guide: [
      {
        t: "A one-line query from the logs",
        d: "The SQL formatter breaks it into clauses you can actually read.",
      },
      {
        t: "A minified script or stylesheet",
        d: "The code formatter pretty-prints JavaScript, CSS and HTML.",
      },
      {
        t: "A SOAP response or XML config",
        d: "The XML formatter indents or minifies it and points out broken tags.",
      },
    ],
  },
  Design: {
    title: "Design tools",
    eyebrow: "colours and units",
    lede: "Convert colours between HEX, RGB, HSL and OKLCH, and CSS lengths between px, rem, em and vw.",
    guideTitle: "Which tool do I need?",
    guide: [
      {
        t: "A colour from a design file",
        d: "The colour converter gives you every format at once.",
      },
      {
        t: "Spacing in px from a mockup",
        d: "The CSS unit converter turns it into rem for your base font size.",
      },
      {
        t: "A palette that feels uneven",
        d: "Compare the colours in OKLCH to keep lightness consistent across hues.",
      },
    ],
  },
  Security: {
    title: "Security tools",
    eyebrow: "tokens and passwords",
    lede: "Decode and verify JWTs and generate strong passwords. Tokens and keys stay in this tab.",
    guideTitle: "Which tool do I need?",
    guide: [
      {
        t: "A token that's being rejected",
        d: "The JWT decoder checks expiry, audience and the signature with your key.",
      },
      {
        t: "A new account or API secret",
        d: "The password generator makes passwords or passphrases from your browser's secure random source.",
      },
      {
        t: "Debugging with a real token",
        d: "Decode it here instead of pasting it into a site that logs requests.",
      },
    ],
  },
  Image: {
    title: "Image tools",
    eyebrow: "compress and preview",
    lede: "Compress images to a size budget and make the blurred previews that show while they load. Your browser does the work, so the sizes are real.",
    guideTitle: "Which tool do I need?",
    guide: [
      {
        t: "Pages loading slowly",
        d: "Image compressor: choose Auto and a max width, or set a size budget per image.",
      },
      {
        t: "Layout jumping as images load",
        d: "Blur placeholder gives next/image a blurDataURL, or a ThumbHash for your database.",
      },
      {
        t: "A whole folder of images",
        d: "Both tools take many files at once and give you one download.",
      },
    ],
  },
  Network: {
    eyebrow: "URLs",
    lede: "Break URLs into their parts and clean up query strings.",
    guide: [
      {
        t: "A long URL full of parameters",
        d: "URL parser splits it into parts so you can read, edit or drop query params.",
      },
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

const toolsIn = (cat: ToolCategory): Tool[] =>
  SHOWCASE_TOOLS.filter((t) => t.category === cat);

/** Categories that have at least one showcase tool, in registry order. */
export const NON_EMPTY_CATEGORIES: ToolCategory[] = CATEGORIES.filter(
  (c) => toolsIn(c).length > 0,
);

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
    title: copy?.title ?? `${cat} tools`,
    glyph: CATEGORY_GLYPH[cat] ?? cat.slice(0, 2),
    tint: CATEGORY_TINT[cat],
    eyebrow: copy?.eyebrow ? `${countLabel} · ${copy.eyebrow}` : countLabel,
    lede:
      copy?.lede ??
      `${cat} utilities that run in your browser. Nothing you paste is uploaded.`,
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
        .map((t) => ({
          t: t.name,
          d: TOOL_PRESENTATION[t.slug]?.tagline ?? t.description,
        })),
    others: NON_EMPTY_CATEGORIES.filter((c) => c !== cat).map((c) => ({
      name: c,
      href: categoryHref(c),
      count: toolsIn(c).length,
      tint: CATEGORY_TINT[c],
    })),
  };
}
