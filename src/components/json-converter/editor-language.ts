import type { CodeLanguage } from "@/components/primitives/code-editor";
import type { Lang } from "@/lib/highlight";

/**
 * Highlighter languages the shared code editor has a grammar for. CSV has
 * no CodeMirror grammar, so it's plain text in the editor.
 */
const EDITOR_LANGS: Partial<Record<Lang, CodeLanguage>> = {
  json: "json",
  yaml: "yaml",
  xml: "xml",
  sql: "sql",
  css: "css",
  markdown: "markdown",
  csv: "plain",
  plain: "plain",
};

/** The editor language for an input pane (unknown grammars fall back to plain text). */
export function editorLanguage(lang: Lang): CodeLanguage {
  return EDITOR_LANGS[lang] ?? "plain";
}

/** True when the editor highlights `lang` itself (or it's plain data like CSV). */
export function editorHandles(lang: Lang): boolean {
  return EDITOR_LANGS[lang] !== undefined;
}
