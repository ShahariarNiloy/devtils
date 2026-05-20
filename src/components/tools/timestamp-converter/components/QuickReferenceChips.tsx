"use client";

import { Temporal } from "@js-temporal/polyfill";
import {
  addDuration,
  roundTo,
  subtractDuration,
} from "../timestamp-converter.lib";
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

function dur(parts: Temporal.DurationLike): Temporal.Duration {
  return Temporal.Duration.from(parts);
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

  const relative: { label: string; instant: Temporal.Instant }[] = [
    { label: "−1 hour", instant: subtractDuration(base, dur({ hours: 1 })) },
    { label: "−1 day", instant: subtractDuration(base, dur({ days: 1 })) },
    { label: "−1 week", instant: subtractDuration(base, dur({ weeks: 1 })) },
    { label: "+1 hour", instant: addDuration(base, dur({ hours: 1 })) },
    { label: "+1 day", instant: addDuration(base, dur({ days: 1 })) },
    { label: "+1 week", instant: addDuration(base, dur({ weeks: 1 })) },
    { label: "+1 month", instant: addDuration(base, dur({ months: 1 })) },
    { label: "+1 year", instant: addDuration(base, dur({ years: 1 })) },
  ];

  const anchors: { label: string; instant: Temporal.Instant }[] = [
    { label: "Start of today", instant: roundTo(base, "day", "floor", primaryTz) },
    { label: "End of today", instant: roundTo(base, "day", "ceil", primaryTz) },
    { label: "Start of week", instant: roundTo(base, "week", "floor", primaryTz) },
    { label: "Start of month", instant: roundTo(base, "month", "floor", primaryTz) },
    { label: "Start of quarter", instant: roundTo(base, "quarter", "floor", primaryTz) },
    { label: "Start of year", instant: roundTo(base, "year", "floor", primaryTz) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Section title="Relative">
        {relative.map((c) => (
          <Chip key={c.label} label={c.label} onClick={() => onApply(toUnix(c.instant))} />
        ))}
      </Section>
      <Section title="Anchors">
        {anchors.map((c) => (
          <Chip key={c.label} label={c.label} onClick={() => onApply(toUnix(c.instant))} />
        ))}
      </Section>
      <Section title="Landmarks">
        {EPOCH_LANDMARKS.map((l) => (
          <Chip
            key={l.label}
            label={l.label}
            title={l.description}
            onClick={() => onApply(toUnix(l.instant))}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
        {title}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  label,
  title,
  onClick,
}: {
  label: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded-full border border-border-subtle bg-surface px-3 py-1 text-sm text-text-muted transition-colors hover:border-border hover:text-text cursor-pointer"
    >
      {label}
    </button>
  );
}
