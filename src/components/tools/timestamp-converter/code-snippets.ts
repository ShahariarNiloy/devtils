/**
 * Idiomatic "Unix ↔ date" code snippets per language. Pure — the current
 * input timestamp is substituted into runnable examples using only each
 * language's standard library.
 */

import type { Temporal } from "@js-temporal/polyfill";

function unixSeconds(instant: Temporal.Instant): string {
  return (instant.epochNanoseconds / BigInt(1_000_000_000)).toString();
}

type Gen = (s: string, iso: string) => string;

const GENERATORS: Record<string, Gen> = {
  javascript: (s, iso) =>
    `// Unix timestamp -> Date\n` +
    `const dt = new Date(${s} * 1000);\n` +
    `console.log(dt.toISOString()); // ${iso}\n\n` +
    `// Date -> Unix\n` +
    `const ts = Math.floor(dt.getTime() / 1000);`,

  typescript: (s, iso) =>
    `// Unix timestamp -> Date\n` +
    `const dt: Date = new Date(${s} * 1000);\n` +
    `console.log(dt.toISOString()); // ${iso}\n\n` +
    `// Date -> Unix\n` +
    `const ts: number = Math.floor(dt.getTime() / 1000);`,

  python: (s) =>
    `from datetime import datetime, timezone\n\n` +
    `# Unix timestamp -> datetime\n` +
    `dt = datetime.fromtimestamp(${s}, tz=timezone.utc)\n\n` +
    `# datetime -> Unix\n` +
    `ts = int(dt.timestamp())`,

  go: () =>
    `package main\n\n` +
    `import (\n\t"fmt"\n\t"time"\n)\n\n` +
    `func main() {\n` +
    `\tt := time.Unix(SECONDS, 0).UTC()\n` +
    `\tfmt.Println(t.Format(time.RFC3339))\n` +
    `\tts := t.Unix()\n` +
    `\t_ = ts\n` +
    `}`,

  rust: () =>
    `use chrono::{DateTime, Utc, TimeZone};\n\n` +
    `fn main() {\n` +
    `    let dt: DateTime<Utc> = Utc.timestamp_opt(SECONDS, 0).unwrap();\n` +
    `    let ts = dt.timestamp();\n` +
    `    println!("{} {}", dt, ts);\n` +
    `}`,

  java: () =>
    `import java.time.Instant;\n` +
    `import java.time.ZonedDateTime;\n` +
    `import java.time.ZoneOffset;\n\n` +
    `Instant instant = Instant.ofEpochSecond(SECONDSL);\n` +
    `ZonedDateTime zdt = instant.atZone(ZoneOffset.UTC);\n` +
    `long ts = instant.getEpochSecond();`,

  php: () =>
    `$dt = (new DateTime())->setTimestamp(SECONDS);\n` +
    `echo $dt->format(DATE_ATOM);\n` +
    `$ts = $dt->getTimestamp();`,

  ruby: (s, iso) =>
    `require 'time'\n\n` +
    `dt = Time.at(${s}).utc\n` +
    `ts = dt.to_i\n` +
    `puts dt.iso8601 # ${iso}`,

  sql: (s, iso) =>
    `-- Unix -> timestamp\n` +
    `SELECT to_timestamp(${s});\n\n` +
    `-- timestamp -> Unix\n` +
    `SELECT EXTRACT(EPOCH FROM TIMESTAMPTZ '${iso}')::bigint;`,

  shell: (s, iso) =>
    `# Unix -> date\n` +
    `date -u -d @${s} +"%Y-%m-%dT%H:%M:%SZ"\n\n` +
    `# date -> Unix\n` +
    `date -u -d "${iso}" +%s`,
};

/**
 * Generate a runnable snippet for a language with the instant substituted.
 *
 * @param language - One of SUPPORTED_LANGUAGES ids.
 * @param instant - The moment to embed.
 * @param primaryTz - Reserved for future zone-aware snippets.
 * @returns The snippet source (plain text, no markup).
 * @example generateSnippet("python", instant, "UTC")
 */
export function generateSnippet(
  language: string,
  instant: Temporal.Instant,
  primaryTz: string,
): string {
  void primaryTz;
  const s = unixSeconds(instant);
  const iso = instant.toString();
  const gen = GENERATORS[language] ?? GENERATORS.javascript;
  return gen(s, iso)
    .replace(/SECONDSL/g, `${s}L`)
    .replace(/SECONDS/g, s);
}

// ── Lightweight syntax highlighting ───────────────────────────────────────────

export type TokenType =
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "plain";

export interface SnippetToken {
  text: string;
  type: TokenType;
}

const HASH_COMMENT = new Set(["python", "ruby", "shell"]);
const DASH_COMMENT = new Set(["sql"]);

const KEYWORDS = new Set([
  "const", "let", "var", "function", "fn", "func", "use", "import", "from",
  "require", "package", "public", "class", "def", "return", "int", "long",
  "echo", "puts", "print", "println", "main", "new", "SELECT", "EXTRACT",
  "FROM", "TIMESTAMPTZ", "unwrap", "true", "false", "void",
]);

/**
 * Tokenize a snippet for display highlighting. Single generic tokenizer
 * (comments / strings / numbers / shared keywords) — no shiki/prism. Pure;
 * the raw string is what gets copied, never this token output.
 *
 * @param code - The snippet source.
 * @param language - Language id (selects the line-comment style).
 * @returns Ordered tokens covering the whole input.
 * @example tokenizeSnippet("# hi", "python")[0].type // "comment"
 */
export function tokenizeSnippet(
  code: string,
  language: string,
): SnippetToken[] {
  let lineComment = "//";
  if (HASH_COMMENT.has(language)) lineComment = "#";
  else if (DASH_COMMENT.has(language)) lineComment = "--";
  const out: SnippetToken[] = [];
  let i = 0;
  let buf = "";
  const flush = () => {
    if (buf) {
      out.push({ text: buf, type: "plain" });
      buf = "";
    }
  };

  while (i < code.length) {
    const rest = code.slice(i);

    if (rest.startsWith("/*")) {
      const end = code.indexOf("*/", i + 2);
      const stop = end === -1 ? code.length : end + 2;
      flush();
      out.push({ text: code.slice(i, stop), type: "comment" });
      i = stop;
      continue;
    }
    if (rest.startsWith(lineComment)) {
      const nl = code.indexOf("\n", i);
      const stop = nl === -1 ? code.length : nl;
      flush();
      out.push({ text: code.slice(i, stop), type: "comment" });
      i = stop;
      continue;
    }
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < code.length && code[j] !== ch) {
        if (code[j] === "\\") j++;
        j++;
      }
      flush();
      out.push({ text: code.slice(i, Math.min(j + 1, code.length)), type: "string" });
      i = j + 1;
      continue;
    }
    if (/\d/.test(ch) && !/[A-Za-z_]/.test(code[i - 1] ?? "")) {
      let j = i;
      while (j < code.length && /[\d._]/.test(code[j])) j++;
      flush();
      out.push({ text: code.slice(i, j), type: "number" });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < code.length && /[A-Za-z0-9_]/.test(code[j])) j++;
      const word = code.slice(i, j);
      flush();
      out.push({
        text: word,
        type: KEYWORDS.has(word) ? "keyword" : "plain",
      });
      i = j;
      continue;
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}
