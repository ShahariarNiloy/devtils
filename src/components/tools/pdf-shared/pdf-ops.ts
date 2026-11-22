/**
 * Client for the PDF worker, plus saving the result. Falls back to running
 * pdf-lib on the main thread if workers aren't available.
 */

import type { OnProgress } from "./pdf-ops.run";
import type { PdfJob, PdfJobReply, PdfJobResult } from "./pdf-ops.types";

let worker: Worker | null | undefined;
let seq = 0;
const pending = new Map<number, { resolve: (r: PdfJobResult) => void; reject: (e: Error) => void; onProgress?: OnProgress }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    if (typeof Worker === "undefined") throw new Error("no worker");
    const w = new Worker(new URL("./pdf-ops.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<PdfJobReply>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      if ("progress" in e.data) {
        p.onProgress?.(e.data.progress.done, e.data.progress.total);
        return;
      }
      pending.delete(e.data.id);
      if (e.data.ok) p.resolve({ outputs: e.data.outputs, stats: e.data.stats, image: e.data.image });
      else p.reject(new Error(e.data.error));
    };
    w.onerror = () => {
      for (const p of pending.values()) p.reject(new Error("The PDF worker stopped. Try again."));
      pending.clear();
      worker = null;
    };
    worker = w;
  } catch {
    worker = null;
  }
  return worker;
}

/** The buffers a job carries — each caller passes copies it no longer needs. */
function transferablesOf(job: PdfJob): ArrayBuffer[] {
  switch (job.kind) {
    case "merge":
      return job.files.map((f) => f.bytes);
    case "sign":
      // Several fields share one signature image; a buffer may be listed only once.
      return [...new Set([job.bytes, ...job.items.flatMap((it) => (it.kind === "image" ? [it.png] : []))])];
    case "split":
    case "compress":
      return [job.bytes];
    case "images":
    case "image-info":
      // Blobs cross by reference; there's nothing to move.
      return [];
  }
}

/**
 * Run a PDF job. Input buffers are *moved* to the worker (the caller's copy
 * is emptied), so pass bytes you no longer need — e.g. `bytes.slice().buffer`.
 */
export async function runPdfJob(job: PdfJob, onProgress?: OnProgress): Promise<PdfJobResult> {
  const w = getWorker();
  if (!w) {
    const [{ runJob }, { browserCodec, rasterCodec }] = await Promise.all([import("./pdf-ops.run"), import("./pdf-codec")]);
    return runJob(job, { ...browserCodec, ...rasterCodec }, onProgress);
  }
  const id = ++seq;
  return new Promise<PdfJobResult>((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    // Move, don't copy: callers hand over fresh buffers, so a 300 MB PDF
    // isn't duplicated on its way to the worker.
    w.postMessage({ id, job }, transferablesOf(job));
  });
}

/** Save a blob as a file download. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Save PDF bytes as a file download. */
export function downloadPdf(bytes: Uint8Array, name: string): void {
  // pdf-lib types its output as Uint8Array<ArrayBufferLike>; it is always a
  // plain ArrayBuffer underneath, which is what Blob wants.
  downloadBlob(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }), name);
}
