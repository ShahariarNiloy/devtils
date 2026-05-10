import type { RepairResult } from "./json-formatter.types";

export class RepairError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "RepairError";
  }
}

/**
 * Apply `fn` to every segment of `s` that is NOT inside a JSON string literal.
 * String literals (including their escape sequences) are passed through unchanged.
 */
function outsideStrings(s: string, fn: (chunk: string) => string): string {
  let result = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] === '"') {
      // Collect the entire string literal verbatim
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

/**
 * Escape literal control characters (newline, tab, CR) that appear inside
 * string literals — these make JSON parsers choke.
 */
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

/** Walk the string to find unmatched open brackets and return their closers. */
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

function track(next: string, prev: string, label: string, changes: string[]): string {
  if (next !== prev) changes.push(label);
  return next;
}

export function repairJson(raw: string): RepairResult {
  try {
    JSON.parse(raw);
    return { fixed: raw, changes: [], wasValid: true };
  } catch { /* fall through to repair */ }

  const changes: string[] = [];
  let s = raw;

  // ── Encoding ──────────────────────────────────────────────────────────────

  // 1. Strip BOM
  if (s.startsWith("﻿")) {
    s = s.slice(1);
    changes.push("Stripped byte-order mark (BOM)");
  }

  // 2. Normalize curly/smart quotes → straight quotes
  s = track(
    s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"),
    s, "Normalized smart/curly quotes", changes,
  );

  // ── Comments ──────────────────────────────────────────────────────────────

  // 3. Strip line comments  //...
  {
    const next = s.replace(/\/\/[^\n]*/g, "");
    if (next !== s) {
      const n = (s.match(/\/\/[^\n]*/g) ?? []).length;
      changes.push(`Removed ${n} line comment${n !== 1 ? "s" : ""}`);
      s = next;
    }
  }

  // 4. Strip block comments  /* ... */
  {
    const next = s.replace(/\/\*[\s\S]*?\*\//g, "");
    if (next !== s) {
      const n = (s.match(/\/\*[\s\S]*?\*\//g) ?? []).length;
      changes.push(`Removed ${n} block comment${n !== 1 ? "s" : ""}`);
      s = next;
    }
  }

  // ── String content ────────────────────────────────────────────────────────

  // 5. Escape literal newlines / tabs inside string literals
  s = track(escapeStringControls(s), s, "Escaped literal newlines/tabs inside strings", changes);

  // 6. Convert single-quoted strings → double-quoted
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

  // ── Keys ─────────────────────────────────────────────────────────────────

  // 7. Quote unquoted keys: { key: value } → { "key": value }
  {
    const re = /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g;
    const next = s.replace(re, (_, prefix, key) => `${prefix}"${key}":`);
    if (next !== s) {
      const n = (s.match(re) ?? []).length;
      changes.push(`Quoted ${n} unquoted key${n !== 1 ? "s" : ""}`);
      s = next;
    }
  }

  // ── Values ────────────────────────────────────────────────────────────────

  // 8. JS / Python non-JSON literals
  for (const [re, repl, label] of [
    [/\bTrue\b/g,      "true",  "Python True → true"],
    [/\bFalse\b/g,     "false", "Python False → false"],
    [/\bNone\b/g,      "null",  "Python None → null"],
    [/\bundefined\b/g, "null",  "undefined → null"],
    [/-Infinity\b/g,   "null",  "-Infinity → null"],
    [/\bInfinity\b/g,  "null",  "Infinity → null"],
    [/\bNaN\b/g,       "null",  "NaN → null"],
  ] as [RegExp, string, string][]) {
    s = track(s.replace(re, repl), s, label, changes);
  }

  // 9. Numeric separators: 1_000_000 → 1000000  (JS / Python)
  s = track(
    outsideStrings(s, (c) => c.replace(/(\d)_(?=\d)/g, "$1")),
    s, "Removed numeric separators (1_000 → 1000)", changes,
  );

  // 10. Leading + on numbers: +3 → 3
  s = track(
    outsideStrings(s, (c) => c.replace(/([:,\[]\s*)\+(-?\d)/g, "$1$2")),
    s, "Removed leading + from numbers", changes,
  );

  // 11. Leading decimal point: .5 → 0.5
  s = track(
    outsideStrings(s, (c) => c.replace(/([:,\[]\s*)\.(\d)/g, "$10.$2")),
    s, "Added leading zero to decimals (.5 → 0.5)", changes,
  );

  // 12. Trailing decimal point: 3. → 3
  s = track(
    outsideStrings(s, (c) => c.replace(/(\d)\.\s*([,}\]\n])/g, "$1$2")),
    s, "Removed trailing decimal point (3. → 3)", changes,
  );

  // 13. Hex numbers: 0xFF → 255
  {
    const next = outsideStrings(s, (c) =>
      c.replace(/\b0[xX][0-9a-fA-F]+\b/g, (m) => String(parseInt(m, 16))),
    );
    s = track(next, s, "Converted hex numbers to decimal", changes);
  }

  // ── Structural ────────────────────────────────────────────────────────────

  // 14. Semicolons as value separators → commas  (outside strings)
  s = track(
    outsideStrings(s, (c) => c.replace(/;/g, ",")),
    s, "Replaced semicolons with commas", changes,
  );

  // 15. Remove trailing commas before ] or }
  {
    const re = /,(\s*[}\]])/g;
    const next = s.replace(re, "$1");
    if (next !== s) {
      const n = (s.match(re) ?? []).length;
      changes.push(`Removed ${n} trailing comma${n !== 1 ? "s" : ""}`);
      s = next;
    }
  }

  // 16. Collapse double / multiple commas → single
  s = track(
    outsideStrings(s, (c) => c.replace(/,(\s*),+/g, ",$1")),
    s, "Collapsed duplicate commas", changes,
  );

  // 17. Add missing commas between values
  //     value\n  "nextKey"  →  value,\n  "nextKey"
  {
    const re = /(true|false|null|"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[}\]])(\s*\n(\s*))(?=["\[{]|-?\d|true\b|false\b|null\b)/g;
    const next = s.replace(re, "$1,$2");
    if (next !== s) {
      const n = (s.match(re) ?? []).length;
      changes.push(`Added ${n} missing comma${n !== 1 ? "s" : ""}`);
      s = next;
    }
  }

  // 18. Append missing closing brackets
  {
    const missing = findMissingClosers(s);
    if (missing.length > 0) {
      s = s.trimEnd() + "\n" + missing.join("\n");
      changes.push(`Added ${missing.length} missing closing bracket${missing.length !== 1 ? "s" : ""}`);
    }
  }

  // ── Final check ───────────────────────────────────────────────────────────

  try {
    JSON.parse(s);
    return { fixed: s, changes, wasValid: false };
  } catch (err) {
    throw new RepairError(err instanceof Error ? err.message : String(err));
  }
}
