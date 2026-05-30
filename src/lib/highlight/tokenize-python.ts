import type { Token, TokenType } from "./types";

const KW = new Set([
  "and","as","assert","async","await","break","class","continue","def",
  "del","elif","else","except","finally","for","from","global","if",
  "import","in","is","lambda","nonlocal","not","or","pass","raise",
  "return","try","while","with","yield","match","case",
]);
const TYPES = new Set([
  "int","float","bool","str","bytes","list","tuple","dict","set",
  "frozenset","None","Any","Optional","Union","List","Dict","Set","Tuple",
  "Callable","Iterable","Iterator","Generator",
]);

function isIdentStart(c: number): boolean {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;
}
function isIdentCont(c: number): boolean {
  return isIdentStart(c) || (c >= 48 && c <= 57);
}
function isWs(c: number): boolean {
  return c === 32 || c === 9 || c === 10 || c === 13;
}
function isDigit(c: number): boolean {
  return c >= 48 && c <= 57;
}

/**
 * Python tokenizer — handles triple-quoted strings (the only nuance over
 * the C-like tokenizer worth handling separately) and `#` comments.
 */
export function tokenizePython(source: string): Token[] {
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

    // Comment
    if (c === 35 /* # */) {
      const start = i;
      while (i < len && source.charCodeAt(i) !== 10) i++;
      tokens.push({ type: "comment", value: source.slice(start, i) });
      continue;
    }

    // Decorator: @name
    if (c === 64 /* @ */) {
      const start = i;
      i++;
      while (i < len && isIdentCont(source.charCodeAt(i))) i++;
      tokens.push({ type: "decorator", value: source.slice(start, i) });
      continue;
    }

    // Triple- or single-quoted strings (with optional r/b/f prefix)
    if (c === 34 || c === 39 || ((c === 114 || c === 98 || c === 102 || c === 82 || c === 66 || c === 70) && (source.charCodeAt(i + 1) === 34 || source.charCodeAt(i + 1) === 39))) {
      const start = i;
      if (c === 114 || c === 98 || c === 102 || c === 82 || c === 66 || c === 70) i++;
      const q = source.charCodeAt(i);
      const isTriple = source.charCodeAt(i + 1) === q && source.charCodeAt(i + 2) === q;
      if (isTriple) {
        i += 3;
        while (i < len) {
          if (source.charCodeAt(i) === 92 && i + 1 < len) { i += 2; continue; }
          if (source.charCodeAt(i) === q && source.charCodeAt(i + 1) === q && source.charCodeAt(i + 2) === q) {
            i += 3;
            break;
          }
          i++;
        }
      } else {
        i++;
        while (i < len) {
          if (source.charCodeAt(i) === 92 && i + 1 < len) { i += 2; continue; }
          if (source.charCodeAt(i) === q) { i++; break; }
          i++;
        }
      }
      tokens.push({ type: "string", value: source.slice(start, i) });
      continue;
    }

    // Number
    if (isDigit(c) || (c === 45 && isDigit(source.charCodeAt(i + 1)))) {
      const start = i;
      if (c === 45) i++;
      while (i < len) {
        const cc = source.charCodeAt(i);
        if (isDigit(cc) || cc === 46 || cc === 95) { i++; continue; }
        if ((cc === 101 || cc === 69) && (source.charCodeAt(i + 1) === 43 || source.charCodeAt(i + 1) === 45 || isDigit(source.charCodeAt(i + 1)))) { i += 2; continue; }
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
      if (KW.has(word)) type = "kw";
      else if (TYPES.has(word)) type = "type";
      else if (word === "True" || word === "False") type = "bool";
      else if (word === "None") type = "null";
      tokens.push({ type, value: word });
      continue;
    }

    tokens.push({ type: "punct", value: source[i] });
    i++;
  }

  return tokens;
}
