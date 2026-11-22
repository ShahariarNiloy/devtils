/**
 * Blog content model. Posts are structured blocks rendered directly by
 * `components/blog/post-body.tsx` — no Markdown/MDX parser on the server
 * or the client. Pure data: no React imports here.
 */

/** Inline run. A bare string is plain text. */
export type Span =
  | string
  | { t: "strong"; v: string }
  | { t: "em"; v: string }
  | { t: "code"; v: string; bold?: boolean }
  | { t: "link"; v: string; href: string };

export type Block =
  | { k: "p" | "note" | "quote"; s: Span[] }
  | { k: "h2"; v: string; id: string }
  | { k: "h3"; v: string }
  | { k: "code"; lang: string; v: string }
  | { k: "ul" | "ol"; items: Span[][] }
  | { k: "table"; head: Span[][]; rows: Span[][][] };

/** Cover drawings in `components/illustrations/blog-covers.tsx`. */
export type CoverKey =
  | "jwt"
  | "json"
  | "cron"
  | "encoding"
  | "seo"
  | "servers"
  | "bigfile"
  | "url"
  | "png"
  | "time"
  | "uuid"
  | "blur"
  | "formats"
  | "keys"
  | "curl";

/** Tag swatch colours (design TINT map → palette tokens). */
export type TagTint = "teal" | "clay" | "sage" | "rose" | "plum" | "faint";

export interface PostTool {
  name: string;
  /** Mono glyph on the keycap. */
  glyph: string;
  tint: TagTint;
  href: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  /** Shorter title for search results (≤ 60 chars) when `title` is long. */
  seoTitle?: string;
  /** Dek + meta description. */
  description: string;
  /** Meta description when the dek runs past ~155 chars. */
  seoDescription?: string;
  /** ISO date (YYYY-MM-DD), UTC. */
  date: string;
  author: string;
  /** First tag is the primary one (breadcrumb, card label, tint). */
  tags: string[];
  readingTime: string;
  cover: CoverKey;
  tool: PostTool;
  blocks: Block[];
}

export interface PlannedPost {
  title: string;
  tag: string;
  readingTime: string;
  cover: CoverKey;
}
