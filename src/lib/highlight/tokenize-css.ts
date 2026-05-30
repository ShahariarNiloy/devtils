import type { Token } from "./types";

/**
 * Lenient CSS tokenizer. Also handles SCSS / Less close enough — those
 * supersets add `$var:`, `@var:`, `&` parent refs, and nested blocks, all
 * of which fall out of the same state machine without special-casing.
 *
 * State is implicit in `mode`:
 *   - `selector`  : outside any declaration block; identifiers are tag
 *                   selectors, leading `.`/`#`/`:`/`::` mark classes/ids/
 *                   pseudo-elements/-classes, `@` introduces at-rules.
 *   - `declaration`: inside `{ }`; an identifier before `:` is the
 *                   property name (`key`), values colour as keywords or
 *                   numbers.
 *   - `value`     : after `:` in a declaration; until `;` or `}`. Hex
 *                   colours render as strings so they read as distinct
 *                   constants.
 *
 * No attempt to parse CSS structurally — we just paint colour for the
 * shapes a reader expects to see. Edge cases (selectors with embedded
 * pseudo-class parens, calc expressions, var(--…) usages) degrade
 * gracefully into plain identifiers.
 */

type Mode = "selector" | "declaration" | "value";

function isWs(c: number): boolean {
  return c === 32 || c === 9;
}

function isIdent(c: number): boolean {
  return (
    (c >= 97 && c <= 122) || // a-z
    (c >= 65 && c <= 90) || // A-Z
    (c >= 48 && c <= 57) || // 0-9
    c === 45 || // -
    c === 95 // _
  );
}

function isIdentStart(c: number): boolean {
  return (
    (c >= 97 && c <= 122) ||
    (c >= 65 && c <= 90) ||
    c === 45 ||
    c === 95
  );
}

/**
 * In value mode we colour ANY identifier as `kw` — most CSS values are
 * defined identifiers in the spec (named colours, layout keywords, font
 * keywords, animation timings, …). Keeping a hand-curated allow-list and
 * letting the rest fall through as `ident` produced a "half-coloured" look
 * that read as broken. Function-call names (`rgba`, `calc`, `var`) get the
 * same treatment, which is fine — they read as CSS-defined too.
 *
 * The cases this slightly over-colours (unquoted multi-word font names
 * like `Arial Helvetica sans-serif`) still read sensibly — the value
 * keywords just stay consistently coloured. Quoted font names are strings
 * and not affected.
 */

export function tokenizeCss(source: string): Token[] {
  const tokens: Token[] = [];
  const len = source.length;
  let i = 0;
  let mode: Mode = "selector";

  while (i < len) {
    const c = source.charCodeAt(i);

    // Whitespace + newlines pass through as-is.
    if (c === 10 || c === 13 || isWs(c)) {
      const start = i;
      while (i < len) {
        const cc = source.charCodeAt(i);
        if (cc === 10 || cc === 13 || isWs(cc)) i++;
        else break;
      }
      tokens.push({ type: "ws", value: source.slice(start, i) });
      continue;
    }

    // Block comment /* ... */
    if (c === 47 && source.charCodeAt(i + 1) === 42) {
      const start = i;
      i += 2;
      while (i < len - 1) {
        if (source.charCodeAt(i) === 42 && source.charCodeAt(i + 1) === 47) {
          i += 2;
          break;
        }
        i++;
      }
      if (i >= len - 1 && (source.charCodeAt(len - 2) !== 42 || source.charCodeAt(len - 1) !== 47)) {
        // Unterminated — eat to end so we don't loop forever.
        i = len;
      }
      tokens.push({ type: "comment", value: source.slice(start, i) });
      continue;
    }

    // Line comment // ... (SCSS / Less, not strict CSS, but harmless)
    if (c === 47 && source.charCodeAt(i + 1) === 47) {
      const start = i;
      while (i < len && source.charCodeAt(i) !== 10) i++;
      tokens.push({ type: "comment", value: source.slice(start, i) });
      continue;
    }

    // Strings — both single and double quoted, with backslash escapes.
    if (c === 34 || c === 39) {
      const q = c;
      const start = i;
      i++;
      while (i < len) {
        const cc = source.charCodeAt(i);
        if (cc === 92 && i + 1 < len) { i += 2; continue; }
        if (cc === q) { i++; break; }
        if (cc === 10) break; // unterminated string, bail at newline
        i++;
      }
      tokens.push({ type: "string", value: source.slice(start, i) });
      continue;
    }

    // Block delimiters drive the mode machine.
    if (c === 123 /* { */) {
      tokens.push({ type: "punct", value: "{" });
      i++;
      mode = "declaration";
      continue;
    }
    if (c === 125 /* } */) {
      tokens.push({ type: "punct", value: "}" });
      i++;
      mode = "selector";
      continue;
    }
    if (c === 59 /* ; */) {
      tokens.push({ type: "punct", value: ";" });
      i++;
      // A `;` inside declaration mode ends the current value and returns
      // us to expecting another property name.
      if (mode === "value") mode = "declaration";
      continue;
    }
    if (c === 58 /* : */) {
      tokens.push({ type: "punct", value: ":" });
      i++;
      if (mode === "declaration") mode = "value";
      continue;
    }

    // At-rules: @media, @import, @keyframes, …
    if (c === 64 /* @ */) {
      const start = i;
      i++;
      while (i < len && isIdent(source.charCodeAt(i))) i++;
      tokens.push({ type: "decorator", value: source.slice(start, i) });
      continue;
    }

    // SCSS / Less variables: $name, $brand-1
    if (c === 36 /* $ */) {
      const start = i;
      i++;
      while (i < len && isIdent(source.charCodeAt(i))) i++;
      tokens.push({ type: "decorator", value: source.slice(start, i) });
      continue;
    }

    // Hex color: #abc, #1a2b3c, #1a2b3c80
    if (
      c === 35 /* # */ &&
      i + 1 < len &&
      isHexDigit(source.charCodeAt(i + 1))
    ) {
      const start = i;
      i++;
      while (i < len && isHexDigit(source.charCodeAt(i))) i++;
      tokens.push({ type: "string", value: source.slice(start, i) });
      continue;
    }

    // Selector markers `.` `#` `&` — always read as the start of a
    // selector, regardless of current mode. This handles CSS nesting,
    // SCSS / Less, and `@media (…) { .card { … } }` blocks where the
    // inner rule starts a fresh selector context. Without this reset,
    // the nested `.card` would render its leading `.` as a stray punct
    // and `card` as a property `key`.
    if (c === 46 || c === 35 || c === 38) {
      const start = i;
      i++;
      while (i < len && isIdent(source.charCodeAt(i))) i++;
      tokens.push({ type: "tag", value: source.slice(start, i) });
      mode = "selector";
      continue;
    }

    // Pseudo-class / pseudo-element: :hover, ::before. Only colour as a
    // selector when we're outside a declaration (the `:` in `color:` is
    // already eaten above).
    if (
      mode === "selector" &&
      c === 58 &&
      isIdentStart(source.charCodeAt(i + 1) | 0)
    ) {
      const start = i;
      i++;
      if (source.charCodeAt(i) === 58) i++; // ::
      while (i < len && isIdent(source.charCodeAt(i))) i++;
      tokens.push({ type: "tag", value: source.slice(start, i) });
      continue;
    }

    // !important flag
    if (c === 33 /* ! */) {
      const start = i;
      i++;
      while (i < len && isIdent(source.charCodeAt(i))) i++;
      tokens.push({ type: "decorator", value: source.slice(start, i) });
      continue;
    }

    // Numbers with optional unit (px, em, rem, %, vh, …)
    if (
      (c >= 48 && c <= 57) ||
      (c === 46 && source.charCodeAt(i + 1) >= 48 && source.charCodeAt(i + 1) <= 57) ||
      (c === 45 && source.charCodeAt(i + 1) >= 48 && source.charCodeAt(i + 1) <= 57)
    ) {
      const start = i;
      if (c === 45) i++;
      while (i < len) {
        const cc = source.charCodeAt(i);
        if ((cc >= 48 && cc <= 57) || cc === 46) i++;
        else break;
      }
      // Unit
      while (i < len) {
        const cc = source.charCodeAt(i);
        if ((cc >= 97 && cc <= 122) || (cc >= 65 && cc <= 90) || cc === 37) i++;
        else break;
      }
      tokens.push({ type: "number", value: source.slice(start, i) });
      continue;
    }

    // Identifiers — meaning depends on mode.
    if (isIdentStart(c)) {
      const start = i;
      while (i < len && isIdent(source.charCodeAt(i))) i++;
      const word = source.slice(start, i);

      if (mode === "selector") {
        tokens.push({ type: "tag", value: word });
      } else if (mode === "declaration") {
        // Property name (looking ahead would confirm `:`, but the colon
        // is the only thing that ever follows in valid CSS — fine to
        // commit early).
        tokens.push({ type: "key", value: word });
      } else {
        // value mode — see the header comment above.
        tokens.push({ type: "kw", value: word });
      }
      continue;
    }

    // Fallback: punctuation / operator.
    if (c === 44 || c === 40 || c === 41 || c === 91 || c === 93) {
      tokens.push({ type: "punct", value: source[i] });
    } else if (c === 62 || c === 43 || c === 126 || c === 42) {
      tokens.push({ type: "op", value: source[i] });
    } else {
      tokens.push({ type: "ident", value: source[i] });
    }
    i++;
  }

  return tokens;
}

function isHexDigit(c: number): boolean {
  return (
    (c >= 48 && c <= 57) ||
    (c >= 97 && c <= 102) ||
    (c >= 65 && c <= 70)
  );
}
