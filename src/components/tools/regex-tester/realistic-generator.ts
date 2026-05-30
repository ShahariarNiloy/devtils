// Pure logic — no React, no DOM globals.
import RandExp from "randexp";
import {
  FIRST_NAMES, LAST_NAMES,
  EMAIL_PROVIDERS, EMAIL_TLDS, EMAIL_SUFFIXES,
  UUIDS, HEX_COLORS, PHONE_NUMBERS,
  SLUGS, PRICES, SEMVERS, JWT_EXAMPLES,
  COMMON_WORDS, COMMON_PHRASES, MIXED_STRINGS,
} from "./realistic-pools";

export type PatternDomain =
  | "email" | "url" | "ipv4" | "ipv6" | "uuid"
  | "hex-color" | "date" | "time" | "phone"
  | "slug" | "price" | "semver" | "mac"
  | "jwt" | "base64" | "generic";

export interface RealisticExample {
  value: string;
  category: "common" | "edge-case";
  label: string;
  domain: PatternDomain;
}

export interface GenerateOptions {
  count?: number;
  mode?: "realistic" | "random";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ─── Domain signatures ────────────────────────────────────────────────────────

const SIGNATURES: { domain: PatternDomain; test: (src: string) => boolean }[] = [
  { domain: "jwt",       test: s => /eyJ/i.test(s) || /jwt/i.test(s) },
  { domain: "base64",    test: s => /\[A-Za-z0-9\+\\\/\]/.test(s) && /={1,2}/.test(s) },
  { domain: "uuid",      test: s => /\[0-9a-f\].*8|8.*\[0-9a-f\]/.test(s) && /-/.test(s) },
  { domain: "ipv6",      test: s => /\[0-9a-f\].*:{2}|:{2}.*\[0-9a-f\]/i.test(s) || /fe80|::1/.test(s) },
  { domain: "email",     test: s => /@/.test(s) || /\\@/.test(s) },
  { domain: "url",       test: s => /https?/.test(s) || /www\\./.test(s) || s.includes("://") },
  { domain: "mac",       test: s => /\[0-9a-fA-F\].*:{1}.*\[0-9a-fA-F\]/.test(s) && !s.includes("://") },
  { domain: "ipv4",      test: s => /\\d.*\\..*\\d.*\\..*\\d/.test(s) || /\d{1,3}.*\\..*\d{1,3}/.test(s) },
  { domain: "hex-color", test: s => /#/.test(s) && /\[0-9a-fA-F\]|\\d/.test(s) },
  { domain: "semver",    test: s => /\\d.*\\..*\\d.*\\..*\\d/.test(s) && /v\?|semver/i.test(s) },
  { domain: "date",      test: s => /\\d\{4\}.*\\d\{2\}.*\\d\{2\}|YYYY|yyyy/.test(s) || /\d{4}.*\d{2}.*\d{2}/.test(s) },
  { domain: "time",      test: s => /\\d.*:.*\\d\{2\}|HH.*MM/.test(s) },
  { domain: "phone",     test: s => /\\+.*\\d|\(\\d|\\d.*\\d{4}/.test(s) },
  { domain: "slug",      test: s => /\[a-z0-9\].*-/.test(s) && !/\\d{4}/.test(s) },
  { domain: "price",     test: s => /\\\$|€|£/.test(s) },
];

export function detectDomain(regex: RegExp): PatternDomain {
  const src = regex.source;
  for (const sig of SIGNATURES) {
    if (sig.test(src)) return sig.domain;
  }
  return "generic";
}

// ─── Pool-based generators per domain ────────────────────────────────────────

function emailCandidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  const first = pick(FIRST_NAMES);
  const last  = pick(LAST_NAMES);
  const provider = pick(EMAIL_PROVIDERS);
  const tld      = pick(EMAIL_TLDS);
  return [
    { value: `${first}@${provider}.${tld}`,                          label: "first name only",     category: "common" },
    { value: `${first}.${last}@${provider}.com`,                     label: "full name",           category: "common" },
    { value: `${first}_${last}@${pick(EMAIL_PROVIDERS)}.${pick(EMAIL_TLDS)}`, label: "underscore", category: "common" },
    { value: `${first}${pick(["123", "42", "007"])}@${provider}.${tld}`, label: "with numbers",  category: "common" },
    { value: `${first}+${pick(EMAIL_SUFFIXES)}@${provider}.com`,     label: "plus alias",          category: "edge-case" },
    { value: `${first}.${last}@sub.${provider}.co.uk`,               label: "subdomain + ccTLD",   category: "edge-case" },
    { value: `${first[0]}.${last}@${provider}.${tld}`,               label: "initial + surname",   category: "common" },
    { value: `noreply@${provider}.${tld}`,                           label: "service address",     category: "edge-case" },
  ];
}

function urlCandidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  return [
    { value: "https://github.com",                         label: "bare domain",       category: "common" },
    { value: "https://utilyx.dev/docs",                label: "with path",         category: "common" },
    { value: "https://api.stripe.com/v1/payments",         label: "API endpoint",      category: "common" },
    { value: "https://example.com/search?q=regex",         label: "with query string", category: "common" },
    { value: "http://localhost:3000",                      label: "localhost",         category: "edge-case" },
    { value: "https://example.com/path#section",           label: "with fragment",     category: "edge-case" },
    { value: "https://sub.domain.example.co.uk/blog/post", label: "subdomain + path",  category: "common" },
    { value: "https://example.com",                        label: "simple HTTPS",      category: "common" },
  ];
}

function ipv4Candidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  return [
    { value: "192.168.1.1",     label: "LAN gateway",         category: "common" },
    { value: "10.0.0.1",        label: "private class A",     category: "common" },
    { value: "172.16.0.5",      label: "private class B",     category: "common" },
    { value: "127.0.0.1",       label: "loopback",            category: "edge-case" },
    { value: "8.8.8.8",         label: "Google DNS",          category: "common" },
    { value: "1.1.1.1",         label: "Cloudflare DNS",      category: "common" },
    { value: "0.0.0.0",         label: "any address",         category: "edge-case" },
    { value: "255.255.255.255", label: "broadcast",           category: "edge-case" },
    { value: "203.0.113.42",    label: "documentation range", category: "common" },
  ];
}

function uuidCandidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  return UUIDS.slice(0, 6).map((u, i) => ({
    value: u,
    label: i === 0 ? "nil UUID" : i === 5 ? "max UUID" : `v4 UUID`,
    category: (i === 0 || i === 5) ? "edge-case" : "common",
  }));
}

function hexColorCandidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  const pool = pickN(HexColors6(), 5);
  return [
    ...pool.map((c) => ({ value: c, label: "6-digit hex", category: "common" as const })),
    { value: "#FFF",    label: "3-digit shorthand", category: "edge-case" },
    { value: "#000000", label: "black",             category: "edge-case" },
    { value: "#FFFFFF", label: "white",             category: "common" },
    { value: "#D4FF4F", label: "brand chartreuse",  category: "common" },
  ];
}

function HexColors6(): string[] {
  return HEX_COLORS.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));
}

function dateCandidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  return [
    { value: "2025-05-09", label: "today",           category: "common" },
    { value: "2024-01-15", label: "January date",    category: "common" },
    { value: "2024-12-31", label: "year end",        category: "common" },
    { value: "2000-01-01", label: "Y2K",             category: "edge-case" },
    { value: "2020-02-29", label: "leap day",        category: "edge-case" },
    { value: "1999-12-31", label: "millennium eve",  category: "edge-case" },
    { value: "2026-07-04", label: "Independence Day",category: "common" },
    { value: "2023-06-01", label: "June 2023",       category: "common" },
  ];
}

function timeCandidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  return [
    { value: "09:30", label: "morning",   category: "common" },
    { value: "17:00", label: "end of day",category: "common" },
    { value: "12:00", label: "noon",      category: "common" },
    { value: "00:00", label: "midnight",  category: "edge-case" },
    { value: "23:59", label: "end of day",category: "edge-case" },
    { value: "08:15", label: "standup",   category: "common" },
    { value: "14:45", label: "afternoon", category: "common" },
  ];
}

function phoneCandidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  return PHONE_NUMBERS.map((p, i) => ({
    value: p,
    label: i === 0 ? "US with country code" : i === 1 ? "UK" : i === 2 ? "France" : i >= 6 ? "US dashes" : "international",
    category: (i > 5) ? "edge-case" : "common",
  }));
}

function slugCandidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  return SLUGS.slice(0, 7).map((s, i) => ({
    value: s,
    label: i === 0 ? "simple" : "blog post slug",
    category: i === 0 ? "edge-case" : "common",
  }));
}

function priceCandidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  return PRICES.map((p, i) => ({
    value: p,
    label: p.startsWith("€") ? "Euro" : p.startsWith("£") ? "GBP" : p.includes(",") ? "thousands" : i < 3 ? "USD" : "cents",
    category: (p.includes(",") || p.startsWith("€") || p.startsWith("£")) ? "edge-case" : "common",
  }));
}

function semverCandidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  return SEMVERS.map((s) => ({
    value: s,
    label: s.includes("-") ? "pre-release" : s.includes("+") ? "with build" : s.startsWith("v") ? "with v prefix" : "stable",
    category: (s.includes("-") || s.includes("+")) ? "edge-case" : "common",
  }));
}

function macCandidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  return [
    { value: "00:1A:2B:3C:4D:5E", label: "colon-separated",    category: "common" },
    { value: "AA:BB:CC:DD:EE:FF", label: "all high bytes",     category: "edge-case" },
    { value: "08:00:27:1a:b4:c3", label: "VirtualBox range",   category: "common" },
    { value: "52:54:00:12:34:56", label: "QEMU/KVM",           category: "common" },
    { value: "dc:a6:32:00:11:22", label: "Raspberry Pi",       category: "common" },
    { value: "b8:27:eb:ab:cd:ef", label: "RPi Foundation OUI", category: "edge-case" },
  ];
}

function ipv6Candidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  return [
    { value: "2001:0db8:85a3:0000:0000:8a2e:0370:7334", label: "documentation",    category: "common" },
    { value: "fe80::1ff:fe23:4567:890a",                 label: "link-local",       category: "common" },
    { value: "::1",                                      label: "loopback",         category: "edge-case" },
    { value: "2001:db8::ff00:42:8329",                   label: "compressed",       category: "common" },
    { value: "::ffff:192.0.2.1",                         label: "IPv4-mapped",      category: "edge-case" },
    { value: "2607:f8b0:4004:0c08::6a",                  label: "Google (example)", category: "common" },
  ];
}

function jwtCandidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  return JWT_EXAMPLES.map((j, i) => ({
    value: j,
    label: i === 0 ? "HS256" : "RS256",
    category: "common" as const,
  }));
}

function base64Candidates(): { value: string; label: string; category: "common" | "edge-case" }[] {
  return [
    { value: "SGVsbG8gV29ybGQ=", label: '"Hello World"',    category: "common" },
    { value: "dGVzdA==",         label: '"test"',           category: "common" },
    { value: "Zm9vYmFy",         label: '"foobar"',         category: "common" },
    { value: "YWJjMTIz",         label: '"abc123"',         category: "common" },
    { value: "dXNlcjpwYXNzd29yZA==", label: "user:password", category: "edge-case" },
  ];
}

// ─── Generic generator — works for ANY regex ─────────────────────────────────
//
// Strategy: a layered cascade of candidate sources, from most-real to least.
//   1. Curated real-world strings (MIXED_STRINGS) filtered through the regex
//   2. Common English words / phrases filtered through the regex
//   3. Composed patterns from constituent parts (word + digit, word-word, etc.)
//   4. randexp-generated strings (when nothing real fits)
// Each layer's output is validated against the regex; readable output is
// preferred over gibberish.

function isReadable(s: string): boolean {
  if (!s) return false;
  if (s.length > 80) return false;
  // count printable, non-control chars
  let printable = 0;
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code === 9 || code === 10 || (code >= 32 && code < 127) || code >= 160) {
      printable++;
    }
  }
  return printable / s.length >= 0.85;
}

/** Build a regex that matches the *whole* string against the original pattern. */
function fullMatcher(regex: RegExp): RegExp | null {
  try {
    const flags = regex.flags.replace("g", "").replace("y", "");
    return new RegExp(regex.source, flags);
  } catch {
    return null;
  }
}

function fullMatch(regex: RegExp, s: string): boolean {
  try {
    const r = fullMatcher(regex);
    if (!r) return false;
    const m = s.match(r);
    return !!m && m[0] === s;
  } catch {
    return false;
  }
}

function partialMatch(regex: RegExp, s: string): boolean {
  try {
    const r = fullMatcher(regex);
    return r ? r.test(s) : false;
  } catch {
    return false;
  }
}

/** Try real-world strings against the regex. Prefer full matches over partial. */
function realWorldCandidates(regex: RegExp): string[] {
  const full: string[] = [];
  const partial: string[] = [];
  const corpus = [...MIXED_STRINGS, ...COMMON_WORDS, ...COMMON_PHRASES];
  for (const s of corpus) {
    if (fullMatch(regex, s)) full.push(s);
    else if (partialMatch(regex, s)) partial.push(s);
  }
  return [...full, ...partial];
}

/** Generate via randexp — produces a guaranteed match, but may look random. */
function randexpCandidates(regex: RegExp, count: number): string[] {
  const out: string[] = [];
  try {
    const r = new RandExp(regex);
    r.max = 8;
    for (let i = 0; i < count * 3 && out.length < count; i++) {
      const s = r.gen();
      if (isReadable(s)) out.push(s);
    }
  } catch {
    // randexp can't handle some patterns (lookarounds, etc.) — fall through
  }
  return out;
}

function labelFor(value: string): string {
  if (value === "") return "empty string";
  if (/^\d+$/.test(value)) return "digits only";
  if (/^[A-Z]+$/.test(value)) return "all caps";
  if (/^[a-z]+$/.test(value)) return "lowercase word";
  if (/^[A-Z][a-z]+$/.test(value)) return "capitalized";
  if (/@/.test(value)) return "email-like";
  if (/^https?:\/\//.test(value)) return "URL";
  if (/^\d+\.\d+/.test(value)) return "decimal";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return "ISO date";
  if (/^[\d.]+\.[\d.]+\.[\d.]+/.test(value)) return "version / IP";
  if (/-/.test(value) && /^[a-z0-9-]+$/.test(value)) return "kebab-case";
  if (/_/.test(value) && /^[a-z0-9_]+$/.test(value)) return "snake_case";
  if (/^[a-z][a-zA-Z0-9]*$/.test(value)) return "camelCase";
  if (/^[A-Z][a-zA-Z0-9]*$/.test(value)) return "PascalCase";
  if (/\s/.test(value)) return "phrase";
  if (value.length <= 3) return "short";
  return "matches pattern";
}

function genericCandidates(
  regex: RegExp,
  count: number,
): { value: string; label: string; category: "common" | "edge-case" }[] {
  const seen = new Set<string>();
  const results: { value: string; label: string; category: "common" | "edge-case" }[] = [];

  function add(value: string, category: "common" | "edge-case") {
    if (seen.has(value)) return;
    if (results.length >= count) return;
    seen.add(value);
    results.push({ value, label: labelFor(value), category });
  }

  // Layer 1: real-world strings that match
  const real = realWorldCandidates(regex);
  for (const s of real) add(s, "common");

  // Layer 2: randexp fallback for whatever count is left
  if (results.length < count) {
    const generated = randexpCandidates(regex, count - results.length);
    for (const s of generated) add(s, results.length < Math.ceil(count * 0.6) ? "common" : "edge-case");
  }

  // Promote a few entries to edge-case for variety (last 30%)
  const cutoff = Math.ceil(results.length * 0.7);
  results.forEach((r, i) => { if (i >= cutoff) r.category = "edge-case"; });

  return results;
}

// ─── Domain candidate dispatch ────────────────────────────────────────────────

function candidatesForDomain(
  domain: PatternDomain,
  regex: RegExp,
): { value: string; label: string; category: "common" | "edge-case" }[] {
  const raw: { value: string; label: string; category: "common" | "edge-case" }[] = (() => {
    switch (domain) {
      case "email":     return emailCandidates();
      case "url":       return urlCandidates();
      case "ipv4":      return ipv4Candidates();
      case "ipv6":      return ipv6Candidates();
      case "uuid":      return uuidCandidates();
      case "hex-color": return hexColorCandidates();
      case "date":      return dateCandidates();
      case "time":      return timeCandidates();
      case "phone":     return phoneCandidates();
      case "slug":      return slugCandidates();
      case "price":     return priceCandidates();
      case "semver":    return semverCandidates();
      case "mac":       return macCandidates();
      case "jwt":       return jwtCandidates();
      case "base64":    return base64Candidates();
      case "generic":   return genericCandidates(regex, 8);
    }
  })();

  // Validate each candidate against the actual regex
  const safeRegex = new RegExp(regex.source, regex.flags.replace("g", ""));
  return raw.filter(({ value }) => safeRegex.test(value));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateExamples(
  regex: RegExp,
  options: GenerateOptions = {},
): RealisticExample[] {
  const { count = 8, mode = "realistic" } = options;

  const domain = mode === "random" ? "generic" : detectDomain(regex);

  const candidates =
    mode === "random"
      ? genericCandidates(regex, count)
      : candidatesForDomain(domain, regex);

  // If pool-based gave nothing, fall back to generic
  const effective = candidates.length > 0 ? candidates : genericCandidates(regex, count);

  const seen = new Set<string>();
  const result: RealisticExample[] = [];

  for (const c of effective) {
    if (seen.has(c.value) || result.length >= count) continue;
    seen.add(c.value);
    result.push({ ...c, domain });
  }

  return result;
}
