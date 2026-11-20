"use client";

import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { extractColumns } from "@/components/tools/json-formatter/json-formatter.lib";

export interface TableViewProps {
  value: Record<string, unknown>[];
}

type SortDir = "asc" | "desc" | "none";

function renderCell(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Above this row count the table caps rendering to avoid main-thread stalls. */
const MAX_RENDER_ROWS = 1000;

export function TableView({ value }: TableViewProps) {
  const columns = useMemo(() => extractColumns(value), [value]);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("none");

  const handleHeaderClick = (col: string) => {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir("asc");
    } else {
      const next: SortDir = sortDir === "asc" ? "desc" : sortDir === "desc" ? "none" : "asc";
      setSortDir(next);
      if (next === "none") setSortCol(null);
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortCol || sortDir === "none") return value;
    return [...value].sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      const as = av === null || av === undefined ? "" : String(av);
      const bs = bv === null || bv === undefined ? "" : String(bv);
      const cmp = as.localeCompare(bs, undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [value, sortCol, sortDir]);

  const visibleRows = sortedRows.length > MAX_RENDER_ROWS
    ? sortedRows.slice(0, MAX_RENDER_ROWS)
    : sortedRows;
  const isCapped = sortedRows.length > MAX_RENDER_ROWS;

  return (
    <div className="relative overflow-auto h-full">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border-subtle bg-canvas px-3.5 py-2">
        <span className="font-mono text-xs text-text-faint">
          {value.length} rows
          {isCapped && ` · showing first ${MAX_RENDER_ROWS}`}
        </span>
      </div>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {columns.map((col) => {
              const isActive = sortCol === col && sortDir !== "none";
              return (
                <th
                  key={col}
                  onClick={() => handleHeaderClick(col)}
                  className={cn(
                    "sticky top-[33px] z-10 cursor-pointer border-b border-border bg-canvas px-2.5 py-2 text-left font-semibold whitespace-nowrap text-text-faint select-none",
                    "transition-colors hover:text-text",
                    isActive && "text-text",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col}
                    {isActive && sortDir === "asc" && <ArrowUp size={12} />}
                    {isActive && sortDir === "desc" && <ArrowDown size={12} />}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-white/[.05] transition-colors last:border-0 hover:bg-white/[.03]"
            >
              {columns.map((col) => {
                const v = row[col];
                const isNull = v === null || v === undefined;
                const isBool = typeof v === "boolean";
                const isNum = typeof v === "number";
                const isObj = v !== null && typeof v === "object";
                return (
                  <td
                    key={col}
                    className={cn(
                      "max-w-[28rem] overflow-hidden px-2.5 py-2 align-top font-mono text-ellipsis whitespace-nowrap",
                      isNull && "text-syntax-punctuation",
                      isBool && "text-syntax-boolean",
                      isNum && "text-syntax-number",
                      isObj && "text-text-faint",
                      !isNull && !isBool && !isNum && !isObj && "text-syntax-string",
                    )}
                    title={isObj ? JSON.stringify(v) : String(v ?? "")}
                  >
                    {renderCell(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Flat Path / Value / Type table (v2) ─────────────────────────────────────

interface FlatRow {
  path: string;
  value: string;
  type: string;
  color: string;
}

const TYPE_COLOR: Record<string, string> = {
  string: "text-syntax-string",
  number: "text-syntax-number",
  boolean: "text-syntax-boolean",
  null: "text-syntax-punctuation",
};

function flatten(v: unknown, path: string, out: FlatRow[]): void {
  if (out.length >= MAX_RENDER_ROWS) return;
  if (v !== null && typeof v === "object") {
    const entries = Array.isArray(v) ? v.map((x, i) => [i, x] as const) : Object.entries(v);
    if (entries.length === 0) {
      out.push({ path, value: Array.isArray(v) ? "[]" : "{}", type: Array.isArray(v) ? "array" : "object", color: "text-text-faint" });
      return;
    }
    for (const [k, child] of entries) {
      const next = typeof k === "number" ? `${path}[${k}]` : /^[A-Za-z_$][\w$]*$/.test(k) ? `${path}.${k}` : `${path}[${JSON.stringify(k)}]`;
      flatten(child, next, out);
    }
    return;
  }
  const type = v === null ? "null" : typeof v;
  out.push({ path, value: JSON.stringify(v) ?? String(v), type, color: TYPE_COLOR[type] ?? "text-text" });
}

/**
 * Every leaf as one row — works for any document, not only arrays of
 * records. Capped like the records table; the cap is stated, not hidden.
 */
export function FlatTableView({ value }: { value: unknown }) {
  const rows = useMemo(() => {
    const out: FlatRow[] = [];
    flatten(value, "$", out);
    return out;
  }, [value]);
  return (
    <div className="h-full overflow-auto p-3.5">
      <table className="w-full table-fixed border-collapse text-[13px]">
        <thead>
          <tr className="text-left text-text-faint">
            <th className="border-b border-border px-2.5 py-2 font-semibold">Path</th>
            <th className="border-b border-border px-2.5 py-2 font-semibold">Value</th>
            <th className="w-24 border-b border-border px-2.5 py-2 font-semibold">Type</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.path}>
              <td className="border-b border-white/[.05] px-2.5 py-2 font-mono break-all text-syntax-key">{r.path}</td>
              <td className={cn("border-b border-white/[.05] px-2.5 py-2 font-mono break-all", r.color)}>{r.value}</td>
              <td className="border-b border-white/[.05] px-2.5 py-2 break-all text-text-faint">{r.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length >= MAX_RENDER_ROWS && (
        <p className="mt-3 text-xs text-text-faint">Showing the first {MAX_RENDER_ROWS} values.</p>
      )}
    </div>
  );
}
