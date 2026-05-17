export type IndentStyle = "2" | "4" | "tab";

export type ViewMode = "code" | "tree" | "table" | "graph" | "diff" | "path";

export type ConvertTarget =
  | "csv"
  | "yaml"
  | "typescript"
  | "xml"
  | "zod"
  | "schema"
  | "go"
  | "python"
  | "rust";

export type SortOrder = "asc" | "desc" | "none";

export type ValidationState =
  | { status: "idle" }
  | { status: "valid"; size: number; lines: number }
  | { status: "invalid"; message: string; line: number; col: number };

export interface JsonStats {
  size: number;
  lines: number;
  depth: number;
  keys: number;
  strings: number;
  numbers: number;
  booleans: number;
  nulls: number;
  arrays: number;
  objects: number;
}

export interface DiffResult {
  added: string[];
  removed: string[];
  changed: string[];
}

export interface ConversionResult {
  output: string;
  format: ConvertTarget;
  size: number;
}

export interface RepairResult {
  fixed: string;
  changes: string[];
  wasValid: boolean;
}

export interface RepairPreview {
  /** What the user typed before we touched it. */
  original: string;
  /** Best-effort repaired output — may still be invalid if `error` is set. */
  fixed: string;
  /** Human-readable list of what changed. */
  changes: string[];
  /** Post-repair JSON.parse error if we couldn't make it valid. */
  error?: string;
}

export interface CursorPosition {
  ln: number;
  col: number;
}

export interface MinifyStats {
  before: number;
  after: number;
  savedPct: number;
}
