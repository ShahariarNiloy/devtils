/**
 * Tiny self-contained JSON syntax highlighter — returns a string of HTML
 * with class-tagged spans. Tokenizes character-by-character for accuracy
 * and speed up to ~500 KB of JSON.
 */

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface Token {
  type: "string" | "number" | "bool" | "null" | "punct" | "ws";
  value: string;
  /** True when this string token is followed by a `:` (i.e. it's a key). */
  isKey?: boolean;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];

    if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
      let j = i;
      while (j < len && /\s/.test(source[j])) j += 1;
      tokens.push({ type: "ws", value: source.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      while (j < len) {
        if (source[j] === "\\") {
          j += 2;
          continue;
        }
        if (source[j] === '"') {
          j += 1;
          break;
        }
        j += 1;
      }
      tokens.push({ type: "string", value: source.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === "-" || (ch >= "0" && ch <= "9")) {
      let j = i + 1;
      while (j < len && /[0-9eE+\-.]/.test(source[j])) j += 1;
      tokens.push({ type: "number", value: source.slice(i, j) });
      i = j;
      continue;
    }

    if (source.startsWith("true", i) || source.startsWith("false", i)) {
      const v = source.startsWith("true", i) ? "true" : "false";
      tokens.push({ type: "bool", value: v });
      i += v.length;
      continue;
    }

    if (source.startsWith("null", i)) {
      tokens.push({ type: "null", value: "null" });
      i += 4;
      continue;
    }

    tokens.push({ type: "punct", value: ch });
    i += 1;
  }

  // Determine which strings are keys (followed by `:` after optional whitespace).
  for (let k = 0; k < tokens.length; k += 1) {
    if (tokens[k].type !== "string") continue;
    let m = k + 1;
    while (m < tokens.length && tokens[m].type === "ws") m += 1;
    if (m < tokens.length && tokens[m].type === "punct" && tokens[m].value === ":") {
      tokens[k].isKey = true;
    }
  }

  return tokens;
}

/**
 * Highlight a (presumed-valid) JSON string. Whitespace is preserved so the
 * output can be drop-in for `<pre>`. Invalid input is returned as escaped
 * plain text.
 */
export function highlightJSON(source: string): string {
  if (!source) return "";
  try {
    JSON.parse(source);
  } catch {
    return escape(source);
  }
  const tokens = tokenize(source);
  return tokens
    .map((t) => {
      switch (t.type) {
        case "ws":
          return t.value;
        case "string":
          return `<span class="${t.isKey ? "json-key" : "json-string"}">${escape(t.value)}</span>`;
        case "number":
          return `<span class="json-number">${escape(t.value)}</span>`;
        case "bool":
          return `<span class="json-bool">${t.value}</span>`;
        case "null":
          return `<span class="json-null">null</span>`;
        case "punct":
          return `<span class="json-punct">${escape(t.value)}</span>`;
      }
    })
    .join("");
}

export function lineCount(text: string): number {
  if (!text) return 1;
  return text.split("\n").length;
}

/** Alias for new code — same implementation, spec-required name. */
export const highlightJson = highlightJSON;

/**
 * Wrap every occurrence of `search` inside the syntax-highlighted HTML with a
 * `<mark class="json-search-match">` span. Only touches text nodes — HTML tags
 * are left verbatim so the existing syntax highlighting is preserved.
 */
export function applySearchHighlight(html: string, search: string): string {
  if (!search.trim()) return html;
  // Encode search to match HTML-entity-escaped text (highlighter escapes & < >)
  const encoded = search.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escaped = encoded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  return html.replace(/(<[^>]*>)|([^<]+)/g, (_, tag, text) => {
    if (tag) return tag;
    if (text) return text.replace(re, '<mark class="json-search-match">$1</mark>');
    return "";
  });
}
