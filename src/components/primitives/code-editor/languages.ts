import { json } from "@codemirror/lang-json";
import type { Extension } from "@codemirror/state";
import type { CodeLanguage } from "./types";

/**
 * Language support per `CodeLanguage`. Imported only by the editor chunk.
 *
 * A language is either bundled with the editor (`sync` — JSON, the common
 * case, so its highlighting is there on the first frame) or loaded on first
 * use (`load`). To add one, e.g. YAML:
 *
 *   yaml: { load: () => import("@codemirror/lang-yaml").then((m) => m.yaml()) },
 *
 * after adding the package — the dynamic import gives it its own chunk.
 */
interface LanguageSupport {
  sync?: () => Extension;
  load?: () => Promise<Extension>;
  /** Auto-close brackets/quotes while typing. */
  closeBrackets: boolean;
}

export const LANGUAGES: Record<CodeLanguage, LanguageSupport> = {
  json: { sync: () => json(), closeBrackets: true },
  plain: { sync: () => [], closeBrackets: false },
  // Loaded on first use, each in its own chunk.
  yaml: { load: () => import("@codemirror/lang-yaml").then((m) => m.yaml()), closeBrackets: true },
  sql: { load: () => import("@codemirror/lang-sql").then((m) => m.sql()), closeBrackets: true },
  xml: { load: () => import("@codemirror/lang-xml").then((m) => m.xml()), closeBrackets: false },
  // HTML fragments (e.g. a page <head>) parse fine as XML-ish markup for
  // highlighting; avoids pulling @codemirror/lang-html's JS/CSS sub-grammars.
  html: { load: () => import("@codemirror/lang-xml").then((m) => m.xml()), closeBrackets: false },
  markdown: { load: () => import("@codemirror/lang-markdown").then((m) => m.markdown()), closeBrackets: false },
  css: { load: () => import("@codemirror/lang-css").then((m) => m.css()), closeBrackets: true },
  // JS, TS, JSX, TSX and Flow: the TypeScript + JSX dialect parses all of them.
  typescript: {
    load: () => import("@codemirror/lang-javascript").then((m) => m.javascript({ typescript: true, jsx: true })),
    closeBrackets: true,
  },
};

const loaded = new Map<CodeLanguage, Extension>();

/** The language extension now if it's available, otherwise a promise of it. */
export function languageExtension(lang: CodeLanguage): Extension | Promise<Extension> {
  const have = loaded.get(lang);
  if (have) return have;
  const support = LANGUAGES[lang];
  if (support.sync) {
    const ext = support.sync();
    loaded.set(lang, ext);
    return ext;
  }
  const load = support.load;
  if (!load) return [];
  return load().then((ext) => {
    loaded.set(lang, ext);
    return ext;
  });
}
