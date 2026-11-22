import type { Metadata } from "next";
import { FeaturedPostCard, PlannedPostCard, PostCard } from "@/components/blog/post-cards";
import { PostFilter, type FilterItem } from "@/components/blog/post-filter";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";
import { BLOG_FEED_PATH, featuredPost, filterTags, PLANNED_POSTS, POSTS } from "@/lib/blog";
import { BLOG_DESCRIPTION, blogIndexJsonLd } from "@/lib/blog/seo";
import { OG_HEIGHT, OG_WIDTH, ogPagePath } from "@/lib/og/url";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog",
  description: BLOG_DESCRIPTION,
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": [{ url: BLOG_FEED_PATH, title: `${SITE_NAME} blog` }] },
  },
  openGraph: {
    type: "website",
    title: `Notes from the toolbox · ${SITE_NAME}`,
    description: BLOG_DESCRIPTION,
    url: "/blog",
    siteName: SITE_NAME,
    images: [{ url: ogPagePath("blog.png"), width: OG_WIDTH, height: OG_HEIGHT, alt: `${SITE_NAME} blog` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Notes from the toolbox · ${SITE_NAME}`,
    description: BLOG_DESCRIPTION,
    images: [ogPagePath("blog.png")],
  },
};

/**
 * /blog — static RSC. The tag chips are the only client island; every card
 * is rendered here and handed to it pre-built.
 */
export default function BlogIndexPage() {
  const featured = featuredPost();
  const items: FilterItem[] = [
    ...POSTS.slice(1).map((p) => ({ key: p.slug, tag: p.tags[0], node: <PostCard post={p} /> })),
    ...PLANNED_POSTS.map((p) => ({ key: p.title, tag: p.tag, node: <PlannedPostCard post={p} /> })),
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(blogIndexJsonLd()) }} />
      <Header variant="blog" />
      <main id="main" className="mx-auto w-full max-w-[1160px] flex-1 px-4 pt-9 pb-[72px] sm:px-6 sm:pt-16 sm:pb-24">
        <header className="mb-9 flex flex-col gap-3">
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-clay-light/35 px-3 py-1 text-xs text-clay-cream">
            Blog
          </span>
          <h1 className="m-0 text-[38px] leading-[1.05] sm:text-[clamp(44px,5vw,60px)]">Notes from the toolbox.</h1>
          <p className="m-0 max-w-[620px] text-[17px] text-text-muted">{BLOG_DESCRIPTION}</p>
        </header>

        <FeaturedPostCard post={featured} />

        <h2 className="sr-only">More posts</h2>
        <PostFilter tags={filterTags()} items={items} />

        <div className="surface-panel mt-10 flex flex-wrap items-center gap-3.5 rounded-2xl p-[22px]">
          <div className="flex-[1_1_300px]">
            <div className="text-[17px] font-bold">Get new posts</div>
            <div className="text-sm text-text-tertiary">
              About two a month. Subscribe by RSS, no account or email needed.
            </div>
          </div>
          <a
            href={BLOG_FEED_PATH}
            type="application/rss+xml"
            className="btn-action inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-bold"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-clay)"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" />
              <circle cx="5" cy="19" r="1" />
            </svg>
            RSS feed
          </a>
        </div>
      </main>
      <HomeFooter variant="compact" />
    </div>
  );
}
