/**
 * URL parser — pure logic on top of the WHATWG URL parser. Nothing here
 * fetches anything; it only reads the text.
 */

export type PartKind = "scheme" | "user" | "host" | "port" | "path" | "query" | "hash" | "meta";

export interface UrlSegment {
  text: string;
  kind: PartKind;
}

export interface UrlPart {
  label: string;
  value: string;
  kind: PartKind;
  /** True when the URL has no value for this part ("—"). */
  empty: boolean;
}

export interface QueryParam {
  key: string;
  value: string;
  tracking: boolean;
}

export type ParseResult =
  | { ok: true; url: URL; segments: UrlSegment[]; parts: UrlPart[]; params: QueryParam[] }
  | { ok: false; reason: "empty" | "invalid" };

/**
 * Parameters that only exist for analytics/ad attribution: utm_*, Google
 * (gclid, gbraid, wbraid, dclid), Meta (fbclid), Microsoft (msclkid),
 * X (twclid), TikTok (ttclid), Yandex (yclid), Instagram (igshid),
 * Mailchimp (mc_cid, mc_eid) and HubSpot (_hsenc, _hsmi, __hs*).
 */
const TRACKING = /^(utm_[\w-]+|gclid|gbraid|wbraid|dclid|fbclid|msclkid|twclid|ttclid|yclid|igshid|mc_cid|mc_eid|_hsenc|_hsmi|__hssc|__hstc|__hsfp|hsctatracking)$/i;

export function isTrackingParam(key: string): boolean {
  return TRACKING.test(key);
}

const DEFAULT_PORTS: Record<string, number> = {
  "http:": 80,
  "https:": 443,
  "ws:": 80,
  "wss:": 443,
  "ftp:": 21,
};

/** Percent-decodes, leaving malformed sequences as they are. */
export function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/** Splits the URL text into coloured pieces whose concatenation is url.href. */
export function urlSegments(url: URL): UrlSegment[] {
  const segs: UrlSegment[] = [];
  const afterScheme = url.href.slice(url.protocol.length);
  const slashes = afterScheme.startsWith("//") ? "//" : "";
  segs.push({ text: url.protocol + slashes, kind: "scheme" });
  if (url.username || url.password) {
    segs.push({ text: `${url.username}${url.password ? `:${url.password}` : ""}@`, kind: "user" });
  }
  if (url.hostname) segs.push({ text: url.hostname, kind: "host" });
  if (url.port) segs.push({ text: `:${url.port}`, kind: "port" });
  if (url.pathname) segs.push({ text: url.pathname, kind: "path" });
  if (url.search) segs.push({ text: url.search, kind: "query" });
  if (url.hash) segs.push({ text: url.hash, kind: "hash" });
  return segs;
}

function part(label: string, value: string, kind: PartKind): UrlPart {
  return { label, value: value || "—", kind, empty: !value };
}

export function urlParts(url: URL): UrlPart[] {
  const parts: UrlPart[] = [part("Scheme", url.protocol.replace(/:$/, ""), "scheme")];
  if (url.username || url.password) {
    // Show credentials decoded (p%40ss → p@ss); the coloured URL above keeps the raw form.
    parts.push(part("Credentials", safeDecode(url.username) + (url.password ? `:${safeDecode(url.password)}` : ""), "user"));
  }
  parts.push(part("Host", url.hostname, "host"));
  const def = DEFAULT_PORTS[url.protocol];
  parts.push({
    label: "Port",
    value: url.port || (def !== undefined ? `default (${def})` : "—"),
    kind: "port",
    empty: !url.port && def === undefined,
  });
  parts.push(part("Path", safeDecode(url.pathname), "path"));
  // Opaque paths (mailto:, data:) have no segments to speak of.
  const segs = url.pathname.startsWith("/") ? url.pathname.split("/").filter(Boolean).map(safeDecode) : [];
  parts.push(part("Segments", segs.join("  ›  "), "path"));
  parts.push(part("Query", url.search, "query"));
  parts.push(part("Fragment", url.hash, "hash"));
  parts.push(part("Origin", url.origin === "null" ? "" : url.origin, "meta"));
  return parts;
}

export function queryParams(url: URL): QueryParam[] {
  return Array.from(url.searchParams.entries(), ([key, value]) => ({ key, value, tracking: isTrackingParam(key) }));
}

export function parseUrl(input: string): ParseResult {
  const text = input.trim();
  if (!text) return { ok: false, reason: "empty" };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, url, segments: urlSegments(url), parts: urlParts(url), params: queryParams(url) };
}

/**
 * The raw `key=value` pieces of the query string, aligned with
 * `url.searchParams` order (empty pieces like `&&` are skipped there too).
 * Working on raw pieces keeps every other parameter's encoding untouched.
 */
function rawPairs(url: URL): string[] {
  return url.search.replace(/^\?/, "").split("&").filter((p) => p !== "");
}

function withPairs(url: URL, pairs: readonly string[]): string {
  const next = new URL(url.href);
  next.search = pairs.length ? `?${pairs.join("&")}` : "";
  return next.href;
}

function rawKey(pair: string): string {
  const eq = pair.indexOf("=");
  return safeDecode((eq === -1 ? pair : pair.slice(0, eq)).replace(/\+/g, " "));
}

/** The URL without the `index`-th query parameter. */
export function removeParam(href: string, index: number): string {
  const url = new URL(href);
  return withPairs(
    url,
    rawPairs(url).filter((_, i) => i !== index),
  );
}

/** The URL without any tracking parameters. */
export function stripTracking(href: string): string {
  const url = new URL(href);
  return withPairs(
    url,
    rawPairs(url).filter((p) => !isTrackingParam(rawKey(p))),
  );
}

export const SAMPLE_URL =
  "https://ada:secret@app.utilyx.dev:8443/tools/json-formatter?view=tree&indent=2&utm_source=newsletter&utm_campaign=launch&gclid=abc123#examples";
