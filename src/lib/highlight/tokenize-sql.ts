import type { Token } from "./types";

/**
 * SQL tokenizer. Covers the syntax we expect to see across the dialects
 * the sql-formatter tool supports (ANSI, PostgreSQL, MySQL, SQLite,
 * SQL Server, Oracle, BigQuery, Snowflake, Redshift).
 *
 * Shapes coloured:
 *   - Keywords (SELECT, FROM, WHERE, JOIN, …)         → kw
 *   - Reserved data types (INT, VARCHAR, JSONB, …)    → type
 *   - Function calls (ident followed by `(`)          → ident (default text)
 *   - Identifiers (table/column names)                → ident
 *   - Backtick / double-quote / bracket identifiers   → ident
 *   - String literals (single / dollar-quoted)        → string
 *   - Numbers (int, float, exp notation)              → number
 *   - Booleans (TRUE / FALSE), NULL                   → bool / null
 *   - Comments (-- to EOL, /* … *​/)                  → comment
 *   - Punctuation / operators                         → punct / op
 *
 * Matching is case-insensitive for keywords + types — SQL is famously
 * case-blind. Identifier wrapping (`"foo"`, `\`foo\``, `[foo]`) is
 * coloured as a plain identifier, NOT as a string, so a column reference
 * doesn't look the same as a string literal.
 */

const KEYWORDS = new Set([
  // Query shape
  "select", "from", "where", "group", "by", "having", "order", "limit",
  "offset", "fetch", "first", "next", "rows", "only", "with", "recursive",
  "union", "intersect", "except", "all", "distinct", "as",

  // Joins
  "join", "inner", "outer", "left", "right", "full", "cross", "lateral",
  "natural", "on", "using", "apply",

  // DML
  "insert", "into", "values", "update", "set", "delete", "merge", "upsert",
  "returning", "default", "row", "values",

  // DDL
  "create", "alter", "drop", "truncate", "table", "view", "index", "schema",
  "database", "trigger", "function", "procedure", "sequence", "if", "exists",
  "not", "replace", "temporary", "temp", "unique", "primary", "key",
  "foreign", "references", "constraint", "check", "column", "add", "rename",
  "to", "cascade", "restrict",

  // Control + expressions
  "case", "when", "then", "else", "end", "and", "or", "in", "between",
  "like", "ilike", "is", "any", "some", "exists", "regexp", "rlike",

  // Window functions
  "over", "partition", "window", "rows", "range", "preceding", "following",
  "current", "unbounded",

  // Transactions
  "begin", "commit", "rollback", "transaction", "savepoint", "release",

  // Misc / dialect-specific common
  "explain", "analyze", "vacuum", "show", "use", "describe", "desc", "asc",
  "grant", "revoke", "lock", "unlock", "for", "share", "no",
  "true", "false", "null",
]);

const DATA_TYPES = new Set([
  // Numerics
  "int", "integer", "bigint", "smallint", "tinyint", "mediumint",
  "decimal", "numeric", "real", "double", "float", "money", "serial",
  "bigserial", "smallserial",
  // Strings
  "char", "varchar", "nchar", "nvarchar", "text", "mediumtext", "longtext",
  "tinytext", "string", "clob",
  // Dates / times
  "date", "time", "datetime", "timestamp", "timestamptz", "interval", "year",
  // Binary
  "binary", "varbinary", "blob", "bytea", "image",
  // Boolean
  "bool", "boolean", "bit",
  // JSON / structured
  "json", "jsonb", "xml", "uuid", "array", "struct",
]);

function isWs(c: number): boolean {
  return c === 32 || c === 9;
}

function isIdentStart(c: number): boolean {
  return (
    (c >= 97 && c <= 122) ||
    (c >= 65 && c <= 90) ||
    c === 95
  );
}

function isIdent(c: number): boolean {
  return (
    (c >= 97 && c <= 122) ||
    (c >= 65 && c <= 90) ||
    (c >= 48 && c <= 57) ||
    c === 95
  );
}

export function tokenizeSql(source: string): Token[] {
  const tokens: Token[] = [];
  const len = source.length;
  let i = 0;

  while (i < len) {
    const c = source.charCodeAt(i);

    // Newline + whitespace.
    if (c === 10 || c === 13) {
      tokens.push({ type: "ws", value: source[i] });
      i++;
      continue;
    }
    if (isWs(c)) {
      const start = i;
      while (i < len && isWs(source.charCodeAt(i))) i++;
      tokens.push({ type: "ws", value: source.slice(start, i) });
      continue;
    }

    // Line comment `-- …` to EOL.
    if (c === 45 && source.charCodeAt(i + 1) === 45) {
      const start = i;
      while (i < len && source.charCodeAt(i) !== 10) i++;
      tokens.push({ type: "comment", value: source.slice(start, i) });
      continue;
    }

    // Hash comment `# …` — MySQL flavour.
    if (c === 35 && (i === 0 || source.charCodeAt(i - 1) === 10)) {
      const start = i;
      while (i < len && source.charCodeAt(i) !== 10) i++;
      tokens.push({ type: "comment", value: source.slice(start, i) });
      continue;
    }

    // Block comment `/* … */`.
    if (c === 47 && source.charCodeAt(i + 1) === 42) {
      const start = i;
      i += 2;
      while (i + 1 < len) {
        if (source.charCodeAt(i) === 42 && source.charCodeAt(i + 1) === 47) {
          i += 2;
          break;
        }
        i++;
      }
      tokens.push({ type: "comment", value: source.slice(start, i) });
      continue;
    }

    // Single-quoted string with `''` escape (SQL standard) + backslash
    // (MySQL convention). Both forms accepted — the tokenizer is lenient.
    if (c === 39 /* ' */) {
      const start = i;
      i++;
      while (i < len) {
        const cc = source.charCodeAt(i);
        if (cc === 39 && source.charCodeAt(i + 1) === 39) { i += 2; continue; }
        if (cc === 92 && i + 1 < len) { i += 2; continue; }
        if (cc === 39) { i++; break; }
        if (cc === 10 && source.charCodeAt(i - 1) !== 92) {
          // Unterminated string — bail at newline so we don't eat the rest of the file.
          break;
        }
        i++;
      }
      tokens.push({ type: "string", value: source.slice(start, i) });
      continue;
    }

    // PostgreSQL dollar-quoted string: $$ ... $$ or $tag$ ... $tag$
    if (c === 36 /* $ */) {
      const tagStart = i + 1;
      let j = tagStart;
      while (j < len && (isIdent(source.charCodeAt(j)) || source.charCodeAt(j) === 36)) {
        if (source.charCodeAt(j) === 36) break;
        j++;
      }
      if (source.charCodeAt(j) === 36) {
        const tag = source.slice(i, j + 1); // includes both $s
        const start = i;
        i = j + 1;
        const closeIdx = source.indexOf(tag, i);
        if (closeIdx >= 0) {
          i = closeIdx + tag.length;
        } else {
          i = len;
        }
        tokens.push({ type: "string", value: source.slice(start, i) });
        continue;
      }
      // Not a dollar-quote start — fall through to single-char punct.
    }

    // Backtick / double-quote / bracket identifier. Coloured as ident,
    // not string, so a `"col"` reference doesn't visually clash with a
    // `'literal'`.
    if (c === 96 /* ` */ || c === 34 /* " */) {
      const q = c;
      const start = i;
      i++;
      while (i < len && source.charCodeAt(i) !== q) i++;
      if (i < len) i++;
      tokens.push({ type: "ident", value: source.slice(start, i) });
      continue;
    }
    if (c === 91 /* [ */) {
      // SQL Server bracketed identifier — `[Order Details]`. Greedy to
      // the matching `]`, no escape recognised.
      const start = i;
      i++;
      while (i < len && source.charCodeAt(i) !== 93) i++;
      if (i < len) i++;
      tokens.push({ type: "ident", value: source.slice(start, i) });
      continue;
    }

    // Numbers — int, decimal, exponent.
    if (
      (c >= 48 && c <= 57) ||
      (c === 46 && source.charCodeAt(i + 1) >= 48 && source.charCodeAt(i + 1) <= 57)
    ) {
      const start = i;
      while (i < len) {
        const cc = source.charCodeAt(i);
        if ((cc >= 48 && cc <= 57) || cc === 46) i++;
        else break;
      }
      if (source.charCodeAt(i) === 101 || source.charCodeAt(i) === 69) {
        i++;
        if (source.charCodeAt(i) === 43 || source.charCodeAt(i) === 45) i++;
        while (i < len) {
          const cc = source.charCodeAt(i);
          if (cc >= 48 && cc <= 57) i++;
          else break;
        }
      }
      tokens.push({ type: "number", value: source.slice(start, i) });
      continue;
    }

    // Identifier / keyword / type.
    if (isIdentStart(c)) {
      const start = i;
      while (i < len && isIdent(source.charCodeAt(i))) i++;
      const word = source.slice(start, i);
      const lower = word.toLowerCase();

      if (lower === "true" || lower === "false") {
        tokens.push({ type: "bool", value: word });
      } else if (lower === "null") {
        tokens.push({ type: "null", value: word });
      } else if (KEYWORDS.has(lower)) {
        tokens.push({ type: "kw", value: word });
      } else if (DATA_TYPES.has(lower)) {
        tokens.push({ type: "type", value: word });
      } else {
        tokens.push({ type: "ident", value: word });
      }
      continue;
    }

    // Multi-char comparison operators: <= >= == != <>
    if (c === 60 || c === 62 || c === 33 || c === 61) {
      const start = i;
      i++;
      if (
        source.charCodeAt(i) === 61 ||
        (c === 60 && source.charCodeAt(i) === 62)
      ) {
        i++;
      }
      tokens.push({ type: "op", value: source.slice(start, i) });
      continue;
    }
    // Pipe — `||` is SQL string-concat, `|` is bitwise.
    if (c === 124) {
      const start = i;
      i++;
      if (source.charCodeAt(i) === 124) i++;
      tokens.push({ type: "op", value: source.slice(start, i) });
      continue;
    }

    // Punctuation
    if (c === 40 || c === 41 || c === 44 || c === 59 || c === 46) {
      tokens.push({ type: "punct", value: source[i] });
      i++;
      continue;
    }
    // Other operators
    if (c === 43 || c === 45 || c === 42 || c === 47 || c === 37 || c === 94) {
      tokens.push({ type: "op", value: source[i] });
      i++;
      continue;
    }

    // Default fallback so we never loop forever.
    tokens.push({ type: "ident", value: source[i] });
    i++;
  }

  return tokens;
}
