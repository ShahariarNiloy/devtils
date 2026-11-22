import Link from "next/link";
import type { ToolCategory } from "@/lib/tools-registry";
import { CategoriesBrowser, type BrowseCategory } from "./categories-browser";
import {
  buildCategoryView,
  categoryHref,
  NON_EMPTY_CATEGORIES,
} from "./category-data";
import { CATEGORY_DRAWING } from "./category-page";

/** Board order ("Browse by category"); categories not listed follow after. */
const ORDER: ToolCategory[] = [
  "JSON",
  "SEO",
  "Text",
  "Image",
  "Encoding",
  "Code",
  "Design",
  "Calc",
  "Security",
  "Network",
  "PDF",
];

/** One-line card descriptions from the board. */
const DESC: Partial<Record<ToolCategory, string>> = {
  JSON: "Format, validate, diff and convert JSON into types for TypeScript, Zod, Go, Python and Rust.",
  SEO: "Hreflang, canonicals, robots.txt, sitemaps, share cards and structured data — checked as you type.",
  Text: "Regex, diffs, case conversion and word counts.",
  Image: "Compress to a size budget and make blur placeholders.",
  Encoding: "Base64, URL and HTML entity encoding, both ways.",
  Code: "Readable SQL, XML, JavaScript, CSS and HTML.",
  Design: "Colour formats and CSS units.",
  Calc: "Timestamps, UUIDs, cron and file permissions.",
  Security: "Decode and verify JWTs, generate passwords.",
  Network: "Turn curl commands into code, build new ones, and take URLs apart.",
  PDF: "Merge, split, compress, sign and convert PDFs without uploading them.",
};

/** Short display names where the category key reads badly on a card. */
const NAMES: Partial<Record<ToolCategory, string>> = { Calc: "Time & IDs" };

/** Board badges: SEO is the newest category; one with nothing live yet is "Soon". */
function badgeFor(c: ToolCategory, live: number): BrowseCategory["badge"] {
  if (c === "SEO" || c === "PDF") return "New";
  if (live === 0) return "Soon";
  return null;
}

/**
 * /tools/category — "Browse by category" (SitePage board, page="categories").
 * Server-rendered; only the filter box and the list it filters are a client
 * island, and the drawings are passed in pre-rendered.
 */
export function CategoriesIndex() {
  const cats = [...NON_EMPTY_CATEGORIES].sort((a, b) => {
    const ia = ORDER.indexOf(a);
    const ib = ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const categories: BrowseCategory[] = cats.map((c) => {
    const view = buildCategoryView(c);
    const live = view.tools.filter((t) => t.live).length;
    return {
      key: c,
      name: NAMES[c] ?? c,
      desc: DESC[c] ?? view.lede,
      href: categoryHref(c),
      tint: view.tint,
      tools: view.tools.map((t) => ({
        name: t.name,
        glyph: t.glyph,
        desc: t.desc,
        live: t.live,
      })),
      badge: badgeFor(c, live),
    };
  });
  const totalTools = categories.reduce((n, c) => n + c.tools.length, 0);

  const art = Object.fromEntries(
    cats.map((c) => {
      const Drawing = CATEGORY_DRAWING[c];
      return [c, Drawing ? <Drawing className="w-full" /> : null];
    }),
  );

  return (
    <main
      id="main"
      className="mx-auto w-full max-w-[1160px] flex-1 px-4 pt-10 pb-[72px] sm:px-6 sm:pt-[72px] sm:pb-24"
    >
      <header className="mb-10 flex max-w-[720px] flex-col items-start gap-3">
        <span className="inline-flex items-center rounded-full border border-clay-light/35 px-3 py-1 text-xs text-clay-cream">
          {categories.length} categories · {totalTools} tools
        </span>
        <h1 className="m-0 text-[36px] leading-[1.06] text-text sm:text-[clamp(40px,5vw,60px)]">
          Browse by category
        </h1>
        <p className="m-0 max-w-[620px] text-[17px] text-text-muted">
          Every tool, grouped by the job it does. Open a category to see
          what&apos;s in it and which tool fits your problem.
        </p>
      </header>

      <CategoriesBrowser categories={categories} art={art} />

      <section className="surface-panel mt-10 flex flex-wrap items-center gap-x-7 gap-y-4 rounded-[18px] px-6 py-[22px]">
        <div className="flex flex-[1_1_320px] flex-col gap-1">
          <h2 className="m-0 text-lg text-text">Missing a category?</h2>
          <p className="m-0 text-sm text-text-tertiary">
            Tell us what you&apos;d use. Requests with an example input and
            output get built first.
          </p>
        </div>
        <Link
          href="/request"
          className="inline-flex min-h-11 items-center rounded-[11px] border border-white/16 px-[18px] text-sm font-bold text-text hover:border-white/30 hover:text-text"
        >
          Request a tool
        </Link>
      </section>
    </main>
  );
}
