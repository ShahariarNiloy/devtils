import { hasProblems, isAbsUrl, type Check } from "../seo-shared/seo.lib";

export interface RobotsRule {
  ua: string;
  /** "allow" | "disallow" as typed — validated, not coerced. */
  type: string;
  path: string;
}

export const SAMPLE_RULES: RobotsRule[] = [
  { ua: "*", type: "disallow", path: "/admin/" },
  { ua: "*", type: "disallow", path: "/search" },
  { ua: "*", type: "allow", path: "/search/help" },
  { ua: "GPTBot", type: "disallow", path: "/" },
];
export const SAMPLE_SITEMAP = "https://example.com/sitemap.xml";

export type PresetId = "all" | "std" | "ai" | "none";

export const PRESETS: readonly { id: PresetId; label: string }[] = [
  { id: "all", label: "Allow everything" },
  { id: "std", label: "Block admin & search" },
  { id: "ai", label: "Block AI crawlers" },
  { id: "none", label: "Block everything" },
];

export function presetRules(id: PresetId): RobotsRule[] {
  switch (id) {
    case "all":
      return [{ ua: "*", type: "allow", path: "/" }];
    case "none":
      return [{ ua: "*", type: "disallow", path: "/" }];
    case "std":
      return [
        { ua: "*", type: "disallow", path: "/admin/" },
        { ua: "*", type: "disallow", path: "/search" },
        { ua: "*", type: "disallow", path: "/api/" },
        { ua: "*", type: "allow", path: "/api/docs" },
      ];
    case "ai":
      return [
        { ua: "*", type: "allow", path: "/" },
        { ua: "GPTBot", type: "disallow", path: "/" },
        { ua: "Google-Extended", type: "disallow", path: "/" },
        { ua: "CCBot", type: "disallow", path: "/" },
        { ua: "ClaudeBot", type: "disallow", path: "/" },
      ];
  }
}

const isAllow = (t: string) => /^allow$/i.test(t.trim());
const isDisallow = (t: string) => /^disallow$/i.test(t.trim());
const uaOf = (r: RobotsRule) => r.ua.trim() || "*";

export function isBadCell(r: RobotsRule, key: keyof RobotsRule): boolean {
  if (key === "type") return !isAllow(r.type) && !isDisallow(r.type);
  if (key === "path") return !(r.path.trim() === "" || /^[/*]/.test(r.path.trim()));
  return !r.ua.trim();
}

/** Rules grouped by user-agent (case-insensitive), in first-seen order. */
export function groupRules(rules: readonly RobotsRule[]): { ua: string; rules: RobotsRule[] }[] {
  const groups: { ua: string; rules: RobotsRule[] }[] = [];
  for (const r of rules) {
    const ua = uaOf(r);
    const g = groups.find((x) => x.ua.toLowerCase() === ua.toLowerCase());
    if (g) g.rules.push(r);
    else groups.push({ ua, rules: [r] });
  }
  return groups;
}

export interface RobotsInput {
  rules: readonly RobotsRule[];
  sitemap: string;
  delay: string;
}

export function buildRobots({ rules, sitemap, delay }: RobotsInput): string {
  const out: string[] = [];
  groupRules(rules).forEach((g, gi) => {
    if (gi) out.push("");
    out.push(`User-agent: ${g.ua}`);
    for (const r of g.rules) out.push(`${isAllow(r.type) ? "Allow" : "Disallow"}: ${r.path.trim()}`);
    if (delay.trim() && g.ua === "*") out.push(`Crawl-delay: ${delay.trim()}`);
  });
  if (sitemap.trim()) {
    if (out.length) out.push("");
    out.push(`Sitemap: ${sitemap.trim()}`);
  }
  return out.join("\n");
}

export function checkRobots({ rules, sitemap, delay }: RobotsInput): Check[] {
  const checks: Check[] = [];
  const push = (level: Check["level"], text: string) => checks.push({ level, text });
  const groups = groupRules(rules);
  if (!rules.length) push("warn", "No rules. An empty robots.txt allows everything.");
  const star = groups.find((g) => g.ua === "*");
  const blocksAll = (r: RobotsRule) => isDisallow(r.type) && ["/", "/*", "*"].includes(r.path.trim());
  if (star && star.rules.some(blocksAll)) {
    // Allow wins a same-length tie, so only an Allow of "/" (or "/*") undoes Disallow: /.
    const allows = star.rules.filter((r) => isAllow(r.type) && r.path.trim());
    if (!allows.some((r) => ["/", "/*", "*"].includes(r.path.trim()))) {
      if (!allows.length) push("err", "Disallow: / for * blocks your whole site from every search engine.");
      else {
        const list = allows.slice(0, 3).map((r) => r.path.trim()).join(", ");
        push(
          "warn",
          `Disallow: / for * blocks your whole site from every search engine except ${list}${allows.length > 3 ? "…" : ""}. Make sure that's intended.`,
        );
      }
    }
  }
  rules.forEach((r, i) => {
    if (!isAllow(r.type) && !isDisallow(r.type)) push("err", `Rule ${i + 1}: type must be allow or disallow.`);
    const p = r.path.trim();
    if (p && !/^[/*]/.test(p)) push("err", `Rule ${i + 1}: paths start with /.`);
  });
  const sm = sitemap.trim();
  if (!sm) push("warn", "No Sitemap line. Adding one helps crawlers find your pages.");
  else if (!isAbsUrl(sm)) push("err", "The sitemap must be an absolute URL.");
  const d = delay.trim();
  if (d) {
    if (!/^\d+(\.\d+)?$/.test(d)) push("err", "Crawl-delay must be a number of seconds.");
    else if (!star) push("warn", "Crawl-delay is only added to the * group, and there isn't one. Add a rule for * or it won't appear.");
  }
  push("info", "robots.txt controls crawling, not indexing. Use noindex to keep a page out of search results.");
  if (!hasProblems(checks)) {
    push("ok", `${groups.length} user-agent ${groups.length === 1 ? "group" : "groups"}, ${rules.length} ${rules.length === 1 ? "rule" : "rules"}.`);
  }
  return checks;
}

/* ── Path tester (RFC 9309 matching) ────────────────────────────────── */

export const TEST_AGENTS: readonly { value: string; label: string }[] = [
  { value: "Googlebot", label: "Googlebot" },
  { value: "Bingbot", label: "Bingbot" },
  { value: "GPTBot", label: "GPTBot" },
  { value: "ClaudeBot", label: "ClaudeBot" },
  { value: "*", label: "Any other bot" },
];

/**
 * Normalise percent-encoding so equivalent paths compare equal (RFC 9309
 * §2.2.2): non-ASCII and whitespace become UTF-8 %XX, hex is uppercased, and
 * escapes of unreserved characters (A–Z a–z 0–9 - . _ ~) are decoded.
 * Reserved escapes like %2F stay encoded, so /a%2Fb never matches /a/b.
 */
export function normalizePercent(s: string): string {
  const enc = new TextEncoder();
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    out +=
      cp > 0x7e || cp <= 0x20
        ? Array.from(enc.encode(ch), (b) => `%${b.toString(16).toUpperCase().padStart(2, "0")}`).join("")
        : ch;
  }
  return out.replace(/%([0-9a-fA-F]{2})/g, (_, h: string) => {
    const c = String.fromCharCode(parseInt(h, 16));
    return /[A-Za-z0-9\-._~]/.test(c) ? c : `%${h.toUpperCase()}`;
  });
}

/** Does a rule path (with `*` wildcards and a `$` end anchor) match a URL path? */
export function pathMatches(rawPattern: string, rawPath: string): boolean {
  if (!rawPattern) return false;
  const pattern = normalizePercent(rawPattern);
  const path = normalizePercent(rawPath);
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = body
    .split("*")
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${re}${anchored ? "$" : ""}`).test(path);
}

/** Path + query from a typed path or full URL ("https://x.com/a?b" → "/a?b"). */
export function toTestPath(input: string): string {
  const t = input.trim();
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      return u.pathname + u.search;
    } catch {
      return t;
    }
  }
  return t.startsWith("/") ? t : `/${t}`;
}

export interface TestResult {
  allowed: boolean;
  rule: RobotsRule | null;
  /** Which group answered ("*" when the bot has no group of its own). */
  group: string | null;
}

/**
 * Pick the bot's own group (case-insensitive name match), else `*`; then the
 * longest matching path wins, and Allow wins a tie. No match → allowed.
 */
export function testPath(rules: readonly RobotsRule[], agent: string, input: string): TestResult {
  const groups = groupRules(rules);
  const g =
    (agent !== "*" ? groups.find((x) => x.ua.toLowerCase() === agent.toLowerCase()) : undefined) ??
    groups.find((x) => x.ua === "*");
  if (!g) return { allowed: true, rule: null, group: null };
  const path = toTestPath(input);
  let best: RobotsRule | null = null;
  for (const r of g.rules) {
    const p = r.path.trim();
    if (!isAllow(r.type) && !isDisallow(r.type)) continue;
    if (!pathMatches(p, path)) continue;
    // Longest match in octets (after normalising), so /caf%C3%A9 and /café weigh the same.
    const len = normalizePercent(p).length;
    const bl = best ? normalizePercent(best.path.trim()).length : -1;
    if (!best || len > bl || (len === bl && isAllow(r.type) && !isAllow(best.type))) best = r;
  }
  return { allowed: !best || isAllow(best.type), rule: best, group: g.ua };
}

export function describeTest(t: TestResult): string {
  if (!t.rule) return t.allowed ? "✓ Allowed — no rule matches" : "✕ Blocked";
  const kind = isAllow(t.rule.type) ? "Allow" : "Disallow";
  return `${t.allowed ? "✓ Allowed" : "✕ Blocked"} by “${kind}: ${t.rule.path.trim()}”${t.group && t.group !== "*" ? ` (${t.group} group)` : ""}`;
}
