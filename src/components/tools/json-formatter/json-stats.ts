import type { JsonStats } from "./json-formatter.types";
import { byteLength, computeStats, formatBytes } from "./json-formatter.lib";

export { computeStats, formatBytes };
export type { JsonStats };

/** Re-compute stats given raw input string. Returns null when input is empty/invalid. */
export function computeStatsFromRaw(raw: string): JsonStats | null {
  if (!raw.trim()) return null;
  try {
    const value = JSON.parse(raw);
    const stats = computeStats(value);
    stats.size = byteLength(raw);
    stats.lines = raw.split("\n").length;
    return stats;
  } catch {
    return null;
  }
}

export interface StatRow {
  label: string;
  value: string | number;
  highlight?: boolean;
}

/** Format stats for display in the StatsPanel. */
export function formatStatsRows(stats: JsonStats): StatRow[] {
  return [
    { label: "File size", value: formatBytes(stats.size), highlight: true },
    { label: "Lines", value: stats.lines },
    { label: "Max depth", value: stats.depth },
    { label: "Keys", value: stats.keys },
    { label: "Strings", value: stats.strings },
    { label: "Numbers", value: stats.numbers },
    { label: "Booleans", value: stats.booleans },
    { label: "Nulls", value: stats.nulls },
    { label: "Arrays", value: stats.arrays },
    { label: "Objects", value: stats.objects },
  ];
}
