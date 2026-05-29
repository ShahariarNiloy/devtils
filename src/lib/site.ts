/**
 * Canonical production origin used by `Metadata.metadataBase` and every
 * absolute URL Next.js emits (OG, Twitter cards, canonical alternates,
 * sitemap entries). Set NEXT_PUBLIC_SITE_URL in the environment for
 * production; the fallback exists so localhost previews don't crash on a
 * missing env var.
 *
 * Lives here (not in `app/layout.tsx`) because Next.js restricts which
 * named exports a layout file is allowed to have.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://devtils.com";

export const SITE_NAME = "devtils";
