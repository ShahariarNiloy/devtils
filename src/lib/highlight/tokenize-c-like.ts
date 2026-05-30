import type { Token, TokenType } from "./types";

/**
 * Tokenizer for the "C-family" subset shared by TypeScript / JavaScript,
 * Go, and Rust. Parameterised by keyword and type-name sets — the parsing
 * shape (line comments, block comments, double / single / backtick strings,
 * numbers, identifiers, punctuation) is identical across them.
 *
 * It's intentionally not a full parser; it just paints colour-class spans
 * over generated code. Edge cases (template-literal interpolation,
 * lifetime quotes in Rust, raw strings) degrade gracefully rather than
 * throwing.
 */

export interface CLikeConfig {
  keywords: Set<string>;
  types: Set<string>;
  /** Extra constants treated like booleans / null (`nil`, `None`). */
  bools?: Set<string>;
  nulls?: Set<string>;
  /** Whether the language uses single-quoted strings (TS/JS yes, Go no). */
  singleQuoteStrings?: boolean;
  /** Backtick strings (TS template literals, Go raw strings). */
  backtickStrings?: boolean;
}

function isIdentStart(c: number): boolean {
  return (
    (c >= 65 && c <= 90) ||  // A-Z
    (c >= 97 && c <= 122) || // a-z
    c === 95 ||              // _
    c === 36                 // $
  );
}

function isIdentCont(c: number): boolean {
  return isIdentStart(c) || (c >= 48 && c <= 57); // + digits
}

function isWs(c: number): boolean {
  return c === 32 || c === 9 || c === 10 || c === 13;
}

function isDigit(c: number): boolean {
  return c >= 48 && c <= 57;
}

export function tokenizeCLike(source: string, cfg: CLikeConfig): Token[] {
  const tokens: Token[] = [];
  const len = source.length;
  let i = 0;

  const consumeString = (quote: number): string => {
    const start = i;
    i++;
    while (i < len) {
      const c = source.charCodeAt(i);
      if (c === 92 && i + 1 < len) {
        i += 2;
        continue;
      }
      if (c === quote) {
        i++;
        return source.slice(start, i);
      }
      i++;
    }
    return source.slice(start, i);
  };

  while (i < len) {
    const c = source.charCodeAt(i);

    if (isWs(c)) {
      const start = i;
      while (i < len && isWs(source.charCodeAt(i))) i++;
      tokens.push({ type: "ws", value: source.slice(start, i) });
      continue;
    }

    // Line comment: // …
    if (c === 47 && source.charCodeAt(i + 1) === 47) {
      const start = i;
      while (i < len && source.charCodeAt(i) !== 10) i++;
      tokens.push({ type: "comment", value: source.slice(start, i) });
      continue;
    }

    // Block comment: /* … */
    if (c === 47 && source.charCodeAt(i + 1) === 42) {
      const start = i;
      i += 2;
      while (i < len && !(source.charCodeAt(i) === 42 && source.charCodeAt(i + 1) === 47)) i++;
      if (i < len) i += 2;
      tokens.push({ type: "comment", value: source.slice(start, i) });
      continue;
    }

    // Double-quoted string
    if (c === 34) {
      tokens.push({ type: "string", value: consumeString(34) });
      continue;
    }

    // Single-quoted string (where allowed)
    if (c === 39 && cfg.singleQuoteStrings) {
      tokens.push({ type: "string", value: consumeString(39) });
      continue;
    }

    // Backtick string (template literals / Go raw strings)
    if (c === 96 && cfg.backtickStrings) {
      tokens.push({ type: "string", value: consumeString(96) });
      continue;
    }

    // Number
    if (isDigit(c) || (c === 45 && isDigit(source.charCodeAt(i + 1)))) {
      const start = i;
      if (c === 45) i++;
      while (i < len) {
        const cc = source.charCodeAt(i);
        if (isDigit(cc) || cc === 46 || cc === 95 || cc === 120 || cc === 88 || cc === 98 || cc === 66) {
          i++;
          continue;
        }
        if ((cc === 101 || cc === 69) && (source.charCodeAt(i + 1) === 43 || source.charCodeAt(i + 1) === 45 || isDigit(source.charCodeAt(i + 1)))) {
          i += 2;
          continue;
        }
        break;
      }
      tokens.push({ type: "number", value: source.slice(start, i) });
      continue;
    }

    // Identifier / keyword / type / bool / null
    if (isIdentStart(c)) {
      const start = i;
      while (i < len && isIdentCont(source.charCodeAt(i))) i++;
      const word = source.slice(start, i);
      let type: TokenType = "ident";
      if (cfg.keywords.has(word)) type = "kw";
      else if (cfg.types.has(word)) type = "type";
      else if (word === "true" || word === "false" || cfg.bools?.has(word)) type = "bool";
      else if (word === "null" || word === "undefined" || cfg.nulls?.has(word)) type = "null";
      tokens.push({ type, value: word });
      continue;
    }

    // Punctuation / operators — keep it coarse, the eye only needs them
    // dimmer than identifiers, not finely distinguished.
    tokens.push({ type: "punct", value: source[i] });
    i++;
  }

  return tokens;
}
