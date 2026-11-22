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
      output: options.leadingComma ? toLeadingComma(output, dialectId) : output,
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
 *   1. Lex the output once (`classifySql`) and, per line, find the last
 *      *code* character (ignoring trailing whitespace and comments). It's a
 *      structural comma when it is `,` at paren depth 0 — depth measured at
 *      the comma itself, so `) AS m,` closing a multi-line subquery counts,
 *      while commas inside `VALUES (...)` tuples, `f(a, b)` calls, string
 *      literals and quoted identifiers stay put.
 *   2. For each non-empty line: drop its own structural comma and, if the
 *      previous non-empty line had one, prepend `", "` at that line's
 *      indent.
 *
 * Both pieces fire independently — consecutive comma-ending lines all
 * have their trailing comma stripped AND get a leading comma prepended,
 * which is what makes `a, b, c, d` → `a / , b / , c / , d` come out
 * correctly.
 */
function toLeadingComma(input: string, dialect: DialectId): string {
  const kinds = classifySql(input, dialect);
  const lines = input.split("\n");

  // Absolute offset of each structural trailing comma within its line, or -1.
  const commaAt: number[] = [];
  // Lines with no code/quoted text (blank or comment-only) are skipped when
  // looking for the previous line, so `a,` / `-- note` / `b` still works.
  const hasText: boolean[] = [];
  let depth = 0;
  let offset = 0;
  for (const line of lines) {
    let lastCode = -1;
    let lastCodeDepth = 0;
    let lastCodeSeen = false;
    for (let i = 0; i < line.length; i++) {
      if (kinds[offset + i] === SqlCharKind.Comment) continue;
      const c = line.charCodeAt(i);
      if (kinds[offset + i] === SqlCharKind.Code) {
        if (c === 40) depth++;
        else if (c === 41) depth = Math.max(0, depth - 1);
      }
      if (c !== 32 && c !== 9 && c !== 13) {
        lastCodeSeen = true;
        lastCode = kinds[offset + i] === SqlCharKind.Code ? i : -1;
        lastCodeDepth = depth;
      }
    }
    hasText.push(lastCodeSeen);
    commaAt.push(lastCode >= 0 && line.charCodeAt(lastCode) === 44 && lastCodeDepth === 0 ? lastCode : -1);
    offset += line.length + 1;
  }

  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!hasText[i]) {
      out.push(line);
      continue;
    }

    // Previous line with content — that's whose trailing comma (if any)
    // becomes our leading comma.
    let prev = i - 1;
    while (prev >= 0 && !hasText[prev]) prev--;
    const shouldPrepend = prev >= 0 && commaAt[prev] >= 0;

    let processed = line;
    if (commaAt[i] >= 0) {
      // Remove the comma (and whitespace before it), keeping anything after
      // it — e.g. a trailing `-- comment`.
      const before = line.slice(0, commaAt[i]).trimEnd();
      const after = line.slice(commaAt[i] + 1);
      processed = (before + (after.trim() ? after : "")).trimEnd();
    }

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
/** Dialects where `#` starts a line comment (elsewhere it's an operator or a temp-table prefix). */
const HASH_COMMENT_DIALECTS: ReadonlySet<DialectId> = new Set<DialectId>(["mysql", "mariadb", "bigquery"]);
/** Dialects where a backslash escapes the next character inside '…' strings. */
const BACKSLASH_ESCAPE_DIALECTS: ReadonlySet<DialectId> = new Set<DialectId>(["mysql", "mariadb", "bigquery"]);

export function minify(sql: string, dialect: DialectId = "sql"): string {
  const hashComments = HASH_COMMENT_DIALECTS.has(dialect);
  const backslashEscapes = BACKSLASH_ESCAPE_DIALECTS.has(dialect);
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
    // Hash comment — MySQL / MariaDB / BigQuery only. In Postgres `#>>` is
    // an operator and in T-SQL `#temp` is a table name.
    if (c === 35 && hashComments) {
      while (i < len && sql.charCodeAt(i) !== 10) i++;
      pendingWs = true;
      continue;
    }
    // Block comment `/​* … *​/`.
    if (c === 47 && sql.charCodeAt(i + 1) === 42) {
      const close = sql.indexOf("*/", i + 2);
      i = close === -1 ? len : close + 2; // unterminated → swallow the rest
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
        if (backslashEscapes && cc === 92 && i + 1 < len) { i += 2; continue; }
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

// ── Lexical scan (strings / comments) ───────────────────────────────────

/** What a character of SQL source belongs to. */
export const SqlCharKind = {
  Code: 0,
  /** String literal or quoted identifier — opaque text. */
  Quoted: 1,
  Comment: 2,
} as const;
export type SqlCharKind = (typeof SqlCharKind)[keyof typeof SqlCharKind];

/**
 * Classify every UTF-16 unit of `sql` as code, quoted text or comment, using
 * the same lexical rules as `minify` (dialect-aware `#` comments and `\'`
 * escapes, Postgres dollar quotes, `"…"` / `` `…` `` / `[…]` identifiers).
 * Structural scans — statement counting, paren depth, comma placement — read
 * only `Code` positions, so `'a;b'` or `"a("` can't skew them.
 */
export function classifySql(sql: string, dialect: DialectId = "sql"): Uint8Array {
  const hashComments = HASH_COMMENT_DIALECTS.has(dialect);
  const backslashEscapes = BACKSLASH_ESCAPE_DIALECTS.has(dialect);
  const len = sql.length;
  const kinds = new Uint8Array(len); // zero-filled = Code
  const mark = (from: number, to: number, kind: SqlCharKind) => kinds.fill(kind, from, Math.min(to, len));
  let i = 0;
  while (i < len) {
    const c = sql.charCodeAt(i);
    const start = i;
    if ((c === 45 && sql.charCodeAt(i + 1) === 45) || (c === 35 && hashComments)) {
      while (i < len && sql.charCodeAt(i) !== 10) i++;
      mark(start, i, SqlCharKind.Comment);
      continue;
    }
    if (c === 47 && sql.charCodeAt(i + 1) === 42) {
      const close = sql.indexOf("*/", i + 2);
      i = close === -1 ? len : close + 2;
      mark(start, i, SqlCharKind.Comment);
      continue;
    }
    if (c === 39) {
      i++;
      while (i < len) {
        const cc = sql.charCodeAt(i);
        if (cc === 39 && sql.charCodeAt(i + 1) === 39) { i += 2; continue; }
        if (backslashEscapes && cc === 92 && i + 1 < len) { i += 2; continue; }
        i++;
        if (cc === 39) break;
      }
      mark(start, i, SqlCharKind.Quoted);
      continue;
    }
    if (c === 36) {
      let j = i + 1;
      while (j < len && /[A-Za-z0-9_]/.test(sql[j])) j++;
      if (sql.charCodeAt(j) === 36) {
        const tag = sql.slice(i, j + 1);
        const close = sql.indexOf(tag, j + 1);
        i = close >= 0 ? close + tag.length : len;
        mark(start, i, SqlCharKind.Quoted);
        continue;
      }
    }
    if (c === 96 || c === 34 || c === 91) {
      const close = c === 91 ? 93 : c;
      i++;
      while (i < len && sql.charCodeAt(i) !== close) i++;
      if (i < len) i++;
      mark(start, i, SqlCharKind.Quoted);
      continue;
    }
    i++;
  }
  return kinds;
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

/** POSIX shell single-quoting: nothing inside '…' is special, `'` → `'\\''`. */
export function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

/**
 * Convert formatted SQL into the chosen host-language string literal.
 * `dialect` matters for the shell snippet, which minifies (comment rules
 * are dialect-specific) before flattening to one line.
 */
export function copyAs(sql: string, format: CopyAsFormat, dialect: DialectId = "sql"): string {
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
      // Backslashes first (Python would read `\n` as a newline), then any
      // run of 3+ quotes, and quotes at the very end — `…"` + `"""` would
      // otherwise close the literal early.
      const safe = sql
        .replace(/\\/g, "\\\\")
        .replace(/"{3,}|"+$/g, (run) => run.replace(/"/g, '\\"'));
      return `"""${safe}"""`;
    }
    case "java-text-block": {
      // Java 15+ text block. Indent uniformly so the closing `"""`
      // controls the de-indent baseline.
      // Escape `\` (escape sequences are live in text blocks) and `"""`.
      const indented = sql
        .replace(/\\/g, "\\\\")
        .replace(/"""/g, '\\"""')
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
      // One shell line. Minify first: it drops `--` / `#` / `/* */`
      // comments (a joined `-- …` would comment out the rest of the query)
      // and collapses whitespace without touching string literals. Then
      // POSIX single-quote it — inside '…' nothing (`$`, backticks, `\`)
      // is interpreted, so the SQL can't trigger command substitution.
      return `psql -h DB_HOST -U USER -d DB -c ${shellQuote(minify(sql, dialect))}`;
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

export function statsFor(input: string, output: string, dialect: DialectId = "sql"): SqlStats {
  const inputLines = input ? input.split(/\r\n|\r|\n/).length : 0;
  const outputLines = output ? output.split(/\r\n|\r|\n/).length : 0;
  // Statement count = count of top-level semicolons in the OUTPUT. We use
  // output because input semicolons could be split across many lines /
  // hidden by extra whitespace; the formatter normalises. Only code
  // positions count — `;` / `(` inside strings, quoted identifiers and
  // comments are text, and a comment alone isn't a statement.
  const kinds = classifySql(output, dialect);
  let depth = 0;
  let count = 0;
  let sawCodeSinceLastSemi = false;
  for (let i = 0; i < output.length; i++) {
    const kind = kinds[i];
    if (kind === SqlCharKind.Comment) continue;
    const c = output.charCodeAt(i);
    if (kind === SqlCharKind.Code && c === 40) depth++;
    else if (kind === SqlCharKind.Code && c === 41) depth = Math.max(0, depth - 1);
    else if (kind === SqlCharKind.Code && c === 59 && depth === 0) {
      if (sawCodeSinceLastSemi) count++;
      sawCodeSinceLastSemi = false;
      continue;
    }
    if (c !== 32 && c !== 9 && c !== 10 && c !== 13) sawCodeSinceLastSemi = true;
  }
  if (sawCodeSinceLastSemi) count++;
  return {
    inputLines,
    outputLines,
    inputChars: input.length,
    outputChars: output.length,
    statementCount: count,
  };
}
