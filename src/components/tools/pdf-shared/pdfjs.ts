/**
 * PDF.js, loaded on first use. Parsing happens in PDF.js's own worker; only
 * painting a page onto a canvas runs on the main thread, and callers keep
 * that small (thumbnails, or one visible page at a time).
 */

import type * as Pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import type { PdfFacts } from "./pdf-inspect.lib";

export type { PDFDocumentProxy, PDFPageProxy };

let lib: Promise<typeof Pdfjs> | null = null;

export function loadPdfjs(): Promise<typeof Pdfjs> {
  lib ??= import("pdfjs-dist").then((m) => {
    m.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    return m;
  });
  return lib;
}

export class PdfPasswordError extends Error {}

/**
 * Encryption and existing digital signatures, as PDF.js found them while
 * parsing (in its worker) — structural, so text that merely mentions
 * "/ByteRange" can't fool it.
 */
export async function pdfFacts(pdf: PDFDocumentProxy): Promise<PdfFacts> {
  const { info } = await pdf.getMetadata();
  const field = (k: string): unknown =>
    info && typeof info === "object" ? Reflect.get(info, k) : undefined;
  return {
    encrypted: field("EncryptFilterName") != null,
    digitallySigned: field("IsSignaturesPresent") === true,
  };
}

/** Release a document and its worker-side memory. */
export function closePdf(doc: PDFDocumentProxy): void {
  void doc.loadingTask.destroy();
}

/**
 * Open a PDF for display. PDF.js takes ownership of (detaches) the buffer it
 * is given, so it gets a copy and the caller keeps the original bytes.
 */
export async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: bytes.slice() });
  task.onPassword = () => {
    void task.destroy();
  };
  try {
    return await task.promise;
  } catch (e) {
    if (e instanceof Error && /password/i.test(e.name + e.message))
      throw new PdfPasswordError("password");
    throw e;
  }
}

/**
 * Paint one page at `cssWidth` CSS pixels wide (sharp on HiDPI screens),
 * honouring the page's own /Rotate plus `extraRotation`.
 */
export async function renderPage(
  page: PDFPageProxy,
  cssWidth: number,
  extraRotation = 0,
  canvas: HTMLCanvasElement = document.createElement("canvas"),
): Promise<HTMLCanvasElement> {
  const rotation = (page.rotate + extraRotation) % 360;
  const base = page.getViewport({ scale: 1, rotation });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const viewport = page.getViewport({
    scale: (cssWidth / base.width) * dpr,
    rotation,
  });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvas, viewport }).promise;
  return canvas;
}

/** A page as a small image URL — for long lists of thumbnails. */
export async function pageThumbnail(
  page: PDFPageProxy,
  cssWidth: number,
): Promise<string> {
  const canvas = await renderPage(page, cssWidth);
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/jpeg", 0.82),
  );
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new Error("Couldn't draw the page");
  return URL.createObjectURL(blob);
}

/**
 * Paint a page at an exact `scale` (1 = 72 DPI) onto `canvas`, sized `w` × `h`,
 * for export. Uses the "print" intent: PDF.js otherwise paces rendering to
 * animation frames (right for on-screen pages, ~100 ms of waiting per page
 * when exporting thousands). `transparent` leaves blank paper see-through.
 */
export async function renderPageAt(
  page: PDFPageProxy,
  scale: number,
  w: number,
  h: number,
  canvas: HTMLCanvasElement,
  transparent: boolean,
): Promise<void> {
  const viewport = page.getViewport({ scale });
  // Resizing clears the canvas, so a reused canvas never shows the last page.
  canvas.width = w;
  canvas.height = h;
  if (transparent) {
    // Given a bare canvas, PDF.js draws through an opaque (alpha: false)
    // context; hand it one that keeps alpha.
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D canvas");
    await page.render({
      canvas: null,
      canvasContext: ctx,
      viewport,
      intent: "print",
      background: "rgba(0,0,0,0)",
    }).promise;
    return;
  }
  await page.render({
    canvas,
    viewport,
    intent: "print",
    background: "#ffffff",
  }).promise;
}
