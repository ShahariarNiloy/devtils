import type { Token } from "./types";

/**
 * Compact XML/HTML tokenizer. Recognises tags, attribute names, attribute
 * values, comments, CDATA, and processing instructions. Text content
 * passes through as `ident`.
 */

function isWs(c: number): boolean {
  return c === 32 || c === 9 || c === 10 || c === 13;
}

export function tokenizeXml(source: string): Token[] {
  const tokens: Token[] = [];
  const len = source.length;
  let i = 0;

  while (i < len) {
    const c = source.charCodeAt(i);

    if (isWs(c)) {
      const start = i;
      while (i < len && isWs(source.charCodeAt(i))) i++;
      tokens.push({ type: "ws", value: source.slice(start, i) });
      continue;
    }

    // Comment <!-- … -->
    if (c === 60 && source.startsWith("<!--", i)) {
      const start = i;
      i += 4;
      while (i < len && !source.startsWith("-->", i)) i++;
      if (i < len) i += 3;
      tokens.push({ type: "comment", value: source.slice(start, i) });
      continue;
    }

    // CDATA / DOCTYPE / processing instruction — coarse, render as comment-ish
    if (c === 60 && (source.startsWith("<![CDATA[", i) || source.startsWith("<!", i) || source.startsWith("<?", i))) {
      const start = i;
      while (i < len && source.charCodeAt(i) !== 62 /* > */) i++;
      if (i < len) i++;
      tokens.push({ type: "comment", value: source.slice(start, i) });
      continue;
    }

    // Tag open: <name … > or </name>
    if (c === 60 /* < */) {
      tokens.push({ type: "punct", value: "<" });
      i++;
      // Optional /
      if (source.charCodeAt(i) === 47) {
        tokens.push({ type: "punct", value: "/" });
        i++;
      }
      // Tag name
      const tagStart = i;
      while (i < len) {
        const cc = source.charCodeAt(i);
        if ((cc >= 65 && cc <= 90) || (cc >= 97 && cc <= 122) || (cc >= 48 && cc <= 57) || cc === 45 || cc === 95 || cc === 58) {
          i++;
        } else break;
      }
      if (i > tagStart) tokens.push({ type: "tag", value: source.slice(tagStart, i) });

      // Attributes
      while (i < len && source.charCodeAt(i) !== 62 && source.charCodeAt(i) !== 47) {
        if (isWs(source.charCodeAt(i))) {
          const s = i;
          while (i < len && isWs(source.charCodeAt(i))) i++;
          tokens.push({ type: "ws", value: source.slice(s, i) });
          continue;
        }
        const attrStart = i;
        while (i < len) {
          const cc = source.charCodeAt(i);
          if ((cc >= 65 && cc <= 90) || (cc >= 97 && cc <= 122) || (cc >= 48 && cc <= 57) || cc === 45 || cc === 95 || cc === 58) {
            i++;
          } else break;
        }
        if (i > attrStart) tokens.push({ type: "attr", value: source.slice(attrStart, i) });
        if (source.charCodeAt(i) === 61 /* = */) {
          tokens.push({ type: "op", value: "=" });
          i++;
          const q = source.charCodeAt(i);
          if (q === 34 || q === 39) {
            const vStart = i;
            i++;
            while (i < len && source.charCodeAt(i) !== q) i++;
            if (i < len) i++;
            tokens.push({ type: "string", value: source.slice(vStart, i) });
          }
        }
      }
      if (source.charCodeAt(i) === 47) {
        tokens.push({ type: "punct", value: "/" });
        i++;
      }
      if (source.charCodeAt(i) === 62) {
        tokens.push({ type: "punct", value: ">" });
        i++;
      }
      continue;
    }

    // Text content — collect until next `<` so it renders as a single span
    const textStart = i;
    while (i < len && source.charCodeAt(i) !== 60) i++;
    if (i > textStart) tokens.push({ type: "ident", value: source.slice(textStart, i) });
  }

  return tokens;
}
