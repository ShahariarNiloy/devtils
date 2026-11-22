/**
 * Pure helpers shared by every SEO tool (no React, no DOM): check levels and
 * summaries, language-code validation, URL checks, escaping and the small
 * syntax highlighters used by the code panel.
 */

/* ── Checks ─────────────────────────────────────────────────────────── */

export type CheckLevel = "err" | "warn" | "info" | "ok";

export interface Check {
  level: CheckLevel;
  text: string;
}

export interface CheckCounts {
  err: number;
  warn: number;
  ok: number;
  info: number;
}

const LEVEL_ORDER: Record<CheckLevel, number> = { err: 0, warn: 1, info: 2, ok: 3 };

/** Errors first, then warnings, notes, passes. Stable within a level. */
export function sortChecks(checks: readonly Check[]): Check[] {
  return checks
    .map((c, i) => ({ c, i }))
    .sort((a, b) => LEVEL_ORDER[a.c.level] - LEVEL_ORDER[b.c.level] || a.i - b.i)
    .map((x) => x.c);
}

export function countChecks(checks: readonly Check[]): CheckCounts {
  const n: CheckCounts = { err: 0, warn: 0, ok: 0, info: 0 };
  for (const c of checks) n[c.level]++;
  return n;
}

export function hasProblems(checks: readonly Check[]): boolean {
  return checks.some((c) => c.level === "err" || c.level === "warn");
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface SummaryChip {
  level: "err" | "warn" | "ok";
  label: string;
}

/** "2 errors" · "1 warning", or a single "All checks pass". */
export function summaryChips(counts: CheckCounts): SummaryChip[] {
  const out: SummaryChip[] = [];
  if (counts.err) out.push({ level: "err", label: plural(counts.err, "error", "errors") });
  if (counts.warn) out.push({ level: "warn", label: plural(counts.warn, "warning", "warnings") });
  if (!counts.err && !counts.warn) out.push({ level: "ok", label: "All checks pass" });
  return out;
}

/** Status-bar line: "2 errors" / "1 warning" / "All good". */
export function statusOf(counts: CheckCounts): { level: "err" | "warn" | "ok"; text: string } {
  if (counts.err) return { level: "err", text: plural(counts.err, "error", "errors") };
  if (counts.warn) return { level: "warn", text: plural(counts.warn, "warning", "warnings") };
  return { level: "ok", text: "All good" };
}

/* ── Language codes ─────────────────────────────────────────────────── */

/** ISO 639-1 codes (plus `fil`, which Google accepts). */
const LANGS = new Set(
  "aa ab af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu fil".split(
    " ",
  ),
);

/**
 * ISO 3166-1 alpha-2 codes that are officially assigned. Reserved or
 * user-assigned codes (EU, UN, UK, XX, ZZ, QM–QZ, AA…) aren't countries, and
 * Google ignores hreflang regions that aren't on this list.
 */
const REGIONS = new Set(
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  ),
);

/** Common region mistakes → the code that was meant. */
const REGION_FIX: Record<string, string> = { UK: "GB" };

export interface CodeCheck {
  ok: boolean;
  /** Why it's invalid (ok = false). */
  msg?: string;
  /** Valid but unconventional (ok = true). */
  warn?: string;
  /** Best-guess corrected code, when one is obvious. */
  fixed?: string;
}

const LANG_RE = /^([a-zA-Z]{2,3})(?:-([a-zA-Z]{4}))?(?:-([a-zA-Z]{2}|\d{3}))?$/;

/**
 * Validate an hreflang value: ISO 639-1 language, optional script and
 * ISO 3166-1 alpha-2 region, or x-default. Values are case-insensitive;
 * `fixed` is the conventional casing (x-default, zh-Hant-TW, en-GB).
 */
export function checkLangCode(code: string): CodeCheck {
  if (code.toLowerCase() === "x-default") return { ok: true, fixed: "x-default" };
  const m = LANG_RE.exec(code);
  if (!m) {
    return {
      ok: false,
      msg: `“${code}” isn't a language code. Use ISO 639-1, optionally with an ISO 3166-1 region, like en or en-GB.`,
    };
  }
  const [, lang, script, region] = m;
  const lg = lang.toLowerCase();
  const sc = script ? `-${script[0].toUpperCase()}${script.slice(1).toLowerCase()}` : "";
  if (!LANGS.has(lg)) return { ok: false, msg: `“${lang}” isn't an ISO 639-1 language code.` };
  const rg = region?.toUpperCase();
  if (rg && REGION_FIX[rg]) {
    const fixed = `${lg}${sc}-${REGION_FIX[rg]}`;
    return { ok: false, msg: `“${code}” uses an invalid region. Did you mean ${fixed}?`, fixed };
  }
  if (rg === "EU" || rg === "UN") {
    return {
      ok: false,
      msg: `“${code}”: Google doesn't support ${rg} as a region. List each country (like ${lg}-DE, ${lg}-FR) or use plain ${lg}.`,
    };
  }
  const fixed = `${lg}${sc}${rg ? `-${rg}` : ""}`;
  if (rg && /^\d{3}$/.test(rg)) {
    return {
      ok: true,
      warn: `“${code}” is valid BCP 47, but Google doesn't support numeric UN M.49 regions and ignores it. Use plain ${lg} or a country, like ${lg}-MX.`,
      fixed,
    };
  }
  if (rg && !REGIONS.has(rg)) {
    return { ok: false, msg: `“${region}” isn't an assigned ISO 3166-1 country code.` };
  }
  if (rg === "LA" && lg === "es") {
    return {
      ok: true,
      warn: `“${code}” targets Laos. For Latin America there's no country code: use plain es or specific countries like es-MX.`,
      fixed,
    };
  }
  if (region && region !== rg) {
    return { ok: true, warn: `“${code}” works, but regions are conventionally uppercase: ${fixed}.`, fixed };
  }
  return { ok: true, fixed };
}

/* ── URLs ───────────────────────────────────────────────────────────── */

/**
 * Absolute http(s) URL that parses, with a dotted host and no raw
 * whitespace anywhere (spaces must be written as %20).
 */
export function isAbsUrl(u: string | null | undefined): boolean {
  const s = u ?? "";
  if (!/^https?:\/\//i.test(s) || /\s/.test(s)) return false;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.hostname.startsWith("[")) return true; // IPv6 literal
  const labels = url.hostname.replace(/\.$/, "").split(".");
  return labels.length >= 2 && labels.every(Boolean);
}

/** Normalised form for comparing two URLs (host case, default port…). */
export function sameUrl(a: string, b: string): boolean {
  if (a === b) return true;
  try {
    return new URL(a).href === new URL(b).href;
  } catch {
    return false;
  }
}

/* ── Dates ──────────────────────────────────────────────────────────── */

/** Days in a month (1–12) of a year, leap years included. */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Is Y-M-D a real calendar date (no Feb 30, no Apr 31)? */
export function isRealDate(year: number, month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/* ── Escaping ───────────────────────────────────────────────────────── */

/** Escape a value for an HTML/XML double-quoted attribute or text node. */
export function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Decode the handful of entities that show up in pasted href values. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/* ── Highlighting ───────────────────────────────────────────────────── */

export type TokenKind =
  | "plain"
  | "punct"
  | "tag"
  | "attr"
  | "string"
  | "number"
  | "bool"
  | "entity"
  | "comment"
  | "key"
  | "value"
  | "allow"
  | "disallow"
  | "agent";

export interface Token {
  v: string;
  k: TokenKind;
}

export type CodeLine = Token[];

export type HighlightLang = "markup" | "robots" | "plain" | "json";

function highlightMarkupLine(ln: string): CodeLine {
  const toks: Token[] = [];
  const re = /(<!--.*?-->)|(<\/?|<\?)([\w:.-]+)|(\/?>|\?>)|([\w:-]+)(=)("[^"]*")|(&\w+;|&#x?[0-9a-f]+;)/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(ln)) !== null) {
    if (m.index > last) toks.push({ v: ln.slice(last, m.index), k: "plain" });
    if (m[1]) toks.push({ v: m[1], k: "comment" });
    else if (m[2]) toks.push({ v: m[2], k: "punct" }, { v: m[3], k: "tag" });
    else if (m[4]) toks.push({ v: m[4], k: "punct" });
    else if (m[5]) toks.push({ v: m[5], k: "attr" }, { v: m[6], k: "punct" }, { v: m[7], k: "string" });
    else toks.push({ v: m[0], k: "entity" });
    last = re.lastIndex;
  }
  if (last < ln.length) toks.push({ v: ln.slice(last), k: "plain" });
  return toks;
}

function highlightRobotsLine(ln: string): CodeLine {
  const m = /^(#.*)$|^([A-Za-z-]+)(:)(\s*)(.*)$/.exec(ln);
  if (!m) return [{ v: ln, k: "plain" }];
  if (m[1]) return [{ v: m[1], k: "comment" }];
  const key = m[2].toLowerCase();
  const k: TokenKind = key === "disallow" ? "disallow" : key === "allow" ? "allow" : key === "user-agent" ? "agent" : "key";
  return [
    { v: m[2], k },
    { v: m[3] + m[4], k: "punct" },
    { v: m[5], k: "value" },
  ];
}

function highlightPlainLine(ln: string): CodeLine {
  const m = /^([\w-]+:)(.*)$/.exec(ln);
  return m ? [{ v: m[1], k: "key" }, { v: m[2], k: "plain" }] : [{ v: ln, k: "value" }];
}

function highlightJsonLine(ln: string): CodeLine {
  const toks: Token[] = [];
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(ln)) !== null) {
    if (m.index > last) toks.push({ v: ln.slice(last, m.index), k: "plain" });
    if (m[1]) {
      toks.push({ v: m[1], k: m[2] ? "key" : "string" });
      if (m[2]) toks.push({ v: m[2], k: "punct" });
    } else toks.push({ v: m[0], k: m[3] ? "number" : m[4] ? "bool" : "punct" });
    last = re.lastIndex;
  }
  if (last < ln.length) toks.push({ v: ln.slice(last), k: "plain" });
  return toks;
}

const LINE_HIGHLIGHTERS: Record<HighlightLang, (ln: string) => CodeLine> = {
  markup: highlightMarkupLine,
  robots: highlightRobotsLine,
  plain: highlightPlainLine,
  json: highlightJsonLine,
};

/** Split text into lines of coloured tokens for the code panel. */
export function highlight(text: string, lang: HighlightLang): CodeLine[] {
  if (!text) return [];
  return text.split("\n").map(LINE_HIGHLIGHTERS[lang]);
}

/* ── Small parsing helpers ──────────────────────────────────────────── */

/**
 * Parse a delimited table (CSV or TSV, as pasted from a spreadsheet).
 * Tabs win when the first line has one; double-quoted cells may contain the
 * delimiter. Blank lines are skipped; cells are trimmed.
 */
export function parseTable(raw: string): string[][] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const delim = lines[0].includes("\t") ? "\t" : ",";
  return lines.map((line) => {
    const cells: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"' && cur.trim() === "") {
        quoted = true;
        cur = "";
      } else if (ch === delim) {
        cells.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  });
}

export interface HtmlTag {
  /** Lowercased tag name. */
  name: string;
  /** Lowercased attribute names → decoded values ("" for bare attributes). */
  attrs: Record<string, string>;
  /** The raw tag text. */
  raw: string;
}

/**
 * Remove what a browser never parses as tags: comments, and the contents of
 * <script>, <style>, <template> and <textarea> (their start/end tags stay).
 */
export function stripInertHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?(?:-->|$)/g, "")
    .replace(/(<(script|style|template|textarea)\b(?:[^>"']|"[^"]*"|'[^']*')*>)[\s\S]*?(?:(<\/\2\s*>)|$)/gi, "$1$3");
}

/**
 * Find every `<name …>` start tag in pasted HTML and read its attributes.
 * Tags inside comments, scripts, styles and templates are skipped.
 */
export function findTags(html: string, name: string): HtmlTag[] {
  const out: HtmlTag[] = [];
  const re = new RegExp(`<${name}\\b((?:[^>"']|"[^"]*"|'[^']*')*)>`, "gi");
  const src = stripInertHtml(html);
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const attrs: Record<string, string> = {};
    const are = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let a: RegExpExecArray | null;
    while ((a = are.exec(m[1])) !== null) {
      const key = a[1].toLowerCase();
      if (key in attrs) continue; // first occurrence wins, as in browsers
      attrs[key] = decodeEntities(a[2] ?? a[3] ?? a[4] ?? "");
    }
    out.push({ name: name.toLowerCase(), attrs, raw: m[0] });
  }
  return out;
}
