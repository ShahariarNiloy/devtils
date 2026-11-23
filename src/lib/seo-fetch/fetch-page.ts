/**
 * Server-side page fetcher for the SEO checker — the one place utilyx
 * fetches a URL for a user. Locked down because a "fetch any URL" endpoint
 * is the classic way into a server's private network (SSRF):
 *
 * - http/https on the default ports only.
 * - Every address a hostname resolves to must be public. The check runs in
 *   the socket's own DNS lookup, on every redirect hop, so DNS rebinding and
 *   redirects into the private network are refused too. IP literals (which
 *   skip DNS) are checked up front.
 * - At most 5 redirects, 10 s in total, 2 MB of *decoded* body (so a small
 *   compressed bomb can't balloon).
 *
 * Node-only (node:http, node:dns). Pure helpers are exported for tests.
 */

import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";
import type { Readable } from "node:stream";

export class FetchError extends Error {
  constructor(
    message: string,
    /** HTTP status the API should answer with. */
    readonly status = 422,
  ) {
    super(message);
  }
}

/* ------------------------------------------------------------ addresses */

function v4ToInt(ip: string): number {
  return ip.split(".").reduce((n, p) => (n << 8) + Number(p), 0) >>> 0;
}

const V4_BLOCKED: readonly [string, number][] = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, incl. cloud metadata 169.254.169.254
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // 6to4 relay
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, incl. broadcast
];

function isPublicV4(ip: string): boolean {
  const n = v4ToInt(ip);
  return !V4_BLOCKED.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (v4ToInt(base) & mask);
  });
}

/** An IPv6 address as eight 16-bit groups (handles :: and a trailing IPv4). */
function v6Groups(ip: string): number[] | null {
  let s = ip.toLowerCase().split("%")[0];
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (v4) {
    const n = v4ToInt(v4[1]);
    s = s.slice(0, -v4[1].length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const [head, tail] = s.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined && tail ? tail.split(":") : [];
  const fill = s.includes("::") ? 8 - h.length - t.length : 0;
  const all = [...h, ...Array.from({ length: fill }, () => "0"), ...t].map((x) => Number.parseInt(x, 16));
  return all.length === 8 && all.every((x) => Number.isInteger(x) && x >= 0 && x <= 0xffff) ? all : null;
}

function isPublicV6(ip: string): boolean {
  const g = v6Groups(ip);
  if (!g) return false;
  if (g.every((x) => x === 0)) return false; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return false; // ::1
  // IPv4-mapped (::ffff:a.b.c.d) and NAT64 (64:ff9b::a.b.c.d) carry an IPv4 address.
  const embedded = `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`;
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return isPublicV4(embedded);
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return isPublicV4(embedded);
  if ((g[0] & 0xfe00) === 0xfc00) return false; // unique local fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return false; // link-local fe80::/10
  if ((g[0] & 0xff00) === 0xff00) return false; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false; // documentation
  if (g[0] === 0x0100 && g.slice(1, 4).every((x) => x === 0)) return false; // discard 100::/64
  return true;
}

/** True only for addresses on the public internet. */
export function isPublicAddress(ip: string): boolean {
  const kind = net.isIP(ip);
  if (kind === 4) return isPublicV4(ip);
  if (kind === 6) return isPublicV6(ip);
  return false;
}

/** Validate a user-typed URL before anything connects. Returns the parsed URL. */
export function checkTarget(raw: string): URL {
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    throw new FetchError("That doesn't look like a URL.", 400);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new FetchError("Only http and https pages can be checked.", 400);
  if (url.username || url.password) throw new FetchError("URLs with a username or password can't be checked.", 400);
  if (url.port && url.port !== "80" && url.port !== "443") throw new FetchError("Only the standard ports (80 and 443) can be checked.", 400);
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (net.isIP(host)) {
    if (!isPublicAddress(host)) throw new FetchError("That address isn't on the public internet.", 400);
  } else if (!host.includes(".") || /\.(local|localhost|internal|lan|home|corp|intranet)$/.test(host) || host === "localhost") {
    throw new FetchError("That host isn't on the public internet.", 400);
  }
  return url;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void;

/** DNS lookup for sockets: every resolved address must be public. */
function safeLookup(hostname: string, options: dns.LookupOptions, callback: LookupCallback): void {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "");
    const list = Array.isArray(addresses) ? addresses : [];
    if (!list.length) return callback(Object.assign(new Error("No address"), { code: "ENOTFOUND" }), "");
    if (list.some((a) => !isPublicAddress(a.address))) {
      return callback(Object.assign(new Error("Private address"), { code: "EPRIVATE" }), "");
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

/* ---------------------------------------------------------------- fetch */

export interface Hop {
  url: string;
  status: number;
}

export interface FetchedPage {
  /** Every response on the way, ending with the final one. */
  hops: Hop[];
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  contentType: string;
  /** Decoded text — only for HTML, XML and plain text, else "". */
  body: string;
  truncated: boolean;
  ms: number;
}

const UA = "Mozilla/5.0 (compatible; utilyx-seo-checker/1.0; +https://www.utilyx.dev/tools/seo-checker)";
const KEEP_HEADERS = ["content-type", "content-length", "content-range", "x-robots-tag", "link", "last-modified", "cache-control", "content-language", "server", "location"];

interface Raw {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
  truncated: boolean;
}

function once(url: URL, deadline: number, maxBytes: number, method: "GET" | "HEAD", range: boolean): Promise<Raw> {
  return new Promise((resolve, reject) => {
    const left = deadline - Date.now();
    if (left <= 0) return reject(new FetchError("The page took too long to respond.", 504));
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(
      url,
      {
        method,
        lookup: safeLookup,
        agent: false,
        timeout: left,
        headers: {
          "user-agent": UA,
          accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "en",
          // One byte, but Content-Range still reports the full size.
          ...(range ? { range: "bytes=0-0" } : {}),
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        // Redirect bodies are irrelevant; don't read them.
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, headers: res.headers, body: Buffer.alloc(0), truncated: false });
        }
        // HEAD has no body to read (or decompress — an empty gzip stream is an error).
        if (method === "HEAD") {
          res.resume();
          return resolve({ status, headers: res.headers, body: Buffer.alloc(0), truncated: false });
        }
        const enc = String(res.headers["content-encoding"] ?? "").toLowerCase();
        let stream: Readable = res;
        if (enc === "gzip" || enc === "x-gzip") stream = res.pipe(zlib.createGunzip());
        else if (enc === "deflate") stream = res.pipe(zlib.createInflate());
        else if (enc === "br") stream = res.pipe(zlib.createBrotliDecompress());
        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        stream.on("data", (c: Buffer) => {
          if (truncated) return;
          if (size + c.length > maxBytes) {
            chunks.push(c.subarray(0, maxBytes - size));
            size = maxBytes;
            truncated = true;
            req.destroy();
            resolve({ status, headers: res.headers, body: Buffer.concat(chunks), truncated });
            return;
          }
          chunks.push(c);
          size += c.length;
        });
        stream.on("end", () => resolve({ status, headers: res.headers, body: Buffer.concat(chunks), truncated }));
        stream.on("error", () => (truncated ? undefined : reject(new FetchError("The page's response couldn't be read.", 502))));
      },
    );
    req.on("timeout", () => req.destroy(new FetchError("The page took too long to respond.", 504)));
    req.on("error", (e: NodeJS.ErrnoException) => {
      if (e instanceof FetchError) return reject(e);
      if (e.code === "EPRIVATE") return reject(new FetchError("That host points to a private network address, so it can't be checked.", 400));
      if (e.code === "ENOTFOUND" || e.code === "EAI_AGAIN") return reject(new FetchError("That domain doesn't resolve. Check the spelling.", 422));
      if (e.code === "ECONNREFUSED") return reject(new FetchError("The server refused the connection.", 502));
      if (e.code?.startsWith("ERR_TLS") || e.code?.includes("CERT")) return reject(new FetchError("The site's HTTPS certificate isn't valid.", 502));
      reject(new FetchError("The page couldn't be reached.", 502));
    });
    req.end();
  });
}

/** Text from bytes, honouring the declared charset (header, then <meta charset>). */
export function decodeBody(body: Buffer, contentType: string): string {
  const head = body.subarray(0, 2048).toString("latin1");
  const label =
    /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ??
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ??
    "utf-8";
  try {
    return new TextDecoder(label.toLowerCase()).decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

export interface FetchOptions {
  /** HEAD reads headers only — for checking images without downloading them. */
  method?: "GET" | "HEAD";
  /** Ask for the first byte only (for servers that refuse HEAD). */
  range?: boolean;
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
}

/** Fetch a public URL, following redirects, with every hop checked. */
export async function fetchPublicPage(start: URL, o: FetchOptions = {}): Promise<FetchedPage> {
  const t0 = Date.now();
  const deadline = t0 + (o.timeoutMs ?? 10_000);
  const maxRedirects = o.maxRedirects ?? 5;
  const hops: Hop[] = [];
  let url = start;
  for (;;) {
    const r = await once(url, deadline, o.maxBytes ?? 2 * 1024 * 1024, o.method ?? "GET", o.range ?? false);
    hops.push({ url: url.href, status: r.status });
    const location = r.headers.location;
    if (r.status >= 300 && r.status < 400 && location) {
      if (hops.length > maxRedirects) throw new FetchError(`More than ${maxRedirects} redirects — likely a redirect loop.`, 422);
      let next: URL;
      try {
        next = new URL(location, url);
      } catch {
        throw new FetchError("The page redirects to an invalid URL.", 422);
      }
      url = checkTarget(next.href);
      continue;
    }
    const headers: Record<string, string> = {};
    for (const k of KEEP_HEADERS) {
      const v = r.headers[k];
      if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(", ") : v;
    }
    const contentType = headers["content-type"] ?? "";
    // HTML for pages, XML for sitemaps, plain text for robots.txt.
    const textual = /text\/html|application\/xhtml\+xml|text\/plain|[/+]xml/i.test(contentType) || !contentType;
    return {
      hops,
      finalUrl: url.href,
      status: r.status,
      headers,
      contentType,
      body: textual ? decodeBody(r.body, contentType) : "",
      truncated: r.truncated,
      ms: Date.now() - t0,
    };
  }
}
