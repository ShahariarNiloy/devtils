import Link from "next/link";
import type { ReactNode } from "react";
import { BlogCover } from "@/components/illustrations/blog-covers";
import { formatPostDate, postHref, tagTint, type BlogPost, type PlannedPost } from "@/lib/blog";
import { cn } from "@/lib/cn";
import { TINT_BG, TINT_TEXT } from "./tints";

/** Server-rendered card pieces for /blog and "Read next". No client JS. */

const CARD_HOVER = "transition-colors hover:border-clay-light/45";

/** Featured cover: teal glow top-left, clay glow bottom-right (design). */
const FEATURED_COVER_BG =
  "radial-gradient(90% 90% at 20% 20%, rgba(111,166,175,.28), transparent 60%), radial-gradient(70% 80% at 90% 90%, rgba(224,160,114,.22), transparent 60%), #0d0d0c";

function PostMeta({ date, readingTime }: { date: string; readingTime: string }) {
  return (
    <>
      <time dateTime={date}>{formatPostDate(date)}</time> · {readingTime} read
    </>
  );
}

export function FeaturedPostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={postHref(post.slug)}
      className={cn(
        "mb-7 flex flex-wrap overflow-hidden rounded-[20px] border border-white/[.08] bg-surface text-text hover:text-text",
        CARD_HOVER,
      )}
    >
      <div
        className="relative flex min-h-[240px] flex-[1_1_340px] items-center justify-center p-7"
        style={{ background: FEATURED_COVER_BG }}
      >
        <div className="w-full max-w-[380px]">
          <BlogCover cover={post.cover} />
        </div>
      </div>
      <div className="flex flex-[1_1_380px] flex-col justify-center gap-3 p-7">
        <span className="text-xs font-bold text-clay-light">Featured · {post.tags[0]}</span>
        <h2 className="m-0 text-2xl leading-[1.15] sm:text-[30px]">{post.title}</h2>
        <p className="m-0 text-[15px] text-text-tertiary">{post.description}</p>
        <span className="text-[13px] text-text-faint">
          <PostMeta date={post.date} readingTime={post.readingTime} />
        </span>
      </div>
    </Link>
  );
}

interface GridCardProps {
  title: string;
  description: string;
  tag: string;
  cover: BlogPost["cover"];
  meta: ReactNode;
  badge?: string;
}

function GridCardBody({ title, description, tag, cover, meta, badge }: GridCardProps) {
  return (
    <>
      <div className="-mx-5 -mt-5 mb-1.5 flex h-[132px] items-center justify-center border-b border-border-subtle bg-[#0d0d0c] p-3.5">
        <div className="w-full max-w-[210px]">
          <BlogCover cover={cover} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className={cn("size-2 rounded-[2px]", TINT_BG[tagTint(tag)])} />
        <span className="grow text-xs font-bold text-text-strong">{tag}</span>
        {badge && (
          <span className="rounded-full border border-border-strong px-2 py-0.5 text-[11px] text-text-tertiary">
            {badge}
          </span>
        )}
      </div>
      <h3 className="m-0 text-[19px] leading-[1.25]">{title}</h3>
      <p className="m-0 text-sm text-text-tertiary">{description}</p>
      <span className="mt-auto text-xs text-text-faint">{meta}</span>
    </>
  );
}

const GRID_CARD = "flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-white/[.07] bg-surface p-5";

export function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={postHref(post.slug)} className={cn(GRID_CARD, CARD_HOVER, "text-text hover:text-text")}>
      <GridCardBody
        title={post.title}
        description={post.description}
        tag={post.tags[0]}
        cover={post.cover}
        meta={<PostMeta date={post.date} readingTime={post.readingTime} />}
      />
    </Link>
  );
}

/** Planned post: not a link (there's nothing to open yet), dimmed per design. */
export function PlannedPostCard({ post }: { post: PlannedPost }) {
  return (
    <div className={cn(GRID_CARD, "opacity-60")}>
      <GridCardBody
        title={post.title}
        description="Coming soon."
        tag={post.tag}
        cover={post.cover}
        meta={<>Planned · {post.readingTime} read</>}
        badge="Planned"
      />
    </div>
  );
}

export function ReadNextCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={postHref(post.slug)}
      className={cn(
        "flex flex-col gap-2 rounded-[14px] border border-white/[.07] bg-surface p-[18px] text-text hover:text-text",
        CARD_HOVER,
      )}
    >
      <span className={cn("text-xs font-bold", TINT_TEXT[tagTint(post.tags[0])])}>{post.tags[0]}</span>
      <span className="text-[17px] leading-[1.3] font-bold">{post.title}</span>
      <span className="text-xs text-text-faint">{post.readingTime} read</span>
    </Link>
  );
}
