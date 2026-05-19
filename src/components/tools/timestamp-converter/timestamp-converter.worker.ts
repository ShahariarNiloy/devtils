/// <reference lib="webworker" />

/**
 * Batch parse/convert off the main thread. parseInput pulls Temporal +
 * chrono (heavy) — running it here keeps a 10k-row paste from freezing the
 * UI. Only small string rows cross the boundary back.
 */

import { parseInput } from "./timestamp-converter.lib";

interface BatchRequest {
  id: number;
  inputs: string[];
}
export interface BatchRow {
  input: string;
  format: string;
  iso: string;
  ok: boolean;
}
type BatchResponse = { id: number; rows: BatchRow[] };

// Worker globals collide with the DOM lib in this tsconfig; one cast.
const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<BatchRequest>) => {
  const { id, inputs } = e.data;
  const rows: BatchRow[] = inputs.map((raw) => {
    const r = parseInput(raw);
    return {
      input: raw,
      format: r.detectedFormat,
      iso: r.ok && r.instant ? r.instant.toString() : "",
      ok: r.ok,
    };
  });
  ctx.postMessage({ id, rows } satisfies BatchResponse);
};

export {};
