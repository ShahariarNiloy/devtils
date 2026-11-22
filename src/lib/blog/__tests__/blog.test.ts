/**
 * Blog content + feed invariants.
 * Run: npx tsx src/lib/blog/__tests__/blog.test.ts
 */

/* eslint-disable no-console */

import { IMPLEMENTED_TOOL_SLUGS } from "../../implemented-tools";
import { filterTags, gridTags, PLANNED_POSTS, POSTS, spansText, toc } from "../index";
import { buildRss } from "../rss";
import { postJsonLd, wordCount } from "../seo";
import type { Block, Span } from "../types";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, hint?: string) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}`);
    if (hint) console.error(`      ${hint}`);
  }
}

function allStrings(b: Block): string[] {
  switch (b.k) {
    case "h2":
      return [b.v, b.id];
    case "h3":
    case "code":
      return [b.v];
    case "p":
    case "note":
    case "quote":
      return [spansText(b.s)];
    case "ul":
    case "ol":
      return b.items.map(spansText);
    case "table":
      return [...b.head, ...b.rows.flat()].map(spansText);
  }
}

function allSpans(b: Block): Span[] {
  switch (b.k) {
    case "p":
    case "note":
    case "quote":
      return b.s;
    case "ul":
    case "ol":
      return b.items.flat();
    case "table":
      return [...b.head, ...b.rows.flat()].flat();
    default:
      return [];
  }
}

const toolSlug = (href: string) => href.replace(/^\/tools\//, "");

function getPostOrThrow(slug: string) {
  const p = POSTS.find((x) => x.slug === slug);
  if (!p) throw new Error(`missing post ${slug}`);
  return p;
}

console.log("\n── Published set ──");
check(
  "exactly the approved posts are published",
  POSTS.map((p) => p.slug).sort().join(",") ===
    [
      "avif-vs-webp-vs-jpeg",
      "base64-is-not-encryption",
      "blur-placeholders-measured",
      "cron-syntax-explained",
      "curl-to-code-gotchas",
      "decode-jwt-safely",
      "format-50mb-json-in-browser",
      "how-lossy-png-compression-works",
      "hreflang-mistakes",
      "json-parse-errors",
      "react-codemirror-dropped-keystrokes",
      "unix-timestamps-time-zones",
      "url-encoding-explained",
      "uuid-v4-v7-ulid",
    ].join(","),
);
check("the privacy draft is not published", !POSTS.some((p) => p.slug.includes("privacy")));

console.log("\n── Content ──");
for (const p of POSTS) {
  const text = [p.title, p.description, p.author, p.date, p.tool.href, ...p.blocks.flatMap(allStrings)].join("\n");
  const placeholder = text.match(/\[(?:DATE|AUTHOR|CRON TOOL URL|N|X|EMAIL|RANDOM)\]/);
  check(`${p.slug}: no design placeholders`, !placeholder, placeholder?.[0]);
  check(`${p.slug}: author is the team`, p.author === "The utilyx team");
  check(`${p.slug}: ISO date`, /^\d{4}-\d{2}-\d{2}$/.test(p.date));
  check(`${p.slug}: tool is live`, IMPLEMENTED_TOOL_SLUGS.has(toolSlug(p.tool.href)), p.tool.href);

  const ids = toc(p).map((e) => e.id);
  check(`${p.slug}: TOC has entries`, ids.length > 2);
  check(`${p.slug}: heading ids unique`, new Set(ids).size === ids.length);
  check(`${p.slug}: heading ids are slug-safe`, ids.every((id) => /^[a-z0-9-]+$/.test(id)));

  for (const s of p.blocks.flatMap(allSpans)) {
    if (typeof s !== "string" && s.t === "link") {
      // Internal links must hit a live tool or a published post; external
      // sources must be https (their content was checked when written).
      const ok = s.href.startsWith("/blog/")
        ? POSTS.some((q) => `/blog/${q.slug}` === s.href.split("#")[0])
        : s.href.startsWith("/")
          ? IMPLEMENTED_TOOL_SLUGS.has(toolSlug(s.href))
          : s.href.startsWith("https://");
      check(`${p.slug}: link ${s.href} resolves`, ok);
    }
  }
  check(`${p.slug}: word count plausible`, wordCount(p) > 600, String(wordCount(p)));
  const ld = JSON.stringify(postJsonLd(p));
  check(`${p.slug}: JSON-LD has BlogPosting + BreadcrumbList`, ld.includes('"BlogPosting"') && ld.includes('"BreadcrumbList"'));
}

console.log("\n── Code samples ──");
{
  // JWT: the browser snippet decodes the post's own sample token.
  const jwt = getPostOrThrow("decode-jwt-safely");
  const codes = jwt.blocks.flatMap((b) => (b.k === "code" ? [b] : []));
  const token = codes[0].v;
  const fnSrc = codes.find((c) => c.v.startsWith("function decodeJwt"))?.v.split("\n\ndecodeJwt(")[0] ?? "";
  const decodeJwt = new Function(`${fnSrc}; return decodeJwt;`)() as (t: string) => {
    header: { alg: string };
    payload: { name: string; exp: number };
  };
  const out = decodeJwt(token);
  check("JWT browser snippet decodes the sample token", out.header.alg === "HS256" && out.payload.name === "Ada");
  const split = codes[1].v.split("\n").map((l) => l.split(/\s+/)[1]);
  check("JWT split view matches the token", split.join(".") === token);
}
{
  // JSON: each invalid sample throws exactly the V8 message printed under it.
  const blocks = getPostOrThrow("json-parse-errors").blocks;
  for (let i = 0; i < blocks.length - 1; i++) {
    const a = blocks[i];
    const b = blocks[i + 1];
    if (a.k !== "code" || a.lang !== "json" || b.k !== "code" || b.lang !== "text") continue;
    let msg = "";
    try {
      JSON.parse(a.v);
    } catch (e) {
      msg = e instanceof Error ? e.message : "";
    }
    check(`JSON sample ${JSON.stringify(a.v.slice(0, 24))}… → message`, msg === b.v, `got: ${msg}`);
  }
}
{
  // Cron: every expression cell in the schedule tables has 5 fields.
  const exprs = getPostOrThrow("cron-syntax-explained").blocks
    .flatMap((b) => (b.k === "table" ? b.rows.flat().flat() : []))
    .flatMap((s) => (typeof s !== "string" && s.t === "code" && /^[\d*][^ ]* /.test(s.v) ? [s.v] : []));
  check("cron tables have expressions", exprs.length >= 20);
  for (const e of exprs) check(`cron "${e}" has 5 fields`, e.split(" ").length === 5);
}

console.log("\n── Index ──");
{
  const present = new Set(gridTags());
  check("every filter chip matches a card", filterTags().every((t) => present.has(t)));
  check("planned posts are not also published", PLANNED_POSTS.every((pl) => !POSTS.some((p) => p.title === pl.title)));
}

console.log("\n── RSS ──");
{
  const xml = buildRss();
  check("RSS 2.0 root", xml.includes('<rss version="2.0"'));
  check("one item per post", (xml.match(/<item>/g) ?? []).length === POSTS.length);
  check("no raw ampersands", !/&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml));
  check("RFC 822 pubDate", /<pubDate>\w{3}, \d{2} \w{3} \d{4} 00:00:00 GMT<\/pubDate>/.test(xml));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
