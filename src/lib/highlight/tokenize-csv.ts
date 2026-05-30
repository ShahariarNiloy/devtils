import type { Token } from "./types";

/**
 * Minimal CSV tokenizer. CSV is just text separated by commas — we tint
 * quoted strings and commas, leave plain cells as identifiers. Enough to
 * make the output visually scannable.
 */

export function tokenizeCsv(source: string): Token[] {
  const tokens: Token[] = [];
  const len = source.length;
  let i = 0;

  while (i < len) {
    const c = source.charCodeAt(i);

    if (c === 10 || c === 13) {
      tokens.push({ type: "ws", value: source[i] });
      i++;
      continue;
    }
    if (c === 44 /* , */) {
      tokens.push({ type: "punct", value: "," });
      i++;
      continue;
    }
    if (c === 34 /* " */) {
      const start = i;
      i++;
      while (i < len) {
        const cc = source.charCodeAt(i);
        if (cc === 34) {
          if (source.charCodeAt(i + 1) === 34) { i += 2; continue; }
          i++;
          break;
        }
        i++;
      }
      tokens.push({ type: "string", value: source.slice(start, i) });
      continue;
    }
    const start = i;
    while (i < len) {
      const cc = source.charCodeAt(i);
      if (cc === 44 || cc === 10 || cc === 13 || cc === 34) break;
      i++;
    }
    if (i > start) tokens.push({ type: "ident", value: source.slice(start, i) });
  }
  return tokens;
}
