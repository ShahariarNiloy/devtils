/**
 * Canonical brand + URL constants. EVERY consumer must read from here.
 * Hardcoded brand strings or domains anywhere else in the codebase are
 * a smell — change them to import from this module.
 *
 * Lives here (not in `app/layout.tsx`) because Next.js restricts which
 * named exports a layout file is allowed to have.
 */

/** Title-case brand name for prose, metadata, OG, JSON-LD. */
export const SITE_NAME = "Utilyx";

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
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://utilyx.dev";

/** Bare domain (no scheme) for display, robots host, structured data. */
export const SITE_DOMAIN = "utilyx.dev";

/** Default meta description — long form. */
export const SITE_DESCRIPTION =
  "Format JSON, convert cases, encode Base64, test regex, and convert colors. Fast, keyboard-first, and beautifully designed — every tool runs in your browser.";

/** Short description for OG / Twitter / per-page fallbacks. */
export const SITE_DESCRIPTION_SHORT =
  "A curated set of polished, client-side developer tools. JSON, encoding, text, image, regex, and more.";

/** Tagline pairing with the brand name in titles. */
export const SITE_TAGLINE = "handcrafted developer utilities";

/** Composed default title: `${SITE_NAME} — ${SITE_TAGLINE}`. */
export const SITE_TITLE_DEFAULT = `${SITE_NAME} — ${SITE_TAGLINE}`;

/** Default contact email used in privacy / contact / docs. */
export const SITE_EMAIL = `hello@${SITE_DOMAIN}`;
