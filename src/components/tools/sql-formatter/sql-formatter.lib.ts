/**
 * Pure SQL-formatting lib. Wraps the `sql-formatter` npm package with
 * lazy loading — the package is small (~50 KB compressed) but visitors
 * who never open this tool still pay nothing.
 *
 * Architecture matches AGENTS.md: no React, no DOM. Returns plain data
 * shapes the component layer can render. Errors come back as a discriminated
 * `{ ok: false, error, line?, column? }` rather than thrown — UI uses the
 * shape directly to render diagnostic banners.
 *
 * Dialect choices: every dialect the underlying package supports for which
 * we believe there's actual user demand on a public dev-tools site. PL/SQL
 * (Oracle), TransactSQL (SQL Server), and the warehouse trio (BigQuery,
 * Snowflake, Redshift) are the dialects where a "Standard SQL" formatter
 * commonly mangles syntax — exposing them lets users pick the right one.
 */

// Type-only imports — avoid pulling sql-formatter into the initial chunk.
import type { FormatOptionsWithLanguage } from "sql-formatter";
import type * as SqlFormatterModule from "sql-formatter";

type SqlFormatter = typeof SqlFormatterModule;

// ── Dialects ────────────────────────────────────────────────────────────

export type DialectId =
  | "sql"
  | "postgresql"
  | "mysql"
  | "mariadb"
  | "sqlite"
  | "transactsql"
  | "plsql"
  | "bigquery"
  | "snowflake"
  | "redshift";

export interface DialectDef {
  id: DialectId;
  /** Display label in the picker. */
  label: string;
  /** Hint shown in the picker — what's distinctive. */
  hint: string;
  /** File extension for download. */
  extension: string;
}

export const DIALECTS: ReadonlyArray<DialectDef> = [
  { id: "sql", label: "Standard SQL", hint: "ANSI / generic", extension: "sql" },
  { id: "postgresql", label: "PostgreSQL", hint: "Postgres 9+", extension: "sql" },
  { id: "mysql", label: "MySQL", hint: "MySQL 5.7+ / 8", extension: "sql" },
  { id: "mariadb", label: "MariaDB", hint: "MariaDB 10+", extension: "sql" },
  { id: "sqlite", label: "SQLite", hint: "SQLite 3", extension: "sql" },
  { id: "transactsql", label: "SQL Server", hint: "T-SQL", extension: "sql" },
  { id: "plsql", label: "Oracle", hint: "PL/SQL", extension: "sql" },
  { id: "bigquery", label: "BigQuery", hint: "Google Standard SQL", extension: "sql" },
  { id: "snowflake", label: "Snowflake", hint: "Snowflake SQL", extension: "sql" },
  { id: "redshift", label: "Redshift", hint: "Amazon Redshift", extension: "sql" },
];

export function getDialect(id: DialectId): DialectDef {
  const found = DIALECTS.find((d) => d.id === id);
  if (!found) throw new Error(`Unknown dialect: ${id}`);
  return found;
}

// ── Options ─────────────────────────────────────────────────────────────

/**
 * Subset of sql-formatter's `FormatOptions` exposed in our UI. Aliased
 * so we can adjust default values centrally and never leak third-party
 * types into the component layer.
 */
export interface SqlFormatOptions {
  /** 2 / 4 / 8. */
  tabWidth?: number;
  useTabs?: boolean;
  keywordCase?: "preserve" | "upper" | "lower";
  identifierCase?: "preserve" | "upper" | "lower";
  functionCase?: "preserve" | "upper" | "lower";
  dataTypeCase?: "preserve" | "upper" | "lower";
  /** Inline expression width before wrap. */
  expressionWidth?: number;
  /** Empty lines between `;`-separated statements. */
  linesBetweenQueries?: number;
  /** Logical operator (AND / OR) placement. */
  logicalOperatorNewline?: "before" | "after";
  /** Comma style — `false` = trailing (default), `true` = leading. */
  leadingComma?: boolean;
  /** Newline before final semicolon — uncommon but useful for migrations. */
  newlineBeforeSemicolon?: boolean;
  /** `tabularLeft` / `tabularRight` align tokens in columns. */
  indentStyle?: "standard" | "tabularLeft" | "tabularRight";
}

export type FormatResult =
  | { ok: true; output: string }
  | { ok: false; error: string; line?: number; column?: number };

// ── Lazy load ───────────────────────────────────────────────────────────

let modulePromise: Promise<SqlFormatter> | null = null;

function getFormatter(): Promise<SqlFormatter> {
  if (!modulePromise) {
    modulePromise = import("sql-formatter");
  }
  return modulePromise;
}

// ── Format ──────────────────────────────────────────────────────────────

/**
 * Format a SQL string. Empty input returns ok+empty (Prettier-style); a
 * parse error is reported via the result shape — no exception.
 *
 * The underlying package's error has a `message` like
 * `"Parse error at line 3 column 7"` which we destructure for the UI.
 */
export async function format(
  sql: string,
  dialectId: DialectId,
  options: SqlFormatOptions = {},
): Promise<FormatResult> {
  if (sql === "" || sql.trim() === "") return { ok: true, output: "" };

  try {
    const lib = await getFormatter();

    const opts: FormatOptionsWithLanguage = {
      language: dialectId,
      tabWidth: options.tabWidth ?? 2,
      useTabs: options.useTabs ?? false,
      keywordCase: options.keywordCase ?? "preserve",
      identifierCase: options.identifierCase ?? "preserve",
      functionCase: options.functionCase ?? "preserve",
      dataTypeCase: options.dataTypeCase ?? "preserve",
      expressionWidth: options.expressionWidth ?? 50,
      linesBetweenQueries: options.linesBetweenQueries ?? 1,
      logicalOperatorNewline: options.logicalOperatorNewline ?? "before",
      indentStyle: options.indentStyle ?? "standard",
      newlineBeforeSemicolon: options.newlineBeforeSemicolon ?? false,
    };

    const output = lib.format(sql, opts);

    // Comma-style is applied post-format because sql-formatter's API
    // doesn't expose a leading-comma option directly. The transformation
    // is purely whitespace + comma reordering and only touches lines that
    // start with a comma after the standard format pass.
    return {
      ok: true,
      output: options.leadingComma ? toLeadingComma(output) : output,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // sql-formatter's parse errors look like:
    //   "Parse error at line 3 column 7"
    // Pull the numbers if present so the UI can highlight the offending row.
    const m = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
    return {
      ok: false,
      error: message,
      line: m ? Number(m[1]) : undefined,
      column: m ? Number(m[2]) : undefined,
    };
  }
}

/**
 * Convert trailing-comma SQL to leading-comma. Two-pass:
 *
 *   1. Annotate each line with paren depth at its start (so commas
 *      inside `VALUES (...)` tuples or `f(a, b)` calls stay put).
 *   2. For each non-empty line: drop its own trailing structural comma
 *      and, if the previous non-empty line had one, prepend `", "` at
 *      that line's indent.
 *
 * Both pieces fire independently — consecutive comma-ending lines all
 * have their trailing comma stripped AND get a leading comma prepended,
 * which is what makes `a, b, c, d` → `a / , b / , c / , d` come out
 * correctly.
 */
function toLeadingComma(input: string): string {
  const lines = input.split("\n");

  let depth = 0;
  const depthAtStart: number[] = [];
  for (const line of lines) {
    depthAtStart.push(depth);
    for (let i = 0; i < line.length; i++) {
      const c = line.charCodeAt(i);
      if (c === 40) depth++;
      else if (c === 41) depth--;
    }
  }

  const endsWithStructComma = lines.map(
    (line, i) => depthAtStart[i] === 0 && line.trimEnd().endsWith(","),
  );

  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") {
      out.push(line);
      continue;
    }

    // Previous *non-empty* line — that's whose trailing comma (if any)
    // becomes our leading comma.
    let prev = i - 1;
    while (prev >= 0 && lines[prev].trim() === "") prev--;
    const shouldPrepend = prev >= 0 && endsWithStructComma[prev];

    let processed = endsWithStructComma[i]
      ? line.trimEnd().slice(0, -1)
      : line;

    if (shouldPrepend) {
      const indentMatch = processed.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : "";
      const rest = processed.slice(indent.length);
      processed = `${indent}, ${rest}`;
    }
    out.push(processed);
  }
  return out.join("\n");
}

// ── Minify ──────────────────────────────────────────────────────────────

/**
 * Strip comments + collapse whitespace into a single-line query. Useful
 * for embedding SQL into JSON config or code strings.
 *
 * State machine so we don't mangle quoted strings that happen to contain
 * `--` or `/*`, and so `'a' || 'b'` (with whitespace in operators) stays
 * valid. Handles:
 *
 *   - Line comments: `-- …\n` and `# …\n` (MySQL)
 *   - Block comments: `/​* … *​/`
 *   - Single-quoted strings: `''` escape and `\'` escape
 *   - Dollar-quoted strings: `$$ … $$` and `$tag$ … $tag$` (Postgres)
 *   - Quoted identifiers: `"…"`, `\`…\``, `[…]` (preserved verbatim)
 *
 * No attempt to tighten `a , b , c` to `a,b,c` — single-space is safer
 * across edge cases (e.g. positional numeric `0.5` followed by `e10`).
 */
export function minify(sql: string): string {
  if (!sql || !sql.trim()) return "";
  const len = sql.length;
  const out: string[] = [];
  let i = 0;
  let pendingWs = false;

  const emitChar = (s: string) => {
    // Emit the queued space only when there's prior content to separate
    // from. Always clear `pendingWs` afterwards — leaving it true would
    // sticky-on and push a stray space between every following char (the
    // bug that made `SELECT` come out as `S ELECT` after a leading
    // comment).
    if (pendingWs && out.length > 0) {
      out.push(" ");
    }
    pendingWs = false;
    out.push(s);
  };

  while (i < len) {
    const c = sql.charCodeAt(i);

    if (c === 32 || c === 9 || c === 10 || c === 13) {
      pendingWs = true;
      i++;
      continue;
    }

    // Line comments — `--` to EOL.
    if (c === 45 && sql.charCodeAt(i + 1) === 45) {
      while (i < len && sql.charCodeAt(i) !== 10) i++;
      pendingWs = true;
      continue;
    }
    // Hash comment (MySQL).
    if (c === 35) {
      while (i < len && sql.charCodeAt(i) !== 10) i++;
      pendingWs = true;
      continue;
    }
    // Block comment `/​* … *​/`.
    if (c === 47 && sql.charCodeAt(i + 1) === 42) {
      i += 2;
      while (i + 1 < len) {
        if (sql.charCodeAt(i) === 42 && sql.charCodeAt(i + 1) === 47) {
          i += 2;
          break;
        }
        i++;
      }
      if (i + 1 >= len && (sql.charCodeAt(len - 2) !== 42 || sql.charCodeAt(len - 1) !== 47)) {
        i = len; // unterminated — bail
      }
      pendingWs = true;
      continue;
    }

    // Single-quoted string — emit verbatim (including escapes).
    if (c === 39) {
      const start = i;
      i++;
      while (i < len) {
        const cc = sql.charCodeAt(i);
        if (cc === 39 && sql.charCodeAt(i + 1) === 39) { i += 2; continue; }
        if (cc === 92 && i + 1 < len) { i += 2; continue; }
        if (cc === 39) { i++; break; }
        i++;
      }
      emitChar(sql.slice(start, i));
      continue;
    }

    // Dollar-quoted string — `$$...$$` or `$tag$...$tag$`.
    if (c === 36) {
      let j = i + 1;
      while (j < len) {
        const cc = sql.charCodeAt(j);
        if (
          (cc >= 97 && cc <= 122) ||
          (cc >= 65 && cc <= 90) ||
          (cc >= 48 && cc <= 57) ||
          cc === 95
        ) {
          j++;
        } else break;
      }
      if (sql.charCodeAt(j) === 36) {
        const tag = sql.slice(i, j + 1);
        const start = i;
        i = j + 1;
        const close = sql.indexOf(tag, i);
        if (close >= 0) {
          i = close + tag.length;
        } else {
          i = len;
        }
        emitChar(sql.slice(start, i));
        continue;
      }
      // Bare `$` — fall through.
    }

    // Quoted identifier — preserved verbatim.
    if (c === 96 || c === 34 || c === 91) {
      const close = c === 91 ? 93 : c;
      const start = i;
      i++;
      while (i < len && sql.charCodeAt(i) !== close) i++;
      if (i < len) i++;
      emitChar(sql.slice(start, i));
      continue;
    }

    // Default — emit the byte.
    emitChar(sql[i]);
    i++;
  }

  return out.join("").trim();
}

// ── Copy-as: host-language string literals ─────────────────────────────

/** Host-language wrappers we offer in the Copy-as menu. */
export type CopyAsFormat =
  | "js-template"
  | "js-string-array"
  | "python-triple"
  | "java-text-block"
  | "go-raw-string"
  | "curl-psql";

export interface CopyAsOption {
  id: CopyAsFormat;
  /** Display label in the menu. */
  label: string;
  /** Short hint shown beside the label. */
  hint: string;
}

export const COPY_AS_OPTIONS: ReadonlyArray<CopyAsOption> = [
  { id: "js-template", label: "JS template literal", hint: "`…`" },
  { id: "js-string-array", label: "JS string array", hint: "[ … ].join('\\n')" },
  { id: "python-triple", label: "Python triple-quoted", hint: '"""…"""' },
  { id: "java-text-block", label: "Java text block", hint: '""" … """' },
  { id: "go-raw-string", label: "Go raw string", hint: "`…` or escape" },
  { id: "curl-psql", label: "cURL (psql -c)", hint: "shell command" },
];

/** Convert formatted SQL into the chosen host-language string literal. */
export function copyAs(sql: string, format: CopyAsFormat): string {
  switch (format) {
    case "js-template": {
      // Backticks, ${…} interpolation, and backslashes need escaping.
      const safe = sql
        .replace(/\\/g, "\\\\")
        .replace(/`/g, "\\`")
        .replace(/\$\{/g, "\\${");
      return "`" + safe + "`";
    }
    case "js-string-array": {
      // One element per line, JSON-encoded for safety, then `.join("\n")`.
      const lines = sql
        .split("\n")
        .map((l) => "  " + JSON.stringify(l))
        .join(",\n");
      return `[\n${lines},\n].join("\\n")`;
    }
    case "python-triple": {
      // Triple double-quote. Escape any embedded `"""` runs.
      const safe = sql.replace(/"""/g, '\\"\\"\\"');
      return `"""${safe}"""`;
    }
    case "java-text-block": {
      // Java 15+ text block. Indent uniformly so the closing `"""`
      // controls the de-indent baseline.
      const indented = sql
        .split("\n")
        .map((l) => "    " + l)
        .join("\n");
      return `"""\n${indented}\n    """`;
    }
    case "go-raw-string": {
      // Go raw strings (backticks) cannot contain backticks. Fall back
      // to an interpreted string with explicit `\n` if the input does.
      if (sql.includes("`")) {
        return JSON.stringify(sql);
      }
      return "`" + sql + "`";
    }
    case "curl-psql": {
      // Shell single-line. Escape `"` and `$`; flatten newlines.
      const escaped = sql
        .replace(/"/g, '\\"')
        .replace(/\$/g, '\\$')
        .replace(/\s*\n\s*/g, " ");
      return `psql -h DB_HOST -U USER -d DB -c "${escaped}"`;
    }
  }
}

// ── Dialect auto-detection (heuristic) ──────────────────────────────────

/**
 * Light heuristic for picking a sensible default dialect from raw input.
 * Returns `null` if no dialect-distinguishing token is found.
 *
 * Cheap, regex-based, deliberately conservative — we'd rather return null
 * and let the user pick than confidently mis-detect.
 */
export function detectDialect(sql: string): DialectId | null {
  const s = sql.toLowerCase();
  if (/\b(top\s+\d|cross\s+apply|outer\s+apply|nvarchar|getdate\(\))/.test(s)) {
    return "transactsql";
  }
  if (/\b(returning|generate_series|to_jsonb|to_tsvector|interval\s+')/.test(s)) {
    return "postgresql";
  }
  if (/\b(connect\s+by|sys\.|dual|nvl\(|sysdate\b)/.test(s)) {
    return "plsql";
  }
  if (/`[a-z_][a-z0-9_]*`/.test(s) || /\bunsigned\b/.test(s)) {
    return "mysql";
  }
  if (/\b(autoincrement|pragma\s|sqlite_)/.test(s)) {
    return "sqlite";
  }
  if (/\b(struct<|array<|unnest\(|`[a-z_]+\.[a-z_]+`)/.test(s)) {
    return "bigquery";
  }
  if (/\b(merge\s+into|copy\s+into|warehouse|sysadmin)/.test(s)) {
    return "snowflake";
  }
  return null;
}

// ── Stats ───────────────────────────────────────────────────────────────

export interface SqlStats {
  inputLines: number;
  outputLines: number;
  inputChars: number;
  outputChars: number;
  statementCount: number;
}

export function statsFor(input: string, output: string): SqlStats {
  const inputLines = input ? input.split(/\r\n|\r|\n/).length : 0;
  const outputLines = output ? output.split(/\r\n|\r|\n/).length : 0;
  // Statement count = count of top-level semicolons in the OUTPUT. We use
  // output because input semicolons could be split across many lines /
  // hidden by extra whitespace; the formatter normalises.
  let depth = 0;
  let count = 0;
  let sawNonWsSinceLastSemi = false;
  for (let i = 0; i < output.length; i++) {
    const c = output.charCodeAt(i);
    if (c === 40) depth++;
    else if (c === 41) depth--;
    else if (c === 59 && depth === 0) {
      if (sawNonWsSinceLastSemi) count++;
      sawNonWsSinceLastSemi = false;
    } else if (c !== 32 && c !== 9 && c !== 10 && c !== 13) {
      sawNonWsSinceLastSemi = true;
    }
  }
  if (sawNonWsSinceLastSemi) count++;
  return {
    inputLines,
    outputLines,
    inputChars: input.length,
    outputChars: output.length,
    statementCount: count,
  };
}
