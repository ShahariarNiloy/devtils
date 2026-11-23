/**
 * SEO checker: audit one page from its HTML (plus, when it was fetched, the
 * status, redirects, headers and robots.txt). Pure — no React, no DOM — and
 * built on the other SEO tools' libs so every check reads the same way.
 */

import { auditHreflang, parseHead, type Audit } from "../hreflang-validator/hreflang-validator.lib";
import { buildMeta, estimateWidth, type Measure } from "../meta-preview/meta-preview.lib";
import { parseRobotsTxt, testPath } from "../robots-txt-generator/robots-txt-generator.lib";
import type { AssetInfo } from "@/lib/seo-fetch/asset-types";
import { allTitles, metaContent, readIcons, type IconCandidate } from "../seo-shared/page-meta.lib";
import { findTags, isAbsUrl, sameUrl, stripInertHtml, type Check, type CheckLevel } from "../seo-shared/seo.lib";

export interface Hop {
  url: string;
  status: number;
}

export interface PageInput {
  /** The page's address (the final one after redirects). May be "" when pasted. */
  url: string;
  html: string;
  /** Fetched mode only. */
  status?: number;
  hops?: Hop[];
  headers?: Record<string, string>;
  /** robots.txt text; null = the site has none; undefined = not checked. */
  robotsTxt?: string | null;
  truncated?: boolean;
}

export type SectionId = "response" | "indexing" | "search" | "social" | "hreflang" | "data" | "basics";

export interface Section {
  id: SectionId;
  title: string;
  checks: Check[];
}

export interface SocialInfo {
  title: string;
  desc: string;
  image: string;
  imageAlt: string;
  /** summary_large_image unless the page asks for the small card. */
  large: boolean;
  site: string;
  domain: string;
}

export interface LdBlock {
  ok: boolean;
  types: string[];
  error?: string;
  text: string;
}

export interface Report {
  sections: Section[];
  /** null when there's not enough to say (pasted without a URL). */
  indexable: boolean | null;
  /** Why it isn't indexable — the first thing to fix. */
  blockers: string[];
  serp: ReturnType<typeof buildMeta>["serp"];
  social: SocialInfo;
  hreflang: Audit | null;
  jsonLd: LdBlock[];
  canonical: string | null;
  /** Favicon candidates, best first; the browser loads them to check. */
  icons: IconCandidate[];
}

/** What loading one icon in the browser found. */
export type IconProbe = { state: "loading" } | { state: "ok"; w: number; h: number } | { state: "error" };

const short = (href: string) => (href.startsWith("data:") ? "an inline data: icon" : href.replace(/^https?:\/\//, "").slice(0, 80));

/**
 * Favicon checks once the candidates have been loaded: the first that loads
 * is the one browsers and Google show. Empty while any are still loading.
 */
export function iconChecks(icons: readonly IconCandidate[], probes: Readonly<Record<string, IconProbe>>, hasUrl: boolean): Check[] {
  if (!hasUrl) return [{ level: "info", text: "Add the page URL to check its favicon." }];
  if (icons.some((c) => (probes[c.href]?.state ?? "loading") === "loading")) return [];
  const out: Check[] = [];
  for (const c of icons) {
    if (c.kind !== "default" && probes[c.href]?.state === "error") out.push({ level: "err", text: `The icon ${short(c.href)} doesn't load (missing, or the server blocks it).` });
  }
  const chosen = icons.find((c) => probes[c.href]?.state === "ok");
  const probe = chosen ? probes[chosen.href] : undefined;
  if (!chosen || probe?.state !== "ok") {
    out.push({ level: "warn", text: icons.length ? "No favicon loads, so Google shows a generic globe next to your result." : "The page opts out of a favicon (an empty data: icon), so Google shows a generic globe." });
    return out;
  }
  if (chosen.kind === "default") {
    out.push({ level: "info", text: "No <link rel=\"icon\"> — browsers find /favicon.ico on their own. Google asks for the icon to be declared; add <link rel=\"icon\" href=\"/favicon.ico\">." });
  } else if (chosen.kind === "apple") {
    out.push({ level: "warn", text: "Only an Apple touch icon loads. Add a <link rel=\"icon\"> so every browser and Google find a favicon." });
  }
  const svg = /svg/i.test(chosen.type) || /\.svg(?:[?#]|$)/i.test(chosen.href) || chosen.href.startsWith("data:image/svg");
  const { w, h } = probe;
  if (!svg && Math.min(w, h) < 48) out.push({ level: "warn", text: `The favicon is ${w} × ${h}. Google needs at least 48 × 48 (multiples of 48 look sharpest), or use an SVG.` });
  if (w !== h) out.push({ level: "warn", text: `The favicon is ${w} × ${h}, not square — it'll be squashed or cropped.` });
  if (!out.some((c) => c.level === "err" || c.level === "warn")) out.push({ level: "ok", text: `Favicon loads (${svg ? "SVG" : `${w} × ${h}`}).` });
  return out;
}

/* ------------------------------------------------------------- reading */

/** JSON-LD blocks: parsed, with every @type (including those in @graph). */
export function readJsonLd(html: string): LdBlock[] {
  const noComments = html.replace(/<!--[\s\S]*?-->/g, "");
  const out: LdBlock[] = [];
  for (const m of noComments.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    const text = m[1].trim();
    try {
      const data: unknown = JSON.parse(text);
      const types = new Set<string>();
      const walk = (v: unknown, depth: number) => {
        if (depth > 6 || v === null || typeof v !== "object") return;
        if (Array.isArray(v)) {
          for (const x of v) walk(x, depth + 1);
          return;
        }
        const t: unknown = Reflect.get(v, "@type");
        if (depth <= 2) {
          if (typeof t === "string") types.add(t);
          else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") types.add(x);
        }
        walk(Reflect.get(v, "@graph"), depth + 1);
      };
      walk(data, 0);
      out.push({ ok: true, types: [...types], text });
    } catch (e) {
      out.push({ ok: false, types: [], error: e instanceof Error ? e.message : "Invalid JSON", text });
    }
  }
  return out;
}

/** `name` of a WebSite node in the page's JSON-LD — what Google uses as the site name first. */
function websiteName(blocks: readonly LdBlock[]): string | null {
  for (const b of blocks) {
    if (!b.ok || !b.types.includes("WebSite")) continue;
    const data: unknown = JSON.parse(b.text);
    const graph: unknown = data && typeof data === "object" ? Reflect.get(data, "@graph") : undefined;
    const nodes: unknown[] = Array.isArray(data) ? data : [data, ...(Array.isArray(graph) ? graph : [])];
    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      const t: unknown = Reflect.get(n, "@type");
      const name: unknown = Reflect.get(n, "name");
      if ((t === "WebSite" || (Array.isArray(t) && t.includes("WebSite"))) && typeof name === "string" && name.trim()) return name.trim();
    }
  }
  return null;
}

/** Second-level labels that are really part of a country's suffix (example.co.uk). */
const SUFFIX_2ND = new Set(["co", "com", "net", "org", "gov", "ac", "edu", "or", "ne", "go"]);

/** "news.ycombinator.com" → "Ycombinator", "shop.example.co.uk" → "Example". */
function domainName(host: string): string {
  const labels = host.replace(/^www\./, "").split(".");
  let i = labels.length - 2;
  if (i > 0 && labels[labels.length - 1].length === 2 && SUFFIX_2ND.has(labels[i])) i--;
  const label = labels[Math.max(0, i)] ?? host;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const robotsDirectives = (s: string) =>
  s
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);

/* --------------------------------------------------------------- audit */

export function auditPage(p: PageInput, measure: Measure = estimateWidth): Report {
  const html = p.html;
  const fetched = p.status !== undefined;
  const url = p.url.trim();
  const page = isAbsUrl(url) ? new URL(url) : null;
  const blockers: string[] = [];
  const sec = (id: SectionId, title: string) => {
    const s: Section = { id, title, checks: [] };
    const chk = (level: CheckLevel, text: string) => s.checks.push({ level, text });
    return { s, chk };
  };

  /* Response */
  const response = sec("response", "Response");
  if (fetched) {
    const hops = p.hops ?? [];
    const status = p.status ?? 0;
    if (status === 200) response.chk("ok", "The page answers 200 OK.");
    else if (status >= 400) {
      response.chk("err", `The page answers ${status}. Search engines drop pages that return errors.`);
      blockers.push(`it returns ${status}`);
    } else response.chk("warn", `The page answers ${status}.`);
    const redirects = hops.slice(0, -1);
    if (redirects.length) {
      response.chk(redirects.length > 1 ? "warn" : "info", `${redirects.length} redirect${redirects.length > 1 ? "s" : ""} before the page: ${hops.map((h) => `${h.status} ${h.url}`).join(" → ")}`);
      if (redirects.some((h) => h.status === 302 || h.status === 307)) {
        response.chk("warn", "A temporary redirect (302/307) is in the chain. Use 301 or 308 for moves that are permanent, so search engines move the ranking too.");
      }
      if (redirects.length > 1) response.chk("warn", "Several hops in a row slow the page down. Redirect straight to the final address.");
    }
    if (page?.protocol === "http:") response.chk("err", "The page is served over plain http. Use https.");
    if (p.truncated) response.chk("info", "The page is over 2 MB; only the first 2 MB was checked.");
  } else {
    response.chk("info", "Pasted source: status, redirects, response headers and robots.txt weren't checked.");
  }

  /* Indexing */
  const indexing = sec("indexing", "Indexing");
  const metaRobots = [metaContent(html, "robots"), metaContent(html, "googlebot")].filter((x): x is string => x !== null);
  const directives = metaRobots.flatMap(robotsDirectives);
  const headerDirectives = robotsDirectives(p.headers?.["x-robots-tag"] ?? "");
  if (directives.includes("noindex") || directives.includes("none")) {
    indexing.chk("err", "The page has <meta name=\"robots\" content=\"noindex\">, so it won't appear in search results.");
    blockers.push("it's marked noindex");
  }
  if (headerDirectives.includes("noindex") || headerDirectives.includes("none")) {
    indexing.chk("err", "The server sends X-Robots-Tag: noindex, so the page won't appear in search results.");
    blockers.push("the X-Robots-Tag header says noindex");
  }
  if (directives.includes("nofollow") || headerDirectives.includes("nofollow")) {
    indexing.chk("warn", "Links on this page are marked nofollow, so they won't pass ranking to the pages they point to.");
  }
  if (p.robotsTxt !== undefined && page) {
    if (p.robotsTxt === null) indexing.chk("info", "The site has no robots.txt — everything may be crawled, which is fine.");
    else {
      const t = testPath(parseRobotsTxt(p.robotsTxt).rules, "Googlebot", page.pathname + page.search);
      if (!t.allowed && t.rule) {
        indexing.chk("err", `robots.txt blocks Googlebot from this page (“Disallow: ${t.rule.path}”). Google can't read it.`);
        blockers.push("robots.txt blocks it");
      } else indexing.chk("ok", "robots.txt lets Googlebot crawl this page.");
    }
  }
  const { canonical: firstCanonical } = parseHead(html);
  const canonicals = findTags(html, "link").filter((t) => (t.attrs.rel ?? "").toLowerCase().split(/\s+/).includes("canonical"));
  const linkHeaderCanonical = /<([^>]+)>\s*;\s*rel="?canonical"?/i.exec(p.headers?.link ?? "")?.[1] ?? null;
  const canonical = firstCanonical ?? linkHeaderCanonical;
  if (canonicals.length > 1) indexing.chk("err", `The page declares ${canonicals.length} canonical URLs. Search engines may ignore all of them — keep one.`);
  if (!canonical) indexing.chk("warn", "No canonical URL. Add <link rel=\"canonical\"> so duplicates (tracking params, http/https, www) count as this page.");
  else if (!isAbsUrl(canonical)) indexing.chk("warn", `The canonical URL is relative (${canonical}). Use the full https:// address.`);
  else if (page && !sameUrl(canonical, page.href)) {
    indexing.chk("warn", `The canonical points elsewhere: ${canonical}. Search engines will likely index that page instead of this one.`);
  } else indexing.chk("ok", "The canonical URL points to this page.");
  if (!blockers.length && (fetched || page)) indexing.chk("ok", "Nothing stops search engines from indexing this page.");

  /* Search result */
  const titles = allTitles(html);
  const desc = metaContent(html, "description");
  const meta = buildMeta({ title: titles[0] ?? "", desc: desc ?? "", url: page?.href ?? "" }, "desktop", measure);
  const search = sec("search", "Search result");
  search.s.checks.push(...meta.checks.filter((c) => !/must be absolute/.test(c.text)));
  if (titles.length > 1) search.chk("warn", `The page has ${titles.length} <title> tags. Browsers and search engines use the first.`);

  /* Social */
  const social = sec("social", "Sharing");
  const ogTitle = metaContent(html, "og:title");
  const ogDesc = metaContent(html, "og:description");
  const ogImage = metaContent(html, "og:image") ?? metaContent(html, "og:image:url") ?? metaContent(html, "twitter:image");
  const twCard = metaContent(html, "twitter:card");
  const ogUrl = metaContent(html, "og:url");
  if (!ogTitle) social.chk(titles[0] ? "warn" : "err", titles[0] ? "No og:title — platforms will fall back to the <title>." : "No og:title and no <title>.");
  if (!ogDesc) social.chk("warn", desc ? "No og:description — some platforms fall back to the meta description, others show none." : "No og:description.");
  let image = ogImage ?? "";
  if (!ogImage) social.chk("err", "No og:image. Links without an image get far fewer clicks.");
  else if (!isAbsUrl(ogImage)) {
    social.chk("warn", `og:image is relative (${ogImage}). Crawlers need the full https:// address.`);
    if (page) image = new URL(ogImage, page).href;
  }
  if (ogUrl && canonical && isAbsUrl(ogUrl) && isAbsUrl(canonical) && !sameUrl(ogUrl, canonical)) {
    social.chk("warn", `og:url (${ogUrl}) doesn't match the canonical URL. Shares should point at the canonical address.`);
  }
  if (!twCard) social.chk("info", "No twitter:card. X falls back to a small summary card — add summary_large_image for a big image.");
  if (ogTitle && ogDesc && ogImage) social.chk("ok", "The essentials for a share card are here.");

  /* Hreflang */
  const hreflangSec = sec("hreflang", "Languages (hreflang)");
  const hasHreflang = parseHead(html).tags.length > 0;
  let hreflang: Audit | null = null;
  if (hasHreflang && page) {
    hreflang = auditHreflang(page.href, html);
    hreflangSec.s.checks.push(...hreflang.checks);
  } else if (hasHreflang) hreflangSec.chk("info", "Add the page URL to check its hreflang tags.");
  else hreflangSec.chk("info", "No hreflang tags — that's fine for a site in one language.");

  /* Structured data */
  const data = sec("data", "Structured data");
  const jsonLd = readJsonLd(html);
  jsonLd.forEach((b, i) => {
    if (!b.ok) data.chk("err", `JSON-LD block ${i + 1} isn't valid JSON (${b.error}). Search engines ignore it entirely.`);
  });
  const types = [...new Set(jsonLd.flatMap((b) => b.types))];
  if (types.length) data.chk("ok", `Found ${types.join(", ")}.`);
  else if (!jsonLd.length) data.chk("info", "No JSON-LD structured data. Adding it (Article, Product, FAQ…) can earn rich results.");
  if (/\bitemscope\b/i.test(stripInertHtml(html))) data.chk("info", "The page also uses microdata (itemscope).");

  /* Page basics */
  const basics = sec("basics", "Page basics");
  const htmlTag = findTags(html, "html")[0];
  if (!htmlTag?.attrs.lang) basics.chk("warn", "<html> has no lang attribute. Screen readers and search engines use it to know the language.");
  if (metaContent(html, "viewport") === null) basics.chk("warn", "No viewport meta tag — the page won't scale properly on phones.");
  const h1s = (stripInertHtml(html).match(/<h1\b/gi) ?? []).length;
  if (h1s === 0) basics.chk("warn", "No <h1> heading. One clear main heading helps readers and search engines.");
  else if (h1s > 1) basics.chk("info", `${h1s} <h1> headings. That's allowed, but one main heading is clearer.`);
  const imgs = findTags(html, "img");
  const noAlt = imgs.filter((t) => !("alt" in t.attrs)).length;
  if (noAlt) basics.chk("warn", `${noAlt} of ${imgs.length} images have no alt attribute.`);
  if (!basics.s.checks.some((c) => c.level !== "info")) basics.chk("ok", "Language, viewport, headings and image alt text look right.");

  const host = page?.hostname ?? "";
  // Google's site name: WebSite structured data, then og:site_name, then the domain.
  const siteName = websiteName(jsonLd) ?? (metaContent(html, "og:site_name") || null) ?? (host ? domainName(host) : null);
  if (siteName) meta.serp.site = siteName;
  // A blocker is certain even from pasted source; "indexable" needs a URL.
  let indexable: boolean | null = null;
  if (blockers.length) indexable = false;
  else if (fetched || page) indexable = true;
  return {
    sections: [response.s, indexing.s, search.s, social.s, hreflangSec.s, data.s, basics.s],
    indexable,
    blockers,
    serp: meta.serp,
    social: {
      title: ogTitle || titles[0] || "",
      desc: ogDesc || desc || "",
      image,
      imageAlt: metaContent(html, "og:image:alt") ?? metaContent(html, "twitter:image:alt") ?? "",
      large: twCard ? twCard === "summary_large_image" : true,
      site: metaContent(html, "og:site_name") ?? "",
      domain: host.replace(/^www\./, ""),
    },
    hreflang,
    jsonLd,
    canonical,
    icons: readIcons(html, page?.href ?? ""),
  };
}

const mb = (n: number) => `${(n / 1048576).toFixed(n < 10 * 1048576 ? 1 : 0)} MB`;
const kb = (n: number) => (n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : mb(n));

/**
 * What crawlers hit when they fetch the share image or the favicon — the
 * server-side view the browser can't give: status, real type, size, and
 * robots.txt rules for the crawler that fetches it.
 */
export function assetChecks(role: "share" | "favicon", a: AssetInfo): Check[] {
  const what = role === "share" ? "The share image" : "The favicon";
  if (a.error) return [{ level: "err", text: `${what} couldn't be fetched by a crawler: ${a.error}` }];
  const out: Check[] = [];
  const status = a.status ?? 0;
  if (status >= 400) return [{ level: "err", text: `${what} answers ${status} to crawlers, so it won't show.` }];
  const type = a.contentType ?? "";
  // .ico is often served as octet-stream; browsers cope, crawlers usually do too.
  if (type && !type.startsWith("image/")) {
    const ico = role === "favicon" && /\.ico(?:[?#]|$)/i.test(a.finalUrl ?? a.url) && type === "application/octet-stream";
    out.push(ico ? { level: "info", text: "The favicon is served as application/octet-stream. Serving it as image/x-icon is safer." } : { level: "err", text: `${what} is served as ${type}, not an image — often an error or login page.` });
  }
  if (role === "share" && a.bytes) {
    if (a.bytes > 5 * 1048576) out.push({ level: "err", text: `The share image is ${mb(a.bytes)}. X won't show images over 5 MB (Facebook's limit is 8 MB) — compress it.` });
    else if (a.bytes > 1048576) out.push({ level: "warn", text: `The share image is ${mb(a.bytes)}. Under 1 MB loads reliably in every app and chat.` });
  }
  if (a.redirects) out.push({ level: "info", text: `${what} redirects ${a.redirects === 1 ? "once" : `${a.redirects} times`} before loading. Point the tag straight at the final URL.` });
  if (role === "share" && a.blocked?.Twitterbot) out.push({ level: "warn", text: "robots.txt blocks Twitterbot from the share image, so X shows the card without it." });
  if (role === "favicon" && a.blocked?.["Googlebot-Image"]) out.push({ level: "err", text: "robots.txt blocks Googlebot-Image from the favicon, so Google can't show it next to your result." });
  if (!out.some((c) => c.level !== "info")) {
    const size = a.bytes ? `, ${kb(a.bytes)}` : "";
    out.push({ level: "ok", text: `${role === "share" ? "Crawlers" : "Google's crawler"} can fetch ${what.toLowerCase()} (${type || "image"}${size}).` });
  }
  return out;
}
