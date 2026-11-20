import type { ReactNode } from "react";
import type { RegexMatch } from "../regex.lib";

/** Alternating clay / teal tints so neighbouring matches stay distinct. */
const TINT = [
  "bg-clay-light/28 shadow-[inset_0_-2px_0_var(--color-clay-light)]",
  "bg-cat-teal/28 shadow-[inset_0_-2px_0_var(--color-cat-teal)]",
] as const;

const SELECTED = "bg-clay-light/45 shadow-[inset_0_0_0_1.5px_var(--color-clay-light)]";

/**
 * The visible layer of the test-string editor: plain text with every match
 * wrapped in a tinted span. No padding on the spans — the transparent
 * textarea on top has to line up glyph for glyph. Zero-width matches have
 * nothing to paint and are listed in the match panel only.
 */
export function buildHighlighted(
  matches: RegexMatch[],
  text: string,
  validSelected: number | null,
): ReactNode[] {
  const out: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((m, i) => {
    if (m.end <= m.index || m.index < cursor) return;
    if (m.index > cursor) out.push(text.slice(cursor, m.index));
    out.push(
      <span key={m.index} className={`rounded-[3px] ${validSelected === i ? SELECTED : TINT[i % 2]}`}>
        {text.slice(m.index, m.end)}
      </span>,
    );
    cursor = m.end;
  });

  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

/** Tint for match #i in the match list (mirrors the editor colours). */
export function matchTint(i: number): string {
  return i % 2 === 0 ? "text-clay-light" : "text-cat-teal";
}
