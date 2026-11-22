/**
 * Canonical brand + URL constants. EVERY consumer must read from here.
 * Hardcoded brand strings or domains anywhere else in the codebase are
 * a smell — change them to import from this module.
 *
 * Lives here (not in `app/layout.tsx`) because Next.js restricts which
 * named exports a layout file is allowed to have.
 */

/** Title-case brand name for prose, metadata, OG, JSON-LD. */
export const SITE_NAME = "utilyx";

/** Lowercase brand for the header wordmark / logotype. */
export const SITE_WORDMARK = "utilyx";

/**
 * Canonical absolute base URL. No trailing slash. Used by
 * `Metadata.metadataBase` and every absolute URL Next.js emits (OG,
 * Twitter cards, canonical alternates, sitemap entries). Set
 * NEXT_PUBLIC_SITE_URL in the environment for production; the fallback
 * exists so localhost previews don't crash on a missing env var.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.utilyx.dev";

/**
 * Bare domain (no scheme) for display: OG footers, the contact email, the
 * GitHub path. Not a URL — the live site serves from `www.` (the bare domain
 * redirects there), so canonical links, the sitemap and robots.txt use
 * SITE_URL.
 */
export const SITE_DOMAIN = "utilyx.dev";

/**
 * The brand promise, word for word. Use this phrase — not "client-side",
 * "100% local" or other variants — wherever the site states it.
 */
export const PRIVACY_PROMISE = "Nothing leaves your browser";

/** Default meta description — long form. */
export const SITE_DESCRIPTION =
  "Free tools for JSON, PDFs, images, SEO and text that never upload your files. Merge and sign PDFs, compress images, format JSON, decode JWTs — nothing leaves your browser, no sign-up, no watermarks.";

/** Short description for OG / Twitter / per-page fallbacks. */
export const SITE_DESCRIPTION_SHORT =
  "Tools for JSON, PDFs, images, SEO and text that never upload your files. Nothing leaves your browser.";

/** Tagline pairing with the brand name in titles. */
export const SITE_TAGLINE = "tools that don't upload your files";

/** Composed default title: `${SITE_NAME} — ${SITE_TAGLINE}`. */
export const SITE_TITLE_DEFAULT = `${SITE_NAME} — ${SITE_TAGLINE}`;

/** Default contact email used in privacy / contact / docs. */
export const SITE_EMAIL = `hello@${SITE_DOMAIN}`;
