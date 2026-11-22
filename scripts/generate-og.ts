/* eslint-disable no-console -- CLI script: progress output is the point. */
/**
 * Build-time OG image generator: renders the layouts in `src/lib/og/card.tsx`
 * to static PNGs under `public/og/`, so social cards are plain CDN files.
 *
 * Re-run whenever the brand, a tool's name/tagline/category, a blog post or
 * a category's copy changes:
 *
 *   pnpm og:build
 *
 * Outputs:
 *   public/og/default.png            home page / fallback
 *   public/og/<tool-slug>.png        every live tool
 *   public/og/blog.png               blog index
 *   public/og/blog/<post-slug>.png   every published post
 *   public/og/categories.png         /tools/category
 *   public/og/category/<slug>.png    every category page
 *
 * Fonts (Fredoka 600, Noto Sans 400/600, JetBrains Mono 400; SIL OFL) live in
 * scripts/og-fonts/ — Satori needs real TTF files.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ImageResponse } from "next/og";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { iconForTool } from "@/components/shared/key-icon";
import { buildCategoryView, categorySlug, NON_EMPTY_CATEGORIES } from "@/components/site/category/category-data";
import { BLOG_DESCRIPTION } from "@/lib/blog/seo";
import { POSTS } from "@/lib/blog/posts";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { BlogCard, DefaultCard, OG_SIZE, PageCard, ToolCard, toolTint } from "@/lib/og/card";
import { TOOL_PRESENTATION } from "@/lib/tools/presentation";
import { TOOLS } from "@/lib/tools-registry";

const OUT_DIR = join(process.cwd(), "public", "og");
const FONT_DIR = join(process.cwd(), "scripts", "og-fonts");

type Font = { name: string; data: Buffer; weight: 400 | 600; style: "normal" };

async function loadFonts(): Promise<Font[]> {
  const f = async (file: string, name: string, weight: 400 | 600): Promise<Font> => ({
    name,
    data: await readFile(join(FONT_DIR, file)),
    weight,
    style: "normal",
  });
  return Promise.all([
    f("Fredoka-600.ttf", "Fredoka", 600),
    f("NotoSans-400.ttf", "Noto Sans", 400),
    f("NotoSans-600.ttf", "Noto Sans", 600),
    f("JetBrainsMono-400.ttf", "JetBrains Mono", 400),
  ]);
}

/** Code points a TrueType font can draw (cmap format 4 — the BMP). */
function codePoints(font: Buffer): Set<number> {
  const has = new Set<number>();
  const tables = font.readUInt16BE(4);
  let cmap = 0;
  for (let i = 0; i < tables; i++) if (font.toString("latin1", 12 + i * 16, 16 + i * 16) === "cmap") cmap = font.readUInt32BE(12 + i * 16 + 8);
  for (let i = 0; i < font.readUInt16BE(cmap + 2); i++) {
    const sub = cmap + font.readUInt32BE(cmap + 4 + i * 8 + 4);
    if (font.readUInt16BE(sub) !== 4) continue;
    const segs = font.readUInt16BE(sub + 6) / 2;
    for (let s = 0; s < segs; s++) {
      const end = font.readUInt16BE(sub + 14 + s * 2);
      const start = font.readUInt16BE(sub + 16 + segs * 2 + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) has.add(c);
    }
  }
  return has;
}

(async () => {
  const fonts = await loadFonts();
  const drawable = new Set(fonts.flatMap((f) => [...codePoints(f.data)]));
  /** The tool's site icon as an SVG data URL, when its keycap glyph would render as boxes. */
  const iconFor = (tool: (typeof TOOLS)[number]): string | undefined => {
    const glyph = TOOL_PRESENTATION[tool.slug]?.glyph;
    if (!glyph || [...glyph].every((c) => drawable.has(c.codePointAt(0) ?? 0))) return undefined;
    const svg = renderToStaticMarkup(createElement(iconForTool(tool), { size: 76, color: toolTint(tool), strokeWidth: 1.75 }));
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  };
  let total = 0;
  let count = 0;

  const render = async (element: ReactElement, file: string) => {
    const out = join(OUT_DIR, file);
    await mkdir(dirname(out), { recursive: true });
    const response = new ImageResponse(element, { width: OG_SIZE.width, height: OG_SIZE.height, fonts });
    const buf = Buffer.from(await response.arrayBuffer());
    await writeFile(out, buf);
    total += buf.byteLength;
    count++;
    console.log(`  ✓ ${file.padEnd(44)} ${(buf.byteLength / 1024).toFixed(1)} KB`);
  };

  await render(DefaultCard(), "default.png");

  for (const tool of TOOLS.filter((t) => IMPLEMENTED_TOOL_SLUGS.has(t.slug))) {
    await render(ToolCard({ tool, icon: iconFor(tool) }), `${tool.slug}.png`);
  }

  await render(
    PageCard({ eyebrow: `${IMPLEMENTED_TOOL_SLUGS.size} live`, title: "All tools", line: "Every utilyx tool on one page. Free, no sign-up, in your browser.", path: "/tools" }),
    "tools.png",
  );
  await render(
    PageCard({ eyebrow: "Changelog", title: "What's new", line: "Every tool we ship, improve or fix.", path: "/changelog" }),
    "changelog.png",
  );
  await render(
    PageCard({ eyebrow: "FAQ", title: "Questions, answered", line: "Privacy, the tools, and how utilyx works.", path: "/faq" }),
    "faq.png",
  );
  await render(
    PageCard({ eyebrow: "Blog", title: "Notes from the toolbox", line: BLOG_DESCRIPTION, path: "/blog" }),
    "blog.png",
  );
  for (const post of POSTS) {
    await render(
      BlogCard({ title: post.title, tag: post.tags[0] ?? "Blog", readingTime: post.readingTime, slug: post.slug }),
      `blog/${post.slug}.png`,
    );
  }

  await render(
    PageCard({
      eyebrow: `${NON_EMPTY_CATEGORIES.length} categories`,
      title: "Browse by category",
      line: "Every tool, grouped by the job it does.",
      path: "/tools/category",
    }),
    "categories.png",
  );
  for (const cat of NON_EMPTY_CATEGORIES) {
    const v = buildCategoryView(cat);
    await render(
      PageCard({ eyebrow: v.eyebrow, title: v.title, line: v.lede, path: `/tools/category/${categorySlug(cat)}`, tint: v.tint }),
      `category/${categorySlug(cat)}.png`,
    );
  }

  console.log(`\n${count} files · ${(total / 1024 / 1024).toFixed(2)} MB total`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
