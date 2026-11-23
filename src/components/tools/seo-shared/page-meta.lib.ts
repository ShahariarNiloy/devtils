/**
 * Reading a page's head: meta tags and the real <title>. Shared by the SEO
 * checker and the tools' "Load from URL". Pure — no DOM.
 */

import { decodeEntities, findTags, stripInertHtml } from "./seo.lib";

/** `<meta name|property="key" content>` — first match, case-insensitive key. */
export function metaContent(html: string, key: string): string | null {
  const k = key.toLowerCase();
  const tag = findTags(html, "meta").find((t) => (t.attrs.name ?? t.attrs.property ?? "").toLowerCase() === k);
  return tag ? (tag.attrs.content ?? "").trim() : null;
}

/** Every page <title>, in order (SVG tooltips excluded). */
export function allTitles(html: string): string[] {
  // Titles inside <svg> are tooltips, not the page title.
  const noSvg = stripInertHtml(html).replace(/<svg\b[\s\S]*?<\/svg>/gi, "");
  return Array.from(noSvg.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi), (m) => decodeEntities(m[1]).replace(/\s+/g, " ").trim());
}

/** The <head> part of a page, for tools that show pasted source. */
export function headOf(html: string): string {
  const m = /<head\b[\s\S]*?<\/head>/i.exec(html);
  return m ? m[0] : html;
}

/** The URL relative links resolve against: <base href> if present, else the page. */
export function baseUrlOf(html: string, pageUrl: string): string | null {
  let page: URL;
  try {
    page = new URL(pageUrl);
  } catch {
    return null;
  }
  const base = findTags(html, "base").find((t) => t.attrs.href)?.attrs.href;
  if (!base) return page.href;
  try {
    return new URL(base, page).href;
  } catch {
    return page.href;
  }
}

export interface IconCandidate {
  /** Absolute URL (or a data: URI) to load. */
  href: string;
  /** Where it came from: a favicon link, an Apple touch icon, or the /favicon.ico every browser tries. */
  kind: "icon" | "apple" | "default";
  /** Declared size ("48x48", "any") and MIME type, as written. */
  sizes: string;
  type: string;
}

const relTokens = (rel: string) => rel.toLowerCase().split(/\s+/).filter(Boolean);
const isSvg = (c: IconCandidate) => /svg/i.test(c.type) || /\.svg(?:[?#]|$)/i.test(c.href);
const declaredPx = (sizes: string) =>
  Math.max(0, ...sizes.split(/\s+/).map((s) => /^(\d+)x(\d+)$/i.exec(s)).map((m) => (m && m[1] === m[2] ? Number(m[1]) : 0)));

/**
 * The page's favicons, best first — the order a browser or search engine
 * would try them: SVG, then the largest declared square, then the rest in
 * document order; Apple touch icons after those; /favicon.ico last.
 * `rel="mask-icon"`, `"fluid-icon"` and friends aren't favicons and are
 * skipped. A `data:,` (empty) icon means "deliberately none". Returns [] when
 * relative links can't be resolved (pasted source without a URL).
 */
export function readIcons(html: string, pageUrl: string): IconCandidate[] {
  const base = baseUrlOf(html, pageUrl);
  const icons: IconCandidate[] = [];
  let optedOut = false;
  for (const t of findTags(html, "link")) {
    const rel = relTokens(t.attrs.rel ?? "");
    let kind: IconCandidate["kind"] | null = null;
    if (rel.includes("icon")) kind = "icon";
    else if (rel.some((r) => r === "apple-touch-icon" || r === "apple-touch-icon-precomposed")) kind = "apple";
    const raw = (t.attrs.href ?? "").trim();
    if (!kind || !raw) continue;
    if (/^data:,?$/i.test(raw)) {
      if (kind === "icon") optedOut = true;
      continue;
    }
    let href: string;
    if (/^data:image\//i.test(raw)) href = raw;
    else if (!base) continue;
    else {
      try {
        href = new URL(raw, base).href;
      } catch {
        continue;
      }
    }
    if (!icons.some((c) => c.href === href)) icons.push({ href, kind, sizes: (t.attrs.sizes ?? "").trim(), type: (t.attrs.type ?? "").trim() });
  }
  const rank = (c: IconCandidate) => {
    if (c.kind === "apple") return 2;
    return isSvg(c) ? 0 : 1;
  };
  const ordered = icons
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rank(a.c) - rank(b.c) || declaredPx(b.c.sizes) - declaredPx(a.c.sizes) || a.i - b.i)
    .map((x) => x.c);
  if (!optedOut && pageUrl) {
    try {
      const fallback = new URL("/favicon.ico", pageUrl).href;
      if (!ordered.some((c) => c.href === fallback)) ordered.push({ href: fallback, kind: "default", sizes: "", type: "" });
    } catch {
      /* no URL, no fallback */
    }
  }
  return ordered;
}
