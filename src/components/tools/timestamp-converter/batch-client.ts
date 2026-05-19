"use client";

import type { BatchRow } from "./timestamp-converter.worker";

export type { BatchRow };

let worker: Worker | null = null;
function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL("./timestamp-converter.worker.ts", import.meta.url),
    );
  }
  return worker;
}

let seq = 0;

/**
 * Convert many inputs in the worker.
 *
 * @param inputs - One raw timestamp/date per entry.
 * @returns Parsed rows (input, detected format, ISO, ok).
 */
export function runBatch(inputs: string[]): Promise<BatchRow[]> {
  return new Promise((resolve) => {
    const w = getWorker();
    const id = ++seq;
    const onMessage = (e: MessageEvent<{ id: number; rows: BatchRow[] }>) => {
      if (e.data.id !== id) return;
      w.removeEventListener("message", onMessage);
      resolve(e.data.rows);
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ id, inputs });
  });
}
