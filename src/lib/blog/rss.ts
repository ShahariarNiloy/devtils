import { SITE_NAME, SITE_URL } from "@/lib/site";
import { BLOG_FEED_PATH, postHref } from "./index";
import { POSTS } from "./posts";
import { BLOG_DESCRIPTION } from "./seo";

/** RSS 2.0 document for /blog/rss.xml. Pure, so the test can parse it. */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RFC 822 date for a YYYY-MM-DD (midnight UTC). */
function rfc822(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toUTCString();
}

export function buildRss(): string {
  const blogUrl = `${SITE_URL}/blog`;
  const latest = POSTS.reduce((max, p) => (p.date > max ? p.date : max), POSTS[0].date);

  const items = POSTS.map((p) => {
    const url = `${SITE_URL}${postHref(p.slug)}`;
    return [
      "    <item>",
      `      <title>${esc(p.title)}</title>`,
      `      <link>${esc(url)}</link>`,
      `      <guid isPermaLink="true">${esc(url)}</guid>`,
      `      <pubDate>${rfc822(p.date)}</pubDate>`,
      `      <description>${esc(p.description)}</description>`,
      ...p.tags.map((t) => `      <category>${esc(t)}</category>`),
      "    </item>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${esc(`${SITE_NAME} blog`)}</title>`,
    `    <link>${esc(blogUrl)}</link>`,
    `    <description>${esc(BLOG_DESCRIPTION)}</description>`,
    "    <language>en</language>",
    `    <lastBuildDate>${rfc822(latest)}</lastBuildDate>`,
    `    <atom:link href="${esc(`${SITE_URL}${BLOG_FEED_PATH}`)}" rel="self" type="application/rss+xml"/>`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
