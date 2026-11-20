/**
 * Pure CSV → JSON logic (no React): delimiter detection, header handling,
 * type inference and dotted-column nesting on top of the shared RFC 4180
 * row reader.
 */

import { parseCsvRows } from "@/components/json-converter/reverse-parsers";

export type DelimiterChoice = "auto" | "," | ";" | "tab";
export type Delimiter = "," | ";" | "\t";

export interface CsvToJsonOptions {
  delimiter: DelimiterChoice;
  header: boolean;
  inferTypes: boolean;
  nest: boolean;
}

export interface CsvToJsonResult {
  records: Record<string, unknown>[];
  /** Column names as used for the keys (after dedupe / defaults). */
  columns: string[];
  /** Raw data rows (strings), header excluded. */
  rows: string[][];
  delimiter: Delimiter;
}

const CANDIDATES: readonly Delimiter[] = [",", ";", "\t"];

/** Pick the candidate that occurs most in the first line, outside quotes. */
export function detectDelimiter(text: string): Delimiter {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const counts = new Map<Delimiter, number>(CANDIDATES.map((d) => [d, 0]));
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      if (inQuotes && src[i + 1] === '"') { i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) break;
    if (!inQuotes && (ch === "," || ch === ";" || ch === "\t")) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  let best: Delimiter = ",";
  for (const d of CANDIDATES) if ((counts.get(d) ?? 0) > (counts.get(best) ?? 0)) best = d;
  return best;
}

const NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/** "" → null, numbers → number (exact only), true/false → boolean. */
export function inferValue(cell: string): unknown {
  if (cell === "") return null;
  const t = cell.trim();
  if (t !== cell) return cell; // padded values stay as typed
  if (/^(true|false)$/i.test(t)) return t.toLowerCase() === "true";
  if (NUMBER.test(t)) {
    const n = Number(t);
    if (!Number.isFinite(n)) return cell;
    if (/^-?\d+$/.test(t) && !Number.isSafeInteger(n)) return cell;
    return n;
  }
  return cell;
}

/** Unique, non-empty column names; header cells win, gaps become columnN. */
function columnNames(headerCells: readonly string[], width: number): string[] {
  const used = new Set<string>();
  const out: string[] = [];
  for (let i = 0; i < width; i++) {
    let base = (headerCells[i] ?? "").trim() || `column${i + 1}`;
    if (used.has(base)) {
      let n = 2;
      while (used.has(`${base}_${n}`)) n++;
      base = `${base}_${n}`;
    }
    used.add(base);
    out.push(base);
  }
  return out;
}

/** Path segments for a column that can nest, or null to keep it flat. */
function nestPaths(columns: readonly string[]): (string[] | null)[] {
  const names = new Set(columns);
  return columns.map((c) => {
    if (!c.includes(".")) return null;
    const parts = c.split(".");
    if (parts.some((p) => !p)) return null;
    // A prefix that is itself a column would collide — stay flat.
    for (let i = 1; i < parts.length; i++) {
      if (names.has(parts.slice(0, i).join("."))) return null;
    }
    return parts;
  });
}

/** Null-prototype record: a "__proto__" column is just a key. */
function record(): Record<string, unknown> {
  return Object.create(null) as Record<string, unknown>;
}

export function csvToJson(text: string, o: CsvToJsonOptions): CsvToJsonResult {
  let delimiter: Delimiter;
  if (o.delimiter === "auto") delimiter = detectDelimiter(text);
  else if (o.delimiter === "tab") delimiter = "\t";
  else delimiter = o.delimiter;
  const all = parseCsvRows(text, delimiter);
  const headerCells = o.header && all.length ? all[0] : [];
  const rows = o.header ? all.slice(1) : all;
  const width = Math.max(headerCells.length, ...rows.map((r) => r.length), 0);
  const columns = columnNames(headerCells, width);
  const paths = o.nest ? nestPaths(columns) : columns.map(() => null);

  const records = rows.map((r) => {
    const rec = record();
    columns.forEach((col, i) => {
      const raw = r[i] ?? "";
      const v = o.inferTypes ? inferValue(raw) : raw;
      const path = paths[i];
      if (!path) {
        rec[col] = v;
        return;
      }
      let node = rec;
      for (const seg of path.slice(0, -1)) {
        const next = node[seg];
        if (next !== null && typeof next === "object" && !Array.isArray(next)) {
          node = next as Record<string, unknown>;
        } else {
          const fresh = record();
          node[seg] = fresh;
          node = fresh;
        }
      }
      node[path[path.length - 1]] = v;
    });
    return rec;
  });

  return { records, columns, rows, delimiter };
}

export const SAMPLE_CSV = [
  "id,name,email,plan,stats.projects,stats.stars",
  "1,Ada Lovelace,ada@example.com,pro,12,248",
  "2,Alan Turing,alan@example.com,free,4,31",
  '3,"Grace Hopper, RADM",grace@example.com,,27,902',
  "",
].join("\n");
