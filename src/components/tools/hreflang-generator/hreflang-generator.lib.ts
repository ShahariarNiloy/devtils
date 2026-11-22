import { checkLangCode, escapeXml, hasProblems, isAbsUrl, type Check } from "../seo-shared/seo.lib";

export interface HreflangRow {
  lang: string;
  url: string;
}

export type HreflangFormat = "html" | "http" | "xml";

export const FORMATS: readonly { id: HreflangFormat; label: string }[] = [
  { id: "html", label: "HTML <head>" },
  { id: "http", label: "HTTP header" },
  { id: "xml", label: "XML sitemap" },
];

export type PresetId = "eu" | "glob" | "lat";

export const PRESETS: readonly { id: PresetId; label: string }[] = [
  { id: "eu", label: "English + EU" },
  { id: "glob", label: "Global English" },
  { id: "lat", label: "Spanish markets" },
];

export const SAMPLE_ROWS: HreflangRow[] = [
  { lang: "en", url: "https://example.com/" },
  { lang: "en-GB", url: "https://example.com/uk/" },
  { lang: "de", url: "https://example.com/de/" },
  { lang: "fr-ca", url: "https://example.com/fr-ca/" },
];
export const SAMPLE_XDEFAULT = "https://example.com/";

export function presetRows(id: PresetId): { rows: HreflangRow[]; xdef: string } {
  const rows: HreflangRow[] =
    id === "eu"
      ? [
          { lang: "en", url: "https://example.com/" },
          { lang: "de", url: "https://example.com/de/" },
          { lang: "fr", url: "https://example.com/fr/" },
          { lang: "es", url: "https://example.com/es/" },
        ]
      : id === "glob"
        ? [
            { lang: "en-US", url: "https://example.com/" },
            { lang: "en-GB", url: "https://example.com/uk/" },
            { lang: "en-AU", url: "https://example.com/au/" },
            { lang: "en", url: "https://example.com/intl/" },
          ]
        : [
            { lang: "es-ES", url: "https://example.com/es/" },
            { lang: "es-MX", url: "https://example.com/mx/" },
            { lang: "es", url: "https://example.com/latam/" },
          ];
  return { rows, xdef: "https://example.com/" };
}

export function isBadCell(row: HreflangRow, key: keyof HreflangRow): boolean {
  return key === "lang" ? !checkLangCode(row.lang.trim()).ok : !isAbsUrl(row.url.trim());
}

const isXDefault = (lang: string) => lang.trim().toLowerCase() === "x-default";

/** Validate the set: codes, absolute URLs, duplicates, x-default, regional-without-plain. */
export function checkHreflang(rows: readonly HreflangRow[], xdef: string): Check[] {
  const checks: Check[] = [];
  const push = (level: Check["level"], text: string) => checks.push({ level, text });
  const seen = new Set<string>();
  for (const r of rows) {
    const lang = r.lang.trim();
    const url = r.url.trim();
    const c = checkLangCode(lang);
    if (!c.ok) push("err", c.msg ?? "Invalid code.");
    else if (c.warn) push("warn", c.warn);
    if (!isAbsUrl(url)) push("err", `“${url || "(empty)"}” must be an absolute URL with https://.`);
    const key = lang.toLowerCase();
    if (seen.has(key)) push("err", `“${lang}” is listed twice. Each language-region needs exactly one URL.`);
    seen.add(key);
  }
  const x = xdef.trim();
  const xRows = rows.filter((r) => isXDefault(r.lang));
  if (x && xRows.length) {
    push(
      "err",
      "x-default is set twice: in a language row and in the x-default field. Keep one, or the output has two conflicting x-default tags.",
    );
  }
  if (!x && !xRows.length) push("warn", "No x-default. Add one so visitors outside your listed locales get a sensible page.");
  else if (x && !isAbsUrl(x)) push("err", "x-default must be an absolute URL.");

  const langs = rows.filter((r) => !isXDefault(r.lang)).map((r) => r.lang.trim().toLowerCase());
  const regional = new Set<string>();
  for (const l of langs) {
    const [base, ...rest] = l.split("-");
    if (rest.length && base) regional.add(base);
  }
  for (const l of regional) {
    if (!langs.includes(l)) {
      push("info", `You have regional “${l}-…” versions but no plain “${l}”. Consider adding one for ${l} speakers elsewhere.`);
    }
  }
  push("info", "Put this same set on every page listed, including a link to itself. Hreflang only works when pages link back to each other.");
  if (!hasProblems(checks)) {
    const n = langs.length;
    push("ok", `${n} ${n === 1 ? "language" : "languages"}${x || xRows.length ? " and x-default" : ""} look valid.`);
  }
  return checks;
}

/** Trimmed, non-empty rows plus the x-default field; x-default spelled in lowercase. */
function allRows(rows: readonly HreflangRow[], xdef: string): HreflangRow[] {
  const all = rows
    .map((r) => ({ lang: isXDefault(r.lang) ? "x-default" : r.lang.trim(), url: r.url.trim() }))
    .filter((r) => r.lang || r.url);
  if (xdef.trim()) all.push({ lang: "x-default", url: xdef.trim() });
  return all;
}

const linkTag = (r: HreflangRow, el: "link" | "xhtml:link", indent = "") =>
  `${indent}<${el} rel="alternate" hreflang="${escapeXml(r.lang)}" href="${escapeXml(r.url)}" />`;

/** One <url> block per page, each listing every alternate (itself included). */
function sitemapUrls(all: readonly HreflangRow[], indent: string): string[] {
  const out: string[] = [];
  for (const p of all.filter((r) => r.lang !== "x-default" && r.url)) {
    out.push(
      `${indent}<url>`,
      `${indent}  <loc>${escapeXml(p.url)}</loc>`,
      ...all.map((r) => linkTag(r, "xhtml:link", `${indent}  `)),
      `${indent}</url>`,
    );
  }
  return out;
}

/** Build the output in the chosen format. Empty rows are skipped. */
export function buildHreflang(rows: readonly HreflangRow[], xdef: string, format: HreflangFormat): string {
  const all = allRows(rows, xdef);
  if (!all.length) return "";
  if (format === "html") return all.map((r) => linkTag(r, "link")).join("\n");
  if (format === "http") {
    // One header line; commas separate links (RFC 8288). Header values must be URI-safe.
    return `Link: ${all.map((r) => `<${encodeURI(decodeSafe(r.url))}>; rel="alternate"; hreflang="${r.lang}"`).join(", ")}`;
  }
  return ['<!-- inside <urlset … xmlns:xhtml="http://www.w3.org/1999/xhtml"> -->', ...sitemapUrls(all, "")].join("\n");
}

/** A complete, uploadable sitemap file (declaration + <urlset> root) for the XML download. */
export function hreflangSitemapFile(rows: readonly HreflangRow[], xdef: string): string {
  const all = allRows(rows, xdef);
  if (!all.length) return "";
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...sitemapUrls(all, "  "),
    "</urlset>",
  ].join("\n");
}

function decodeSafe(u: string): string {
  try {
    return decodeURI(u);
  } catch {
    return u;
  }
}
