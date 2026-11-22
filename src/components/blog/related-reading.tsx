import Link from "next/link";
import { BlogCover } from "@/components/illustrations/blog-covers";
import { postHref, postsForTool } from "@/lib/blog";

/**
 * "Related reading" under a tool: the blog posts written for it or linking
 * to it. Server component, no client JS; renders nothing when there are none.
 * Two-way links between tools and posts help both get found.
 */
export function RelatedReading({ slug }: { slug: string }) {
  const posts = postsForTool(slug);
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby="related-reading" className="mx-auto w-full max-w-[1360px] px-4 pb-12 sm:px-6">
      <h2 id="related-reading" className="mb-3.5 text-base text-text">
        Related reading
      </h2>
      <ul role="list" className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-3">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link
              href={postHref(p.slug)}
              className="surface-panel flex h-full items-center gap-4 rounded-xl p-3 text-text transition-colors duration-[140ms] hover:border-clay-light/40 hover:text-text"
            >
              <span aria-hidden="true" className="flex h-[56px] w-[96px] shrink-0 items-center justify-center rounded-lg bg-[#0d0d0c] px-2">
                <BlogCover cover={p.cover} className="h-full w-full" />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="line-clamp-2 text-sm font-semibold leading-snug">{p.title}</span>
                <span className="text-xs text-text-faint">
                  {p.tags[0]} · {p.readingTime} read
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
