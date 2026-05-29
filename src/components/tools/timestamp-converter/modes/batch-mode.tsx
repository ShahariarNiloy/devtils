"use client";

import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { runBatch, type BatchRow } from "../batch-client";

const RENDER_CAP = 500;

export function BatchMode() {
  const [text, setText] = useState("");
  const [column, setColumn] = useState<number | null>(null);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [busy, setBusy] = useState(false);

  const lines = useMemo(
    () => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
    [text],
  );
  const firstCols = lines[0]?.split(",") ?? [];
  const isCsv = firstCols.length > 1;

  const convert = async () => {
    const inputs = lines.map((l) =>
      isCsv && column !== null
        ? (l.split(",")[column] ?? "").trim()
        : l,
    );
    setBusy(true);
    try {
      setRows(await runBatch(inputs));
    } finally {
      setBusy(false);
    }
  };

  const downloadCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [
      "input,format,iso",
      ...rows.map((r) => [r.input, r.format, r.iso].map(esc).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "timestamps.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          placeholder="One timestamp per line, or paste CSV…"
          aria-label="Batch input"
          className="h-80 w-full resize-y rounded-xl border border-border bg-surface p-3 font-mono text-sm text-text outline-none focus:outline-2 focus:outline-offset-2 focus:outline-brand"
        />
        <div className="flex flex-wrap items-center gap-2">
          {isCsv && (
            <select
              value={column ?? ""}
              onChange={(e) =>
                setColumn(e.target.value === "" ? null : Number(e.target.value))
              }
              aria-label="Timestamp column"
              className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-text-muted outline-none"
            >
              <option value="">Whole line</option>
              {firstCols.map((c, i) => (
                <option key={`${i}-${c}`} value={i}>
                  Column {i + 1}: {c.slice(0, 20)}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={convert}
            disabled={busy || lines.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-bg disabled:opacity-50 cursor-pointer"
          >
            {busy && <Loader2 size={15} className="animate-spin" aria-hidden />}
            Convert {lines.length ? `(${lines.length})` : ""}
          </button>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={downloadCsv}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-text-muted hover:text-text cursor-pointer"
            >
              <Download size={15} aria-hidden /> CSV
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border-subtle px-3 py-2 text-sm text-text-muted">
          {rows.length > RENDER_CAP
            ? `Showing first ${RENDER_CAP} of ${rows.length}`
            : `${rows.length} rows`}
        </div>
        <div className="max-h-80 overflow-auto">
          {rows.slice(0, RENDER_CAP).map((r, i) => (
            <div
              key={`${i}-${r.input}`}
              className="flex items-center gap-3 border-b border-border-subtle px-3 py-1.5 text-sm last:border-0"
            >
              <span className="w-40 shrink-0 truncate font-mono text-text-muted">
                {r.input}
              </span>
              <span
                className={
                  "min-w-0 flex-1 truncate font-mono " +
                  (r.ok ? "text-text" : "text-danger")
                }
              >
                {r.ok ? r.iso : "unparseable"}
              </span>
              <span className="shrink-0 text-[11px] text-text-muted">
                {r.format}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
