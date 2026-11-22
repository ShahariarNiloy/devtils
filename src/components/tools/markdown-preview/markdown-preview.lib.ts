/**
 * Markdown preview — pure logic. A small, safe Markdown parser that produces
 * a typed AST (rendered to React elements by the component, never through
 * innerHTML) plus an escaped HTML serialiser for the "Copy HTML" output.
 *
 * Supported: ATX + setext headings, paragraphs, emphasis / strong /
 * strikethrough, inline code, links (inline + autolinks + bare URLs),
 * images, hard breaks, bullet / ordered / task lists (nested), block quotes
 * (nested), fenced code blocks, GFM pipe tables and thematic breaks.
 * Raw HTML is never interpreted — it is escaped and shown as text.
 */

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong" | "em" | "del"; children: Inline[] }
  | { kind: "link"; href: string | null; title: string | null; children: Inline[] }
  | { kind: "image"; src: string | null; alt: string; title: string | null }
  | { kind: "break" };

export type Align = "left" | "center" | "right" | null;

export interface ListItem {
  /** null for a plain item, true/false for a checked/unchecked task. */
  task: boolean | null;
  blocks: Block[];
}

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type Block =
  | { kind: "heading"; level: HeadingLevel; inline: Inline[] }
  | { kind: "paragraph"; inline: Inline[] }
  | { kind: "quote"; blocks: Block[] }
  | { kind: "code"; lang: string; text: string }
  | { kind: "list"; ordered: boolean; start: number; items: ListItem[] }
  | { kind: "table"; align: Align[]; head: Inline[][]; rows: Inline[][][] }
  | { kind: "hr" };

/* ------------------------------------------------------------------ */
/* URL safety                                                          */
/* ------------------------------------------------------------------ */

const SAFE_LINK_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

function schemeOf(url: string): string | null {
  // Browsers ignore control chars and whitespace inside schemes
  // ("java\nscript:"), so strip them before looking.
  const probe = url.replace(/[\u0000- \u007f]/g, "").toLowerCase();
  const m = /^([a-z][a-z0-9+.-]*):/.exec(probe);
  return m ? m[1] : null;
}

/** Link targets: http(s), mailto, tel or relative. Anything else → null. */
export function safeHref(raw: string): string | null {
  const url = raw.trim();
  const scheme = schemeOf(url);
  if (scheme === null) return url;
  return SAFE_LINK_SCHEMES.has(scheme) ? url : null;
}

/** Image sources: http(s), relative, or an inline data:image. */
export function safeImageSrc(raw: string): string | null {
  const url = raw.trim();
  const scheme = schemeOf(url);
  if (scheme === null || scheme === "http" || scheme === "https") return url;
  if (scheme === "data" && /^data:image\/(png|gif|jpe?g|webp|avif|bmp|svg\+xml)[;,]/i.test(url)) return url;
  return null;
}

/** Only inline data: images render in the preview — nothing is fetched. */
export function isLocalImage(src: string | null): src is string {
  return src !== null && /^data:image\//i.test(src);
}

/* ------------------------------------------------------------------ */
/* Inline parsing                                                      */
/* ------------------------------------------------------------------ */

const ESCAPABLE = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;
const WORD = /[\p{L}\p{N}]/u;

/**
 * Code spans and link labels are only searched this far ahead, so
 * pathological input (thousands of unmatched "[" or "`") stays fast.
 */
const SCAN_LIMIT = 1000;

/** Index just past a backtick code span starting at `i`, or -1. */
function codeSpanEnd(src: string, i: number): { end: number; run: number; close: number } | null {
  let run = 0;
  while (src[i + run] === "`") run++;
  let j = i + run;
  const stop = Math.min(src.length, i + SCAN_LIMIT);
  while (j < stop) {
    if (src[j] !== "`") {
      j++;
      continue;
    }
    let r = 0;
    while (src[j + r] === "`") r++;
    if (r === run) return { end: j + run, run, close: j };
    j += r;
  }
  return null;
}

/**
 * Finds `token` closing an emphasis run opened before `from`. Skips escapes
 * and code spans; the closer must not follow whitespace.
 */
function findCloser(src: string, from: number, token: string, memo: Map<string, number>): number {
  const ch = token[0];
  // A failed search from p means no closer exists after p, so any later
  // opener of the same token fails too — keeps unmatched runs linear.
  const failedFrom = memo.get(token);
  if (failedFrom !== undefined && from >= failedFrom) return -1;
  let j = from;
  while (j < src.length) {
    const c = src[j];
    if (c === "\\") {
      j += 2;
      continue;
    }
    if (c === "`") {
      const span = codeSpanEnd(src, j);
      if (span) {
        j = span.end;
        continue;
      }
    }
    if (c === ch && src.startsWith(token, j)) {
      let run = 0;
      while (src[j + run] === ch) run++;
      const prev = src[j - 1];
      const after = src[j + run];
      const okPrev = prev !== undefined && !/\s/.test(prev);
      const okUnderscore = ch !== "_" || after === undefined || !WORD.test(after);
      // A single-char closer must not be part of a longer run (that's a
      // nested strong closer); a double closer may sit inside ***.
      const okRun = token.length === 1 ? run === 1 || run === 3 : run >= token.length;
      if (okPrev && okUnderscore && okRun && j > from) {
        // In a run of 3, a single closer is the last char; a double closer
        // the last two (the leftover char closes an inner emphasis).
        if (run === 3 && token.length < 3) return j + 3 - token.length;
        return j;
      }
      j += run;
      continue;
    }
    j++;
  }
  if (!memo.has(token)) memo.set(token, from);
  return -1;
}

interface LinkParts {
  label: string;
  dest: string;
  title: string | null;
  end: number;
}

/** Parses `[label](dest "title")` starting at the `[` at `i`. */
function parseLinkAt(src: string, i: number): LinkParts | null {
  let depth = 0;
  let j = i;
  const stop = Math.min(src.length, i + SCAN_LIMIT);
  if (src.indexOf("](", i) === -1) return null;
  for (; j < stop; j++) {
    const c = src[j];
    if (c === "\\") {
      j++;
      continue;
    }
    if (c === "`") {
      const span = codeSpanEnd(src, j);
      if (span) {
        j = span.end - 1;
        continue;
      }
    }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) break;
    }
  }
  if (j >= stop || src[j + 1] !== "(") return null;
  const label = src.slice(i + 1, j);
  let k = j + 2;
  while (src[k] === " " || src[k] === "\t") k++;
  let dest = "";
  if (src[k] === "<") {
    const close = src.indexOf(">", k);
    if (close === -1) return null;
    dest = src.slice(k + 1, close);
    k = close + 1;
  } else {
    let paren = 0;
    const start = k;
    for (; k < src.length; k++) {
      const c = src[k];
      if (c === "\\") {
        k++;
        continue;
      }
      if (/\s/.test(c)) break;
      if (c === "(") paren++;
      else if (c === ")") {
        if (paren === 0) break;
        paren--;
      }
    }
    dest = src.slice(start, k);
  }
  while (src[k] === " " || src[k] === "\t" || src[k] === "\n") k++;
  let title: string | null = null;
  const q = src[k];
  if (q === '"' || q === "'" || q === "(") {
    const closeCh = q === "(" ? ")" : q;
    const close = src.indexOf(closeCh, k + 1);
    if (close === -1) return null;
    title = src.slice(k + 1, close);
    k = close + 1;
    while (src[k] === " " || src[k] === "\t") k++;
  }
  if (src[k] !== ")") return null;
  return { label, dest: unescapeText(dest), title, end: k + 1 };
}

function unescapeText(s: string): string {
  return s.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, "$1");
}

const BARE_URL = /^(?:https?:\/\/|www\.)[^\s<]*[^\s<?!.,:;*_~'")\]]/i;
const AUTOLINK = /^<((?:https?|mailto|tel):[^\s<>]+)>/i;
const AUTOLINK_EMAIL = /^<([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>/;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  const memo = new Map<string, number>();
  let buf = "";
  const flush = () => {
    if (buf) {
      out.push({ kind: "text", text: buf });
      buf = "";
    }
  };

  let i = 0;
  while (i < src.length) {
    const c = src[i];

    if (c === "\\") {
      const nx = src[i + 1];
      if (nx === "\n") {
        flush();
        out.push({ kind: "break" });
        i += 2;
        continue;
      }
      if (nx !== undefined && ESCAPABLE.test(nx)) {
        buf += nx;
        i += 2;
        continue;
      }
      buf += c;
      i++;
      continue;
    }

    if (c === "\n") {
      const hard = / {2,}$/.test(buf);
      buf = buf.replace(/[ \t]+$/, "");
      if (hard) {
        flush();
        out.push({ kind: "break" });
      } else buf += " ";
      i++;
      while (src[i] === " " || src[i] === "\t") i++;
      continue;
    }

    if (c === "`") {
      const span = codeSpanEnd(src, i);
      if (span) {
        flush();
        let code = src.slice(i + span.run, span.close).replace(/\n/g, " ");
        if (code.length > 2 && code.startsWith(" ") && code.endsWith(" ") && code.trim()) code = code.slice(1, -1);
        out.push({ kind: "code", text: code });
        i = span.end;
        continue;
      }
      let run = 0;
      while (src[i + run] === "`") run++;
      buf += src.slice(i, i + run);
      i += run;
      continue;
    }

    if (c === "!" && src[i + 1] === "[") {
      const l = parseLinkAt(src, i + 1);
      if (l) {
        flush();
        out.push({ kind: "image", src: safeImageSrc(l.dest), alt: inlineToText(parseInline(l.label)), title: l.title });
        i = l.end;
        continue;
      }
    }

    if (c === "[") {
      const l = parseLinkAt(src, i);
      if (l) {
        flush();
        out.push({ kind: "link", href: safeHref(l.dest), title: l.title, children: parseInline(l.label) });
        i = l.end;
        continue;
      }
    }

    if (c === "<") {
      const rest = src.slice(i);
      const m = AUTOLINK.exec(rest);
      const e = m ? null : AUTOLINK_EMAIL.exec(rest);
      const hit = m ?? e;
      if (hit) {
        flush();
        const text = hit[1];
        out.push({ kind: "link", href: m ? safeHref(text) : `mailto:${text}`, title: null, children: [{ kind: "text", text }] });
        i += hit[0].length;
        continue;
      }
    }

    if ((c === "h" || c === "H" || c === "w" || c === "W") && (i === 0 || !/[\p{L}\p{N}/:]/u.test(src[i - 1]))) {
      const m = BARE_URL.exec(src.slice(i));
      if (m) {
        let url = m[0];
        // Keep a trailing ")" only when it closes a "(" inside the URL.
        while (url.endsWith(")") && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)) url = url.slice(0, -1);
        flush();
        const href = /^www\./i.test(url) ? `http://${url}` : url;
        out.push({ kind: "link", href: safeHref(href), title: null, children: [{ kind: "text", text: url }] });
        i += url.length;
        continue;
      }
    }

    if (c === "*" || c === "_" || c === "~") {
      let run = 0;
      while (src[i + run] === c) run++;
      const next = src[i + run];
      const prev = src[i - 1];
      const opens = next !== undefined && !/\s/.test(next) && !(c === "_" && prev !== undefined && WORD.test(prev));

      if (opens && c === "~") {
        if (run === 2) {
          const j = findCloser(src, i + 2, "~~", memo);
          if (j !== -1) {
            flush();
            out.push({ kind: "del", children: parseInline(src.slice(i + 2, j)) });
            i = j + 2;
            continue;
          }
        }
      } else if (opens) {
        if (run >= 3) {
          const j = findCloser(src, i + 3, c.repeat(3), memo);
          if (j !== -1) {
            flush();
            out.push({ kind: "strong", children: [{ kind: "em", children: parseInline(src.slice(i + 3, j)) }] });
            i = j + 3;
            continue;
          }
        }
        if (run >= 2) {
          const j = findCloser(src, i + 2, c + c, memo);
          if (j !== -1) {
            flush();
            out.push({ kind: "strong", children: parseInline(src.slice(i + 2, j)) });
            i = j + 2;
            continue;
          }
        }
        if (run === 1 || run === 3) {
          const j = findCloser(src, i + 1, c, memo);
          if (j !== -1) {
            flush();
            out.push({ kind: "em", children: parseInline(src.slice(i + 1, j)) });
            i = j + 1;
            continue;
          }
        }
      }
      buf += src.slice(i, i + run);
      i += run;
      continue;
    }

    buf += c;
    i++;
  }
  flush();
  return out;
}

export function inlineToText(nodes: readonly Inline[]): string {
  let s = "";
  for (const n of nodes) {
    if (n.kind === "text" || n.kind === "code") s += n.text;
    else if (n.kind === "image") s += n.alt;
    else if (n.kind === "break") s += "\n";
    else s += inlineToText(n.children);
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* Block parsing                                                       */
/* ------------------------------------------------------------------ */

const RE_ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const RE_HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const RE_FENCE = /^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/;
const RE_QUOTE = /^ {0,3}> ?/;
const RE_LIST = /^( {0,3})([-*+]|\d{1,9}[.)])([ \t]+|$)(.*)$/;
const RE_SETEXT_1 = /^ {0,3}=+[ \t]*$/;
const RE_SETEXT_2 = /^ {0,3}-+[ \t]*$/;
const RE_TABLE_DELIM = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

const isBlank = (l: string) => l.trim() === "";
const indentOf = (l: string) => {
  let n = 0;
  for (const ch of l) {
    if (ch === " ") n++;
    else if (ch === "\t") n += 4 - (n % 4);
    else break;
  }
  return n;
};

/** Removes `n` columns of leading indentation (tabs count to the next stop). */
function dedent(l: string, n: number): string {
  let col = 0;
  let k = 0;
  while (k < l.length && col < n) {
    if (l[k] === " ") col++;
    else if (l[k] === "\t") col += 4 - (col % 4);
    else break;
    k++;
  }
  return " ".repeat(Math.max(0, col - n)) + l.slice(k);
}

function isTableStart(lines: readonly string[], i: number): boolean {
  const l = lines[i];
  const next = lines[i + 1];
  return l !== undefined && next !== undefined && l.includes("|") && RE_TABLE_DELIM.test(next) && next.includes("-") && (next.includes("|") || l.trim().startsWith("|"));
}

function startsBlock(lines: readonly string[], i: number): boolean {
  const l = lines[i];
  return RE_ATX.test(l) || RE_HR.test(l) || RE_FENCE.test(l) || RE_QUOTE.test(l) || RE_LIST.test(l) || isTableStart(lines, i);
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  let inCode = 0;
  for (let k = 0; k < s.length; k++) {
    const ch = s[k];
    if (ch === "\\" && s[k + 1] === "|") {
      cur += "|";
      k++;
      continue;
    }
    if (ch === "`") {
      let run = 0;
      while (s[k + run] === "`") run++;
      if (inCode === 0) inCode = run;
      else if (inCode === run) inCode = 0;
      cur += s.slice(k, k + run);
      k += run - 1;
      continue;
    }
    if (ch === "|" && inCode === 0) {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function parseAlign(cell: string): Align {
  const c = cell.trim();
  const l = c.startsWith(":");
  const r = c.endsWith(":");
  if (l && r) return "center";
  if (r) return "right";
  return l ? "left" : null;
}

export function parseMarkdown(src: string): Block[] {
  return parseBlocks(src.replace(/\r\n?/g, "\n").split("\n"), 0);
}

const MAX_DEPTH = 24;

/** "-", "*", "+" or the ordered delimiter: a change starts a new list. */
const markerType = (marker: string) => marker[marker.length - 1];

function parseBlocks(lines: readonly string[], depth: number): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }

    // Fenced code
    const fence = RE_FENCE.exec(line);
    if (fence && !(fence[2][0] === "`" && fence[3].includes("`"))) {
      const indent = fence[1].length;
      const marker = fence[2];
      const lang = fence[3].trim().split(/\s+/)[0] ?? "";
      const code: string[] = [];
      i++;
      const closeRe = new RegExp(`^ {0,3}${marker[0] === "`" ? "`" : "~"}{${marker.length},}[ \\t]*$`);
      while (i < lines.length && !closeRe.test(lines[i])) {
        code.push(dedent(lines[i], indent));
        i++;
      }
      i++; // closing fence (or EOF)
      blocks.push({ kind: "code", lang: unescapeText(lang), text: code.join("\n") });
      continue;
    }

    // ATX heading
    const atx = RE_ATX.exec(line);
    if (atx) {
      const level = atx[1].length as HeadingLevel;
      const text = (atx[2] ?? "").replace(/(^|[ \t]+)#+[ \t]*$/, "").trim();
      blocks.push({ kind: "heading", level, inline: parseInline(text) });
      i++;
      continue;
    }

    // Thematic break
    if (RE_HR.test(line)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    // Block quote
    if (RE_QUOTE.test(line) && depth < MAX_DEPTH) {
      const inner: string[] = [];
      while (i < lines.length) {
        const l = lines[i];
        if (RE_QUOTE.test(l)) inner.push(l.replace(RE_QUOTE, ""));
        else if (!isBlank(l) && inner.length > 0 && !isBlank(inner[inner.length - 1]) && !startsBlock(lines, i)) inner.push(l);
        else break;
        i++;
      }
      blocks.push({ kind: "quote", blocks: parseBlocks(inner, depth + 1) });
      continue;
    }

    // List
    const first = RE_LIST.exec(line);
    if (first && depth < MAX_DEPTH) {
      const ordered = /\d/.test(first[2]);
      const start = ordered ? parseInt(first[2], 10) : 1;
      const type = markerType(first[2]);
      const items: ListItem[] = [];
      while (i < lines.length) {
        const m = RE_LIST.exec(lines[i]);
        if (!m || markerType(m[2]) !== type || RE_HR.test(lines[i])) break;
        // 0 or 5+ spaces after the marker: content starts one column in.
        const pad = m[3].length === 0 || m[3].length > 4 ? 1 : m[3].length;
        const contentIndent = m[1].length + m[2].length + pad;
        const itemLines: string[] = [m[3].length > 4 ? m[3].slice(1) + m[4] : m[4]];
        i++;
        while (i < lines.length) {
          const l = lines[i];
          if (isBlank(l)) {
            let k = i + 1;
            while (k < lines.length && isBlank(lines[k])) k++;
            if (k < lines.length && indentOf(lines[k]) >= contentIndent) {
              for (; i < k; i++) itemLines.push("");
              continue;
            }
            break;
          }
          if (indentOf(l) >= contentIndent) {
            itemLines.push(dedent(l, contentIndent));
            i++;
            continue;
          }
          const last = itemLines[itemLines.length - 1];
          if (!startsBlock(lines, i) && last !== undefined && !isBlank(last)) {
            // Lazy paragraph continuation.
            itemLines.push(l.trim());
            i++;
            continue;
          }
          break;
        }
        let task: boolean | null = null;
        const t = /^\[([ xX])\](?:[ \t]+|$)/.exec(itemLines[0]);
        if (t) {
          task = t[1] !== " ";
          itemLines[0] = itemLines[0].slice(t[0].length);
        }
        items.push({ task, blocks: parseBlocks(itemLines, depth + 1) });

        // The list continues past blank lines if another sibling marker follows.
        let k = i;
        while (k < lines.length && isBlank(lines[k])) k++;
        const nx = k < lines.length ? RE_LIST.exec(lines[k]) : null;
        if (nx && markerType(nx[2]) === type && !RE_HR.test(lines[k])) i = k;
        else break;
      }
      blocks.push({ kind: "list", ordered, start, items });
      continue;
    }

    // Table
    if (isTableStart(lines, i)) {
      const head = splitRow(line);
      const align = splitRow(lines[i + 1]).map(parseAlign);
      const cols = head.length;
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && !isBlank(lines[i]) && lines[i].includes("|") && !startsBlock(lines, i)) {
        const cells = splitRow(lines[i]);
        const row: Inline[][] = [];
        for (let c = 0; c < cols; c++) row.push(parseInline(cells[c] ?? ""));
        rows.push(row);
        i++;
      }
      blocks.push({
        kind: "table",
        align: Array.from({ length: cols }, (_, c) => align[c] ?? null),
        head: head.map((h) => parseInline(h)),
        rows,
      });
      continue;
    }

    // Paragraph (with setext heading detection)
    const para: string[] = [line.replace(/^[ \t]+/, "")];
    i++;
    let setext: HeadingLevel | null = null;
    while (i < lines.length) {
      const l = lines[i];
      if (isBlank(l)) break;
      if (RE_SETEXT_1.test(l)) {
        setext = 1;
        i++;
        break;
      }
      if (RE_SETEXT_2.test(l)) {
        setext = 2;
        i++;
        break;
      }
      if (startsBlock(lines, i)) break;
      para.push(l.replace(/^[ \t]+/, ""));
      i++;
    }
    const text = para.join("\n").replace(/[ \t]+$/, "");
    blocks.push(setext ? { kind: "heading", level: setext, inline: parseInline(text) } : { kind: "paragraph", inline: parseInline(text) });
  }
  return blocks;
}

/* ------------------------------------------------------------------ */
/* HTML output                                                         */
/* ------------------------------------------------------------------ */

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inlineHtml(nodes: readonly Inline[]): string {
  let s = "";
  for (const n of nodes) {
    switch (n.kind) {
      case "text":
        s += escapeHtml(n.text);
        break;
      case "code":
        s += `<code>${escapeHtml(n.text)}</code>`;
        break;
      case "strong":
        s += `<strong>${inlineHtml(n.children)}</strong>`;
        break;
      case "em":
        s += `<em>${inlineHtml(n.children)}</em>`;
        break;
      case "del":
        s += `<del>${inlineHtml(n.children)}</del>`;
        break;
      case "break":
        s += "<br>";
        break;
      case "link": {
        const inner = inlineHtml(n.children);
        if (n.href === null) s += inner;
        else s += `<a href="${escapeHtml(n.href)}"${n.title ? ` title="${escapeHtml(n.title)}"` : ""}>${inner}</a>`;
        break;
      }
      case "image":
        if (n.src === null) s += escapeHtml(n.alt);
        else s += `<img src="${escapeHtml(n.src)}" alt="${escapeHtml(n.alt)}"${n.title ? ` title="${escapeHtml(n.title)}"` : ""}>`;
        break;
    }
  }
  return s;
}

function blockHtml(b: Block, pad: string, out: string[]): void {
  switch (b.kind) {
    case "heading":
      out.push(`${pad}<h${b.level}>${inlineHtml(b.inline)}</h${b.level}>`);
      return;
    case "paragraph":
      out.push(`${pad}<p>${inlineHtml(b.inline)}</p>`);
      return;
    case "hr":
      out.push(`${pad}<hr>`);
      return;
    case "code": {
      const cls = b.lang ? ` class="language-${escapeHtml(b.lang)}"` : "";
      out.push(`${pad}<pre><code${cls}>${escapeHtml(b.text)}</code></pre>`);
      return;
    }
    case "quote":
      out.push(`${pad}<blockquote>`);
      for (const c of b.blocks) blockHtml(c, pad + "  ", out);
      out.push(`${pad}</blockquote>`);
      return;
    case "list": {
      const tag = b.ordered ? "ol" : "ul";
      out.push(`${pad}<${tag}${b.ordered && b.start !== 1 ? ` start="${b.start}"` : ""}>`);
      for (const it of b.items) {
        const box = it.task === null ? "" : `<input type="checkbox" disabled${it.task ? " checked" : ""}> `;
        const [head, ...rest] = it.blocks;
        const lead = head?.kind === "paragraph" ? inlineHtml(head.inline) : "";
        const tail = head?.kind === "paragraph" ? rest : it.blocks;
        if (tail.length === 0) out.push(`${pad}  <li>${box}${lead}</li>`);
        else {
          out.push(`${pad}  <li>${box}${lead}`);
          for (const c of tail) blockHtml(c, pad + "    ", out);
          out.push(`${pad}  </li>`);
        }
      }
      out.push(`${pad}</${tag}>`);
      return;
    }
    case "table": {
      const attr = (a: Align) => (a ? ` align="${a}"` : "");
      out.push(`${pad}<table>`, `${pad}  <thead>`, `${pad}    <tr>`);
      b.head.forEach((h, c) => out.push(`${pad}      <th${attr(b.align[c])}>${inlineHtml(h)}</th>`));
      out.push(`${pad}    </tr>`, `${pad}  </thead>`);
      if (b.rows.length) {
        out.push(`${pad}  <tbody>`);
        for (const r of b.rows) {
          out.push(`${pad}    <tr>`);
          r.forEach((cell, c) => out.push(`${pad}      <td${attr(b.align[c])}>${inlineHtml(cell)}</td>`));
          out.push(`${pad}    </tr>`);
        }
        out.push(`${pad}  </tbody>`);
      }
      out.push(`${pad}</table>`);
      return;
    }
  }
}

/** Escaped, indented HTML for the AST. Safe to paste anywhere. */
export function renderHtml(blocks: readonly Block[]): string {
  const out: string[] = [];
  for (const b of blocks) blockHtml(b, "", out);
  return out.join("\n");
}

/** A standalone .html document wrapping the rendered body. */
export function htmlDocument(body: string, title: string): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escapeHtml(title)}</title>`,
    "</head>",
    "<body>",
    body,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */

function blockText(b: Block): string {
  switch (b.kind) {
    case "heading":
    case "paragraph":
      return inlineToText(b.inline);
    case "code":
      return b.text;
    case "quote":
      return b.blocks.map(blockText).join("\n");
    case "list":
      return b.items.map((it) => it.blocks.map(blockText).join("\n")).join("\n");
    case "table":
      return [...b.head, ...b.rows.flat()].map(inlineToText).join(" ");
    case "hr":
      return "";
  }
}

const WORD_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

export interface MarkdownStats {
  blocks: number;
  words: number;
  /** Whole minutes at 230 wpm; 0 only when there are no words. */
  readMinutes: number;
}

/** Counts words in the rendered text (not URLs or Markdown syntax). */
export function markdownStats(blocks: readonly Block[]): MarkdownStats {
  const text = blocks.map(blockText).join("\n");
  const words = text.match(WORD_RE)?.length ?? 0;
  return { blocks: blocks.length, words, readMinutes: words === 0 ? 0 : Math.max(1, Math.round(words / 230)) };
}

/* ------------------------------------------------------------------ */
/* HTML syntax highlighting (for the HTML view)                        */
/* ------------------------------------------------------------------ */

export type HtmlTokenKind = "text" | "comment" | "punct" | "tag" | "attr" | "value" | "entity";
export interface HtmlToken {
  v: string;
  k: HtmlTokenKind;
}

/** Splits each line of HTML into coloured tokens. */
export function highlightHtml(html: string): HtmlToken[][] {
  return html.split("\n").map((ln) => {
    const toks: HtmlToken[] = [];
    const re = /(<!--.*?-->)|(<\/?)([\w:.-]+)|(\/?>)|([\w:-]+)(=)("[^"]*")|(&#?\w+;)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ln)) !== null) {
      if (m.index > last) toks.push({ v: ln.slice(last, m.index), k: "text" });
      if (m[1]) toks.push({ v: m[1], k: "comment" });
      else if (m[2]) toks.push({ v: m[2], k: "punct" }, { v: m[3], k: "tag" });
      else if (m[4]) toks.push({ v: m[4], k: "punct" });
      else if (m[5]) toks.push({ v: m[5], k: "attr" }, { v: m[6], k: "punct" }, { v: m[7], k: "value" });
      else toks.push({ v: m[0], k: "entity" });
      last = re.lastIndex;
    }
    if (last < ln.length) toks.push({ v: ln.slice(last), k: "text" });
    return toks;
  });
}

/** Sample doc. Headings start at level 2: the preview renders into the page,
 *  which already has its own <h1> (one h1 per page for SEO). */
export const SAMPLE_MARKDOWN = `## Release notes

utilyx **2.1** ships three new tools and a faster *JSON formatter*.

### What's new

- [x] Markdown preview
- [x] Word counter with \`keyword density\`
- [ ] PDF tools (coming soon)

> Everything still runs in your browser.

\`\`\`
git tag v2.1.0 && git push --tags
\`\`\`

Read the [changelog](https://example.com/changelog).`;
