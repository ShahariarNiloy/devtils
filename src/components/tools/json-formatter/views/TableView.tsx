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
  if (typeof v === "object") {
    const str = JSON.stringify(v);
    return str.length > 40 ? str.slice(0, 40) + "…" : str;
  }
  return String(v);
}

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

  return (
    <div className="relative overflow-auto h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle sticky top-0 bg-surface z-20">
        <span className="text-sm text-text-faint font-mono">{value.length} rows</span>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {columns.map((col) => {
              const isActive = sortCol === col && sortDir !== "none";
              return (
                <th
                  key={col}
                  onClick={() => handleHeaderClick(col)}
                  className={cn(
                    "sticky top-10 bg-surface z-10 px-4 py-2.5 text-left text-sm font-semibold text-text-muted border-b border-border cursor-pointer select-none whitespace-nowrap",
                    "hover:text-text hover:bg-surface-soft transition-colors",
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
          {sortedRows.map((row, ri) => (
            <tr
              key={ri}
              className="even:bg-surface-soft border-b border-border-subtle last:border-0 hover:bg-surface-sage/30 transition-colors"
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
                      "px-4 py-2 text-sm font-mono whitespace-nowrap max-w-48 overflow-hidden text-ellipsis align-top",
                      isNull && "text-text-faint italic",
                      isBool && "text-brand",
                      isNum && "text-text-muted",
                      isObj && "text-text-faint",
                      !isNull && !isBool && !isNum && !isObj && "text-text",
                    )}
                    title={isObj ? JSON.stringify(v) : undefined}
                    style={isNum ? { color: "var(--color-clay)" } : undefined}
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
