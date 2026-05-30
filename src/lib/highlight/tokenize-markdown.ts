import type { Token } from "./types";

/**
 * Lenient Markdown tokenizer. CommonMark-ish, not strict. Optimised for
 * "looks right in the editor" rather than "matches the spec exactly".
 *
 * Shapes coloured:
 *   - ATX headings (`#`, `##`, …)               → kw markers + key text
 *   - Setext heading underlines (`===`, `---`)   → kw
 *   - Blockquote markers (`>`)                   → kw
 *   - List markers (`-`, `*`, `+`, `1.`)         → kw
 *   - Horizontal rules (`---`, `***`, `___`)     → kw
 *   - Fenced code blocks (```` ``` ````)         → comment (whole block)
 *   - Inline code (`` ` ``)                      → string
 *   - Bold (`**…**`) / italic (`*…*` / `_…_`)    → string + kw markers
 *   - Links (`[text](url)`) / images (`![…](…)`) → key text + string url
 *   - HTML tags inside markdown                  → tag
 *
 * MDX falls through this tokenizer (we register it under both `mdx` and
 * `markdown`) — embedded JSX renders as plain text rather than nested-
 * highlighted, which is the same compromise highlight.js makes.
 */

function isWs(c: number): boolean {
  return c === 32 || c === 9;
}

function isLineStart(source: string, i: number): boolean {
  return i === 0 || source.charCodeAt(i - 1) === 10;
}

export function tokenizeMarkdown(source: string): Token[] {
  const tokens: Token[] = [];
  const len = source.length;
  let i = 0;

  while (i < len) {
    const c = source.charCodeAt(i);

    // Fenced code block — eat the whole block as a single comment token
    // so embedded triple-backticks in editors don't bleed colour.
    if (
      (c === 96 /* ` */ || c === 126 /* ~ */) &&
      source.charCodeAt(i + 1) === c &&
      source.charCodeAt(i + 2) === c &&
      isLineStart(source, i)
    ) {
      const fence = source[i];
      const start = i;
      i += 3;
      // Eat the optional language hint on the same line.
      while (i < len && source.charCodeAt(i) !== 10) i++;
      // Eat lines until the closing fence at the start of a line.
      while (i < len) {
        if (source.charCodeAt(i) === 10) i++;
        if (
          isLineStart(source, i) &&
          source[i] === fence &&
          source[i + 1] === fence &&
          source[i + 2] === fence
        ) {
          i += 3;
          while (i < len && source.charCodeAt(i) !== 10) i++;
          break;
        }
        if (i < len) i++;
      }
      tokens.push({ type: "comment", value: source.slice(start, i) });
      continue;
    }

    // Newline pass-through.
    if (c === 10 || c === 13) {
      tokens.push({ type: "ws", value: source[i] });
      i++;
      continue;
    }

    // Leading whitespace at start-of-line — eat in one go so block
    // detection below can run on a normalised pointer.
    if (isLineStart(source, i) && isWs(c)) {
      const start = i;
      while (i < len && isWs(source.charCodeAt(i))) i++;
      tokens.push({ type: "ws", value: source.slice(start, i) });
      continue;
    }

    // ATX heading: `# `, `## `, … up to six hashes, at line start.
    if (c === 35 /* # */ && isLineStart(source, i)) {
      const start = i;
      let level = 0;
      while (level < 6 && source.charCodeAt(i + level) === 35) level++;
      if (
        level >= 1 &&
        level <= 6 &&
        (source.charCodeAt(i + level) === 32 || source.charCodeAt(i + level) === 10 || i + level === len)
      ) {
        i += level;
        tokens.push({ type: "kw", value: source.slice(start, i) });
        // The rest of the line is the title — render as `key` so it
        // stands out vs ordinary prose.
        const titleStart = i;
        while (i < len && source.charCodeAt(i) !== 10) i++;
        if (i > titleStart) {
          tokens.push({ type: "key", value: source.slice(titleStart, i) });
        }
        continue;
      }
      // Not a heading — fall through to default char handling.
    }

    // Horizontal rule: line of `---`, `***`, `___` (3+ of the same char,
    // optionally interleaved with spaces).
    if (isLineStart(source, i) && (c === 45 || c === 42 || c === 95)) {
      let j = i;
      let count = 0;
      while (j < len && (source.charCodeAt(j) === c || source.charCodeAt(j) === 32)) {
        if (source.charCodeAt(j) === c) count++;
        j++;
      }
      if (count >= 3 && (j >= len || source.charCodeAt(j) === 10)) {
        tokens.push({ type: "kw", value: source.slice(i, j) });
        i = j;
        continue;
      }
    }

    // Blockquote marker `> `
    if (c === 62 /* > */ && isLineStart(source, i)) {
      tokens.push({ type: "kw", value: ">" });
      i++;
      continue;
    }

    // List marker: `- `, `* `, `+ ` (unordered) or `1. `, `12. ` (ordered),
    // at the start of a line.
    if (isLineStart(source, i)) {
      // Unordered
      if ((c === 45 || c === 42 || c === 43) && source.charCodeAt(i + 1) === 32) {
        tokens.push({ type: "kw", value: source.slice(i, i + 2) });
        i += 2;
        continue;
      }
      // Ordered
      if (c >= 48 && c <= 57) {
        let j = i;
        while (j < len && source.charCodeAt(j) >= 48 && source.charCodeAt(j) <= 57) j++;
        if (
          j > i &&
          (source.charCodeAt(j) === 46 || source.charCodeAt(j) === 41) &&
          source.charCodeAt(j + 1) === 32
        ) {
          tokens.push({ type: "kw", value: source.slice(i, j + 2) });
          i = j + 2;
          continue;
        }
      }
    }

    // Inline code: `…` (no nesting; closes on first matching backtick).
    if (c === 96) {
      const start = i;
      i++;
      while (i < len && source.charCodeAt(i) !== 96 && source.charCodeAt(i) !== 10) i++;
      if (i < len && source.charCodeAt(i) === 96) i++;
      tokens.push({ type: "string", value: source.slice(start, i) });
      continue;
    }

    // Bold (`**…**`) and italic (`*…*` / `_…_`). Bold first so `**` isn't
    // mistakenly parsed as two italics.
    if ((c === 42 || c === 95) && source.charCodeAt(i + 1) === c) {
      const marker = source.slice(i, i + 2);
      const start = i;
      i += 2;
      while (
        i + 1 < len &&
        !(source.charCodeAt(i) === c && source.charCodeAt(i + 1) === c) &&
        source.charCodeAt(i) !== 10
      ) {
        i++;
      }
      if (i + 1 < len && source.charCodeAt(i) === c && source.charCodeAt(i + 1) === c) {
        i += 2;
      }
      tokens.push({ type: "kw", value: marker });
      tokens.push({ type: "string", value: source.slice(start + 2, i - 2) });
      tokens.push({ type: "kw", value: marker });
      continue;
    }
    if (c === 42 || c === 95) {
      // Single-marker emphasis. Require a non-whitespace char after to
      // avoid swallowing `* ` bullets (handled above) and bare `_`s.
      const next = source.charCodeAt(i + 1);
      if (next !== 32 && next !== 10 && next !== c) {
        const marker = source[i];
        const start = i;
        i++;
        while (i < len && source.charCodeAt(i) !== c && source.charCodeAt(i) !== 10) i++;
        if (i < len && source.charCodeAt(i) === c) i++;
        tokens.push({ type: "kw", value: marker });
        tokens.push({ type: "string", value: source.slice(start + 1, i - 1) });
        tokens.push({ type: "kw", value: marker });
        continue;
      }
    }

    // Link / image: ![alt](url) or [text](url)
    if (c === 33 && source.charCodeAt(i + 1) === 91) {
      tokens.push({ type: "kw", value: "![" });
      i += 2;
      continue;
    }
    if (c === 91) {
      // Eat text up to matching `]`, then optional `(url)`.
      const textStart = i + 1;
      let j = i + 1;
      while (j < len && source.charCodeAt(j) !== 93 && source.charCodeAt(j) !== 10) j++;
      if (j < len && source.charCodeAt(j) === 93) {
        tokens.push({ type: "punct", value: "[" });
        if (j > textStart) tokens.push({ type: "key", value: source.slice(textStart, j) });
        tokens.push({ type: "punct", value: "]" });
        i = j + 1;
        if (i < len && source.charCodeAt(i) === 40) {
          const urlStart = i + 1;
          let k = i + 1;
          while (k < len && source.charCodeAt(k) !== 41 && source.charCodeAt(k) !== 10) k++;
          if (k < len && source.charCodeAt(k) === 41) {
            tokens.push({ type: "punct", value: "(" });
            if (k > urlStart) tokens.push({ type: "string", value: source.slice(urlStart, k) });
            tokens.push({ type: "punct", value: ")" });
            i = k + 1;
            continue;
          }
        }
        continue;
      }
    }

    // HTML / JSX tag — colour the `<tagname` opener so MDX components
    // visually pop. We don't try to balance closing tags.
    if (c === 60 /* < */) {
      const next = source.charCodeAt(i + 1);
      if (
        next === 47 || // </
        (next >= 65 && next <= 90) ||
        (next >= 97 && next <= 122)
      ) {
        const start = i;
        i++;
        if (source.charCodeAt(i) === 47) i++;
        while (
          i < len &&
          (source.charCodeAt(i) === 45 ||
            (source.charCodeAt(i) >= 48 && source.charCodeAt(i) <= 57) ||
            (source.charCodeAt(i) >= 65 && source.charCodeAt(i) <= 90) ||
            (source.charCodeAt(i) >= 97 && source.charCodeAt(i) <= 122))
        ) {
          i++;
        }
        tokens.push({ type: "tag", value: source.slice(start, i) });
        continue;
      }
    }

    // Default: ordinary prose. Eat a run of non-special characters so we
    // don't emit one ident per letter.
    const start = i;
    while (i < len) {
      const cc = source.charCodeAt(i);
      if (
        cc === 10 || cc === 13 || cc === 96 || cc === 42 || cc === 95 ||
        cc === 91 || cc === 60 || cc === 33
      ) break;
      i++;
    }
    if (i > start) {
      tokens.push({ type: "ident", value: source.slice(start, i) });
    } else {
      // Single special char we didn't classify — keep moving so we never
      // loop forever.
      tokens.push({ type: "ident", value: source[i] });
      i++;
    }
  }

  return tokens;
}
