/**
 * Reverse-direction parsers for the bidirectional converter tools. YAML
 * delegates to js-yaml (already a dependency); CSV uses a hand-rolled
 * RFC 4180 parser. Each returns the parsed value or throws an Error with a
 * useful message — the calling hook's parse status pill shows the message
 * verbatim.
 */

import type { CsvOptions } from "@/components/tools/json-formatter/json-convert";

/* eslint-disable @typescript-eslint/no-require-imports */

export function parseYaml(text: string): unknown {
  const yaml = require("js-yaml") as { load: (s: string) => unknown };
  // js-yaml returns `undefined` for empty input; coerce to null so the
  // downstream emitter has a defined value to serialise.
  const value = yaml.load(text);
  return value === undefined ? null : value;
}

/**
 * RFC 4180-ish CSV reader. Handles quoted fields, escaped quotes, embedded
 * commas/newlines, and arbitrary delimiters. Doesn't try to be smart about
 * type inference — numbers stay as numbers only if the JSON consumer asks
 * (caller can post-process). Booleans / null stay as strings on output.
 *
 * Designed for the "paste a CSV, get JSON" workflow rather than parsing
 * gigabyte logs — the parser is straightforward and reasonably fast for
 * inputs up to a few MB.
 */
export function parseCsv(
  text: string,
  opts: Pick<CsvOptions, "delimiter" | "includeHeader"> = {},
): unknown {
  const delim = (opts.delimiter ?? ",").charAt(0);
  const hasHeader = opts.includeHeader ?? true;

  // Strip UTF-8 BOM if present — Excel will sometimes save with one.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = src.length;

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
      field += ch;
      i++;
      continue;
    }

    if (ch === '"' && field.length === 0) {
      inQuotes = true;
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
      // Skip CR; the LF below handles row termination.
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      // Skip wholly empty trailing rows produced by a final newline.
      if (!(row.length === 1 && row[0] === "")) rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // Final cell if file didn't end with newline.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];

  if (!hasHeader) {
    // Headerless → return rows as arrays of strings.
    return rows;
  }

  const headers = rows[0];
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = cells[c] ?? "";
    }
    out.push(obj);
  }
  return out;
}
