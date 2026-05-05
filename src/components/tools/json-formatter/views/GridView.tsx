"use client";

import { cn } from "@/lib/cn";

export interface GridViewProps {
  value: Record<string, unknown>[];
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-text-faint italic">null</span>;
  }
  if (typeof value === "boolean") {
    return <span className="text-brand">{String(value)}</span>;
  }
  if (typeof value === "number") {
    return (
      <span style={{ color: "var(--color-clay)" }}>{String(value)}</span>
    );
  }
  if (typeof value === "string") {
    const display = value.length > 40 ? value.slice(0, 40) + "…" : value;
    return <span className="text-brand">{display}</span>;
  }
  if (typeof value === "object") {
    const str = JSON.stringify(value);
    const display = str.length > 40 ? str.slice(0, 40) + "…" : str;
    return <span className="text-text-faint font-mono">{display}</span>;
  }
  return <span className="text-text">{String(value)}</span>;
}

export function GridView({ value }: GridViewProps) {
  return (
    <div className="p-4 overflow-auto h-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {value.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-surface p-3 overflow-hidden"
          >
            {Object.entries(item).map(([k, v]) => (
              <div key={k} className="flex flex-col py-1">
                <span className="text-sm text-text-faint truncate">{k}</span>
                <span
                  className={cn(
                    "text-sm font-mono truncate",
                    v === null || v === undefined ? "text-text-faint italic" : "",
                  )}
                >
                  <CellValue value={v} />
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
