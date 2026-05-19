"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
import { Temporal } from "@js-temporal/polyfill";
import { getRelativeTime } from "../timestamp-converter.lib";
import type { ParseResult } from "../timestamp-converter.types";

interface Props {
  parseResult: ParseResult;
  nowUnix: number;
}

/**
 * The headline humanized distance ("2 years ago", "in 3 days") — what epoch
 * sites lead with. Recomputes against the live clock so it ticks every
 * second.
 */
export function RelativeFocus({ parseResult, nowUnix }: Props) {
  const phrase = useMemo(() => {
    if (!parseResult.ok || !parseResult.instant) return null;
    return getRelativeTime(
      parseResult.instant,
      Temporal.Instant.fromEpochMilliseconds(nowUnix * 1000),
    );
  }, [parseResult, nowUnix]);

  if (!phrase) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-1">
      <Clock size={18} aria-hidden className="text-text-faint" />
      <span
        aria-live="polite"
        className="text-2xl font-medium tracking-tight text-text"
      >
        {phrase}
      </span>
    </div>
  );
}
