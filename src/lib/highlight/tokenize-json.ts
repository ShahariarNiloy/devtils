import type { Token } from "./types";

/**
 * Lenient JSON tokenizer. Never throws — malformed input still produces a
 * best-effort stream so the editor never goes dark during typing. Strings
 * with a `:` immediately following (modulo whitespace) are reclassified as
 * `key` rather than `string`.
 *
 * The tokenizer is the hottest function in the highlighter pipeline. Inner
 * loops avoid regex tests in favour of integer comparisons against char
 * codes — measurable speedup on big payloads.
 */

const CC_SPACE = 32;
const CC_TAB = 9;
const CC_NEWLINE = 10;
const CC_CR = 13;
const CC_DQUOTE = 34;
const CC_BACKSLASH = 92;
const CC_MINUS = 45;
const CC_DOT = 46;
const CC_0 = 48;
const CC_9 = 57;
const CC_E_LOW = 101;
const CC_E_UP = 69;
const CC_PLUS = 43;
const CC_T = 116;
const CC_F = 102;
const CC_N = 110;
const CC_COLON = 58;

function isWs(c: number): boolean {
  return c === CC_SPACE || c === CC_TAB || c === CC_NEWLINE || c === CC_CR;
}

function isDigit(c: number): boolean {
  return c >= CC_0 && c <= CC_9;
}

function isNumberCont(c: number): boolean {
  return (
    isDigit(c) ||
    c === CC_DOT ||
    c === CC_E_LOW ||
    c === CC_E_UP ||
    c === CC_PLUS ||
    c === CC_MINUS
  );
}

export function tokenizeJson(source: string): Token[] {
  const tokens: Token[] = [];
  const len = source.length;
  let i = 0;

  while (i < len) {
    const c = source.charCodeAt(i);

    // Whitespace run
    if (isWs(c)) {
      let j = i + 1;
      while (j < len && isWs(source.charCodeAt(j))) j++;
      tokens.push({ type: "ws", value: source.slice(i, j) });
      i = j;
      continue;
    }

    // String — collect verbatim with escape handling
    if (c === CC_DQUOTE) {
      let j = i + 1;
      while (j < len) {
        const cc = source.charCodeAt(j);
        if (cc === CC_BACKSLASH && j + 1 < len) {
          j += 2;
        } else if (cc === CC_DQUOTE) {
          j++;
          break;
        } else {
          j++;
        }
      }
      tokens.push({ type: "string", value: source.slice(i, j) });
      i = j;
      continue;
    }

    // Number — leading - or digit, then number continuation chars
    if (c === CC_MINUS || isDigit(c)) {
      let j = i + 1;
      while (j < len && isNumberCont(source.charCodeAt(j))) j++;
      tokens.push({ type: "number", value: source.slice(i, j) });
      i = j;
      continue;
    }

    // Keywords: true / false / null
    if (c === CC_T && source.startsWith("true", i)) {
      tokens.push({ type: "bool", value: "true" });
      i += 4;
      continue;
    }
    if (c === CC_F && source.startsWith("false", i)) {
      tokens.push({ type: "bool", value: "false" });
      i += 5;
      continue;
    }
    if (c === CC_N && source.startsWith("null", i)) {
      tokens.push({ type: "null", value: "null" });
      i += 4;
      continue;
    }

    // Default — single-char punctuation
    tokens.push({ type: "punct", value: source[i] });
    i++;
  }

  // Reclassify string-followed-by-colon as keys. Two-pass keeps the main
  // loop tight; this pass is O(tokens) and only touches string entries.
  for (let k = 0; k < tokens.length; k++) {
    if (tokens[k].type !== "string") continue;
    let m = k + 1;
    while (m < tokens.length && tokens[m].type === "ws") m++;
    if (
      m < tokens.length &&
      tokens[m].type === "punct" &&
      tokens[m].value.charCodeAt(0) === CC_COLON
    ) {
      tokens[k].type = "key";
    }
  }

  return tokens;
}
