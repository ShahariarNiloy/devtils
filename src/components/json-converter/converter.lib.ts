/**
 * Pure helpers shared by the converter tools: output summaries for the
 * header + status bar, and the small table preview under CSV output.
 * No React, no DOM.
 */

import { parseCsvRows } from "./reverse-parsers";

export interface TablePreview {
  cols: string[];
  rows: string[][];
}

/** Number of lines in a block of text ("" → 0). */
export function lineCount(text: string): number {
  if (!text) return 0;
  return text.replace(/\n$/, "").split("\n").length;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

/** "N lines" summary for document-shaped outputs (YAML, XML, JSON). */
export function linesSummary(text: string): string {
  return text ? plural(lineCount(text), "line") : "";
}

/** "N types" summary — counts lines matching a declaration pattern. */
export function declarationSummary(text: string, pattern: RegExp): string {
  if (!text) return "";
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags.includes("m") ? flags : `${flags}m`);
  const n = (text.match(re) ?? []).length;
  return plural(n, "type");
}

/** "N rows · M columns" for a table. */
export function tableSummary(rows: number, cols: number): string {
  return `${plural(rows, "row")} · ${plural(cols, "column")}`;
}

/**
 * Preview table from generated CSV: header (or column1…N) plus the first
 * `maxRows` data rows. Returns null when the CSV can't be read back.
 */
export function csvPreview(
  csv: string,
  delimiter: string,
  hasHeader: boolean,
  maxRows = 5,
): (TablePreview & { totalRows: number }) | null {
  if (!csv) return null;
  let rows: string[][];
  try {
    rows = parseCsvRows(csv, delimiter);
  } catch {
    return null;
  }
  if (rows.length === 0) return null;
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
  const cols = hasHeader
    ? rows[0]
    : Array.from({ length: width }, (_, i) => `column${i + 1}`);
  const body = hasHeader ? rows.slice(1) : rows;
  return { cols, rows: body.slice(0, maxRows), totalRows: body.length };
}
