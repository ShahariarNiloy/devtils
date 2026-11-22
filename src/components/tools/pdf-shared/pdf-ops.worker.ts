/// <reference lib="webworker" />
/**
 * PDF worker: merging, signing, splitting, compressing and building from
 * images with pdf-lib, off
 * the main thread, so a 300-page job never freezes the page. Results are
 * transferred back, not copied.
 */

import { browserCodec, rasterCodec } from "./pdf-codec";
import { runJob } from "./pdf-ops.run";
import type { PdfJob, PdfJobReply } from "./pdf-ops.types";

self.onmessage = async (e: MessageEvent<{ id: number; job: PdfJob }>) => {
  const { id, job } = e.data;
  try {
    const result = await runJob(job, { ...browserCodec, ...rasterCodec }, (done, total) => {
      const tick: PdfJobReply = { id, progress: { done, total } };
      self.postMessage(tick);
    });
    const reply: PdfJobReply = { id, ok: true, ...result };
    self.postMessage(
      reply,
      result.outputs.map((o) => o.buffer),
    );
  } catch (err) {
    // runJob only throws PdfOpError, whose messages are written for people.
    const error = err instanceof Error && err.message ? err.message : "Something went wrong while writing the PDF.";
    const reply: PdfJobReply = { id, ok: false, error };
    self.postMessage(reply);
  }
};
