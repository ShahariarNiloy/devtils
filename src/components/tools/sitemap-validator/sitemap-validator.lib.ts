/**
 * Sitemap validator — pure logic (no React, no DOM).
 *
 * Reads pasted sitemap XML as text and checks it against the sitemaps.org
 * protocol: declaration, namespace, well-formed tags, a <loc> on every entry,
 * absolute same-host URLs, duplicates, unescaped &, lastmod (W3C datetime),
 * changefreq, priority and the 50,000-URL / 50 MB limits. Nothing is fetched.
 */

import { decodeEntities, isAbsUrl, type Check, type CheckLevel } from "@/components/tools/seo-shared/seo.lib";

/** Same shape as the shared SeoTable row. */
export interface SitemapRow {
  level: "err" | "warn" | "ok";
  a: string;
  b: string;
  note: string;
}

export const SAMPLE_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-11-18</lastmod>
  </url>
  <url>
    <loc>https://example.com/pricing</loc>
    <lastmod>20/11/2026</lastmod>
    <priority>1.5</priority>
  </url>
  <url>
    <loc>https://cdn.example.net/blog</loc>
  </url>
  <url>
    <loc>https://example.com/</loc>
    <changefreq>sometimes</changefreq>
  </url>
</urlset>`;

const NS = "http://www.sitemaps.org/schemas/sitemap/0.9";
const FREQ = new Set(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]);
const MAX_URLS = 50_000;
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_LOC = 2048;
/** Rows shown in the per-URL list; checks still cover every entry. */
export const TABLE_LIMIT = 500;
/** Above this many per-URL issues, checks are grouped by issue kind. */
const PER_URL_CHECK_LIMIT = 25;

/** W3C datetime: YYYY, YYYY-MM, YYYY-MM-DD, or a full date-time with zone. */
const W3C_DATE =
  /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?)?)?$/;

interface Issue {
  level: "err" | "warn";
  /** Stable kind for grouping. */
  kind: string;
  text: string;
}

export interface SitemapEntry {
  index: number;
  loc: string | null;
  lastmod: string | null;
  issues: Issue[];
}

export interface SitemapReport {
  kind: "urlset" | "sitemapindex";
  entries: SitemapEntry[];
  checks: Check[];
  /** Per-URL rows for the table (first TABLE_LIMIT entries). */
  table: SitemapRow[];
  host: string | null;
  bytes: number;
  /** Real totals (not capped by grouping). */
  errors: number;
  warnings: number;
  /** The "Summary" code panel text. */
  summary: string;
}

/** Text content of the first <tag>…</tag> in an entry body (entities decoded). */
function child(body: string, tag: string): string | null {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>\\s*([\\s\\S]*?)\\s*</${tag}>`).exec(body);
  if (!m) return null;
  const cdata = /^<!\[CDATA\[([\s\S]*)\]\]>$/.exec(m[1]);
  return cdata ? cdata[1] : m[1];
}

function lineAt(text: string, index: number): number {
  let n = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/**
 * Minimal well-formedness check: every start tag is closed in order.
 * Skips comments, CDATA, processing instructions and the doctype.
 * Returns an error message or null.
 */
export function wellFormedError(xml: string): string | null {
  const stack: { name: string; at: number }[] = [];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([A-Za-z_][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    if (!m[2]) continue;
    const [, close, name, , selfClose] = m;
    if (selfClose) continue;
    if (!close) {
      stack.push({ name, at: m.index });
      continue;
    }
    const top = stack.pop();
    if (!top) return `Line ${lineAt(xml, m.index)}: </${name}> has no matching start tag.`;
    if (top.name !== name) {
      return `Line ${lineAt(xml, m.index)}: expected </${top.name}> (opened on line ${lineAt(xml, top.at)}) but found </${name}>.`;
    }
  }
  const open = stack.pop();
  if (open) return `Line ${lineAt(xml, open.at)}: <${open.name}> is never closed.`;
  return null;
}

function checkLastmod(lm: string, now: Date): Issue | null {
  const m = W3C_DATE.exec(lm);
  if (!m) {
    return { level: "err", kind: "lastmod-format", text: `lastmod “${lm}” isn't W3C datetime (YYYY-MM-DD).` };
  }
  const [, , mo, d, hh, mi, ss] = m;
  const bad =
    (mo && (+mo < 1 || +mo > 12)) ||
    (d && (+d < 1 || +d > 31)) ||
    (hh && +hh > 23) ||
    (mi && +mi > 59) ||
    (ss && +ss > 59);
  if (bad) return { level: "err", kind: "lastmod-format", text: `lastmod “${lm}” isn't a real date.` };
  // Date-only values are read as UTC midnight; YYYY and YYYY-MM start on day 1.
  const t = Date.parse(m[4] ? lm : `${m[1]}-${mo ?? "01"}-${d ?? "01"}T00:00:00Z`);
  if (Number.isFinite(t) && t > now.getTime() + 86_400_000) {
    return { level: "warn", kind: "lastmod-future", text: `lastmod “${lm}” is in the future.` };
  }
  return null;
}

function entryIssues(
  body: string,
  seen: Set<string>,
  hostRef: { host: string | null },
  now: Date,
): { loc: string | null; lastmod: string | null; issues: Issue[] } {
  const rawLoc = child(body, "loc");
  const lastmod = child(body, "lastmod");
  const cf = child(body, "changefreq");
  const pr = child(body, "priority");
  const issues: Issue[] = [];
  let loc: string | null = null;

  if (rawLoc === null || rawLoc === "") {
    issues.push({ level: "err", kind: "no-loc", text: "Missing <loc>." });
  } else {
    if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i.test(rawLoc)) {
      issues.push({ level: "err", kind: "amp", text: "Unescaped & — write &amp;." });
    }
    loc = decodeEntities(rawLoc);
    if (!isAbsUrl(loc)) {
      issues.push({ level: "err", kind: "relative", text: "Not an absolute URL." });
    } else {
      let host: string | null = null;
      try {
        host = new URL(loc).host;
      } catch {
        issues.push({ level: "err", kind: "bad-url", text: "Not a valid URL." });
      }
      if (host !== null) {
        if (hostRef.host === null) hostRef.host = host;
        else if (host !== hostRef.host) {
          issues.push({
            level: "err",
            kind: "host",
            text: `Different host (${host}). A sitemap may only list URLs from its own host.`,
          });
        }
      }
      if (/^http:/i.test(loc)) issues.push({ level: "warn", kind: "http", text: "Uses http." });
    }
    if (loc.length > MAX_LOC) {
      issues.push({ level: "err", kind: "long", text: `URL is ${loc.length} characters; the limit is ${MAX_LOC}.` });
    }
    if (seen.has(loc)) issues.push({ level: "err", kind: "dup", text: "Duplicate URL." });
    seen.add(loc);
  }

  if (lastmod !== null) {
    const issue = checkLastmod(lastmod, now);
    if (issue) issues.push(issue);
  }
  if (cf !== null && !FREQ.has(cf)) {
    issues.push({ level: "err", kind: "changefreq", text: `changefreq “${cf}” isn't valid.` });
  }
  if (pr !== null && !/^(0(\.\d+)?|1(\.0+)?|\.\d+)$/.test(pr)) {
    issues.push({ level: "err", kind: "priority", text: "priority must be 0.0–1.0." });
  }
  return { loc, lastmod, issues };
}

/** Human file size: "312 B", "4 KB", "1.2 MB". */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function validateSitemap(xml: string, now: Date = new Date()): SitemapReport {
  const checks: Check[] = [];
  const chk = (level: CheckLevel, text: string) => checks.push({ level, text });
  const bytes = new TextEncoder().encode(xml).length;

  if (!xml.trim()) {
    chk("warn", "Nothing to check yet. Paste your sitemap.xml.");
    return {
      kind: "urlset",
      entries: [],
      checks,
      table: [],
      host: null,
      bytes: 0,
      errors: 0,
      warnings: 1,
      summary: "",
    };
  }

  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  const kind = isIndex ? "sitemapindex" : "urlset";
  const tag = isIndex ? "sitemap" : "url";
  let errors = 0;
  let warnings = 0;
  const doc = (level: "err" | "warn", text: string) => {
    chk(level, text);
    if (level === "err") errors++;
    else warnings++;
  };

  if (!/^\uFEFF?\s*<\?xml\b/.test(xml)) doc("warn", 'Missing the <?xml version="1.0" encoding="UTF-8"?> declaration.');
  else if (/^\uFEFF?\s+<\?xml/.test(xml)) doc("warn", "Remove the whitespace before <?xml …?>. Strict XML parsers reject anything before the declaration.");

  const root = /<(urlset|sitemapindex)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/i.exec(xml);
  if (!root) doc("err", "No <urlset> or <sitemapindex> root element.");
  else {
    const ns = /\sxmlns\s*=\s*["']([^"']*)["']/.exec(root[2]);
    if (!ns || ns[1] !== NS) doc("err", `The root element needs xmlns="${NS}".`);
    // Extension prefixes (image:, video:, news:, xhtml:) must be declared.
    const declared = new Set<string>();
    for (const d of root[2].matchAll(/\sxmlns:([\w.-]+)\s*=/g)) declared.add(d[1]);
    const used = new Set<string>();
    for (const u of xml.matchAll(/<\/?([A-Za-z_][\w.-]*):[\w.-]+/g)) used.add(u[1]);
    for (const p of used) {
      if (p !== "xml" && !declared.has(p)) doc("err", `<${p}:…> tags are used but xmlns:${p} isn't declared on the root element.`);
    }
  }

  const opens = (xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>`, "g")) ?? []).length;
  const closes = (xml.match(new RegExp(`</${tag}>`, "g")) ?? []).length;
  if (opens !== closes) doc("err", `Unbalanced tags: ${opens} <${tag}> vs ${closes} </${tag}>.`);
  else {
    const wf = wellFormedError(xml);
    if (wf) doc("err", `XML isn't well-formed. ${wf}`);
  }

  const entries: SitemapEntry[] = [];
  const seen = new Set<string>();
  const hostRef: { host: string | null } = { host: null };
  const reE = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
  let mE: RegExpExecArray | null;
  while ((mE = reE.exec(xml)) !== null) {
    const r = entryIssues(mE[1], seen, hostRef, now);
    entries.push({ index: entries.length + 1, ...r });
  }

  // Per-URL issues: one check each for small files, grouped by kind for big ones.
  const allIssues = entries.flatMap((e) => e.issues.map((i) => ({ e, i })));
  for (const { i } of allIssues) {
    if (i.level === "err") errors++;
    else warnings++;
  }
  const noun = isIndex ? "Sitemap" : "URL";
  if (allIssues.length <= PER_URL_CHECK_LIMIT) {
    for (const { e, i } of allIssues) chk(i.level, `${noun} ${e.index}: ${i.text}`);
  } else {
    const groups = new Map<string, { level: "err" | "warn"; text: string; at: number[] }>();
    for (const { e, i } of allIssues) {
      const g = groups.get(i.kind);
      if (g) g.at.push(e.index);
      else groups.set(i.kind, { level: i.level, text: i.text, at: [e.index] });
    }
    for (const g of groups.values()) {
      const first = g.at.slice(0, 5).join(", ");
      const more = g.at.length > 5 ? ` and ${g.at.length - 5} more` : "";
      const text = g.at.length === 1 ? g.text : groupText(g.text);
      chk(g.level, `${g.at.length} ${g.at.length === 1 ? noun : `${noun}s`} (${first}${more}): ${text}`);
    }
  }

  if (!entries.length) doc("err", `No <${tag}> entries found.`);
  if (entries.length > MAX_URLS) doc("err", `More than ${MAX_URLS.toLocaleString("en-US")} URLs. Split it and use a sitemap index.`);
  if (bytes > MAX_BYTES) doc("err", `The file is ${formatBytes(bytes)}; the limit is 50 MB uncompressed.`);

  chk(
    "info",
    `${isIndex ? "Sitemap index" : "URL set"} · ${entries.length.toLocaleString("en-US")} ${entries.length === 1 ? "entry" : "entries"} · ${formatBytes(bytes)} of 50 MB allowed.`,
  );
  if (/<priority[\s>]|<changefreq[\s>]/.test(xml)) {
    chk("info", "Google ignores priority and changefreq. lastmod is used when it's accurate.");
  }
  if (entries.length > TABLE_LIMIT) {
    chk("info", `The list below shows the first ${TABLE_LIMIT} entries. Checks above cover all ${entries.length.toLocaleString("en-US")}.`);
  }
  if (!errors && !warnings) chk("ok", isIndex ? "Valid sitemap index." : "Valid sitemap.");

  const table: SitemapRow[] = entries.slice(0, TABLE_LIMIT).map((e) => {
    let level: SitemapRow["level"] = "ok";
    if (e.issues.some((i) => i.level === "err")) level = "err";
    else if (e.issues.length) level = "warn";
    return {
      level,
      a: String(e.index),
      b: e.loc ?? "(no loc)",
      note: e.issues.map((i) => i.text).join(" ") || `OK${e.lastmod ? ` · lastmod ${e.lastmod}` : ""}`,
    };
  });

  const summary = [
    `${isIndex ? "sitemaps" : "urls"}: ${entries.length}`,
    `host: ${hostRef.host ?? "—"}`,
    `errors: ${errors}`,
    `warnings: ${warnings}`,
  ].join("\n");

  return { kind, entries, checks, table, host: hostRef.host, bytes, errors, warnings, summary };
}

/** Strip entry-specific values from a grouped message ("lastmod “x” isn't…" → "lastmod isn't…"). */
function groupText(text: string): string {
  return text.replace(/\s*“[^”]*”/g, "").replace(/\s*\([^)]*\)\./, ".");
}
