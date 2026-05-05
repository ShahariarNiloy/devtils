export type IndentStyle = "2" | "4" | "tab";

export type ViewMode = "code" | "tree" | "table" | "grid" | "diff" | "path";

export type ConvertTarget =
  | "csv"
  | "yaml"
  | "typescript"
  | "xml"
  | "zod"
  | "csv-to-json"
  | "yaml-to-json";

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

export interface CursorPosition {
  ln: number;
  col: number;
}

export interface MinifyStats {
  before: number;
  after: number;
  savedPct: number;
}
