// ─── Compile ──────────────────────────────────────────────────────────────────

export interface CompiledOk {
  ok: true;
  regex: RegExp;
}
export interface CompiledError {
  ok: false;
  message: string;
}
export type Compiled = CompiledOk | CompiledError;

export function compile(pattern: string, flags: string): Compiled {
  if (!pattern) return { ok: false, message: "Pattern is empty." };
  try {
    return { ok: true, regex: new RegExp(pattern, flags) };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Match ────────────────────────────────────────────────────────────────────

export interface RegexMatch {
  index: number;
  end: number;
  match: string;
  groups: string[];
  named: Record<string, string>;
  line: number;
}

/** Run the regex against text, return every match. Capped at 5 000. */
export function matchAll(regex: RegExp, text: string): RegexMatch[] {
  const r = regex.global ? regex : new RegExp(regex.source, regex.flags + "g");
  const out: RegexMatch[] = [];
  let lastIndex = -1;
  let m: RegExpExecArray | null;
  while ((m = r.exec(text))) {
    if (m.index === lastIndex) { r.lastIndex += 1; continue; }
    lastIndex = m.index;
    const line = text.slice(0, m.index).split("\n").length;
    out.push({
      index: m.index,
      end: m.index + m[0].length,
      match: m[0],
      groups: m.slice(1).map((g) => g ?? ""),
      named: { ...(m.groups ?? {}) },
      line,
    });
    if (out.length >= 5000) break;
    if (m[0].length === 0) r.lastIndex += 1;
  }
  return out;
}

// ─── Replace ──────────────────────────────────────────────────────────────────

export function replaceText(regex: RegExp, text: string, replacement: string): string {
  try {
    const r = regex.global ? regex : new RegExp(regex.source, regex.flags + "g");
    return text.replace(r, replacement);
  } catch {
    return text;
  }
}

// ─── Split ────────────────────────────────────────────────────────────────────

export function splitText(regex: RegExp, text: string): string[] {
  try {
    return text.split(regex);
  } catch {
    return [text];
  }
}

// ─── Copy formats ─────────────────────────────────────────────────────────────

export type CopyFormat = "json" | "lines" | "csv";

export function formatMatches(matches: RegexMatch[], format: CopyFormat): string {
  const values = matches.map((m) => m.match);
  switch (format) {
    case "json":  return JSON.stringify(values, null, 2);
    case "lines": return values.join("\n");
    case "csv":   return values.map((v) => `"${v.replace(/"/g, '""')}"`).join("\n");
  }
}

// ─── ReDoS detection ─────────────────────────────────────────────────────────

export interface ReDoSResult {
  safe: boolean;
  warning: string | null;
}

export function detectReDoS(pattern: string): ReDoSResult {
  // Strip escape sequences so they don't confuse bracket matching
  const clean = pattern.replace(/\\./g, "XX");

  // Nested quantifiers — the classic catastrophic pattern
  // Matches: group containing a quantifier, itself followed by a quantifier
  // e.g. (a+)+  (.*)* ([a-z]+)* (\w+\s?)*
  const nestedQ = /\([^()]*[+*{][^()]*\)[+*{?]/;
  if (nestedQ.test(clean)) {
    return {
      safe: false,
      warning:
        "Nested quantifiers detected (e.g. (a+)+). " +
        "Certain inputs can cause exponential backtracking and hang the engine.",
    };
  }

  // Alternation with overlapping branches under quantifier: (a|aa)+
  const overlapAlt = /\((?:[^|()]+\|){1,}[^|()]+\)[+*{]/;
  if (overlapAlt.test(clean)) {
    return {
      safe: false,
      warning:
        "Alternation with quantifier detected — if branches overlap (e.g. (a|ab)+) " +
        "this can cause catastrophic backtracking.",
    };
  }

  return { safe: true, warning: null };
}

// ─── Explain ─────────────────────────────────────────────────────────────────

export type TokenType =
  | "anchor"
  | "char-class"
  | "group"
  | "group-end"
  | "quantifier"
  | "escape"
  | "special"
  | "literal"
  | "alternation";

export interface ExplainToken {
  raw: string;
  label: string;
  detail: string;
  type: TokenType;
  startIndex: number;
  endIndex: number;
}

export function explainPattern(pattern: string): ExplainToken[] {
  const tokens: ExplainToken[] = [];
  let i = 0;
  let groupIndex = 0;

  const push = (
    start: number,
    raw: string,
    label: string,
    detail: string,
    type: TokenType,
  ) => tokens.push({ raw, label, detail, type, startIndex: start, endIndex: start + raw.length });

  while (i < pattern.length) {
    const ch = pattern[i];

    // ── Escape sequence ──────────────────────────────────────
    if (ch === "\\") {
      const start = i;
      const next = pattern[i + 1] ?? "";
      const raw = "\\" + next;
      i += 2;
      switch (next) {
        case "d": push(start, raw, "Digit",          "Any digit [0-9]",                          "char-class"); break;
        case "D": push(start, raw, "Non-digit",      "Any character that is NOT a digit [^0-9]", "char-class"); break;
        case "w": push(start, raw, "Word char",      "Letter, digit or underscore [a-zA-Z0-9_]", "char-class"); break;
        case "W": push(start, raw, "Non-word",       "Anything NOT a word character",            "char-class"); break;
        case "s": push(start, raw, "Whitespace",     "Space, tab, newline, etc.",                "char-class"); break;
        case "S": push(start, raw, "Non-whitespace", "Any non-whitespace character",             "char-class"); break;
        case "b": push(start, raw, "Word boundary",  "Position between a word and a non-word character", "anchor"); break;
        case "B": push(start, raw, "Non-boundary",   "Position NOT at a word boundary",          "anchor"); break;
        case "n": push(start, raw, "Newline",         "Newline character (LF \\u000A)",           "escape"); break;
        case "r": push(start, raw, "Carriage return", "Carriage return (CR \\u000D)",             "escape"); break;
        case "t": push(start, raw, "Tab",             "Horizontal tab (\\u0009)",                 "escape"); break;
        case "f": push(start, raw, "Form feed",       "Form feed (\\u000C)",                      "escape"); break;
        case "v": push(start, raw, "Vertical tab",    "Vertical tab (\\u000B)",                   "escape"); break;
        case "0": push(start, raw, "Null",            "Null character (\\u0000)",                 "escape"); break;
        default:
          if (/\d/.test(next)) {
            push(start, raw, `Backreference $${next}`, `Matches the same text captured by group ${next}`, "escape");
          } else {
            push(start, raw, `Literal '${next}'`, `Escaped character — matches '${next}' literally`, "literal");
          }
      }
      continue;
    }

    // ── Anchors ──────────────────────────────────────────────
    if (ch === "^") {
      push(i, "^", "Start", "Matches start of input (or start of line with the m flag)", "anchor");
      i++; continue;
    }
    if (ch === "$") {
      push(i, "$", "End", "Matches end of input (or end of line with the m flag)", "anchor");
      i++; continue;
    }

    // ── Wildcard ─────────────────────────────────────────────
    if (ch === ".") {
      push(i, ".", "Any char", "Matches any character except newline (unless the s flag is set)", "special");
      i++; continue;
    }

    // ── Alternation ──────────────────────────────────────────
    if (ch === "|") {
      push(i, "|", "Or", "Matches the expression on the left OR the right", "alternation");
      i++; continue;
    }

    // ── Character class ──────────────────────────────────────
    if (ch === "[") {
      const start = i;
      let j = i + 1;
      if (pattern[j] === "^") j++;
      if (pattern[j] === "]") j++;
      while (j < pattern.length && pattern[j] !== "]") {
        if (pattern[j] === "\\") j++;
        j++;
      }
      const raw = pattern.slice(i, j + 1);
      const neg = pattern[i + 1] === "^";
      const inner = neg ? raw.slice(2, -1) : raw.slice(1, -1);
      push(
        start,
        raw,
        neg ? "Not in set" : "Character set",
        neg ? `Match any char NOT in [${inner}]` : `Match any char in [${inner}]`,
        "char-class",
      );
      i = j + 1;
      continue;
    }

    // ── Groups ───────────────────────────────────────────────
    if (ch === "(") {
      const start = i;
      const rest = pattern.slice(i + 1);
      if (rest.startsWith("?:")) {
        push(start, "(?:", "Non-capturing group", "Groups the expression without creating a capture ($1, $2…)", "group");
        i += 3;
      } else if (rest.startsWith("?=")) {
        push(start, "(?=", "Lookahead", "Asserts the following text matches this group (not consumed)", "group");
        i += 3;
      } else if (rest.startsWith("?!")) {
        push(start, "(?!", "Negative lookahead", "Asserts the following text does NOT match this group", "group");
        i += 3;
      } else if (rest.startsWith("?<=")) {
        push(start, "(?<=", "Lookbehind", "Asserts the preceding text matches this group", "group");
        i += 4;
      } else if (rest.startsWith("?<!")) {
        push(start, "(?<!", "Negative lookbehind", "Asserts the preceding text does NOT match this group", "group");
        i += 4;
      } else if (rest.startsWith("?<")) {
        const end = pattern.indexOf(">", i + 3);
        const name = end > 0 ? pattern.slice(i + 3, end) : "?";
        const raw = `(?<${name}>`;
        push(start, raw, `Named capture '${name}'`, `Capture group — accessible as match.groups.${name}`, "group");
        i += raw.length;
      } else {
        groupIndex++;
        push(start, "(", `Capture group $${groupIndex}`, `Captures the match as $${groupIndex} in replacements and backreferences`, "group");
        i++;
      }
      continue;
    }

    if (ch === ")") {
      push(i, ")", "End group", "Closes the preceding group", "group-end");
      i++; continue;
    }

    // ── Quantifiers ──────────────────────────────────────────
    if (ch === "*" || ch === "+" || ch === "?") {
      const start = i;
      const lazy = pattern[i + 1] === "?";
      const raw = lazy ? ch + "?" : ch;
      const suffix = lazy ? " (lazy — as few as possible)" : " (greedy — as many as possible)";
      if (ch === "*") push(start, raw, `0 or more${lazy ? " lazy" : ""}`, `Repeats the preceding 0 or more times${suffix}`, "quantifier");
      else if (ch === "+") push(start, raw, `1 or more${lazy ? " lazy" : ""}`, `Repeats the preceding 1 or more times${suffix}`, "quantifier");
      else push(start, raw, lazy ? "Lazy" : "Optional", lazy ? "Makes the preceding quantifier lazy" : "Matches 0 or 1 of the preceding (greedy)", "quantifier");
      i += lazy ? 2 : 1;
      continue;
    }

    if (ch === "{") {
      const start = i;
      const j = pattern.indexOf("}", i);
      if (j > i) {
        const inner = pattern.slice(i + 1, j);
        const lazy = pattern[j + 1] === "?";
        const raw = `{${inner}}${lazy ? "?" : ""}`;
        let detail = "";
        if (/^\d+$/.test(inner)) detail = `Matches exactly ${inner} of the preceding`;
        else if (/^\d+,$/.test(inner)) detail = `Matches ${inner.slice(0, -1)} or more of the preceding`;
        else if (/^\d+,\d+$/.test(inner)) {
          const [mn, mx] = inner.split(",");
          detail = `Matches between ${mn} and ${mx} of the preceding`;
        } else {
          detail = `Quantifier {${inner}}`;
        }
        if (lazy) detail += " (lazy)";
        push(start, raw, `Repeat {${inner}}`, detail, "quantifier");
        i = j + 1 + (lazy ? 1 : 0);
        continue;
      }
    }

    // ── Literal ───────────────────────────────────────────────
    push(i, ch, `'${ch}'`, `Matches the literal character '${ch}'`, "literal");
    i++;
  }

  return tokens;
}

// ─── Flags ────────────────────────────────────────────────────────────────────

export const ALL_FLAGS = ["g", "i", "m", "s", "u", "y"] as const;
export type Flag = (typeof ALL_FLAGS)[number];

export const flagDescriptions: Record<Flag, string> = {
  g: "global — find all matches",
  i: "case-insensitive",
  m: "multiline ^ and $",
  s: "dotall — . matches newlines",
  u: "unicode",
  y: "sticky — match at lastIndex",
};

// ─── Pattern library ─────────────────────────────────────────────────────────

export interface CommonPattern {
  label: string;
  pattern: string;
  flags: string;
  hint: string;
}

export interface PatternCategory {
  category: string;
  patterns: CommonPattern[];
}

export const PATTERN_LIBRARY: PatternCategory[] = [
  {
    category: "Validation",
    patterns: [
      { label: "Email address",      pattern: "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b",  flags: "g",  hint: "Common format — not RFC-strict" },
      { label: "URL (http/https)",   pattern: "https?:\\/\\/[\\w.-]+(?::\\d+)?(?:[\\/?#][^\\s]*)?",       flags: "g",  hint: "Absolute URLs only" },
      { label: "IPv4 address",       pattern: "\\b(?:25[0-5]|2[0-4]\\d|1?\\d\\d?)(?:\\.(?:25[0-5]|2[0-4]\\d|1?\\d\\d?)){3}\\b", flags: "g", hint: "Standard dotted-quad" },
      { label: "UUID / GUID",        pattern: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", flags: "gi", hint: "v4-style UUID" },
      { label: "Semver",             pattern: "\\bv?(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-[\\w.-]+)?(?:\\+[\\w.-]+)?\\b", flags: "g", hint: "Semantic version string" },
      { label: "Hex color",          pattern: "#(?:[0-9a-fA-F]{3,4}){1,2}\\b",                            flags: "g",  hint: "3, 4, 6 or 8-digit hex" },
      { label: "Slug",               pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",                                flags: "",   hint: "URL-safe lowercase slug" },
    ],
  },
  {
    category: "Dates & Times",
    patterns: [
      { label: "ISO date (YYYY-MM-DD)", pattern: "\\b\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])\\b", flags: "g", hint: "Loose calendar validation" },
      { label: "ISO datetime",          pattern: "\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})?", flags: "g", hint: "ISO 8601 with optional timezone" },
      { label: "Time (HH:MM)",          pattern: "\\b([01]?\\d|2[0-3]):[0-5]\\d\\b",                        flags: "g", hint: "24-hour clock" },
      { label: "Unix timestamp",        pattern: "\\b[1-9]\\d{9}(?:\\.\\d+)?\\b",                           flags: "g", hint: "10-digit epoch seconds" },
    ],
  },
  {
    category: "Security",
    patterns: [
      { label: "JWT",               pattern: "eyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+",    flags: "g",  hint: "JSON Web Token" },
      { label: "Strong password",   pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$",    flags: "",   hint: "Min 8 chars, mixed case + digit + symbol" },
      { label: "Base64 string",     pattern: "(?:[A-Za-z0-9+\\/]{4})*(?:[A-Za-z0-9+\\/]{2}==|[A-Za-z0-9+\\/]{3}=)?", flags: "g", hint: "Standard Base64 with padding" },
    ],
  },
  {
    category: "Network",
    patterns: [
      { label: "Phone (international)", pattern: "(?:\\+?\\d{1,3}[\\s-]?)?(?:\\(\\d{2,4}\\)|\\d{2,4})[\\s-]?\\d{3,4}[\\s-]?\\d{3,4}", flags: "g", hint: "International format" },
      { label: "MAC address",           pattern: "(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}",                  flags: "gi", hint: "Colon-separated MAC" },
      { label: "Domain name",           pattern: "\\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}\\b", flags: "g", hint: "Excludes protocol" },
    ],
  },
  {
    category: "Code",
    patterns: [
      { label: "JS/TS import",   pattern: "import\\s+(?:[\\w*{}\\s,]+from\\s+)?[\"'][^\"']+[\"']",          flags: "gm", hint: "ES module import statement" },
      { label: "JS comment",     pattern: "\\/\\/.*$|\\/\\*[\\s\\S]*?\\*\\/",                               flags: "gm", hint: "Single-line and multi-line" },
      { label: "Console.log",    pattern: "console\\.[a-z]+\\([^)]*\\)",                                    flags: "g",  hint: "console.log/warn/error etc." },
      { label: "HTML tag",       pattern: "<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*>",                               flags: "g",  hint: "Opening tags only" },
      { label: "CSS hex color",  pattern: "#([0-9a-fA-F]{3,6})\\b",                                         flags: "gi", hint: "3 or 6-digit hex values" },
    ],
  },
  {
    category: "Text",
    patterns: [
      { label: "Whole word",       pattern: "\\b[\\w']+\\b",                                                flags: "g",  hint: "Words including apostrophes" },
      { label: "Empty line",       pattern: "^\\s*$",                                                       flags: "gm", hint: "Lines with only whitespace" },
      { label: "Extra whitespace", pattern: "[ \\t]{2,}",                                                   flags: "g",  hint: "Two or more consecutive spaces/tabs" },
      { label: "Duplicate word",   pattern: "\\b(\\w+)\\s+\\1\\b",                                         flags: "gi", hint: "Repeated words like 'the the'" },
      { label: "Markdown heading", pattern: "^#{1,6}\\s+(.+)$",                                             flags: "gm", hint: "ATX-style headings" },
    ],
  },
];

// Flat list kept for the old code path
export const commonPatterns: CommonPattern[] = PATTERN_LIBRARY.flatMap(
  (c) => c.patterns,
);

// ─── Example generation ───────────────────────────────────────────────────────

export interface GenerateResult {
  examples: string[];
  error: string | null;
}

/**
 * Generate sample strings that match the given regex pattern.
 * Uses randexp under the hood; caps unbounded quantifiers so output
 * stays readable (e.g. `.*` won't produce 500-char strings).
 */
export async function generateExamples(
  pattern: string,
  flags: string,
  count = 8,
): Promise<GenerateResult> {
  try {
    // randexp is a CommonJS module — dynamic import keeps the lib file
    // free of top-level side-effects and avoids SSR issues.
    const RandExp = (await import("randexp")).default ?? (await import("randexp"));
    const re = new RegExp(pattern, flags.replace(/g/g, ""));
    const gen = new (RandExp as new (r: RegExp) => { gen(): string; max: number })(re);
    gen.max = 12; // cap `*` and `+` repetitions to keep output compact

    const seen = new Set<string>();
    const examples: string[] = [];
    const attempts = count * 6;

    for (let i = 0; i < attempts && examples.length < count; i++) {
      const s = gen.gen();
      if (!seen.has(s)) {
        seen.add(s);
        examples.push(s);
      }
    }

    if (examples.length === 0) {
      return { examples: [], error: "Could not generate examples for this pattern." };
    }
    return { examples, error: null };
  } catch (err) {
    return {
      examples: [],
      error: err instanceof Error ? err.message : "Generation failed.",
    };
  }
}
