import { escapeXml, type Check } from "../seo-shared/seo.lib";

export type WwwRule = "keep" | "remove" | "add";
export type SlashRule = "keep" | "add" | "remove";
export type CanonicalFormat = "html" | "http" | "url";

export interface CanonicalOptions {
  www: WwwRule;
  slash: SlashRule;
  https: boolean;
  lower: boolean;
  index: boolean;
  track: boolean;
  allParams: boolean;
  sort: boolean;
  hash: boolean;
}

export type ToggleId = "https" | "lower" | "index" | "track" | "allParams" | "sort" | "hash";

export const TOGGLES: readonly { id: ToggleId; label: string }[] = [
  { id: "https", label: "Force https" },
  { id: "lower", label: "Lowercase host and path" },
  { id: "index", label: "Drop index.html" },
  { id: "track", label: "Strip tracking params" },
  { id: "allParams", label: "Strip all params" },
  { id: "sort", label: "Sort remaining params" },
  { id: "hash", label: "Remove #fragment" },
];

export const DEFAULT_OPTIONS: CanonicalOptions = {
  www: "remove",
  slash: "remove",
  https: true,
  lower: true,
  index: true,
  track: true,
  allParams: false,
  sort: true,
  hash: true,
};

export const SAMPLE_URL =
  "http://www.Example.com/Blog/Post-Title/index.html?utm_source=newsletter&page=2&gclid=abc123#comments";

export const FORMATS: readonly { id: CanonicalFormat; label: string }[] = [
  { id: "html", label: "HTML tag" },
  { id: "http", label: "HTTP header" },
  { id: "url", label: "URL only" },
];

/** Query params that only track a visit, never change the content. */
export const TRACKING_PARAM = /^(utm_\w+|gclid|gbraid|wbraid|fbclid|msclkid|dclid|yclid|twclid|mc_cid|mc_eid|_hsenc|_hsmi|ref|sessionid|sid)$/i;

export interface CanonicalResult {
  /** null when the input isn't a parseable absolute URL. */
  canonical: string | null;
  checks: Check[];
}

const NORMALISED = "Normalised the URL's form (default port, dot segments, root slash, encoding or an empty ? / #)";

/** Decoded name of a raw `k=v` query segment ("utm%5Fsource=x" → "utm_source"). */
function paramKey(seg: string): string {
  const k = seg.split("=")[0].replace(/\+/g, " ");
  try {
    return decodeURIComponent(k);
  } catch {
    return k;
  }
}

/** Raw host as typed (URL() lowercases it, which hides what changed). */
function rawHost(input: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/?#]*@)?([^/?#:]*)/i.exec(input)?.[1] ?? "";
}

export function canonicalize(input: string, o: CanonicalOptions): CanonicalResult {
  const checks: Check[] = [];
  const push = (level: Check["level"], text: string) => checks.push({ level, text });
  const raw = input.trim();
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    push("err", "Enter a full URL, including https://.");
    return { canonical: null, checks };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    push("err", "Canonical URLs must use http or https.");
    return { canonical: null, checks };
  }

  const notes: string[] = [];
  // The parser itself may rewrite the URL (default port, dot segments, a root
  // "/", percent-encoding); say so rather than calling it "already clean".
  const host = rawHost(raw);
  if (u.href !== raw.replace(host, host.toLowerCase())) notes.push(NORMALISED);
  if (o.https && u.protocol === "http:") {
    u.protocol = "https:";
    notes.push("Switched to https");
  }
  // Hostnames are case-insensitive: the URL parser always lowercases them.
  const hostHadCaps = /[A-Z]/.test(rawHost(raw));
  let pathLowered = false;
  if (o.lower) {
    const lp = u.pathname.toLowerCase();
    pathLowered = lp !== u.pathname;
    u.pathname = lp;
  }
  if (hostHadCaps && pathLowered) notes.push("Lowercased host and path");
  else if (hostHadCaps) notes.push("Lowercased host");
  else if (pathLowered) notes.push("Lowercased path");

  // Only when something domain-like remains: www.com is a domain, not a www host.
  if (o.www === "remove" && u.hostname.startsWith("www.") && u.hostname.slice(4).includes(".")) {
    u.hostname = u.hostname.slice(4);
    notes.push("Removed www");
  }
  if (o.www === "add" && !u.hostname.startsWith("www.")) {
    u.hostname = `www.${u.hostname}`;
    notes.push("Added www");
  }
  if (o.index && /\/index\.(html?|php)$/i.test(u.pathname)) {
    u.pathname = u.pathname.replace(/index\.(html?|php)$/i, "");
    notes.push("Dropped index file");
  }

  // Work on the raw `k=v` segments so kept params keep their original
  // encoding (%20 stays %20, a bare `?amp` stays bare, commas aren't escaped).
  let params = u.search
    .slice(1)
    .split("&")
    .filter((seg) => seg !== "");
  if (o.allParams) {
    if (params.length) notes.push(`Removed all ${params.length} ${params.length === 1 ? "param" : "params"}`);
    params = [];
  } else if (o.track) {
    const dropped = params.filter((seg) => TRACKING_PARAM.test(paramKey(seg)));
    if (dropped.length) {
      notes.push(`Removed ${dropped.map(paramKey).join(", ")}`);
      params = params.filter((seg) => !TRACKING_PARAM.test(paramKey(seg)));
    }
  }
  if (o.sort && params.length > 1) {
    const sorted = params
      .map((seg, i) => ({ seg, key: paramKey(seg), i }))
      .sort((a, b) => {
        if (a.key !== b.key) return a.key < b.key ? -1 : 1;
        return a.i - b.i;
      })
      .map((x) => x.seg);
    if (sorted.some((p, i) => p !== params[i])) notes.push("Sorted params");
    params = sorted;
  }
  u.search = params.length ? `?${params.join("&")}` : "";

  const path = u.pathname;
  const isFile = /\.[a-z0-9]{2,5}$/i.test(path);
  if (o.slash === "add" && !path.endsWith("/") && !isFile) {
    u.pathname = `${path}/`;
    notes.push("Added trailing slash");
  }
  if (o.slash === "remove" && /.\/$/.test(path)) {
    u.pathname = path.replace(/\/+$/, "");
    notes.push("Removed trailing slash");
  }
  if (o.hash && u.hash) {
    u.hash = "";
    notes.push("Removed fragment");
  }
  if (u.username || u.password) push("warn", "The URL contains a username or password. Canonicals should never include credentials.");

  // `u.hash = ""` can leave a bare "#" in some engines; strip it.
  const canonical = u.href.replace(/#$/, "");
  notes.forEach((n) => push("ok", n));
  if (!notes.length) push("ok", canonical === raw ? "Already clean — nothing to change." : NORMALISED);
  if (params.length) {
    push("info", `Kept ${params.length} ${params.length === 1 ? "param" : "params"}. Only keep ones that change the content, like ?page=2.`);
  }
  if (!o.hash && u.hash) push("warn", "Search engines ignore #fragments; a canonical with one points at the same page without it.");
  push("info", "Use the same canonical on every duplicate, and make sure this URL returns 200 and isn't blocked in robots.txt.");
  return { canonical, checks };
}

export function formatCanonical(url: string, f: CanonicalFormat): string {
  if (f === "html") return `<link rel="canonical" href="${escapeXml(url)}" />`;
  if (f === "http") return `Link: <${url}>; rel="canonical"`;
  return url;
}
