"use client";

import { Temporal } from "@js-temporal/polyfill";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { getTimezoneView } from "../timestamp-converter.lib";
import { TimezonePicker } from "../components/timezone-picker";
import type { UseTimestampConverter } from "../useTimestampConverter";

interface Props {
  s: UseTimestampConverter;
}

export function CompareMode({ s }: Props) {
  const instant =
    s.parseResult.ok && s.parseResult.instant
      ? s.parseResult.instant
      : Temporal.Now.instant();
  const atFull = s.compareZones.length >= 6;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {s.compareZones.map((tz, i) => {
          const v = getTimezoneView(instant, tz);
          return (
            <div
              key={tz}
              className={
                "flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3" +
                (i > 0 ? " border-t border-border-subtle" : "")
              }
            >
              <span className="w-48 shrink-0 font-medium text-text">
                {tz}
              </span>
              <span className="min-w-0 flex-1 font-mono text-sm text-text break-all">
                {v.iso8601}
              </span>
              <span className="text-sm text-text-muted">{v.dayOfWeek}</span>
              <span className="text-sm text-text-muted">{v.relativeTime}</span>
              <span className="ml-auto flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => s.moveCompareZone(tz, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${tz} up`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-soft hover:text-text disabled:opacity-30 cursor-pointer"
                >
                  <ChevronUp size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => s.moveCompareZone(tz, 1)}
                  disabled={i === s.compareZones.length - 1}
                  aria-label={`Move ${tz} down`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-soft hover:text-text disabled:opacity-30 cursor-pointer"
                >
                  <ChevronDown size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => s.removeCompareZone(tz)}
                  disabled={s.compareZones.length <= 1}
                  aria-label={`Remove ${tz}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-soft hover:text-danger disabled:opacity-30 cursor-pointer"
                >
                  <X size={15} aria-hidden />
                </button>
              </span>
            </div>
          );
        })}
      </div>
      {atFull ? (
        <p className="text-sm text-text-muted">Maximum of 6 zones.</p>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Add timezone:</span>
          <TimezonePicker value="Select…" onChange={s.addCompareZone} />
        </div>
      )}
    </div>
  );
}
