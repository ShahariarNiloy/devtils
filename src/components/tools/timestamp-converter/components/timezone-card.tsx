"use client";

import { cn } from "@/lib/cn";
import { TimezonePicker } from "./timezone-picker";
import type { TimezoneView } from "../timestamp-converter.types";

interface Props {
  title: string;
  isPrimary?: boolean;
  view: TimezoneView | null;
  tz: string;
  onTzChange: (tz: string) => void;
}

export function TimezoneCard({
  title,
  isPrimary,
  view,
  tz,
  onTzChange,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-surface p-6",
        isPrimary ? "border-border" : "border-border-subtle",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <TimezonePicker value={tz} onChange={onTzChange} />
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            isPrimary
              ? "bg-mist-sage text-olive-ink"
              : "bg-surface-soft text-text-muted",
          )}
        >
          {title}
        </span>
      </div>

      {view ? (
        <>
          {/* Hero block — time is the scan target, date directly under it. */}
          <div className="mt-6 flex flex-col gap-1">
            <span className="text-3xl font-semibold tracking-tight tabular-nums text-text">
              {view.time}
            </span>
            <span className="text-base text-text-muted">{view.date}</span>
          </div>

          {/* Single faint meta strip — offset · abbrev · calendar context. */}
          <dl className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-subtle pt-4 font-mono text-[12px] text-text-muted">
            <Meta v={view.offset} />
            <Dot />
            <Meta v={view.abbreviation} />
            <Dot />
            <Meta k="Day" v={view.dayOfYear} />
            <Dot />
            <Meta k="Week" v={view.weekOfYear} />
            <Dot />
            <Meta k="Q" v={view.quarter} />
          </dl>
        </>
      ) : (
        <p className="py-12 text-center text-sm text-text-muted">
          Enter a timestamp to begin.
        </p>
      )}
    </div>
  );
}

function Meta({ k, v }: { k?: string; v: string | number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      {k && <dt className="text-text-muted/70">{k}</dt>}
      <dd className="text-text-muted">{v}</dd>
    </div>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-text-muted/50">
      ·
    </span>
  );
}
