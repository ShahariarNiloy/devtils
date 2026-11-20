/**
 * Reverse-direction parsers for the converter tools (YAML → JSON, CSV →
 * JSON). YAML delegates to js-yaml (already a dependency); CSV uses a
 * hand-rolled RFC 4180 reader. Each returns the parsed value or throws an
 * Error whose message names the line and column — the shell shows it
 * verbatim and `useConverter` reads the position back out of it.
 */

import { CORE_SCHEMA, load, loadAll, YAMLException } from "js-yaml";
import type { CsvOptions } from "@/components/tools/json-formatter/json-convert";

/** Rethrow js-yaml errors as `reason (line L, column C)` — 1-based. */
function yamlError(err: unknown): Error {
  if (err instanceof YAMLException) {
    const reason = err.reason || "Invalid YAML";
    const mark = err.mark;
    return mark
      ? new Error(`${reason} (line ${mark.line + 1}, column ${mark.column + 1})`)
      : new Error(reason);
  }
  return err instanceof Error ? err : new Error(String(err));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Apply YAML merge keys (`<<: *base` or `<<: [*a, *b]`): merged maps fill
 * in keys the parent doesn't set. CORE_SCHEMA leaves `<<` as a plain key,
 * so this restores the behaviour configs rely on.
 */
function applyMergeKeys(v: unknown, done = new Map<object, unknown>()): unknown {
  if (v === null || typeof v !== "object") return v;
  // Aliases share one object: process it once and reuse the result.
  const cached = done.get(v);
  if (cached !== undefined) return cached;
  if (Array.isArray(v)) {
    const arr: unknown[] = [];
    done.set(v, arr);
    for (const x of v) arr.push(applyMergeKeys(x, done));
    return arr;
  }
  const src = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  done.set(v, out);
  const merge = src["<<"];
  const sources = Array.isArray(merge) ? merge : [merge];
  const isMerge = "<<" in src && sources.every(isRecord);
  for (const [k, val] of Object.entries(src)) {
    if (k === "<<" && isMerge) continue;
    out[k] = applyMergeKeys(val, done);
  }
  if (isMerge) {
    // Explicit keys win; earlier merge sources win over later ones.
    for (const m of sources) {
      const merged = applyMergeKeys(m, done);
      if (!isRecord(merged)) continue;
      for (const [k, val] of Object.entries(merged)) {
        if (!(k in out)) out[k] = val;
      }
    }
  }
  return out;
}

/**
 * JSON-safe YAML load: CORE_SCHEMA keeps dates as the strings you wrote
 * (the default schema turns `2026-03-02` into a Date, which JSON then
 * rewrites as a timestamp) and never yields binary/set types.
 */
function loadJsonSafe(text: string): unknown {
  const value = load(text, { schema: CORE_SCHEMA });
  return value === undefined ? null : applyMergeKeys(value);
}

/** Parse a single YAML document. Empty input becomes `null`. */
export function parseYaml(text: string): unknown {
  try {
    return loadJsonSafe(text);
  } catch (err) {
    throw yamlError(err);
  }
}

/**
 * Parse a YAML stream. One document returns its value; several documents
 * (separated by `---`) return an array, one item per document.
 */
export function parseYamlStream(text: string): unknown {
  try {
    const docs = loadAll(text, undefined, { schema: CORE_SCHEMA }).map((d) =>
      d === undefined ? null : applyMergeKeys(d),
    );
    if (docs.length === 0) return null;
    return docs.length === 1 ? docs[0] : docs;
  } catch (err) {
    throw yamlError(err);
  }
}

/**
 * RFC 4180-ish CSV row reader. Handles quoted fields, escaped quotes ("")
 * and embedded delimiters/newlines; strips a UTF-8 BOM and skips blank
 * lines. Throws when a quoted field is never closed.
 */
export function parseCsvRows(text: string, delimiter = ","): string[][] {
  const delim = delimiter.charAt(0) || ",";
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let quoteLine = 0;
  let line = 1;
  let i = 0;
  const len = src.length;

  const endRow = () => {
    row.push(field);
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
    field = "";
  };

  while (i < len) {
    const ch = src[i];

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      if (ch === "\n") line++;
      field += ch;
      i++;
      continue;
    }

    if (ch === '"' && field.length === 0) {
      inQuotes = true;
      quoteLine = line;
      i++;
      continue;
    }
    if (ch === delim) {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      endRow();
      line++;
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  if (inQuotes) {
    throw new Error(`Quoted field is never closed (line ${quoteLine}, column 1)`);
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

/**
 * CSV → records. With a header row, each row becomes an object keyed by the
 * header; without one, rows come back as arrays of strings. Values stay
 * strings — the dedicated CSV → JSON tool does type inference.
 */
export function parseCsv(
  text: string,
  opts: Pick<CsvOptions, "delimiter" | "includeHeader"> = {},
): unknown {
  const rows = parseCsvRows(text, opts.delimiter ?? ",");
  const hasHeader = opts.includeHeader ?? true;
  if (rows.length === 0) return [];
  if (!hasHeader) return rows;

  const headers = rows[0];
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    // Null prototype so a "__proto__" header is stored as a plain key.
    const obj = Object.create(null) as Record<string, string>;
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = cells[c] ?? "";
    }
    out.push(obj);
  }
  return out;
}
