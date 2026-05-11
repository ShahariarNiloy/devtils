import type { RepairResult } from "./json-formatter.types";

export class RepairError extends Error {
  /** The actual JSON.parse error after all repairs were attempted. */
  readonly parseError: string;
  /** The best-effort repaired JSON we couldn't quite parse — handy for diffs. */
  readonly partialFixed: string;
  /** Repairs we did manage to apply along the way. */
  readonly partialChanges: string[];
  constructor(parseError: string, partialFixed: string, partialChanges: string[]) {
    super(parseError);
    this.name = "RepairError";
    this.parseError = parseError;
    this.partialFixed = partialFixed;
    this.partialChanges = partialChanges;
  }
}

// ── String-aware traversal ───────────────────────────────────────────────────
// Both helpers below walk character-by-character so the contents of string
// literals are isolated from structural syntax. The fixers above the line
// don't need to know about strings; helpers below them rewrite ONLY string
// content. Each helper is allocation-light: a single result accumulator,
// no per-char regex.

/** Apply `fn` to every chunk OUTSIDE string literals. Strings pass through. */
function outsideStrings(s: string, fn: (chunk: string) => string): string {
  let result = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] === '"') {
      result += '"';
      i++;
      while (i < s.length) {
        if (s[i] === "\\" && i + 1 < s.length) {
          result += s[i] + s[i + 1];
          i += 2;
        } else if (s[i] === '"') {
          result += '"';
          i++;
          break;
        } else {
          result += s[i++];
        }
      }
    } else {
      let chunk = "";
      while (i < s.length && s[i] !== '"') chunk += s[i++];
      result += fn(chunk);
    }
  }
  return result;
}

/** Apply `fn` to every chunk INSIDE string literals (between the quotes). */
function insideStrings(s: string, fn: (content: string) => string): string {
  let result = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] === '"') {
      result += '"';
      i++;
      let content = "";
      while (i < s.length) {
        if (s[i] === "\\" && i + 1 < s.length) {
          content += s[i] + s[i + 1];
          i += 2;
        } else if (s[i] === '"') {
          break;
        } else {
          content += s[i++];
        }
      }
      result += fn(content);
      if (i < s.length && s[i] === '"') {
        result += '"';
        i++;
      }
    } else {
      result += s[i++];
    }
  }
  return result;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeStringControls(s: string): string {
  let result = "";
  let i = 0;
  let changed = false;
  while (i < s.length) {
    if (s[i] === '"') {
      result += '"';
      i++;
      while (i < s.length) {
        if (s[i] === "\\" && i + 1 < s.length) {
          result += s[i] + s[i + 1];
          i += 2;
        } else if (s[i] === '"') {
          result += '"';
          i++;
          break;
        } else if (s[i] === "\n") { result += "\\n";  i++; changed = true; }
        else if (s[i] === "\r") { result += "\\r";  i++; changed = true; }
        else if (s[i] === "\t") { result += "\\t";  i++; changed = true; }
        else { result += s[i++]; }
      }
    } else {
      result += s[i++];
    }
  }
  return changed ? result : s;
}

function findMissingClosers(s: string): string[] {
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  return stack.reverse();
}

/** True if walking `s` leaves us inside an unclosed string literal. */
function endsInsideString(s: string): boolean {
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') inString = !inString;
  }
  return inString;
}

/**
 * Locate every top-level JSON value (object or array) in `s`. Used to strip
 * prefix/suffix garbage AND to wrap NDJSON / concatenated JSON in a single
 * array — both are the same problem at heart (multiple structural roots).
 *
 * An unclosed final value is reported with `end = s.length - 1` so the
 * bracket-closer pass downstream can patch it.
 */
function findTopLevelValues(s: string): { start: number; end: number }[] {
  const values: { start: number; end: number }[] = [];
  let i = 0;
  while (i < s.length) {
    while (i < s.length && s[i] !== "{" && s[i] !== "[") i++;
    if (i >= s.length) break;
    const start = i;
    let depth = 0;
    let inString = false;
    let escape = false;
    for (; i < s.length; i++) {
      const ch = s[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{" || ch === "[") depth++;
      else if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 0) { values.push({ start, end: i }); i++; break; }
      }
    }
    if (depth !== 0) {
      values.push({ start, end: s.length - 1 });
      break;
    }
  }
  return values;
}

/**
 * If `s` is wrapped in a JSONP-style call — `name({...});` — return the
 * inner argument. Detection is conservative: there must be a single
 * balanced paren pair, optionally followed by a single semicolon, with no
 * other top-level tokens.
 */
function stripJsonpWrapper(s: string): string | null {
  const t = s.trim();
  const m = /^([a-zA-Z_$][\w$]*)\s*\(/.exec(t);
  if (!m) return null;
  const openIdx = t.indexOf("(", m[0].length - 1);
  let depth = 1;
  let inString = false;
  let escape = false;
  let strQuote = "";
  for (let i = openIdx + 1; i < t.length; i++) {
    const ch = t[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (inString) {
      if (ch === strQuote) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") { inString = true; strQuote = ch; continue; }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) {
        const after = t.slice(i + 1).trim();
        if (after === "" || after === ";") {
          return t.slice(openIdx + 1, i).trim();
        }
        return null;
      }
    }
  }
  return null;
}

// ── HTML entities ────────────────────────────────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '\\"',
  "&apos;": "'",
  "&nbsp;": " ",
};
const NAMED_ENTITY_RE = /&(?:amp|lt|gt|quot|apos|nbsp);/g;
const NUMERIC_ENTITY_RE = /&#(x[0-9a-f]+|\d+);/gi;

function decodeHtmlEntitiesInStringContent(content: string): string {
  let next = content.replace(NAMED_ENTITY_RE, (m) => NAMED_ENTITIES[m] ?? m);
  next = next.replace(NUMERIC_ENTITY_RE, (m, digits: string) => {
    const code = digits.toLowerCase().startsWith("x")
      ? parseInt(digits.slice(1), 16)
      : parseInt(digits, 10);
    if (!Number.isFinite(code) || code < 0x20) return m;
    if (code === 0x22) return '\\"';
    if (code === 0x5C) return "\\\\";
    try { return String.fromCodePoint(code); } catch { return m; }
  });
  return next;
}

// ── \u{XXXX} and \xFF inside string content ──────────────────────────────────

function expandUnicodeEscapes(content: string): string {
  return content.replace(/\\u\{([0-9a-fA-F]+)\}/g, (m, hex: string) => {
    const code = parseInt(hex, 16);
    if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return m;
    // BMP: keep \uXXXX form so we don't introduce non-ASCII bytes here.
    if (code <= 0xffff) return `\\u${code.toString(16).padStart(4, "0")}`;
    // Astral: emit a UTF-16 surrogate pair, both as \uXXXX escapes.
    const offset = code - 0x10000;
    const high = 0xd800 + (offset >> 10);
    const low = 0xdc00 + (offset & 0x3ff);
    return `\\u${high.toString(16)}\\u${low.toString(16)}`;
  });
}

function expandHexEscapes(content: string): string {
  return content.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex: string) =>
    `\\u00${hex.toLowerCase()}`,
  );
}

// ── CSV doubled quotes ───────────────────────────────────────────────────────

/**
 * In CSV, `""` inside a quoted cell means a literal `"`. When such a string
 * is pasted into JSON we end up with `"foo""bar"` — which a JSON parser
 * reads as two adjacent strings. Detect the pattern and re-encode as `\"`.
 */
function unescapeCsvQuotes(s: string): string {
  let out = "";
  let i = 0;
  let inString = false;
  while (i < s.length) {
    const ch = s[i];
    if (inString) {
      if (ch === "\\" && i + 1 < s.length) {
        out += ch + s[i + 1];
        i += 2;
      } else if (ch === '"') {
        if (s[i + 1] === '"') {
          out += '\\"';
          i += 2;
        } else {
          out += '"';
          inString = false;
          i++;
        }
      } else {
        out += ch;
        i++;
      }
    } else if (ch === '"') {
      out += '"';
      inString = true;
      i++;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

// ── Tracker ──────────────────────────────────────────────────────────────────

function track(next: string, prev: string, label: string, changes: string[]): string {
  if (next !== prev) changes.push(label);
  return next;
}

// ── Repair pipeline ──────────────────────────────────────────────────────────

export function repairJson(raw: string): RepairResult {
  try {
    JSON.parse(raw);
    return { fixed: raw, changes: [], wasValid: true };
  } catch { /* fall through to repair */ }

  const changes: string[] = [];
  let s = raw;

  // ── Encoding & wrappers ────────────────────────────────────────────────────

  if (s.startsWith("﻿")) {
    s = s.slice(1);
    changes.push("Stripped byte-order mark (BOM)");
  }

  s = track(
    s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"),
    s, "Normalized smart/curly quotes", changes,
  );

  const stripped = stripJsonpWrapper(s);
  if (stripped !== null) {
    s = stripped;
    changes.push("Stripped JSONP wrapper");
  }

  // ── Comments — string-aware ────────────────────────────────────────────────
  // Old implementation stripped `//` from URL strings and `/*` from inside
  // strings; that's data corruption. Route through outsideStrings.

  {
    let count = 0;
    const next = outsideStrings(s, (c) =>
      c.replace(/\/\/[^\n]*/g, () => { count++; return ""; }),
    );
    if (count > 0) {
      changes.push(`Removed ${count} line comment${count !== 1 ? "s" : ""}`);
      s = next;
    }
  }
  {
    let count = 0;
    const next = outsideStrings(s, (c) =>
      c.replace(/\/\*[\s\S]*?\*\//g, () => { count++; return ""; }),
    );
    if (count > 0) {
      changes.push(`Removed ${count} block comment${count !== 1 ? "s" : ""}`);
      s = next;
    }
  }

  // ── CSV doubled quotes (must run BEFORE control-char escaping etc.) ────────

  s = track(unescapeCsvQuotes(s), s, "Collapsed CSV doubled quotes (\"\" → \\\")", changes);

  // ── String content ─────────────────────────────────────────────────────────

  s = track(escapeStringControls(s), s, "Escaped literal newlines/tabs inside strings", changes);

  s = track(
    insideStrings(s, decodeHtmlEntitiesInStringContent),
    s, "Decoded HTML entities inside strings", changes,
  );

  s = track(
    insideStrings(s, expandUnicodeEscapes),
    s, "Expanded \\u{XXXX} escapes to surrogate pairs", changes,
  );

  s = track(
    insideStrings(s, expandHexEscapes),
    s, "Expanded \\xFF escapes to \\u00FF", changes,
  );

  // ── Single → double quote ──────────────────────────────────────────────────

  {
    const re = /'(?:[^'\\]|\\.)*'/g;
    const next = s.replace(re, (m) => {
      const inner = m.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"');
      return `"${inner}"`;
    });
    if (next !== s) {
      const n = (s.match(re) ?? []).length;
      changes.push(`Converted ${n} single-quoted string${n !== 1 ? "s" : ""} to double-quoted`);
      s = next;
    }
  }

  // ── Keys ───────────────────────────────────────────────────────────────────

  {
    const re = /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g;
    const next = s.replace(re, (_, prefix, key) => `${prefix}"${key}":`);
    if (next !== s) {
      const n = (s.match(re) ?? []).length;
      changes.push(`Quoted ${n} unquoted key${n !== 1 ? "s" : ""}`);
      s = next;
    }
  }

  // ── Value literals ─────────────────────────────────────────────────────────

  for (const [re, repl, label] of [
    [/\bTrue\b/g,      "true",  "Python True → true"],
    [/\bFalse\b/g,     "false", "Python False → false"],
    [/\bNone\b/g,      "null",  "Python None → null"],
    [/\bundefined\b/g, "null",  "undefined → null"],
    [/-Infinity\b/g,   "null",  "-Infinity → null"],
    [/\bInfinity\b/g,  "null",  "Infinity → null"],
    [/\bNaN\b/g,       "null",  "NaN → null"],
  ] as [RegExp, string, string][]) {
    s = track(
      outsideStrings(s, (c) => c.replace(re, repl)),
      s, label, changes,
    );
  }

  // ── BigInt literal: 123n → 123 (outside strings only) ──────────────────────

  s = track(
    outsideStrings(s, (c) => c.replace(/(\b\d+)n\b/g, "$1")),
    s, "Removed BigInt `n` suffix", changes,
  );

  // ── Numeric normalisation ──────────────────────────────────────────────────

  s = track(
    outsideStrings(s, (c) => c.replace(/(\d)_(?=\d)/g, "$1")),
    s, "Removed numeric separators (1_000 → 1000)", changes,
  );
  s = track(
    outsideStrings(s, (c) => c.replace(/([:,[]\s*)\+(-?\d)/g, "$1$2")),
    s, "Removed leading + from numbers", changes,
  );
  s = track(
    outsideStrings(s, (c) => c.replace(/([:,[]\s*)\.(\d)/g, "$10.$2")),
    s, "Added leading zero to decimals (.5 → 0.5)", changes,
  );
  s = track(
    outsideStrings(s, (c) => c.replace(/(\d)\.\s*([,}\]\n])/g, "$1$2")),
    s, "Removed trailing decimal point (3. → 3)", changes,
  );
  {
    const next = outsideStrings(s, (c) =>
      c.replace(/\b0[xX][0-9a-fA-F]+\b/g, (m) => String(parseInt(m, 16))),
    );
    s = track(next, s, "Converted hex numbers to decimal", changes);
  }

  // ── Structural punctuation ─────────────────────────────────────────────────

  s = track(
    outsideStrings(s, (c) => c.replace(/;/g, ",")),
    s, "Replaced semicolons with commas", changes,
  );

  {
    const re = /,(\s*[}\]])/g;
    const next = s.replace(re, "$1");
    if (next !== s) {
      const n = (s.match(re) ?? []).length;
      changes.push(`Removed ${n} trailing comma${n !== 1 ? "s" : ""}`);
      s = next;
    }
  }

  s = track(
    outsideStrings(s, (c) => c.replace(/,(\s*),+/g, ",$1")),
    s, "Collapsed duplicate commas", changes,
  );

  {
    const re = /(true|false|null|"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[}\]])(\s*\n(\s*))(?=["[{]|-?\d|true\b|false\b|null\b)/g;
    const next = s.replace(re, "$1,$2");
    if (next !== s) {
      const n = (s.match(re) ?? []).length;
      changes.push(`Added ${n} missing comma${n !== 1 ? "s" : ""}`);
      s = next;
    }
  }

  // ── Truncated string at EOF ────────────────────────────────────────────────
  // Run before the bracket-closer so the closer sees a properly-terminated
  // last string and can balance any open containers around it.

  if (endsInsideString(s)) {
    s = s + '"';
    changes.push("Closed truncated string at end of input");
  }

  // ── Multi-root: prefix / suffix garbage + NDJSON / concatenated → array ────
  // One pass handles all three: top-level values are collected, anything
  // around them is dropped, and 2+ values get wrapped in `[…]`.

  {
    const values = findTopLevelValues(s);
    if (values.length === 1) {
      const v = values[0];
      const before = s.slice(0, v.start);
      const after = s.slice(v.end + 1);
      const hasGarbage =
        before.trim().length > 0 || after.trim().length > 0;
      if (hasGarbage) {
        s = s.slice(v.start, v.end + 1);
        changes.push("Stripped non-JSON prefix/suffix");
      }
    } else if (values.length > 1) {
      const parts = values.map((v) => s.slice(v.start, v.end + 1).trim());
      s = `[${parts.join(",")}]`;
      changes.push(
        `Wrapped ${values.length} top-level values into a JSON array (NDJSON / concatenated)`,
      );
    }
  }

  // ── Append missing closing brackets ────────────────────────────────────────

  {
    const missing = findMissingClosers(s);
    if (missing.length > 0) {
      s = s.trimEnd() + "\n" + missing.join("\n");
      changes.push(`Added ${missing.length} missing closing bracket${missing.length !== 1 ? "s" : ""}`);
    }
  }

  // ── Final check ────────────────────────────────────────────────────────────

  try {
    JSON.parse(s);
    return { fixed: s, changes, wasValid: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new RepairError(msg, s, changes);
  }
}
