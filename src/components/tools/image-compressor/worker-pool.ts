/**
 * Worker pool for image compression. Owns N Worker instances, routes
 * compress() calls to a free worker (queueing if all busy), and
 * resurrects workers that crash. Workers are lazily created on first
 * use so an empty workspace doesn't burn memory on idle WASM.
 *
 * Buffers are transferred (not cloned) in both directions:
 *   main → worker: the input ArrayBuffer
 *   worker → main: the encoded result buffer
 *
 * After transfer, the source buffer's byteLength becomes 0 — the
 * caller has lost ownership. The hook reads File.arrayBuffer() afresh
 * for each compression so re-compression is unaffected.
 */

import { CompressionFailure } from "./image-compressor.errors";
import type { CompressionResult, CompressionSettings } from "./image-compressor.types";
import type { WorkerRequest, WorkerResponse } from "./compress.worker";

export interface WorkerPool {
  /**
   * Enqueue a compression. Returns both the assigned job ID (for
   * cancellation) and the result promise.
   */
  compress(
    buffer: ArrayBuffer,
    mime: string,
    settings: CompressionSettings,
  ): { id: string; promise: Promise<CompressionResult> };
  /**
   * Cancel a queued or in-flight job by ID. If in-flight, terminates
   * the handling worker (it gets respawned on next dispatch). The
   * job's promise rejects with a `CompressionFailure({ kind: "cancelled" })`.
   * Returns true if the job was found and cancelled, false otherwise.
   */
  cancel(jobId: string): boolean;
  terminate(): void;
}

interface Job {
  id: string;
  request: WorkerRequest;
  resolve: (result: CompressionResult) => void;
  reject: (err: Error) => void;
}

interface PooledWorker {
  worker: Worker;
  busy: boolean;
  currentJobId: string | null;
}

function newJobId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function spawnWorker(): Worker {
  return new Worker(new URL("./compress.worker.ts", import.meta.url), {
    type: "module",
  });
}

export function createWorkerPool(size: number): WorkerPool {
  const workers: PooledWorker[] = [];
  const pendingJobs = new Map<string, Job>();
  const queue: Job[] = [];
  let terminated = false;

  function ensureWorker(slot: number): PooledWorker {
    let p = workers[slot];
    if (p && !terminated) return p;
    const worker = spawnWorker();
    p = { worker, busy: false, currentJobId: null };
    workers[slot] = p;

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { id } = e.data;
      const job = pendingJobs.get(id);
      pendingJobs.delete(id);
      p.busy = false;
      p.currentJobId = null;
      if (job) {
        if (e.data.ok) job.resolve(e.data.result);
        else job.reject(new CompressionFailure(e.data.error));
      }
      dispatch();
    };

    // If the worker crashes mid-job, reject the in-flight job and
    // resurrect the worker so subsequent calls don't get stuck.
    worker.onerror = (e: ErrorEvent) => {
      const failingJobId = p.currentJobId;
      const job = failingJobId ? pendingJobs.get(failingJobId) : null;
      if (job && failingJobId) {
        pendingJobs.delete(failingJobId);
        job.reject(
          new CompressionFailure({
            kind: "unknown",
            message: e.message || "Compression worker crashed",
          }),
        );
      }
      // Tear down and replace this slot.
      try {
        worker.terminate();
      } catch {
        // ignore
      }
      delete workers[slot];
      if (!terminated) {
        // Force lazy re-creation on the next dispatch loop.
        dispatch();
      }
    };

    return p;
  }

  function dispatch() {
    if (terminated) return;
    if (queue.length === 0) return;
    // Find or create a free worker slot up to `size`.
    for (let i = 0; i < size; i++) {
      const slot = workers[i];
      if (slot && slot.busy) continue;
      const job = queue.shift();
      if (!job) return;
      const p = ensureWorker(i);
      p.busy = true;
      p.currentJobId = job.id;
      pendingJobs.set(job.id, job);
      // Transfer the input buffer into the worker (no copy).
      p.worker.postMessage(job.request, [job.request.buffer]);
      if (queue.length === 0) return;
    }
  }

  function compress(
    buffer: ArrayBuffer,
    mime: string,
    settings: CompressionSettings,
  ): { id: string; promise: Promise<CompressionResult> } {
    const id = newJobId();
    if (terminated) {
      return {
        id,
        promise: Promise.reject(new CompressionFailure({ kind: "unknown", message: "Pool terminated" })),
      };
    }
    const promise = new Promise<CompressionResult>((resolve, reject) => {
      queue.push({
        id,
        request: { id, buffer, mime, settings },
        resolve,
        reject,
      });
      dispatch();
    });
    return { id, promise };
  }

  function cancel(jobId: string): boolean {
    // Case 1: job is currently running on a worker — terminate that
    // worker (it gets re-spawned on next dispatch via ensureWorker).
    for (let i = 0; i < workers.length; i++) {
      const p = workers[i];
      if (p && p.currentJobId === jobId) {
        try {
          p.worker.terminate();
        } catch {
          /* ignore */
        }
        delete workers[i];
        const job = pendingJobs.get(jobId);
        pendingJobs.delete(jobId);
        if (job) job.reject(new CompressionFailure({ kind: "cancelled" }));
        dispatch();
        return true;
      }
    }
    // Case 2: job is still queued — drop it.
    const idx = queue.findIndex((j) => j.id === jobId);
    if (idx >= 0) {
      const [job] = queue.splice(idx, 1);
      job.reject(new CompressionFailure({ kind: "cancelled" }));
      return true;
    }
    return false;
  }

  function terminate() {
    terminated = true;
    for (const p of workers) {
      if (!p) continue;
      try {
        p.worker.terminate();
      } catch {
        // ignore
      }
    }
    workers.length = 0;
    for (const job of pendingJobs.values()) {
      job.reject(new CompressionFailure({ kind: "unknown", message: "Pool terminated" }));
    }
    pendingJobs.clear();
    for (const job of queue) {
      job.reject(new CompressionFailure({ kind: "unknown", message: "Pool terminated" }));
    }
    queue.length = 0;
  }

  return { compress, cancel, terminate };
}
