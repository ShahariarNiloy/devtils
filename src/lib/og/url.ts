import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Resolve the OG image URL for a given tool slug. Returns a path
 * relative to the site root (consumed by metadata as
 * `/og/<slug>.png`); the actual file lives under `public/og/`.
 *
 * Falls back to `/og/default.png` if the per-slug image hasn't been
 * pre-generated yet — `existsSync` runs at build time (Node runtime for
 * static metadata) so the fallback is decided once, not per request.
 */
const PUBLIC_OG_DIR = join(process.cwd(), "public", "og");
const DEFAULT_PATH = "/og/default.png";

export function ogImagePath(slug?: string): string {
  if (!slug) return DEFAULT_PATH;
  try {
    if (existsSync(join(PUBLIC_OG_DIR, `${slug}.png`))) {
      return `/og/${slug}.png`;
    }
  } catch {
    // `fs` not available (edge runtime / unsupported env) — fall through.
  }
  return DEFAULT_PATH;
}

/**
 * OG image for a non-tool page, by its file under `public/og/` (e.g.
 * "blog.png", "blog/<slug>.png", "category/json.png"); falls back to the
 * default card when it hasn't been generated (`pnpm og:build`).
 */
export function ogPagePath(file: string): string {
  try {
    if (existsSync(join(PUBLIC_OG_DIR, file))) return `/og/${file}`;
  } catch {
    // fs unavailable — fall through.
  }
  return DEFAULT_PATH;
}

export const OG_DEFAULT_PATH = DEFAULT_PATH;
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
