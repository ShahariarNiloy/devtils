/** One entry point for every PDF job, used by the worker and the fallback. */

import { imageInfo, imagesToPdf, type RasterCodec } from "./images-to-pdf.lib";
import { compressPdf, mergePdfs, PdfOpError, signPdf, splitPdf, type ImageCodec } from "./pdf-ops.lib";
import type { PdfJob, PdfJobResult } from "./pdf-ops.types";

export type Codecs = ImageCodec & RasterCodec;
export type OnProgress = (done: number, total: number) => void;

export async function runJob(job: PdfJob, codec: Codecs, onProgress?: OnProgress): Promise<PdfJobResult> {
  try {
    switch (job.kind) {
      case "merge":
        return { outputs: [await mergePdfs(job)] };
      case "sign":
        return { outputs: [await signPdf(job)] };
      case "split":
        return { outputs: await splitPdf(job) };
      case "compress": {
        const r = await compressPdf(job, codec);
        return { outputs: [r.bytes], stats: r.stats };
      }
      case "images":
        return { outputs: [await imagesToPdf(job, codec, onProgress)] };
      case "image-info": {
        const r = await imageInfo(job, codec);
        return { outputs: [r.thumb], image: r.info };
      }
    }
  } catch (e) {
    if (e instanceof PdfOpError) throw e;
    throw new PdfOpError("Something went wrong while writing the PDF.");
  }
}
