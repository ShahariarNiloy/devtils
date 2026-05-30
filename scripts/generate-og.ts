/**
 * Build-time OG image generator. Renders the same Satori-flavoured
 * ToolCard / DefaultCard layouts the metadata used to produce at request
 * time, but writes them as static PNG files under `public/og/`. After
 * this runs, the social-card metadata in `app/layout.tsx` and
 * `app/tools/[slug]/page.tsx` resolves to a real file served by the
 * CDN — no Lambda cold-start, no per-tool Satori work on first share.
 *
 * Re-run whenever:
 *   - the brand identity changes (palette, wordmark)
 *   - a new tool is added to COMPONENT_MAP
 *   - an existing tool's name / description / category changes
 *
 *   pnpm og:build
 *
 * Outputs:
 *   public/og/<slug>.png  for every live tool
 *   public/og/default.png for the homepage / unknown-slug fallback
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { IMPLEMENTED_TOOL_SLUGS } from "@/lib/implemented-tools";
import { DefaultCard, OG_SIZE, ToolCard } from "@/lib/og/card";
import { TOOLS } from "@/lib/tools-registry";

const OUT_DIR = join(process.cwd(), "public", "og");

async function renderToFile(
  element: React.ReactElement,
  filename: string,
): Promise<number> {
  const response = new ImageResponse(element, {
    width: OG_SIZE.width,
    height: OG_SIZE.height,
  });
  const buf = Buffer.from(await response.arrayBuffer());
  await writeFile(join(OUT_DIR, filename), buf);
  return buf.byteLength;
}

(async () => {
  await mkdir(OUT_DIR, { recursive: true });

  const live = TOOLS.filter((t) => IMPLEMENTED_TOOL_SLUGS.has(t.slug));
  console.log(`Generating ${live.length} tool cards + 1 default → ${OUT_DIR}`);

  // Default card first — used by every page that doesn't have a per-slug card.
  const defaultBytes = await renderToFile(DefaultCard(), "default.png");
  console.log(`  ✓ default.png            ${(defaultBytes / 1024).toFixed(1)} KB`);

  // Per-tool cards, serially. Concurrency would only help if the CPU work
  // overlapped meaningfully; Satori is single-threaded inside each render,
  // and serial output keeps logs readable.
  let total = defaultBytes;
  for (const tool of live) {
    const bytes = await renderToFile(ToolCard({ tool }), `${tool.slug}.png`);
    total += bytes;
    console.log(`  ✓ ${tool.slug.padEnd(22)} ${(bytes / 1024).toFixed(1)} KB`);
  }

  console.log(
    `\n${live.length + 1} files · ${(total / 1024 / 1024).toFixed(2)} MB total`,
  );
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
