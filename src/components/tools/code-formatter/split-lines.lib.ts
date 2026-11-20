/**
 * Pure helpers shared by the formatter workspaces (SQL, XML, code). No
 * React, no DOM.
 */

const TAG_OR_NEWLINE = /<[^>]*>|\n/g;

/**
 * Split highlighter HTML into one HTML fragment per source line.
 *
 * The highlighter (`tokensToHtml`) emits flat, never-nested spans
 * (`<span class="tok-x">…</span>`, `<mark …>…</mark>`) and escapes every
 * `<` in text, so any `<` is a tag. A span that crosses a newline (block
 * comment, multi-line string) is closed at the end of the line and re-opened
 * at the start of the next, so each line renders with the right colour on
 * its own.
 */
export function splitHighlightedLines(html: string): string[] {
  const lines: string[] = [];
  let cur = "";
  let open: string | null = null;
  let last = 0;
  TAG_OR_NEWLINE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_OR_NEWLINE.exec(html)) !== null) {
    cur += html.slice(last, m.index);
    last = TAG_OR_NEWLINE.lastIndex;
    const tok = m[0];
    if (tok === "\n") {
      if (open) cur += closingTag(open);
      lines.push(stripCr(cur));
      cur = open ?? "";
      continue;
    }
    cur += tok;
    if (tok.startsWith("</")) open = null;
    else if (!tok.endsWith("/>")) open = tok;
  }
  cur += html.slice(last);
  lines.push(stripCr(cur));
  return lines;
}

function closingTag(openTag: string): string {
  const name = /^<([a-zA-Z0-9-]+)/.exec(openTag)?.[1] ?? "span";
  return `</${name}>`;
}

function stripCr(line: string): string {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}

/** Number of lines in a text (0 for empty). */
export function countLines(text: string): number {
  if (!text) return 0;
  let n = 1;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/** "1 line" / "12 lines". */
export function linesLabel(n: number): string {
  return `${n.toLocaleString()} ${n === 1 ? "line" : "lines"}`;
}
