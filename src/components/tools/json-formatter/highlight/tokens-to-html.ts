import type { Token } from "./types";

/**
 * Single allocation per token, single pass — the renderer is performance-
 * critical because it runs on every keystroke in the overlay-style editor.
 * Whitespace tokens emit as bare text so we don't allocate spans for them
 * (typical JSON is ~25% whitespace; skipping its spans halves the DOM).
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function tokensToHtml(tokens: Token[]): string {
  let out = "";
  for (const t of tokens) {
    if (t.type === "ws") {
      out += t.value;
    } else {
      out += `<span class="tok-${t.type}">${escapeHtml(t.value)}</span>`;
    }
  }
  return out;
}

/**
 * Apply search highlighting at the token-stream level. Each token whose
 * value contains the query is split into matched/unmatched halves so the
 * resulting HTML can mark only the matched text and preserve syntax color
 * on the rest. This is structurally cleaner than the old regex-over-HTML
 * pass and copes with cases where the query straddles entities like `&amp;`.
 */
export function applySearchToTokens(tokens: Token[], rawQuery: string): Token[] {
  const q = rawQuery.trim();
  if (!q) return tokens;
  const qLc = q.toLowerCase();
  const qLen = q.length;
  const out: Token[] = [];
  for (const t of tokens) {
    if (t.type === "ws" || !t.value) { out.push(t); continue; }
    const lc = t.value.toLowerCase();
    let cursor = 0;
    let found = lc.indexOf(qLc);
    if (found === -1) { out.push(t); continue; }
    while (found !== -1) {
      if (found > cursor) {
        out.push({ type: t.type, value: t.value.slice(cursor, found) });
      }
      out.push({ type: "ident", value: `__SEARCH_HIT_OPEN__${t.value.slice(found, found + qLen)}__SEARCH_HIT_CLOSE__` });
      cursor = found + qLen;
      found = lc.indexOf(qLc, cursor);
    }
    if (cursor < t.value.length) {
      out.push({ type: t.type, value: t.value.slice(cursor) });
    }
  }
  return out;
}

/**
 * Variant of `tokensToHtml` that knows how to render the search-hit markers
 * inserted by `applySearchToTokens`. Renders them as `<mark>` so existing
 * CSS targeting `mark.json-search-match` continues to work.
 */
export function tokensToHtmlWithSearch(tokens: Token[]): string {
  let out = "";
  for (const t of tokens) {
    if (t.type === "ws") { out += t.value; continue; }
    if (t.value.startsWith("__SEARCH_HIT_OPEN__")) {
      const inner = t.value.slice("__SEARCH_HIT_OPEN__".length, -"__SEARCH_HIT_CLOSE__".length);
      out += `<mark class="json-search-match">${escapeHtml(inner)}</mark>`;
      continue;
    }
    out += `<span class="tok-${t.type}">${escapeHtml(t.value)}</span>`;
  }
  return out;
}
