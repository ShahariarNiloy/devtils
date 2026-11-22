import { PLANNED_POSTS, POSTS } from "./posts";
import type { BlogPost, Span, TagTint } from "./types";

export type { Block, BlogPost, CoverKey, PlannedPost, Span, TagTint } from "./types";
export { PLANNED_POSTS, POSTS };

export const BLOG_TITLE = "Blog";
export const BLOG_FEED_PATH = "/blog/rss.xml";

/** Design TINT map. Unknown tags fall back to the faint swatch. */
const TAG_TINTS: Record<string, TagTint> = {
  JWT: "teal",
  JSON: "clay",
  Cron: "sage",
  Privacy: "rose",
  Encoding: "plum",
  SEO: "rose",
  Engineering: "faint",
};

export function tagTint(tag: string): TagTint {
  return TAG_TINTS[tag] ?? "faint";
}

/** Filter chip order from the design; only tags with a card are offered. */
const FILTER_ORDER = [
  "JSON",
  "Engineering",
  "Images",
  "Databases",
  "Time",
  "Encoding",
  "Web",
  "Cron",
  "SEO",
  "Privacy",
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function postHref(slug: string): string {
  return `/blog/${slug}`;
}

/** The first post is featured; the rest fill the grid with the planned ones. */
export function featuredPost(): BlogPost {
  return POSTS[0];
}

/** Primary tags of the grid cards (non-featured + planned). */
export function gridTags(): string[] {
  return [...POSTS.slice(1).map((p) => p.tags[0]), ...PLANNED_POSTS.map((p) => p.tag)];
}

export function filterTags(): string[] {
  const present = new Set(gridTags());
  return FILTER_ORDER.filter((t) => present.has(t));
}

/** Two other published posts, in feed order (design: "Read next"). */
export function readNext(slug: string): BlogPost[] {
  return POSTS.filter((p) => p.slug !== slug).slice(0, 2);
}

export function toc(post: BlogPost): { id: string; v: string }[] {
  return post.blocks.flatMap((b) => (b.k === "h2" ? [{ id: b.id, v: b.v }] : []));
}

/** "Nov 21, 2026" — formatted in UTC so server output never drifts. */
export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function spanText(s: Span): string {
  return typeof s === "string" ? s : s.v;
}

export function spansText(spans: Span[]): string {
  return spans.map(spanText).join("");
}

/** Every inline link href in a post's body. */
function linkHrefs(post: BlogPost): string[] {
  const out: string[] = [];
  const spans = (list: Span[]) => {
    for (const s of list) if (typeof s !== "string" && s.t === "link") out.push(s.href);
  };
  for (const b of post.blocks) {
    if (b.k === "p" || b.k === "note" || b.k === "quote") spans(b.s);
    else if (b.k === "ul" || b.k === "ol") b.items.forEach(spans);
    else if (b.k === "table") [...b.head, ...b.rows.flat()].forEach(spans);
  }
  return out;
}

/**
 * Posts about a tool — written for it (`post.tool`) first, then posts that
 * link to it in the body. Feeds the "Related reading" links on tool pages.
 */
export function postsForTool(slug: string, max = 3): BlogPost[] {
  const href = `/tools/${slug}`;
  // Practical guides before our engineering write-ups.
  const own = POSTS.filter((p) => p.tool.href === href).sort(
    (a, b) => Number(a.tags[0] === "Engineering") - Number(b.tags[0] === "Engineering"),
  );
  const mentions = POSTS.filter((p) => !own.includes(p) && linkHrefs(p).some((h) => h === href || h.startsWith(`${href}#`) || h.startsWith(`${href}?`)));
  return [...own, ...mentions].slice(0, max);
}
