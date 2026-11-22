/**
 * Split a pasted curl command into arguments the way the shell it was
 * copied for would. Three dialects, detected from the text:
 *
 *  - bash / zsh (default): '…', "…", $'…' (ANSI-C), backslash escapes and
 *    `\` line continuations.
 *  - Windows cmd (Chrome's "Copy as cURL (cmd)"): `^` escapes the next
 *    character and continues lines; curl.exe then splits with the MSVCRT
 *    rules ("…" groups, \" is a literal quote).
 *  - PowerShell: '…' ('' is a quote), "…" with backtick escapes, and
 *    backtick line continuations.
 *
 * Pure and allocation-light: one pass over the string per dialect.
 */

export type ShellDialect = "bash" | "cmd" | "ps";

export function detectDialect(src: string): ShellDialect {
  if (/\^\r?\n/.test(src) || /\^"/.test(src)) return "cmd";
  if (/`\r?\n/.test(src) || /^\s*curl\.exe\b/i.test(src)) return "ps";
  return "bash";
}

export function tokenize(
  src: string,
  dialect: ShellDialect = detectDialect(src),
): string[] {
  const s = src.replace(/\r\n?/g, "\n");
  if (dialect === "cmd") return tokenizeCmd(s);
  if (dialect === "ps") return tokenizePs(s);
  return tokenizeBash(s);
}

const ANSI_C: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
  "\\": "\\",
  "'": "'",
  '"': '"',
  "0": "\0",
  a: "\x07",
  b: "\b",
  e: "\x1b",
  f: "\f",
  v: "\v",
};

const isBlank = (c: string) => c === " " || c === "\t" || c === "\n";

function tokenizeBash(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inTok = false;
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    // Line continuation: backslash-newline disappears entirely.
    if (c === "\\" && s[i + 1] === "\n") {
      i += 2;
      continue;
    }
    if (isBlank(c)) {
      if (inTok) {
        out.push(cur);
        cur = "";
        inTok = false;
      }
      i++;
      continue;
    }
    // A comment only starts a word.
    if (c === "#" && !inTok) {
      while (i < n && s[i] !== "\n") i++;
      continue;
    }
    inTok = true;
    if (c === "$" && s[i + 1] === "'") {
      i += 2;
      while (i < n && s[i] !== "'") {
        if (s[i] === "\\" && i + 1 < n) {
          const e = s[i + 1];
          if (e === "x") {
            const hex =
              /^[0-9a-fA-F]{1,2}/.exec(s.slice(i + 2, i + 4))?.[0] ?? "";
            cur += hex ? String.fromCharCode(parseInt(hex, 16)) : "x";
            i += 2 + hex.length;
            continue;
          }
          if (e === "u" || e === "U") {
            const len = e === "u" ? 4 : 8;
            const hex =
              new RegExp(`^[0-9a-fA-F]{1,${len}}`).exec(
                s.slice(i + 2, i + 2 + len),
              )?.[0] ?? "";
            cur += hex ? String.fromCodePoint(parseInt(hex, 16)) : e;
            i += 2 + hex.length;
            continue;
          }
          cur += ANSI_C[e] ?? `\\${e}`;
          i += 2;
          continue;
        }
        cur += s[i++];
      }
      i++;
      continue;
    }
    if (c === "'") {
      i++;
      while (i < n && s[i] !== "'") cur += s[i++];
      i++;
      continue;
    }
    if (c === '"') {
      i++;
      while (i < n && s[i] !== '"') {
        if (s[i] === "\\" && i + 1 < n) {
          const e = s[i + 1];
          if (e === "\n") {
            i += 2;
            continue;
          }
          if (e === '"' || e === "\\" || e === "$" || e === "`") {
            cur += e;
            i += 2;
            continue;
          }
        }
        cur += s[i++];
      }
      i++;
      continue;
    }
    if (c === "\\" && i + 1 < n) {
      cur += s[i + 1];
      i += 2;
      continue;
    }
    cur += c;
    i++;
  }
  if (inTok) out.push(cur);
  return out;
}

function tokenizeCmd(src: string): string[] {
  // cmd first: `^` + newline continues the line, `^x` is a literal x.
  let s = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "^") {
      if (src[i + 1] === "\n") {
        i++;
        continue;
      }
      if (i + 1 < src.length) s += src[++i];
      continue;
    }
    s += c;
  }
  // Then curl.exe's argv split (MSVCRT rules).
  const out: string[] = [];
  let cur = "";
  let inTok = false;
  let quoted = false;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (!quoted && isBlank(c)) {
      if (inTok) {
        out.push(cur);
        cur = "";
        inTok = false;
      }
      i++;
      continue;
    }
    inTok = true;
    if (c === "\\") {
      let bs = 0;
      while (s[i] === "\\") {
        bs++;
        i++;
      }
      if (s[i] === '"') {
        cur += "\\".repeat(Math.floor(bs / 2));
        if (bs % 2 === 1) {
          cur += '"';
          i++;
        }
      } else cur += "\\".repeat(bs);
      continue;
    }
    if (c === '"') {
      // "" inside a quoted run is a literal quote.
      if (quoted && s[i + 1] === '"') {
        cur += '"';
        i += 2;
        continue;
      }
      quoted = !quoted;
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  if (inTok) out.push(cur);
  return out;
}

const PS_ESC: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
  "0": "\0",
  "`": "`",
  '"': '"',
  $: "$",
};

function tokenizePs(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inTok = false;
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === "`" && s[i + 1] === "\n") {
      i += 2;
      continue;
    }
    if (isBlank(c)) {
      if (inTok) {
        out.push(cur);
        cur = "";
        inTok = false;
      }
      i++;
      continue;
    }
    inTok = true;
    if (c === "'") {
      i++;
      while (i < n) {
        if (s[i] === "'") {
          if (s[i + 1] === "'") {
            cur += "'";
            i += 2;
            continue;
          }
          break;
        }
        cur += s[i++];
      }
      i++;
      continue;
    }
    if (c === '"') {
      i++;
      while (i < n && s[i] !== '"') {
        if (s[i] === "`" && i + 1 < n) {
          cur += PS_ESC[s[i + 1]] ?? s[i + 1];
          i += 2;
          continue;
        }
        cur += s[i++];
      }
      i++;
      continue;
    }
    if (c === "`" && i + 1 < n) {
      cur += s[i + 1];
      i += 2;
      continue;
    }
    cur += c;
    i++;
  }
  if (inTok) out.push(cur);
  return out;
}
