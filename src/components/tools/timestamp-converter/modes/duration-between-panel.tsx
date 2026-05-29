"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import {
  businessDaysBetween,
  diffDuration,
  parseInput,
} from "../timestamp-converter.lib";
import type { HolidayCalendarId } from "../holidays";
import { FIELD, Stat } from "../components/arithmetic-shared";

interface Props {
  primaryTz: string;
  cal: HolidayCalendarId;
}

export function DurationBetweenPanel({ primaryTz, cal }: Props) {
  const [aRaw, setARaw] = useState("");
  const [bRaw, setBRaw] = useState("");

  const between = useMemo(() => {
    const a = parseInput(aRaw);
    const b = parseInput(bRaw);
    if (!a.ok || !a.instant || !b.ok || !b.instant) return null;
    const d = diffDuration(a.instant, b.instant);
    return {
      d,
      calDays: Math.trunc(d.totalMs / 86_400_000),
      biz: businessDaysBetween(a.instant, b.instant, cal, primaryTz),
    };
  }, [aRaw, bRaw, cal, primaryTz]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <input
          className={cn(FIELD, "min-w-60 flex-1")}
          placeholder="From…"
          value={aRaw}
          onChange={(e) => setARaw(e.target.value)}
          aria-label="From timestamp"
        />
        <input
          className={cn(FIELD, "min-w-60 flex-1")}
          placeholder="To…"
          value={bRaw}
          onChange={(e) => setBRaw(e.target.value)}
          aria-label="To timestamp"
        />
      </div>
      {between && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-border bg-surface p-4 text-sm sm:grid-cols-3">
          <Stat
            k="Total seconds"
            v={between.d.totalSeconds.toLocaleString()}
          />
          <Stat k="Total ms" v={between.d.totalMs.toLocaleString()} />
          <Stat k="Calendar days" v={between.calDays.toLocaleString()} />
          <Stat k="Business days" v={between.biz.toLocaleString()} />
          <Stat
            k="Decomposed"
            v={`${between.d.years}y ${between.d.months}M ${between.d.days}d ${between.d.hours}h ${between.d.minutes}m ${between.d.seconds}s`}
          />
          <Stat k="Human" v={between.d.humanReadable} />
        </dl>
      )}
    </div>
  );
}
