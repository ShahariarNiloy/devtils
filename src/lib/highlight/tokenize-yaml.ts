import type { Token } from "./types";

/**
 * Lenient YAML tokenizer. We only care about painting colour for the most
 * common cases: comments, keys before colons, list bullets, quoted strings,
 * numbers, booleans, and nulls. Block scalars and anchors render as plain
 * identifiers — acceptable degradation for a code-gen output viewer.
 */

function isWs(c: number): boolean {
  return c === 32 || c === 9;
}

export function tokenizeYaml(source: string): Token[] {
  const tokens: Token[] = [];
  const len = source.length;
  let i = 0;

  const isLineStart = () => i === 0 || source.charCodeAt(i - 1) === 10;

  while (i < len) {
    const c = source.charCodeAt(i);

    if (c === 10 || c === 13) {
      tokens.push({ type: "ws", value: source[i] });
      i++;
      continue;
    }

    if (isWs(c)) {
      const start = i;
      while (i < len && isWs(source.charCodeAt(i))) i++;
      tokens.push({ type: "ws", value: source.slice(start, i) });
      continue;
    }

    // Comment to end of line
    if (c === 35 /* # */) {
      const start = i;
      while (i < len && source.charCodeAt(i) !== 10) i++;
      tokens.push({ type: "comment", value: source.slice(start, i) });
      continue;
    }

    // List bullet at line start: `- value`
    if (c === 45 && source.charCodeAt(i + 1) === 32 && isLineStart()) {
      tokens.push({ type: "punct", value: "-" });
      i++;
      continue;
    }

    // Document marker `---`
    if (c === 45 && source.startsWith("---", i)) {
      tokens.push({ type: "punct", value: "---" });
      i += 3;
      continue;
    }

    // Quoted string
    if (c === 34 || c === 39) {
      const q = c;
      const start = i;
      i++;
      while (i < len) {
        const cc = source.charCodeAt(i);
        if (cc === 92 && i + 1 < len) { i += 2; continue; }
        if (cc === q) { i++; break; }
        i++;
      }
      tokens.push({ type: "string", value: source.slice(start, i) });
      continue;
    }

    // Key: word followed by ':' on a value-line
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95) {
      const start = i;
      while (i < len) {
        const cc = source.charCodeAt(i);
        if ((cc >= 65 && cc <= 90) || (cc >= 97 && cc <= 122) || (cc >= 48 && cc <= 57) || cc === 95 || cc === 45) {
          i++;
        } else break;
      }
      const word = source.slice(start, i);
      // Peek: is the next non-space char a colon?
      let j = i;
      while (j < len && isWs(source.charCodeAt(j))) j++;
      if (j < len && source.charCodeAt(j) === 58 /* : */) {
        tokens.push({ type: "key", value: word });
      } else if (word === "true" || word === "false" || word === "yes" || word === "no") {
        tokens.push({ type: "bool", value: word });
      } else if (word === "null" || word === "~") {
        tokens.push({ type: "null", value: word });
      } else {
        tokens.push({ type: "ident", value: word });
      }
      continue;
    }

    // Number
    if ((c >= 48 && c <= 57) || (c === 45 && source.charCodeAt(i + 1) >= 48 && source.charCodeAt(i + 1) <= 57)) {
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

    tokens.push({ type: "punct", value: source[i] });
    i++;
  }

  return tokens;
}
