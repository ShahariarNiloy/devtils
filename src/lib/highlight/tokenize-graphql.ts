import type { Token } from "./types";

/**
 * GraphQL tokenizer. Spec is small and shallow — keywords, names,
 * variables, strings, numbers, directives, punctuation — so this fits in
 * one straightforward pass.
 *
 * Shapes coloured:
 *   - Keywords (`query`, `mutation`, `fragment`, `type`, `enum`, …)  → kw
 *   - Type names (PascalCase identifiers)                            → type
 *   - Field / argument names (camelCase identifiers)                 → ident
 *   - Variables (`$id`)                                              → key
 *   - Directives (`@include`)                                        → decorator
 *   - Strings (single + block `"""`)                                 → string
 *   - Numbers                                                        → number
 *   - Booleans / null                                                → bool / null
 *   - Comments (`#…` to EOL)                                         → comment
 *   - `{ } ( ) [ ]`                                                  → punct
 *   - `: , = | ! ...`                                                → op
 */

const KEYWORDS = new Set([
  "query", "mutation", "subscription", "fragment", "on",
  "type", "interface", "union", "enum", "scalar", "input",
  "directive", "schema", "extend", "implements", "repeatable",
]);

function isIdentStart(c: number): boolean {
  return (
    (c >= 97 && c <= 122) ||
    (c >= 65 && c <= 90) ||
    c === 95
  );
}

function isIdent(c: number): boolean {
  return (
    (c >= 97 && c <= 122) ||
    (c >= 65 && c <= 90) ||
    (c >= 48 && c <= 57) ||
    c === 95
  );
}

function isWs(c: number): boolean {
  return c === 32 || c === 9 || c === 44; // commas are whitespace in GraphQL
}

export function tokenizeGraphql(source: string): Token[] {
  const tokens: Token[] = [];
  const len = source.length;
  let i = 0;

  while (i < len) {
    const c = source.charCodeAt(i);

    // Newline
    if (c === 10 || c === 13) {
      tokens.push({ type: "ws", value: source[i] });
      i++;
      continue;
    }

    // Whitespace (spaces, tabs, commas)
    if (isWs(c)) {
      const start = i;
      while (i < len && isWs(source.charCodeAt(i))) i++;
      tokens.push({ type: "ws", value: source.slice(start, i) });
      continue;
    }

    // Comment: # to EOL
    if (c === 35 /* # */) {
      const start = i;
      while (i < len && source.charCodeAt(i) !== 10) i++;
      tokens.push({ type: "comment", value: source.slice(start, i) });
      continue;
    }

    // Block string: """ ... """ — eat as one token so the embedded
    // newlines / quotes don't bleed colour.
    if (
      c === 34 &&
      source.charCodeAt(i + 1) === 34 &&
      source.charCodeAt(i + 2) === 34
    ) {
      const start = i;
      i += 3;
      while (i + 2 < len) {
        if (
          source.charCodeAt(i) === 34 &&
          source.charCodeAt(i + 1) === 34 &&
          source.charCodeAt(i + 2) === 34
        ) {
          i += 3;
          break;
        }
        i++;
      }
      tokens.push({ type: "string", value: source.slice(start, i) });
      continue;
    }

    // Regular double-quoted string with backslash escapes.
    if (c === 34) {
      const start = i;
      i++;
      while (i < len) {
        const cc = source.charCodeAt(i);
        if (cc === 92 && i + 1 < len) { i += 2; continue; }
        if (cc === 34) { i++; break; }
        if (cc === 10) break;
        i++;
      }
      tokens.push({ type: "string", value: source.slice(start, i) });
      continue;
    }

    // Variable: $name
    if (c === 36 /* $ */) {
      const start = i;
      i++;
      while (i < len && isIdent(source.charCodeAt(i))) i++;
      tokens.push({ type: "key", value: source.slice(start, i) });
      continue;
    }

    // Directive: @name
    if (c === 64 /* @ */) {
      const start = i;
      i++;
      while (i < len && isIdent(source.charCodeAt(i))) i++;
      tokens.push({ type: "decorator", value: source.slice(start, i) });
      continue;
    }

    // Number — integer or float, with optional sign, exponent.
    if (
      (c >= 48 && c <= 57) ||
      (c === 45 && source.charCodeAt(i + 1) >= 48 && source.charCodeAt(i + 1) <= 57)
    ) {
      const start = i;
      if (c === 45) i++;
      while (i < len) {
        const cc = source.charCodeAt(i);
        if ((cc >= 48 && cc <= 57) || cc === 46 || cc === 101 || cc === 69 || cc === 43 || cc === 45) {
          i++;
        } else break;
      }
      tokens.push({ type: "number", value: source.slice(start, i) });
      continue;
    }

    // Identifier — could be a keyword, type, literal, or field name.
    if (isIdentStart(c)) {
      const start = i;
      while (i < len && isIdent(source.charCodeAt(i))) i++;
      const word = source.slice(start, i);

      if (KEYWORDS.has(word)) {
        tokens.push({ type: "kw", value: word });
      } else if (word === "true" || word === "false") {
        tokens.push({ type: "bool", value: word });
      } else if (word === "null") {
        tokens.push({ type: "null", value: word });
      } else if (word.charCodeAt(0) >= 65 && word.charCodeAt(0) <= 90) {
        // PascalCase identifier — almost certainly a type name in
        // GraphQL convention.
        tokens.push({ type: "type", value: word });
      } else {
        tokens.push({ type: "ident", value: word });
      }
      continue;
    }

    // Spread: `...`
    if (c === 46 && source.charCodeAt(i + 1) === 46 && source.charCodeAt(i + 2) === 46) {
      tokens.push({ type: "op", value: "..." });
      i += 3;
      continue;
    }

    // Punctuation
    if (c === 123 || c === 125 || c === 40 || c === 41 || c === 91 || c === 93) {
      tokens.push({ type: "punct", value: source[i] });
      i++;
      continue;
    }
    // Operators
    if (c === 58 || c === 61 || c === 124 || c === 33) {
      tokens.push({ type: "op", value: source[i] });
      i++;
      continue;
    }

    // Anything else — keep moving so we never loop.
    tokens.push({ type: "ident", value: source[i] });
    i++;
  }

  return tokens;
}
