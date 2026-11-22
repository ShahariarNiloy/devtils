/**
 * A small one-pass highlighter for the generated code. Enough for six
 * languages we write ourselves — not a general tokenizer.
 */

import type { Lang } from "./curl-generate.lib";

export type Tone =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "key"
  | "keyword"
  | "flag";
export interface Span {
  t: string;
  tone: Tone;
}

/** Past this many characters the code is shown uncoloured (still instant). */
export const HIGHLIGHT_LIMIT = 80_000;

const KEYWORDS: Record<Lang, RegExp> = {
  curl: /^(curl|curl\.exe)$/,
  fetch:
    /^(const|let|await|async|new|if|throw|return|import|from|function|true|false|null)$/,
  axios:
    /^(const|let|await|async|new|if|throw|return|import|from|function|true|false|null)$/,
  python: /^(import|from|as|def|return|if|None|True|False|with|open|print)$/,
  go: /^(package|import|func|var|if|nil|return|defer|panic|err)$/,
  php: /^(require|new|echo|null|true|false|fopen|getenv|print_r)$/,
};

const COMMENT: Record<Lang, string> = {
  curl: "(?!)",
  fetch: "\\/\\/[^\\n]*",
  axios: "\\/\\/[^\\n]*",
  python: "#[^\\n]*",
  go: "\\/\\/[^\\n]*",
  php: "\\/\\/[^\\n]*",
};

const cache = new Map<Lang, RegExp>();
function pattern(lang: Lang): RegExp {
  let rx = cache.get(lang);
  if (!rx) {
    const flag = lang === "curl" ? "|(?<=^|\\s)(--?[A-Za-z][\\w-]*)" : "";
    rx = new RegExp(
      `(${COMMENT[lang]})|("(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'|\`[^\`]*\`)|\\b(\\d+(?:\\.\\d+)?)\\b|([A-Za-z_$][\\w$]*)(?=\\s*(?::(?!:)|=>))|([A-Za-z_$][\\w$.]*)${flag}`,
      "g",
    );
    cache.set(lang, rx);
  }
  return rx;
}

/** Code → lines of coloured spans. */
export function highlight(code: string, lang: Lang): Span[][] {
  const lines: Span[][] = [[]];
  const push = (t: string, tone: Tone) => {
    const parts = t.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i) lines.push([]);
      if (parts[i]) lines[lines.length - 1].push({ t: parts[i], tone });
    }
  };
  if (code.length > HIGHLIGHT_LIMIT) {
    push(code, "plain");
    return lines;
  }
  const rx = pattern(lang);
  const kw = KEYWORDS[lang];
  rx.lastIndex = 0;
  let last = 0;
  for (let m = rx.exec(code); m; m = rx.exec(code)) {
    if (m.index > last) push(code.slice(last, m.index), "plain");
    let tone: Tone = "plain";
    if (m[1]) tone = "comment";
    else if (m[2]) tone = "string";
    else if (m[3]) tone = "number";
    else if (m[4]) tone = lang === "curl" ? "plain" : "key";
    else if (m[5]) tone = kw.test(m[5]) ? "keyword" : "plain";
    else if (m[6]) tone = "flag";
    push(m[0], tone);
    last = rx.lastIndex;
  }
  if (last < code.length) push(code.slice(last), "plain");
  return lines;
}
