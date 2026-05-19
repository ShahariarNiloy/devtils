"use client";

import { Temporal } from "@js-temporal/polyfill";
import { addDuration, roundTo, subtractDuration } from "../timestamp-converter.lib";
import { EPOCH_LANDMARKS } from "../timestamp-converter.constants";
import type { ParseResult } from "../timestamp-converter.types";

interface Props {
  parseResult: ParseResult;
  primaryTz: string;
  onApply: (unixSeconds: string) => void;
}

function toUnix(i: Temporal.Instant): string {
  return (i.epochNanoseconds / BigInt(1_000_000_000)).toString();
}

export function QuickReferenceChips({
  parseResult,
  primaryTz,
  onApply,
}: Props) {
  const base =
    parseResult.ok && parseResult.instant
      ? parseResult.instant
      : Temporal.Now.instant();

  const chips: { label: string; instant: Temporal.Instant }[] = [
    { label: "−1 day", instant: subtractDuration(base, Temporal.Duration.from({ days: 1 })) },
    { label: "+1 hour", instant: addDuration(base, Temporal.Duration.from({ hours: 1 })) },
    { label: "+1 day", instant: addDuration(base, Temporal.Duration.from({ days: 1 })) },
    { label: "Start of day", instant: roundTo(base, "day", "floor", primaryTz) },
    { label: "Start of week", instant: roundTo(base, "week", "floor", primaryTz) },
    { label: "Start of month", instant: roundTo(base, "month", "floor", primaryTz) },
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold uppercase tracking-wider text-text-faint">
        Quick reference
      </span>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onApply(toUnix(c.instant))}
            className="rounded-md border border-border-subtle bg-surface px-2.5 py-1 text-sm text-text-muted transition-colors hover:border-border hover:text-text cursor-pointer"
          >
            {c.label}
          </button>
        ))}
        {EPOCH_LANDMARKS.map((l) => (
          <button
            key={l.label}
            type="button"
            title={l.description}
            onClick={() => onApply(toUnix(l.instant))}
            className="rounded-md border border-border-subtle bg-surface px-2.5 py-1 text-sm text-text-muted transition-colors hover:border-border hover:text-text cursor-pointer"
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
