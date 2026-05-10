import type { ReactNode } from "react";
import type { RegexMatch } from "../regex.lib";

/**
 * Converts an array of regex matches and the original text into an array of
 * React nodes where every matched span is wrapped in a `<mark>` element.
 *
 * This is intentionally a plain function (not a hook) so it can be called
 * inside a `useMemo` without adding extra hook-call overhead.
 */
export function buildHighlighted(
  matches: RegexMatch[],
  text: string,
  validSelected: number | null,
): ReactNode[] {
  const out: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((m, i) => {
    if (m.index > cursor) out.push(text.slice(cursor, m.index));
    out.push(
      <mark
        key={`${m.index}-${i}`}
        className={validSelected === i ? "regex-match-active" : "regex-match"}
      >
        {text.slice(m.index, m.end) || "·"}
      </mark>,
    );
    cursor = m.end;
  });

  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}
