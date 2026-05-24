/// <reference lib="webworker" />

// Web Worker entry point for image compression. The main thread posts
// a buffer + mime + settings; this worker runs the full decode → resize
// → encode pipeline and posts back the result with the output buffer
// transferred (zero-copy).
//
// Owned exclusively by `worker-pool.ts`. Do not import this directly
// from React components — instantiating workers is the pool's job.

import {
  toCompressionError,
  type CompressionError,
} from "./image-compressor.errors";
import { compressImageData } from "./image-compressor.lib";
import type { CompressionResult, CompressionSettings } from "./image-compressor.types";

export interface WorkerRequest {
  id: string;
  buffer: ArrayBuffer;
  mime: string;
  settings: CompressionSettings;
}

export type WorkerResponse =
  | { id: string; ok: true; result: CompressionResult }
  | { id: string; ok: false; error: CompressionError };

// `self` inside a module worker is the DedicatedWorkerGlobalScope.
const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, buffer, mime, settings } = e.data;
  try {
    const result = await compressImageData(buffer, mime, settings);
    const response: WorkerResponse = { id, ok: true, result };
    // Transfer the result buffer back to the main thread (no copy).
    ctx.postMessage(response, [result.buffer]);
  } catch (err) {
    // Forward the structured failure detail (plain object → structured
    // clone) so the main thread can map it to a kind-specific message.
    const response: WorkerResponse = {
      id,
      ok: false,
      error: toCompressionError(err),
    };
    ctx.postMessage(response);
  }
};
