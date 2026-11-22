import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostBody } from "@/components/blog/post-body";
import { ReadNextCard } from "@/components/blog/post-cards";
import {
  PostTocDisclosure,
  PostTocRail,
  ToolKey,
} from "@/components/blog/post-toc";
import { BlogCover } from "@/components/illustrations/blog-covers";
import { Header } from "@/components/layout/header";
import { HomeFooter } from "@/components/layout/home-footer";
import {
  BLOG_FEED_PATH,
  formatPostDate,
  getPost,
  postHref,
  POSTS,
  readNext,
  toc,
} from "@/lib/blog";
import { postJsonLd } from "@/lib/blog/seo";
import { OG_HEIGHT, OG_WIDTH, ogPagePath } from "@/lib/og/url";
import { safeJsonLd } from "@/lib/safe-json-ld";
import { SITE_NAME } from "@/lib/site";

/** Every published post is prerendered; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Not found" };
  const url = postHref(post.slug);
  const published = `${post.date}T00:00:00.000Z`;

  return {
    // Search results show the short SEO title when there is one; titles that
    // already fill a result skip the " · utilyx" suffix.
    title:
      (post.seoTitle ?? post.title).length > 51
        ? { absolute: post.seoTitle ?? post.title }
        : (post.seoTitle ?? post.title),
    description: post.seoDescription ?? post.description,
    keywords: post.tags,
    authors: [{ name: post.author }],
    alternates: {
      canonical: url,
      types: {
        "application/rss+xml": [
          { url: BLOG_FEED_PATH, title: `${SITE_NAME} blog` },
        ],
      },
    },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.description,
      siteName: SITE_NAME,
      publishedTime: published,
      modifiedTime: published,
      authors: [post.author],
      tags: post.tags,
      images: [
        {
          url: ogPagePath(`blog/${post.slug}.png`),
          width: OG_WIDTH,
          height: OG_HEIGHT,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [ogPagePath(`blog/${post.slug}.png`)],
    },
  };
}

const COVER_BG =
  "radial-gradient(80% 90% at 50% 100%, rgba(197,142,94,.12), transparent 70%), #0d0d0c";

/**
 * /blog/[slug] — static RSC. Client JS is limited to the shared shell plus
 * the code-block Copy buttons.
 */
export default async function BlogPostPage({
  params,
}: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const entries = toc(post);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(postJsonLd(post)) }}
      />
      <Header variant="blog" />
      <main
        id="main"
        className="mx-auto w-full max-w-[1160px] flex-1 px-4 pt-9 pb-[72px] sm:px-6 sm:pt-16 sm:pb-24"
      >
        <nav
          aria-label="Breadcrumb"
          className="mb-[22px] text-[13px] text-text-faint"
        >
          <Link href="/blog" className="text-text-tertiary hover:text-text">
            Blog
          </Link>{" "}
          <span aria-hidden="true">/</span>{" "}
          <span aria-current="page">{post.tags[0]}</span>
        </nav>

        <header className="mb-[34px] flex max-w-[780px] flex-col gap-3.5">
          <ul
            aria-label="Tags"
            className="m-0 flex list-none flex-wrap gap-1.5 p-0"
          >
            {post.tags.map((t) => (
              <li
                key={t}
                className="rounded-full bg-white/5 px-2.5 py-[3px] text-xs font-bold text-text-strong"
              >
                {t}
              </li>
            ))}
          </ul>
          <h1 className="m-0 text-[32px] leading-[1.1] sm:text-[40px] lg:text-5xl">
            {post.title}
          </h1>
          <p className="m-0 text-lg leading-[1.6] text-text-muted">
            {post.description}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-text-faint">
            <span
              aria-hidden="true"
              className="size-7 rounded-full bg-[linear-gradient(135deg,var(--color-clay-light),var(--color-clay))]"
            />
            <span className="font-semibold text-text-strong">
              {post.author}
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readingTime} read</span>
          </div>
        </header>

        <div
          className="-mt-1.5 mb-9 box-border flex h-[170px] max-w-[780px] items-center justify-center rounded-[18px] border border-white/[.07] p-[18px] sm:h-[240px]"
          style={{ background: COVER_BG }}
        >
          <div className="w-full max-w-[260px] sm:max-w-[360px]">
            <BlogCover cover={post.cover} />
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-x-14 gap-y-7">
          <article className="flex max-w-[740px] min-w-0 flex-[999_1_560px] flex-col gap-[18px] text-base leading-[1.75] text-text-strong sm:text-[17px]">
            <PostTocDisclosure entries={entries} />
            <PostBody blocks={post.blocks} />

            <div
              className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-clay-light/30 p-[22px]"
              style={{
                background:
                  "radial-gradient(120% 120% at 0% 0%, rgba(197,142,94,.18), transparent 60%), var(--color-surface)",
              }}
            >
              <ToolKey
                tool={post.tool}
                className="size-12 rounded-xl text-[13px]"
              />
              <div className="flex-[1_1_220px]">
                <div className="text-[17px] font-bold text-text">
                  Try the {post.tool.name}
                </div>
                <div className="text-sm text-text-tertiary">
                  Free, no sign-up, and it runs in your browser.
                </div>
              </div>
              <Link
                href={post.tool.href}
                className="btn-action inline-flex min-h-11 items-center rounded-[10px] px-[18px] text-sm font-bold"
              >
                Open the tool →
              </Link>
            </div>
          </article>

          <PostTocRail entries={entries} tool={post.tool} />
        </div>

        <section
          aria-labelledby="read-next"
          className="mt-14 flex flex-col gap-3.5"
        >
          <h2 id="read-next" className="m-0 text-[22px]">
            Read next
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3">
            {readNext(post.slug).map((p) => (
              <ReadNextCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      </main>
      <HomeFooter variant="compact" />
    </div>
  );
}
