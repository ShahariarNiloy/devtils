import { checkLangCode, escapeXml, hasProblems, isAbsUrl, parseTable, type Check } from "../seo-shared/seo.lib";

export const SAMPLE_CSV = `en,de,fr
https://example.com/,https://example.com/de/,https://example.com/fr/
https://example.com/pricing,https://example.com/de/preise,https://example.com/fr/tarifs
https://example.com/blog,https://example.com/de/blog,`;

export interface SitemapOptions {
  lastmod: boolean;
  /** Also emit x-default pointing at the first column's URL. */
  firstIsXDefault: boolean;
  /** YYYY-MM-DD, supplied by the caller (keeps this module pure); "" skips lastmod. */
  today: string;
}

export interface SitemapResult {
  xml: string;
  checks: Check[];
  urlCount: number;
}

export const MAX_URLS = 50_000;
export const MAX_BYTES = 50 * 1024 * 1024;

export function buildHreflangSitemap(raw: string, opts: SitemapOptions): SitemapResult {
  const checks: Check[] = [];
  const push = (level: Check["level"], text: string) => checks.push({ level, text });
  const table = parseTable(raw);
  const heads = table.shift() ?? [];
  const pages = table;

  const seenHead = new Set<string>();
  heads.forEach((h, i) => {
    const c = checkLangCode(h);
    if (!h) push("err", `Column ${i + 1} has no locale code in the header row.`);
    else if (!c.ok) push("err", `Column “${h}”: ${c.msg ?? "invalid code."}`);
    else if (c.warn) push("warn", `Column “${h}”: ${c.warn}`);
    if (h && seenHead.has(h.toLowerCase())) push("err", `Column “${h}” appears twice. Each locale needs one column.`);
    seenHead.add(h.toLowerCase());
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];
  let count = 0;
  /** Each <loc> may appear once in a sitemap: URL → where it was first listed. */
  const seenLoc = new Map<string, string>();
  pages.forEach((r, ri) => {
    if (r.length > heads.length) push("warn", `Row ${ri + 1} has more cells than there are locale columns; the extra cells are ignored.`);
    const alts = heads
      .map((h, i) => ({ lang: checkLangCode(h).fixed ?? h, url: r[i] ?? "" }))
      .filter((a) => a.url);
    alts.forEach((a) => {
      if (!isAbsUrl(a.url)) push("err", `Row ${ri + 1}, ${a.lang}: “${a.url}” isn't an absolute URL.`);
    });
    if (alts.length < 2) push("warn", `Row ${ri + 1} has only one version, so it needs no alternates.`);
    if (opts.firstIsXDefault && r[0] && !alts.some((a) => a.lang === "x-default")) {
      alts.push({ lang: "x-default", url: r[0] });
    }
    for (const a of alts) {
      if (a.lang === "x-default") continue;
      const first = seenLoc.get(a.url);
      if (first) {
        push("err", `Row ${ri + 1}, ${a.lang}: “${a.url}” is already listed (${first}). Each page URL can appear once, so it's left out.`);
        continue;
      }
      seenLoc.set(a.url, `row ${ri + 1}, ${a.lang}`);
      count++;
      xml.push("  <url>", `    <loc>${escapeXml(a.url)}</loc>`);
      if (opts.lastmod && opts.today) xml.push(`    <lastmod>${opts.today}</lastmod>`);
      for (const b of alts) {
        xml.push(`    <xhtml:link rel="alternate" hreflang="${escapeXml(b.lang)}" href="${escapeXml(b.url)}" />`);
      }
      xml.push("  </url>");
    }
  });
  xml.push("</urlset>");

  if (!heads.length) push("err", "Paste a header row of locale codes, then one row of URLs per page.");
  else if (!pages.length) push("warn", "Only a header row so far. Add one row of URLs per page below it.");
  else {
    push(
      "info",
      `${count} <url> ${count === 1 ? "entry" : "entries"} for ${pages.length} ${pages.length === 1 ? "page" : "pages"} in ${heads.length} ${heads.length === 1 ? "locale" : "locales"}. Each version lists every alternate, including itself.`,
    );
  }
  if (count > MAX_URLS) push("err", "Over 50,000 URLs. Split into several sitemaps with a sitemap index.");
  const out = heads.length ? xml.join("\n") : "";
  if (new TextEncoder().encode(out).length > MAX_BYTES) push("err", "Over 50 MB uncompressed. Split into several sitemaps with a sitemap index.");
  if (heads.length && !hasProblems(checks)) push("ok", "Ready to upload. Reference it from robots.txt or Search Console.");

  return { xml: out, checks, urlCount: count };
}
