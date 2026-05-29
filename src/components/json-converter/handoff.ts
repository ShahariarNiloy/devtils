/**
 * One-shot input handoff between the JSON formatter's Convert dropdown and
 * the dedicated converter tools. The formatter writes the current JSON to
 * sessionStorage, navigates to /tools/json-to-X, and the destination tool
 * picks it up on mount and clears the key (so a subsequent visit to the
 * dedicated tool URL doesn't get stale input).
 *
 * Why sessionStorage and not the URL: the input may be hundreds of KB; that
 * doesn't fit in a URL and would also expose payload contents in browser
 * history / referrer headers. sessionStorage is scoped to the tab and clears
 * on close — the right blast radius.
 */

const KEY = "json-converter:handoff";

export function stashHandoffInput(input: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, input);
  } catch {
    // QuotaExceeded / sandboxed — fall through; the dedicated tool just
    // opens with its default sample instead.
  }
}

/** Consumes and clears any pending handoff. Returns null when nothing is stashed. */
export function consumeHandoffInput(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(KEY);
    if (v !== null) sessionStorage.removeItem(KEY);
    return v;
  } catch {
    return null;
  }
}
