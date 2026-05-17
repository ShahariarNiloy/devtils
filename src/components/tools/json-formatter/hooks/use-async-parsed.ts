"use client";

import { useEffect, useMemo, useState } from "react";
import { parseJson } from "../json-formatter.lib";

// Below this, parse synchronously in render — identical to the old behaviour,
// zero added latency for the common case. Above it, offload to the worker.
const WORKER_THRESHOLD = 256_000; // chars (~256 KB)

let workerSingleton: Worker | null = null;
function getParseWorker(): Worker {
  if (!workerSingleton) {
    workerSingleton = new Worker(
      new URL("../json-parse.worker.ts", import.meta.url),
    );
  }
  return workerSingleton;
}

let seq = 0;

type ParseResponse =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false };

/**
 * Parse `src` to a JS value. Small inputs parse synchronously (no behaviour
 * change). Large inputs go to a worker so JSON.parse never freezes the tab;
 * the last good value is kept until the new parse resolves
 * (stale-while-revalidate) so the views don't flash empty mid-edit.
 */
export function useAsyncParsed(src: string): unknown {
  const small = src.length <= WORKER_THRESHOLD;

  const sync = useMemo<{ v: unknown } | null>(() => {
    if (!src.trim()) return { v: null };
    if (!small) return null; // defer to the worker branch
    try {
      return { v: parseJson(src) };
    } catch {
      return { v: null };
    }
  }, [src, small]);

  const [asyncValue, setAsyncValue] = useState<unknown>(null);

  useEffect(() => {
    if (small || !src.trim()) return;
    const worker = getParseWorker();
    const id = ++seq;
    const onMessage = (e: MessageEvent<ParseResponse>) => {
      const data = e.data;
      if (data.id !== id) return; // stale response from a superseded edit
      setAsyncValue(data.ok ? data.value : null);
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ id, src });
    return () => worker.removeEventListener("message", onMessage);
  }, [src, small]);

  return sync ? sync.v : asyncValue;
}
