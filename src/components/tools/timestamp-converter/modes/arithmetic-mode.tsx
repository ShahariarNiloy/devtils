"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { HOLIDAY_CALENDARS, type HolidayCalendarId } from "../holidays";
import { DurationBetweenPanel } from "./duration-between-panel";
import { AddSubtractPanel } from "./add-subtract-panel";
import type { UseTimestampConverter } from "../useTimestampConverter";

export function ArithmeticMode({ s }: { s: UseTimestampConverter }) {
  const [sub, setSub] = useState<"between" | "addsub">("between");
  const [cal, setCal] = useState<HolidayCalendarId>("us");

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex w-fit flex-wrap items-center rounded-lg border border-border bg-surface p-1">
        {(["between", "addsub"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setSub(m)}
            className={cn(
              "h-8 rounded-md px-3 text-sm font-medium cursor-pointer",
              sub === m ? "bg-surface-soft text-text" : "text-text-muted",
            )}
          >
            {m === "between" ? "Duration between" : "Add / subtract"}
          </button>
        ))}
        <select
          value={cal}
          onChange={(e) => setCal(e.target.value as HolidayCalendarId)}
          aria-label="Holiday calendar"
          className="ml-2 bg-transparent text-sm text-text-muted outline-none"
        >
          {HOLIDAY_CALENDARS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {sub === "between" ? (
        <DurationBetweenPanel primaryTz={s.primaryTz} cal={cal} />
      ) : (
        <AddSubtractPanel
          primaryTz={s.primaryTz}
          secondaryTz={s.secondaryTz}
          cal={cal}
        />
      )}
    </div>
  );
}
