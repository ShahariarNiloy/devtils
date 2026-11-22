/// <reference lib="webworker" />

// Web Worker entry point for image compression. The main thread posts
// a buffer + mime + settings; this worker runs the full decode → resize
// → encode pipeline and posts back the result with the output buffer
// transferred (zero-copy). It also renders the "Show what changed" map.
//
// Owned exclusively by `worker-pool.ts`. Do not import this directly
// from React components — instantiating workers is the pool's job.

import { mergeCandidates } from "./image-compressor.auto";
import type { OutputMime } from "./image-compressor.constants";
import {
  toCompressionError,
  type CompressionError,
} from "./image-compressor.errors";
import { compressCandidates, computeDiff, estimateFromSample, type DiffResult } from "./image-compressor.lib";
import type { CandidateSummary, CompressionResult, CompressionSettings, EstimateSampleData } from "./image-compressor.types";

export type WorkerRequest =
  | {
      kind: "compress";
      id: string;
      buffer: ArrayBuffer;
      mime: string;
      settings: CompressionSettings;
      /** Encode only these containers (split Auto, comparison probes). */
      formats?: OutputMime[];
      /** Return the un-merged per-format results (the caller merges). */
      partial?: boolean;
      /** Render the HEIC display preview. */
      preview?: boolean;
      /** Attach the downscaled sample for estimates. */
      sample?: boolean;
    }
  | {
      kind: "estimate";
      id: string;
      sample: EstimateSampleData;
      settings: CompressionSettings;
      formats: OutputMime[];
    }
  | {
      kind: "diff";
      id: string;
      buffer: ArrayBuffer;
      mime: string;
      settings: CompressionSettings;
      result: { buffer: ArrayBuffer; mimeType: string };
    };

export type WorkerResponse =
  | { id: string; ok: true; kind: "compress"; results: CompressionResult[] }
  | { id: string; ok: true; kind: "diff"; diff: DiffResult }
  | { id: string; ok: true; kind: "estimate"; estimates: CandidateSummary[] }
  | { id: string; ok: false; error: CompressionError };

// `self` inside a module worker is the DedicatedWorkerGlobalScope.
const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    if (req.kind === "diff") {
      const diff = await computeDiff(req.buffer, req.mime, req.settings, req.result);
      const response: WorkerResponse = { id: req.id, ok: true, kind: "diff", diff };
      ctx.postMessage(response);
      return;
    }
    if (req.kind === "estimate") {
      const estimates = await estimateFromSample(req.sample, req.settings, req.formats);
      const response: WorkerResponse = { id: req.id, ok: true, kind: "estimate", estimates };
      ctx.postMessage(response);
      return;
    }
    const start = performance.now();
    const parts = await compressCandidates(req.buffer, req.mime, req.settings, {
      formats: req.formats,
      preview: req.preview,
      sample: req.sample,
    });
    const results = req.partial
      ? parts
      : [mergeCandidates(parts, { buffer: req.buffer, mime: req.mime }, req.settings, { encodingTimeMs: Math.round(performance.now() - start) })];
    const response: WorkerResponse = { id: req.id, ok: true, kind: "compress", results };
    // Transfer the result buffers back to the main thread (no copy). A kept
    // original shares the request buffer — list each buffer once.
    const transfer = new Set<ArrayBuffer>();
    for (const r of results) {
      transfer.add(r.buffer);
      if (r.sourcePreview) transfer.add(r.sourcePreview.buffer);
      if (r.sample) transfer.add(r.sample.buffer);
    }
    ctx.postMessage(response, [...transfer]);
  } catch (err) {
    // Forward the structured failure detail (plain object → structured
    // clone) so the main thread can map it to a kind-specific message.
    const response: WorkerResponse = { id: req.id, ok: false, error: toCompressionError(err) };
    ctx.postMessage(response);
  }
};
