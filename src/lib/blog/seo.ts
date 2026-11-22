import { DISTINCT_LIVE_TOOL_COUNT } from "@/lib/implemented-tools";
import { OG_DEFAULT_PATH } from "@/lib/og/url";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { POSTS } from "./posts";
import { postHref, spansText } from "./index";
import type { Block, BlogPost } from "./types";

/** JSON-LD builders for /blog and /blog/[slug]. Pure data. */

const BLOG_ID = `${SITE_URL}/blog#blog`;
const PUBLISHER = { "@type": "Organization", name: SITE_NAME, url: SITE_URL };

/** The /blog lede, with the live tool count (design copy said "43"). */
export const BLOG_DESCRIPTION = `Practical guides for the problems our tools solve, plus what we learn building ${DISTINCT_LIVE_TOOL_COUNT} of them without a single server.`;

function blockText(b: Block): string {
  switch (b.k) {
    case "h2":
    case "h3":
    case "code":
      return b.v;
    case "p":
    case "note":
    case "quote":
      return spansText(b.s);
    case "ul":
    case "ol":
      return b.items.map(spansText).join(" ");
    case "table":
      return [...b.head, ...b.rows.flat()].map(spansText).join(" ");
  }
}

export function wordCount(post: BlogPost): number {
  return post.blocks
    .map(blockText)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function crumb(position: number, name: string, path: string) {
  return { "@type": "ListItem", position, name, item: `${SITE_URL}${path}` };
}

export function blogIndexJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": BLOG_ID,
        url: `${SITE_URL}/blog`,
        name: `${SITE_NAME} blog`,
        description: BLOG_DESCRIPTION,
        inLanguage: "en",
        publisher: PUBLISHER,
        blogPost: POSTS.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title,
          url: `${SITE_URL}${postHref(p.slug)}`,
          datePublished: p.date,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [crumb(1, "Home", ""), crumb(2, "Blog", "/blog")],
      },
    ],
  };
}

export function postJsonLd(post: BlogPost) {
  const url = `${SITE_URL}${postHref(post.slug)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: post.title,
        description: post.description,
        url,
        mainEntityOfPage: url,
        datePublished: post.date,
        dateModified: post.date,
        author: { "@type": "Organization", name: post.author, url: SITE_URL },
        publisher: PUBLISHER,
        image: `${SITE_URL}${OG_DEFAULT_PATH}`,
        keywords: post.tags.join(", "),
        articleSection: post.tags[0],
        wordCount: wordCount(post),
        inLanguage: "en",
        isPartOf: { "@id": BLOG_ID },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [crumb(1, "Home", ""), crumb(2, "Blog", "/blog"), crumb(3, post.title, postHref(post.slug))],
      },
    ],
  };
}
