"use client";

import type { ConversionResult, ConvertTarget } from "./json-formatter.types";

let workerSingleton: Worker | null = null;
function getConvertWorker(): Worker {
  if (!workerSingleton) {
    workerSingleton = new Worker(
      new URL("./convert.worker.ts", import.meta.url),
    );
  }
  return workerSingleton;
}

let seq = 0;

type ConvertResponse =
  | { id: number; ok: true; result: ConversionResult }
  | { id: number; ok: false; message: string };

/**
 * Run a JSON → X conversion in the worker. Resolves with the converted
 * string; rejects on parse/convert failure. Used only for large inputs —
 * small inputs convert synchronously on the main thread (instant, no
 * loader), so there's no behaviour change for the common case. Options is
 * forwarded straight to the matching emitter.
 */
export function runConversion(
  target: ConvertTarget,
  jsonText: string,
  options?: unknown,
): Promise<ConversionResult> {
  return new Promise((resolve, reject) => {
    const worker = getConvertWorker();
    const id = ++seq;
    const onMessage = (e: MessageEvent<ConvertResponse>) => {
      const data = e.data;
      if (data.id !== id) return; // stale response from a superseded request
      worker.removeEventListener("message", onMessage);
      if (data.ok) resolve(data.result);
      else reject(new Error(data.message));
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ id, target, jsonText, options });
  });
}
