import type { Lang, Token } from "./types";
import { tokenizeJson } from "./tokenize-json";
import { tokenizeTypeScript } from "./tokenize-typescript";
import { tokenizePython } from "./tokenize-python";
import { tokenizeGo } from "./tokenize-go";
import { tokenizeRust } from "./tokenize-rust";
import { tokenizeYaml } from "./tokenize-yaml";
import { tokenizeXml } from "./tokenize-xml";
import { tokenizeCsv } from "./tokenize-csv";
import {
  applySearchToTokens,
  escapeHtml,
  tokensToHtml,
  tokensToHtmlWithSearch,
} from "./tokens-to-html";

export type { Lang, Token } from "./types";
export {
  applySearchToTokens,
  escapeHtml,
  tokensToHtml,
  tokensToHtmlWithSearch,
};

/**
 * Above this byte count we skip tokenisation entirely and render the input
 * as plain escaped text. The DOM cost of tens of thousands of spans dwarfs
 * the parsing time on the few-MB JSON dumps people drag in from logs.
 */
export const HIGHLIGHT_SIZE_THRESHOLD = 100_000;

function tokenizerFor(lang: Lang): (s: string) => Token[] {
  switch (lang) {
    case "json": return tokenizeJson;
    case "typescript": return tokenizeTypeScript;
    case "python": return tokenizePython;
    case "go": return tokenizeGo;
    case "rust": return tokenizeRust;
    case "yaml": return tokenizeYaml;
    case "xml": return tokenizeXml;
    case "csv": return tokenizeCsv;
    case "plain": return () => [];
  }
}

/**
 * Highlight a string for the given language. Returns an HTML fragment ready
 * for `dangerouslySetInnerHTML`. Above the size threshold we bail to plain
 * escaped text — the DOM cost would be the actual lag, not the tokenize.
 */
export function highlight(source: string, lang: Lang = "json"): string {
  if (!source) return "";
  if (lang === "plain" || source.length > HIGHLIGHT_SIZE_THRESHOLD) {
    return escapeHtml(source);
  }
  return tokensToHtml(tokenizerFor(lang)(source));
}

/**
 * Highlight + apply a search term so matches render inside `<mark>` while
 * surrounding text keeps its syntax colour. Skips tokenisation for huge
 * inputs the same way `highlight` does.
 */
export function highlightWithSearch(
  source: string,
  lang: Lang = "json",
  search?: string,
): string {
  if (!source) return "";
  if (lang === "plain" || source.length > HIGHLIGHT_SIZE_THRESHOLD) {
    // Above threshold we degrade to escape-only; still surface search
    // hits via a single regex sweep on the escaped text.
    const escaped = escapeHtml(source);
    if (!search?.trim()) return escaped;
    const q = search.trim();
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return escaped.replace(
      new RegExp(`(${safe})`, "gi"),
      '<mark class="json-search-match">$1</mark>',
    );
  }
  const tokens = tokenizerFor(lang)(source);
  if (!search?.trim()) return tokensToHtml(tokens);
  return tokensToHtmlWithSearch(applySearchToTokens(tokens, search));
}

/** Helper for callers that want a line count without a regex. */
export function lineCount(text: string): number {
  if (!text) return 1;
  let n = 1;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}
