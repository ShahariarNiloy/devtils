/**
 * Pure code-formatting lib. Wraps `prettier/standalone` with per-language
 * plugin lazy-loading so that visitors who pick "JSON" don't download the
 * Babel parser, and visitors who pick "CSS" don't download the HTML one.
 *
 * Each LanguageDef points at:
 *   - `parser` — Prettier's parser id (the value passed as `options.parser`).
 *   - `plugins` — an async getter returning the prettier plugin modules
 *     needed for that parser. Resolved at format-time on first use, cached
 *     for the rest of the page lifetime.
 *
 * Why the registry-of-getters pattern: a top-level `await import("prettier/plugins/babel")`
 * would pull every plugin into the same code-split chunk; per-getter dynamic
 * imports keep them in separate chunks the browser fetches on demand.
 *
 * Architecture matches AGENTS.md: no React, no DOM, returns plain data.
 * The component layer handles state, debounce, toasts, and error display.
 */

import type { Plugin, RequiredOptions } from "prettier";
import type * as Standalone from "prettier/standalone";

type PrettierStandalone = typeof Standalone;

// ── Public surface ─────────────────────────────────────────────────────

export type LanguageId =
  | "javascript"
  | "typescript"
  | "jsx"
  | "tsx"
  | "flow"
  | "json"
  | "json5"
  | "jsonc"
  | "css"
  | "scss"
  | "less"
  | "html"
  | "vue"
  | "angular"
  | "handlebars"
  | "markdown"
  | "mdx"
  | "yaml"
  | "graphql";

export interface LanguageDef {
  id: LanguageId;
  /** Display label shown in the picker. */
  label: string;
  /** Prettier parser identifier passed in `options.parser`. */
  parser: string;
  /** File extension hint, used for the download-as-file action. */
  extension: string;
  /** Which option groups apply (drives the option-chip row). */
  optionGroups: ReadonlyArray<"indent" | "width" | "js" | "css" | "html">;
  /** Lazy-load the plugin(s) Prettier needs for this language. */
  loadPlugins: () => Promise<Plugin[]>;
}

export interface FormatOptions {
  tabWidth?: number;
  useTabs?: boolean;
  printWidth?: number;
  semi?: boolean;
  singleQuote?: boolean;
  trailingComma?: "all" | "es5" | "none";
  bracketSpacing?: boolean;
  arrowParens?: "always" | "avoid";
  endOfLine?: "lf" | "crlf" | "cr" | "auto";
}

export type FormatResult =
  | { ok: true; output: string }
  | { ok: false; error: string; line?: number; column?: number };

// ── Language registry ──────────────────────────────────────────────────

// Babel + ESTree pair powers JS/JSX/JSON. TypeScript parser needs estree too.
// Plugin loaders return the default exports as Prettier plugin objects.

const loadBabelAndEstree = async (): Promise<Plugin[]> => {
  const [babel, estree] = await Promise.all([
    import("prettier/plugins/babel"),
    import("prettier/plugins/estree"),
  ]);
  return [babel.default as Plugin, estree.default as Plugin];
};

const loadTypeScriptAndEstree = async (): Promise<Plugin[]> => {
  const [ts, estree] = await Promise.all([
    import("prettier/plugins/typescript"),
    import("prettier/plugins/estree"),
  ]);
  return [ts.default as Plugin, estree.default as Plugin];
};

const loadPostcss = async (): Promise<Plugin[]> => {
  const m = await import("prettier/plugins/postcss");
  return [m.default as Plugin];
};

const loadHtml = async (): Promise<Plugin[]> => {
  const m = await import("prettier/plugins/html");
  return [m.default as Plugin];
};

const loadMarkdown = async (): Promise<Plugin[]> => {
  const m = await import("prettier/plugins/markdown");
  return [m.default as Plugin];
};

const loadYaml = async (): Promise<Plugin[]> => {
  const m = await import("prettier/plugins/yaml");
  return [m.default as Plugin];
};

const loadGraphql = async (): Promise<Plugin[]> => {
  const m = await import("prettier/plugins/graphql");
  return [m.default as Plugin];
};

const loadFlowAndEstree = async (): Promise<Plugin[]> => {
  const [flow, estree] = await Promise.all([
    import("prettier/plugins/flow"),
    import("prettier/plugins/estree"),
  ]);
  return [flow.default as Plugin, estree.default as Plugin];
};

const loadGlimmer = async (): Promise<Plugin[]> => {
  const m = await import("prettier/plugins/glimmer");
  return [m.default as Plugin];
};

export const LANGUAGES: ReadonlyArray<LanguageDef> = [
  {
    id: "javascript",
    label: "JavaScript",
    parser: "babel",
    extension: "js",
    optionGroups: ["indent", "width", "js"],
    loadPlugins: loadBabelAndEstree,
  },
  {
    id: "typescript",
    label: "TypeScript",
    parser: "typescript",
    extension: "ts",
    optionGroups: ["indent", "width", "js"],
    loadPlugins: loadTypeScriptAndEstree,
  },
  {
    id: "jsx",
    label: "JSX",
    parser: "babel",
    extension: "jsx",
    optionGroups: ["indent", "width", "js"],
    loadPlugins: loadBabelAndEstree,
  },
  {
    id: "tsx",
    label: "TSX",
    parser: "typescript",
    extension: "tsx",
    optionGroups: ["indent", "width", "js"],
    loadPlugins: loadTypeScriptAndEstree,
  },
  {
    id: "flow",
    label: "Flow",
    parser: "flow",
    extension: "js",
    optionGroups: ["indent", "width", "js"],
    loadPlugins: loadFlowAndEstree,
  },
  {
    id: "json",
    label: "JSON",
    parser: "json",
    extension: "json",
    optionGroups: ["indent", "width"],
    loadPlugins: loadBabelAndEstree,
  },
  {
    id: "json5",
    label: "JSON5",
    parser: "json5",
    extension: "json5",
    optionGroups: ["indent", "width"],
    loadPlugins: loadBabelAndEstree,
  },
  {
    id: "jsonc",
    label: "JSONC",
    parser: "jsonc",
    extension: "jsonc",
    optionGroups: ["indent", "width"],
    loadPlugins: loadBabelAndEstree,
  },
  {
    id: "css",
    label: "CSS",
    parser: "css",
    extension: "css",
    optionGroups: ["indent", "width", "css"],
    loadPlugins: loadPostcss,
  },
  {
    id: "scss",
    label: "SCSS",
    parser: "scss",
    extension: "scss",
    optionGroups: ["indent", "width", "css"],
    loadPlugins: loadPostcss,
  },
  {
    id: "less",
    label: "Less",
    parser: "less",
    extension: "less",
    optionGroups: ["indent", "width", "css"],
    loadPlugins: loadPostcss,
  },
  {
    id: "html",
    label: "HTML",
    parser: "html",
    extension: "html",
    optionGroups: ["indent", "width", "html"],
    loadPlugins: loadHtml,
  },
  {
    id: "vue",
    label: "Vue",
    parser: "vue",
    extension: "vue",
    optionGroups: ["indent", "width", "html"],
    loadPlugins: loadHtml,
  },
  {
    id: "angular",
    label: "Angular",
    parser: "angular",
    extension: "html",
    optionGroups: ["indent", "width", "html"],
    loadPlugins: loadHtml,
  },
  {
    id: "handlebars",
    label: "Handlebars",
    parser: "glimmer",
    extension: "hbs",
    optionGroups: ["indent", "width", "html"],
    loadPlugins: loadGlimmer,
  },
  {
    id: "markdown",
    label: "Markdown",
    parser: "markdown",
    extension: "md",
    optionGroups: ["width"],
    loadPlugins: loadMarkdown,
  },
  {
    id: "mdx",
    label: "MDX",
    parser: "mdx",
    extension: "mdx",
    optionGroups: ["width"],
    loadPlugins: loadMarkdown,
  },
  {
    id: "yaml",
    label: "YAML",
    parser: "yaml",
    extension: "yaml",
    optionGroups: ["indent"],
    loadPlugins: loadYaml,
  },
  {
    id: "graphql",
    label: "GraphQL",
    parser: "graphql",
    extension: "graphql",
    optionGroups: ["indent"],
    loadPlugins: loadGraphql,
  },
];

export function getLanguage(id: LanguageId): LanguageDef {
  const found = LANGUAGES.find((l) => l.id === id);
  if (!found) throw new Error(`Unknown language: ${id}`);
  return found;
}

/**
 * Maps our Prettier-language ids onto the languages the shared
 * tokenize-* highlighter supports. CSS/SCSS/Less/Markdown/GraphQL don't
 * have tokenizers yet, so they fall back to plain text styling — still
 * monospace + line-numbered, just no colour. Adding a tokenizer for any
 * of these is a follow-up.
 */
export type HighlighterLang =
  | "json"
  | "yaml"
  | "xml"
  | "typescript"
  | "css"
  | "markdown"
  | "graphql"
  | "plain";

export function toHighlighterLang(id: LanguageId): HighlighterLang {
  switch (id) {
    case "javascript":
    case "typescript":
    case "jsx":
    case "tsx":
    case "flow":
      return "typescript";
    case "json":
    case "json5":
    case "jsonc":
      return "json";
    case "yaml":
      return "yaml";
    case "html":
    case "vue":
    case "angular":
    case "handlebars":
      return "xml";
    case "css":
    case "scss":
    case "less":
      return "css";
    case "markdown":
    case "mdx":
      return "markdown";
    case "graphql":
      return "graphql";
    default:
      return "plain";
  }
}

// ── Caches ─────────────────────────────────────────────────────────────

let prettierModulePromise: Promise<PrettierStandalone> | null = null;
const pluginCache = new Map<LanguageId, Promise<Plugin[]>>();

function getPrettier(): Promise<PrettierStandalone> {
  if (!prettierModulePromise) {
    prettierModulePromise = import("prettier/standalone");
  }
  return prettierModulePromise;
}

function getPluginsFor(lang: LanguageDef): Promise<Plugin[]> {
  let cached = pluginCache.get(lang.id);
  if (!cached) {
    cached = lang.loadPlugins();
    pluginCache.set(lang.id, cached);
  }
  return cached;
}

// ── Format ─────────────────────────────────────────────────────────────

/**
 * Format a string of source code. Returns `{ ok: false, error }` on
 * parse failure rather than throwing — the UI can render a friendly
 * diagnostic without try/catch noise at every call site.
 *
 * The empty-input case returns `ok: true` with an empty output (Prettier
 * would otherwise emit a leading newline, which feels weird in a UI).
 */
export async function format(
  code: string,
  languageId: LanguageId,
  options: FormatOptions = {},
): Promise<FormatResult> {
  if (code === "") return { ok: true, output: "" };

  const lang = getLanguage(languageId);
  try {
    const [prettier, plugins] = await Promise.all([getPrettier(), getPluginsFor(lang)]);

    const opts: Partial<RequiredOptions> = {
      parser: lang.parser,
      plugins,
      tabWidth: options.tabWidth ?? 2,
      useTabs: options.useTabs ?? false,
      printWidth: options.printWidth ?? 80,
      semi: options.semi ?? true,
      singleQuote: options.singleQuote ?? false,
      trailingComma: options.trailingComma ?? "all",
      bracketSpacing: options.bracketSpacing ?? true,
      arrowParens: options.arrowParens ?? "always",
      endOfLine: options.endOfLine ?? "lf",
    };

    const output = await prettier.format(code, opts);
    return { ok: true, output };
  } catch (e) {
    // Prettier surfaces parse errors as plain Error; the message usually
    // includes a position. Extract `(line:column)` if present so the UI
    // can highlight the offending row.
    const message = e instanceof Error ? e.message : String(e);
    const m = message.match(/\((\d+):(\d+)\)/);
    return {
      ok: false,
      error: message,
      line: m ? Number(m[1]) : undefined,
      column: m ? Number(m[2]) : undefined,
    };
  }
}

// ── Stats helper for the UI ────────────────────────────────────────────

export interface FormatStats {
  inputLines: number;
  outputLines: number;
  inputChars: number;
  outputChars: number;
  delta: number;
}

export function statsFor(input: string, output: string): FormatStats {
  const inputLines = input ? input.split(/\r\n|\r|\n/).length : 0;
  const outputLines = output ? output.split(/\r\n|\r|\n/).length : 0;
  return {
    inputLines,
    outputLines,
    inputChars: input.length,
    outputChars: output.length,
    delta: output.length - input.length,
  };
}
