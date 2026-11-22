/**
 * Sitemap validator — pure logic (no React, no DOM).
 *
 * Reads pasted sitemap XML as text and checks it against the sitemaps.org
 * protocol: declaration, namespace, well-formed tags, a <loc> on every entry,
 * absolute same-host URLs, duplicates, unescaped &, lastmod (W3C datetime),
 * changefreq, priority and the 50,000-URL / 50 MB limits. Nothing is fetched.
 */

import { decodeEntities, isAbsUrl, isRealDate, type Check, type CheckLevel } from "@/components/tools/seo-shared/seo.lib";

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

/** & that doesn't start one of XML's entity or character references. */
const BAD_AMP = /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-f]+;)/i;

interface ChildValue {
  /** Text content: entities decoded in text, CDATA sections taken literally. */
  value: string;
  /** A raw & outside CDATA (invalid XML). */
  badAmp: boolean;
}

/** Text content of the first <tag>…</tag> in an entry body. */
function child(body: string, tag: string): ChildValue | null {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>\\s*([\\s\\S]*?)\\s*</${tag}>`).exec(body);
  if (!m) return null;
  let value = "";
  let badAmp = false;
  const text = (t: string) => {
    if (BAD_AMP.test(t)) badAmp = true;
    value += decodeEntities(t);
  };
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
  let last = 0;
  let c: RegExpExecArray | null;
  while ((c = re.exec(m[1])) !== null) {
    text(m[1].slice(last, c.index));
    value += c[1];
    last = re.lastIndex;
  }
  text(m[1].slice(last));
  return { value, badAmp };
}

/** Blank out a match but keep its newlines, so offsets and line numbers stay put. */
const blank = (s: string) => s.replace(/[^\n]/g, " ");

/**
 * The XML with comments and processing instructions (the <?xml?> declaration
 * included) blanked out, so commented-out entries are never scanned.
 * `withCdata: false` also blanks CDATA sections (for counting tags).
 */
function maskInert(xml: string, withCdata = true): string {
  const re = withCdata ? /<!--[\s\S]*?(?:-->|$)|<\?[\s\S]*?(?:\?>|$)/g : /<!--[\s\S]*?(?:-->|$)|<\?[\s\S]*?(?:\?>|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)/g;
  return xml.replace(re, blank);
}

function lineAt(text: string, index: number): number {
  let n = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/**
 * Minimal well-formedness check: every start tag is closed in order, there's
 * exactly one root element, and no text sits outside it. Skips comments,
 * CDATA, processing instructions and the doctype. Returns an error message or null.
 */
export function wellFormedError(xml: string): string | null {
  const stack: { name: string; at: number }[] = [];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([A-Za-z_][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let root: string | null = null;
  let last = 0;
  const outside = (from: number, to: number) => {
    const i = xml.slice(from, to).search(/\S/); // \s covers the BOM too
    return i === -1 ? null : from + i;
  };
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    if (!stack.length) {
      const at = outside(last, m.index) ?? (m[0].startsWith("<![CDATA[") ? m.index : null);
      if (at !== null) return `Line ${lineAt(xml, at)}: text outside the root element.`;
    }
    last = re.lastIndex;
    if (!m[2]) continue;
    const [, close, name, , selfClose] = m;
    if (!close && !stack.length) {
      if (root !== null) {
        return `Line ${lineAt(xml, m.index)}: a second root element <${name}>. An XML file has exactly one root (<${root}>).`;
      }
      root = name;
    }
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
  const tail = outside(last, xml.length);
  if (tail !== null) return `Line ${lineAt(xml, tail)}: text outside the root element.`;
  const unclosed = /<!--(?![\s\S]*?-->)/.exec(xml);
  if (unclosed) return `Line ${lineAt(xml, unclosed.index)}: a comment is never closed (missing -->).`;
  return null;
}

function checkLastmod(lm: string, now: Date): Issue | null {
  const m = W3C_DATE.exec(lm);
  if (!m) {
    return { level: "err", kind: "lastmod-format", text: `lastmod “${lm}” isn't W3C datetime (YYYY-MM-DD).` };
  }
  const [, y, mo, d, hh, mi, ss] = m;
  const bad =
    (mo && (+mo < 1 || +mo > 12)) ||
    (mo && d && !isRealDate(+y, +mo, +d)) ||
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
  const lastmod = child(body, "lastmod")?.value ?? null;
  const cf = child(body, "changefreq")?.value ?? null;
  const pr = child(body, "priority")?.value ?? null;
  const issues: Issue[] = [];
  let loc: string | null = null;

  if (rawLoc === null || rawLoc.value === "") {
    issues.push({ level: "err", kind: "no-loc", text: "Missing <loc>." });
  } else {
    if (rawLoc.badAmp) {
      issues.push({ level: "err", kind: "amp", text: "Unescaped & — write &amp;." });
    }
    loc = rawLoc.value;
    if (!isAbsUrl(loc)) {
      issues.push(
        /^https?:\/\//i.test(loc)
          ? { level: "err", kind: "bad-url", text: /\s/.test(loc) ? "URL contains whitespace — encode spaces as %20." : "Not a valid URL." }
          : { level: "err", kind: "relative", text: "Not an absolute URL." },
      );
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

  // Scan with comments and PIs blanked (same offsets), so commented-out
  // markup never counts as entries, roots or tags.
  const scan = maskInert(xml);
  const bare = maskInert(xml, false);
  const isIndex = /<sitemapindex[\s>/]/i.test(bare);
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
  else if (/^\s+<\?xml/.test(xml.replace(/^\uFEFF/, ""))) doc("warn", "Remove the whitespace before <?xml …?>. Strict XML parsers reject anything before the declaration.");

  const root = /<(urlset|sitemapindex)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/i.exec(bare);
  if (!root) doc("err", "No <urlset> or <sitemapindex> root element.");
  else {
    const ns = /\sxmlns\s*=\s*["']([^"']*)["']/.exec(root[2]);
    if (!ns || ns[1] !== NS) doc("err", `The root element needs xmlns="${NS}".`);
    // Extension prefixes (image:, video:, news:, xhtml:) must be declared.
    const declared = new Set<string>();
    for (const d of root[2].matchAll(/\sxmlns:([\w.-]+)\s*=/g)) declared.add(d[1]);
    const used = new Set<string>();
    for (const u of bare.matchAll(/<\/?([A-Za-z_][\w.-]*):[\w.-]+/g)) used.add(u[1]);
    for (const p of used) {
      if (p !== "xml" && !declared.has(p)) doc("err", `<${p}:…> tags are used but xmlns:${p} isn't declared on the root element.`);
    }
  }

  const opens = (bare.match(new RegExp(`<${tag}(?:\\s[^>]*)?>`, "g")) ?? []).filter((t) => !t.endsWith("/>")).length;
  const closes = (bare.match(new RegExp(`</${tag}\\s*>`, "g")) ?? []).length;
  const wf = wellFormedError(xml);
  if (wf) {
    doc("err", `XML isn't well-formed. ${wf}${opens !== closes ? ` (${opens} <${tag}> vs ${closes} </${tag}>.)` : ""}`);
  } else if (opens !== closes) doc("err", `Unbalanced tags: ${opens} <${tag}> vs ${closes} </${tag}>.`);

  const entries: SitemapEntry[] = [];
  const seen = new Set<string>();
  const hostRef: { host: string | null } = { host: null };
  // An empty self-closing <url/> is an entry too (one with no <loc>).
  const reE = new RegExp(`<${tag}(?:\\s[^>]*?)?(?:/>|>([\\s\\S]*?)</${tag}\\s*>)`, "g");
  let mE: RegExpExecArray | null;
  while ((mE = reE.exec(scan)) !== null) {
    const r = entryIssues(mE[1] ?? "", seen, hostRef, now);
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
  if (/<priority[\s>]|<changefreq[\s>]/.test(bare)) {
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
