"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Temporal } from "@js-temporal/polyfill";
import { cn } from "@/lib/cn";
import {
  addBusinessDays,
  addDuration,
  getTimezoneView,
  parseInput,
  subtractDuration,
} from "../timestamp-converter.lib";
import type { HolidayCalendarId } from "../holidays";
import { FIELD, Stat } from "../components/arithmetic-shared";

const UNITS = [
  "years", "months", "weeks", "days", "hours", "minutes",
  "seconds", "milliseconds", "microseconds", "nanoseconds", "business",
] as const;
type Unit = (typeof UNITS)[number];
interface Row {
  id: number;
  n: string;
  unit: Unit;
  op: "add" | "sub";
}

interface Props {
  primaryTz: string;
  secondaryTz: string;
  cal: HolidayCalendarId;
}

export function AddSubtractPanel({ primaryTz, secondaryTz, cal }: Props) {
  const [base, setBase] = useState("");
  const [rows, setRows] = useState<Row[]>([
    { id: 1, n: "1", unit: "days", op: "add" },
  ]);

  const result = useMemo(() => {
    const p = parseInput(base);
    if (!p.ok || !p.instant) return null;
    let inst = p.instant;
    for (const r of rows) {
      const n = Number(r.n);
      if (!Number.isFinite(n)) continue;
      if (r.unit === "business") {
        inst = addBusinessDays(inst, r.op === "sub" ? -n : n, cal, primaryTz);
      } else {
        const dur = Temporal.Duration.from({ [r.unit]: Math.abs(n) });
        inst =
          r.op === "sub" ? subtractDuration(inst, dur) : addDuration(inst, dur);
      }
    }
    return inst;
  }, [base, rows, cal, primaryTz]);

  const patch = (id: number, p: Partial<Row>) =>
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <div className="flex flex-col gap-3">
      <input
        className={cn(FIELD, "w-full")}
        placeholder="Base timestamp…"
        value={base}
        onChange={(e) => setBase(e.target.value)}
        aria-label="Base timestamp"
      />
      {rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-2">
          <select
            value={r.op}
            onChange={(e) => patch(r.id, { op: e.target.value as "add" | "sub" })}
            aria-label="Operation"
            className={cn(FIELD, "w-24")}
          >
            <option value="add">Add</option>
            <option value="sub">Subtract</option>
          </select>
          <input
            className={cn(FIELD, "w-24")}
            value={r.n}
            onChange={(e) => patch(r.id, { n: e.target.value })}
            aria-label="Amount"
          />
          <select
            value={r.unit}
            onChange={(e) => patch(r.id, { unit: e.target.value as Unit })}
            aria-label="Unit"
            className={cn(FIELD, "w-36")}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u === "business" ? "business days" : u}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              setRows((p) =>
                p.length <= 1 ? p : p.filter((x) => x.id !== r.id),
              )
            }
            aria-label="Remove row"
            disabled={rows.length <= 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-soft hover:text-danger disabled:opacity-30 cursor-pointer"
          >
            <Trash2 size={15} aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setRows((p) => [
            ...p,
            { id: Date.now(), n: "1", unit: "days", op: "add" },
          ])
        }
        className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1 text-sm text-text-muted hover:text-text cursor-pointer"
      >
        <Plus size={14} aria-hidden /> Add another
      </button>
      {result && (
        <dl className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 text-sm">
          <Stat k={primaryTz} v={getTimezoneView(result, primaryTz).iso8601} />
          <Stat
            k={secondaryTz}
            v={getTimezoneView(result, secondaryTz).iso8601}
          />
        </dl>
      )}
    </div>
  );
}
