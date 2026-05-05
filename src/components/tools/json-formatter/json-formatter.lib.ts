/**
 * Pure JSON helpers — kept side-effect-free so the React layer can stay thin
 * and so we can unit-test the parsing/serialization in isolation.
 */

export type IndentMode = "2" | "4" | "tab";

export interface FormatSuccess {
  ok: true;
  output: string;
}

export interface FormatError {
  ok: false;
  message: string;
  /** 1-based line number where parsing failed, if known. */
  line?: number;
  /** 1-based column where parsing failed, if known. */
  column?: number;
}

export type FormatResult = FormatSuccess | FormatError;

const indentString = (mode: IndentMode): string | number =>
  mode === "tab" ? "\t" : Number(mode);

/**
 * Parse + re-serialize JSON. Recovers line/column from the V8-style
 * "at position N" error message so the UI can highlight the offending spot.
 */
export function formatJSON(input: string, indent: IndentMode): FormatResult {
  if (!input.trim()) return { ok: true, output: "" };
  try {
    const parsed = JSON.parse(input);
    return { ok: true, output: JSON.stringify(parsed, null, indentString(indent)) };
  } catch (err) {
    return parseError(err, input);
  }
}

export function minifyJSON(input: string): FormatResult {
  if (!input.trim()) return { ok: true, output: "" };
  try {
    return { ok: true, output: JSON.stringify(JSON.parse(input)) };
  } catch (err) {
    return parseError(err, input);
  }
}

function parseError(err: unknown, source: string): FormatError {
  const message = err instanceof Error ? err.message : String(err);
  const posMatch = /position\s+(\d+)/.exec(message);
  if (!posMatch) return { ok: false, message };
  const pos = Number(posMatch[1]);
  const before = source.slice(0, pos);
  const lines = before.split("\n");
  return {
    ok: false,
    message: message.replace(/\s*\(line.*\)$/, ""),
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

export interface JSONStats {
  bytes: number;
  keys: number;
  depth: number;
}

export function analyzeJSON(input: string): JSONStats | null {
  if (!input.trim()) return { bytes: 0, keys: 0, depth: 0 };
  try {
    const parsed = JSON.parse(input);
    let keys = 0;
    let depth = 0;
    const visit = (v: unknown, d: number) => {
      if (d > depth) depth = d;
      if (Array.isArray(v)) {
        v.forEach((item) => visit(item, d + 1));
      } else if (v && typeof v === "object") {
        for (const k of Object.keys(v as Record<string, unknown>)) {
          keys += 1;
          visit((v as Record<string, unknown>)[k], d + 1);
        }
      }
    };
    visit(parsed, 1);
    const bytes = new TextEncoder().encode(input).length;
    return { bytes, keys, depth };
  } catch {
    return null;
  }
}

const UNITS = ["B", "KB", "MB", "GB"] as const;

/** Format a byte count with one decimal place at KB+ for compact display. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  let i = 0;
  let v = n;
  while (v >= 1024 && i < UNITS.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(1)} ${UNITS[i]}`;
}
