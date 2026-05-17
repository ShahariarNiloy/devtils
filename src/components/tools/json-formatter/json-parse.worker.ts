/// <reference lib="webworker" />

/**
 * Off-main-thread JSON.parse. Only used for large inputs (see
 * `use-async-parsed`) — JSON.parse is synchronous and blocks the tab on big
 * documents, so we move the parse here. The parsed object still has to be
 * structured-cloned back, but the long blocking parse no longer freezes the
 * UI thread.
 */

interface ParseRequest {
  id: number;
  src: string;
}
type ParseResponse =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false };

// Worker globals collide with the DOM lib in this project's tsconfig; this
// single cast narrows `self` to the worker scope so the message API is typed.
const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<ParseRequest>) => {
  const { id, src } = e.data;
  try {
    const value: unknown = JSON.parse(src);
    ctx.postMessage({ id, ok: true, value } satisfies ParseResponse);
  } catch {
    ctx.postMessage({ id, ok: false } satisfies ParseResponse);
  }
};

export {};
