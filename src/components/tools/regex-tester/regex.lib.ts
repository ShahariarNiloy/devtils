/**
 * Regex helpers — compile a (pattern, flags) pair safely and walk the matches.
 * The UI relies on stable shapes so it can render highlights and groups without
 * additional logic.
 */

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

export interface RegexMatch {
  index: number;
  end: number;
  match: string;
  groups: string[];
  named: Record<string, string>;
}

/**
 * Run the compiled regex against `text`, returning every match. We inject
 * the `g` flag so we always iterate; without it `String.matchAll` would
 * throw. Capped at 5,000 matches as a safety net.
 */
export function matchAll(regex: RegExp, text: string): RegexMatch[] {
  if (!regex.global) {
    regex = new RegExp(regex.source, regex.flags + "g");
  }
  const out: RegexMatch[] = [];
  let m: RegExpExecArray | null;
  let lastIndex = -1;
  while ((m = regex.exec(text))) {
    if (m.index === lastIndex) {
      regex.lastIndex += 1;
      continue;
    }
    lastIndex = m.index;
    out.push({
      index: m.index,
      end: m.index + m[0].length,
      match: m[0],
      groups: m.slice(1).map((g) => g ?? ""),
      named: { ...(m.groups ?? {}) },
    });
    if (out.length >= 5000) break;
    if (m[0].length === 0) regex.lastIndex += 1;
  }
  return out;
}

export interface CommonPattern {
  label: string;
  pattern: string;
  flags: string;
  hint: string;
}

export const commonPatterns: CommonPattern[] = [
  {
    label: "Email address",
    pattern: "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b",
    flags: "g",
    hint: "Common forms; not RFC-strict.",
  },
  {
    label: "URL (http/https)",
    pattern: "https?:\\/\\/[\\w.-]+(?:\\:\\d+)?(?:[\\/?#][^\\s]*)?",
    flags: "g",
    hint: "Matches absolute URLs.",
  },
  {
    label: "Phone number",
    pattern: "(?:\\+?\\d{1,3}[\\s-]?)?(?:\\(\\d{2,4}\\)|\\d{2,4})[\\s-]?\\d{3,4}[\\s-]?\\d{3,4}",
    flags: "g",
    hint: "International-ish format.",
  },
  {
    label: "IPv4 address",
    pattern: "\\b(?:25[0-5]|2[0-4]\\d|1?\\d\\d?)(?:\\.(?:25[0-5]|2[0-4]\\d|1?\\d\\d?)){3}\\b",
    flags: "g",
    hint: "Standard dotted-quad.",
  },
  {
    label: "Hex color",
    pattern: "#(?:[0-9a-fA-F]{3,4}){1,2}\\b",
    flags: "g",
    hint: "3, 4, 6, or 8-digit hex.",
  },
  {
    label: "ISO date (YYYY-MM-DD)",
    pattern: "\\b\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])\\b",
    flags: "g",
    hint: "Loose calendar validation.",
  },
];

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
