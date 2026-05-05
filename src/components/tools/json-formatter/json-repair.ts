import type { RepairResult } from "./json-formatter.types";

export class RepairError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "RepairError";
  }
}

/**
 * Try to fix common JSON mistakes in order. Returns a RepairResult with
 * the fixed string and a log of every change made.
 */
export function repairJson(raw: string): RepairResult {
  // If already valid, return immediately
  try {
    JSON.parse(raw);
    return { fixed: raw, changes: [], wasValid: true };
  } catch {
    // continue to repair
  }

  const changes: string[] = [];
  let s = raw;

  // 1. Strip line comments  //...
  const withoutLineComments = s.replace(/\/\/[^\n]*/g, "");
  if (withoutLineComments !== s) {
    const count = (s.match(/\/\/[^\n]*/g) ?? []).length;
    s = withoutLineComments;
    changes.push(`Removed ${count} line comment${count !== 1 ? "s" : ""}`);
  }

  // 2. Strip block comments  /* ... */
  const withoutBlockComments = s.replace(/\/\*[\s\S]*?\*\//g, "");
  if (withoutBlockComments !== s) {
    const count = (s.match(/\/\*[\s\S]*?\*\//g) ?? []).length;
    s = withoutBlockComments;
    changes.push(`Removed ${count} block comment${count !== 1 ? "s" : ""}`);
  }

  // 3. Convert single-quoted strings to double-quoted
  //    Match 'key' or 'value' patterns not already inside double-quoted strings.
  //    Simple heuristic: replace 'text' → "text" when not inside a valid string.
  const singleQuoteRe = /'(?:[^'\\]|\\.)*'/g;
  const withDoubleQuotes = s.replace(singleQuoteRe, (m) => {
    // Re-escape inner content for JSON double-quote context
    const inner = m.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"');
    return `"${inner}"`;
  });
  if (withDoubleQuotes !== s) {
    const count = (s.match(singleQuoteRe) ?? []).length;
    s = withDoubleQuotes;
    changes.push(`Converted ${count} single-quoted string${count !== 1 ? "s" : ""} to double-quoted`);
  }

  // 4. Quote unquoted keys: { key: value } → { "key": value }
  //    Match word chars before a colon that aren't already quoted.
  const unquotedKeyRe = /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g;
  const withQuotedKeys = s.replace(unquotedKeyRe, (_, prefix, key) => `${prefix}"${key}":`);
  if (withQuotedKeys !== s) {
    const count = (s.match(unquotedKeyRe) ?? []).length;
    s = withQuotedKeys;
    changes.push(`Quoted ${count} unquoted key${count !== 1 ? "s" : ""}`);
  }

  // 5. Replace `undefined` values with null
  const undefinedRe = /:\s*undefined\b/g;
  const withNulls = s.replace(undefinedRe, ": null");
  if (withNulls !== s) {
    const count = (s.match(undefinedRe) ?? []).length;
    s = withNulls;
    changes.push(`Replaced ${count} undefined value${count !== 1 ? "s" : ""} with null`);
  }

  // 6. Remove trailing commas before ] or }
  const trailingCommaRe = /,\s*([}\]])/g;
  const withoutTrailing = s.replace(trailingCommaRe, "$1");
  if (withoutTrailing !== s) {
    const count = (s.match(trailingCommaRe) ?? []).length;
    s = withoutTrailing;
    changes.push(`Removed ${count} trailing comma${count !== 1 ? "s" : ""}`);
  }

  // 7. Append missing closing brackets
  //    Count open/close brackets to detect imbalance.
  const missing = findMissingClosers(s);
  if (missing.length > 0) {
    s = s.trimEnd() + "\n" + missing.join("\n");
    changes.push(`Added ${missing.length} missing closing bracket${missing.length !== 1 ? "s" : ""}`);
  }

  // Check if repaired
  try {
    JSON.parse(s);
    return { fixed: s, changes, wasValid: false };
  } catch (err) {
    throw new RepairError(err instanceof Error ? err.message : String(err));
  }
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
