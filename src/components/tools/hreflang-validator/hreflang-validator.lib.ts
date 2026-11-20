import {
  checkLangCode,
  escapeXml,
  findTags,
  hasProblems,
  isAbsUrl,
  sameUrl,
  type Check,
} from "../seo-shared/seo.lib";

export const SAMPLE_PAGE = "https://example.com/de/";
export const SAMPLE_HTML = `<head>
  <title>Preise</title>
  <link rel="canonical" href="https://example.com/de/" />
  <link rel="alternate" hreflang="en" href="https://example.com/" />
  <link rel="alternate" hreflang="en-UK" href="https://example.com/uk/" />
  <link rel="alternate" hreflang="fr" href="/fr/" />
  <link rel="alternate" hreflang="x-default" href="https://example.com/" />
</head>`;

export interface AltTag {
  lang: string;
  url: string;
}

export interface ParsedHead {
  tags: AltTag[];
  canonical: string | null;
}

/** Read `<link rel="alternate" hreflang>` and `<link rel="canonical">` from pasted HTML. */
export function parseHead(html: string): ParsedHead {
  const tags: AltTag[] = [];
  let canonical: string | null = null;
  for (const t of findTags(html, "link")) {
    const rel = (t.attrs.rel ?? "").toLowerCase().split(/\s+/);
    if (rel.includes("alternate") && "hreflang" in t.attrs) {
      tags.push({ lang: t.attrs.hreflang.trim(), url: (t.attrs.href ?? "").trim() });
    }
    if (rel.includes("canonical") && canonical === null) canonical = (t.attrs.href ?? "").trim();
  }
  return { tags, canonical };
}

export interface AuditRow {
  level: "err" | "warn" | "ok";
  a: string;
  b: string;
  note: string;
}

export interface Audit {
  checks: Check[];
  rows: AuditRow[];
  corrected: string;
  tagCount: number;
}

export function auditHreflang(page: string, html: string): Audit {
  const pageUrl = page.trim();
  const { tags, canonical } = parseHead(html);
  const checks: Check[] = [];
  const push = (level: Check["level"], text: string) => checks.push({ level, text });
  const rows: AuditRow[] = [];
  const seenLang = new Set<string>();
  const urlOwner = new Map<string, string>();

  for (const t of tags) {
    const errs: string[] = [];
    const warns: string[] = [];
    const c = checkLangCode(t.lang);
    if (!c.ok) errs.push(c.msg ?? "Invalid code.");
    else if (c.warn) warns.push(c.warn);
    if (!isAbsUrl(t.url)) errs.push("Relative URL — use an absolute https:// URL.");
    else if (/^http:/i.test(t.url)) errs.push("Uses http — link to the https version.");
    const key = t.lang.toLowerCase();
    if (seenLang.has(key)) errs.push("Duplicate hreflang value.");
    seenLang.add(key);
    const owner = urlOwner.get(t.url);
    if (owner && t.lang !== "x-default" && owner !== "x-default") warns.push(`Same URL as “${owner}”.`);
    if (!owner) urlOwner.set(t.url, t.lang);

    const level: AuditRow["level"] = errs.length ? "err" : warns.length ? "warn" : "ok";
    rows.push({ level, a: t.lang || "(empty)", b: t.url || "(empty)", note: [...errs, ...warns].join(" ") || "OK" });
    errs.forEach((x) => push("err", `${t.lang}: ${x}`));
    warns.forEach((x) => push("warn", `${t.lang}: ${x}`));
  }

  if (!tags.length) {
    push("err", 'No <link rel="alternate" hreflang> tags found.');
  } else {
    if (!seenLang.has("x-default")) push("warn", "No x-default tag.");
    const selfRef = pageUrl ? tags.some((t) => sameUrl(t.url, pageUrl)) : true;
    if (pageUrl && !selfRef) {
      push("err", `Missing self-reference: none of the tags point to this page (${pageUrl}). Each page must list itself.`);
    }
    if (canonical && pageUrl && !sameUrl(canonical, pageUrl)) {
      push("err", `The canonical tag points to ${canonical}. Search engines ignore hreflang on non-canonical pages.`);
    }
    if (!pageUrl) push("info", "Add this page's URL to check the self-reference and canonical.");
    push("info", "Return links can't be checked from one page. Paste each listed page's head to confirm they all link back.");
    if (!hasProblems(checks)) push("ok", `${tags.length} hreflang tags, all valid.`);
  }

  return { checks, rows, corrected: correctedTags(tags, pageUrl), tagCount: tags.length };
}

/** Guess the page's own language from its first path segment (/de/ → de). */
function guessLang(page: string): string | null {
  try {
    const seg = new URL(page).pathname.split("/").filter(Boolean)[0];
    if (!seg) return null;
    const c = checkLangCode(seg);
    return c.ok && c.fixed ? c.fixed : null;
  } catch {
    return null;
  }
}

/** A deduplicated, fixed set: normalised codes, https, absolute URLs, self-reference. */
export function correctedTags(tags: readonly AltTag[], page: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  const fixedUrls: string[] = [];
  for (const t of tags) {
    const c = checkLangCode(t.lang);
    const lang = c.fixed ?? t.lang;
    if (seen.has(lang.toLowerCase())) continue;
    seen.add(lang.toLowerCase());
    let url = t.url.replace(/^http:/i, "https:");
    if (!isAbsUrl(url) && page) {
      try {
        url = new URL(url, page).href.replace(/^http:/i, "https:");
      } catch {
        /* keep as typed */
      }
    }
    fixedUrls.push(url);
    if (!c.fixed) out.push(`<!-- “${t.lang}” isn't a valid code: replace it -->`);
    out.push(`<link rel="alternate" hreflang="${escapeXml(lang)}" href="${escapeXml(url)}" />`);
  }
  if (page && out.length && !fixedUrls.some((u) => sameUrl(u, page))) {
    const g = guessLang(page);
    out.push(
      g && !seen.has(g.toLowerCase())
        ? `<!-- self-reference: check this is the page's language -->`
        : `<!-- self-reference: set this page's own language code -->`,
      `<link rel="alternate" hreflang="${escapeXml(g && !seen.has(g.toLowerCase()) ? g : "LANG")}" href="${escapeXml(page)}" />`,
    );
  }
  return out.length ? out.join("\n") : "<!-- nothing to fix yet -->";
}
