"use client";

import { useEffect, useMemo, useState } from "react";
import { byteLength, computeStats } from "../json-formatter.lib";
import { byteLengthSteps, computeStatsSteps, lineCountSteps } from "../json-sliced.lib";
import { formatStatsRows } from "../json-stats";
import type { JsonStats } from "../json-formatter.types";
import { WORKER_THRESHOLD } from "../json-worker-client";
import { runSliced } from "../run-sliced";

interface StatsPanelProps {
  /** Parsed value to compute structural stats from. */
  value: unknown;
  /** Raw text to derive byte size + line count from. */
  text: string;
}

function* statsSteps(value: unknown, text: string): Generator<void, JsonStats> {
  const s = yield* computeStatsSteps(value);
  s.size = yield* byteLengthSteps(text);
  s.lines = yield* lineCountSteps(text);
  return s;
}

/**
 * Structural stats for the current document, shown in a popover from the
 * status bar. Computed only while it's open (this component mounts with the
 * popover) and memoized on (value, text). A large document is walked in
 * short slices (the one-shot walk + byte count + line split took ~1 s on
 * the main thread at 50 MB), so opening the popover never freezes the tab.
 */
export function StatsPanel({ value, text }: StatsPanelProps) {
  const empty = value === null || value === undefined;
  const large = text.length > WORKER_THRESHOLD;
  const syncStats = useMemo(() => {
    if (empty || large) return null;
    try {
      const s = computeStats(value);
      s.size = byteLength(text);
      s.lines = text ? text.split("\n").length : 0;
      return s;
    } catch { return null; }
  }, [empty, large, value, text]);

  const [sliced, setSliced] = useState<{ value: unknown; text: string; stats: JsonStats | null } | null>(null);
  useEffect(() => {
    if (empty || !large) return;
    const job = runSliced(statsSteps(value, text));
    job.promise.then(
      (stats) => setSliced({ value, text, stats }),
      () => setSliced({ value, text, stats: null }),
    );
    return job.cancel;
  }, [empty, large, value, text]);

  const current = sliced !== null && sliced.value === value && sliced.text === text;
  if (!empty && large && !current) {
    return (
      <p aria-busy="true" className="m-0 animate-pulse text-sm text-text-faint">
        Counting…
      </p>
    );
  }
  let stats = syncStats;
  if (large) stats = current ? sliced.stats : null;

  if (!stats) return <p className="m-0 text-sm text-text-faint">Load some JSON to see structural stats.</p>;

  return (
    <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border-subtle">
      {formatStatsRows(stats).map((row) => (
        <div key={row.label} className="flex flex-col gap-0.5 bg-surface-soft px-3 py-2">
          <dt className="text-xs text-text-faint">{row.label}</dt>
          <dd className={row.highlight ? "m-0 font-mono text-sm font-semibold text-text" : "m-0 font-mono text-sm text-text-muted"}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
