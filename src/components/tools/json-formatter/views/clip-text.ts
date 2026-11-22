/**
 * Long values are shown clipped: the browser must lay out (and repaint) every
 * character it's given, so a 7 MB string rendered in full freezes the page.
 * Copy actions still use the full value; Code view shows all of it.
 */
export const DISPLAY_CHARS = 2_000;
export const CELL_CHARS = 300;

/** Clip `s` to `max` chars; `rest` is how many were left out (0 if none). */
export function clipText(s: string, max: number): { text: string; rest: number } {
  return s.length <= max ? { text: s, rest: 0 } : { text: s.slice(0, max), rest: s.length - max };
}

/** "7.3M" / "12.4K" / "950" — compact counts for "+N more chars". */
export function compactCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en");
}

/** JSON.stringify a container for display without building a multi-MB string first when avoidable. */
export function clippedJson(v: unknown, max: number): string {
  const s = JSON.stringify(v) ?? String(v);
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}
