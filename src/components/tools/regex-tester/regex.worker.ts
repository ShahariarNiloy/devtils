/// <reference lib="webworker" />

/**
 * Off-main-thread regex execution. A catastrophic-backtracking pattern can
 * hang a synchronous `regex.exec` indefinitely and there is no way to abort
 * it from JS — so we run it here and let the main thread terminate this
 * worker on timeout (see regex-client). That turns a frozen tab into a
 * graceful "pattern too slow" message.
 */

import {
  compile,
  matchAll,
  replaceText,
  splitText,
  type RegexMatch,
} from "./regex.lib";

interface RegexRequest {
  id: number;
  pattern: string;
  flags: string;
  text: string;
  replacement: string;
  mode: string;
}
type RegexResponse =
  | {
      id: number;
      ok: true;
      matches: RegexMatch[];
      execMs: number;
      replaced: string | null;
      parts: string[] | null;
    }
  | { id: number; ok: false; error: string };

// Worker globals collide with the DOM lib in this project's tsconfig; this
// single cast narrows `self` to the worker scope so the message API is typed.
const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<RegexRequest>) => {
  const { id, pattern, flags, text, replacement, mode } = e.data;
  const c = compile(pattern, flags);
  if (!c.ok) {
    ctx.postMessage({ id, ok: false, error: c.message } satisfies RegexResponse);
    return;
  }
  const t0 = performance.now();
  const matches = matchAll(c.regex, text);
  const execMs = Math.round((performance.now() - t0) * 10) / 10;
  // Only compute what the active mode needs (replace/split over the whole
  // text is wasted work on the Match/Extract tabs).
  const replaced =
    mode === "replace" ? replaceText(c.regex, text, replacement) : null;
  const parts = mode === "split" ? splitText(c.regex, text) : null;
  ctx.postMessage({
    id,
    ok: true,
    matches,
    execMs,
    replaced,
    parts,
  } satisfies RegexResponse);
};

export {};
