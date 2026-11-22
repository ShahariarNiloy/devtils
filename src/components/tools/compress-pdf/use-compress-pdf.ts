"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runPdfJob } from "../pdf-shared/pdf-ops";
import type { CompressStats } from "../pdf-shared/pdf-ops.types";
import { closePdf, openPdf, renderPage, type PDFDocumentProxy } from "../pdf-shared/pdfjs";
import { useSinglePdf } from "../pdf-shared/use-single-pdf";
import { LEVELS, type Level } from "./compress-pdf.lib";

export interface Result {
  bytes: Uint8Array;
  stats: CompressStats;
  level: Level;
  pdf: PDFDocumentProxy | null;
}

/** Page width used for the before/after comparison, in CSS px. */
const COMPARE_PX = 1100;

async function pageUrl(pdf: PDFDocumentProxy, index: number): Promise<string> {
  const page = await pdf.getPage(index + 1);
  const canvas = await renderPage(page, COMPARE_PX);
  page.cleanup();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  canvas.width = 0;
  if (!blob) throw new Error("render");
  return URL.createObjectURL(blob);
}

export function useCompressPdf() {
  const single = useSinglePdf();
  const { doc, setError } = single;
  const [level, setLevel] = useState<Level>("recommended");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [urls, setUrls] = useState<{ before: string; after: string } | null>(null);
  const seq = useRef(0);

  // Compress whenever the document or the level changes; stale runs are dropped.
  useEffect(() => {
    if (!doc) return;
    const run = ++seq.current;
    const t = setTimeout(async () => {
      setBusy(true);
      setError("");
      try {
        const L = LEVELS[level];
        const { outputs, stats } = await runPdfJob({
          kind: "compress",
          bytes: doc.bytes.slice().buffer,
          quality: L.quality,
          maxPx: L.maxPx,
          photosFromLossless: L.photosFromLossless,
        });
        if (run !== seq.current || !stats) return;
        const bytes = outputs[0];
        let pdf: PDFDocumentProxy | null = null;
        try {
          pdf = await openPdf(bytes);
        } catch {
          pdf = null;
        }
        if (run !== seq.current) {
          if (pdf) closePdf(pdf);
          return;
        }
        setResult((old) => {
          if (old?.pdf) closePdf(old.pdf);
          return { bytes, stats, level, pdf };
        });
      } catch (e) {
        if (run === seq.current) setError(e instanceof Error ? e.message : "Compression failed.");
      } finally {
        if (run === seq.current) setBusy(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [doc, level, setError]);

  // Render the chosen page before and after, for the drag-to-compare view.
  useEffect(() => {
    const after = result?.pdf;
    if (!doc || !after) return;
    let live = true;
    const made: string[] = [];
    void (async () => {
      try {
        const b = await pageUrl(doc.pdf, page);
        made.push(b);
        const a = await pageUrl(after, page);
        made.push(a);
        if (live) setUrls({ before: b, after: a });
      } catch {
        /* comparison is a nicety; the download still works */
      }
    })();
    return () => {
      live = false;
      for (const u of made) URL.revokeObjectURL(u);
    };
  }, [doc, result, page]);

  const openFile = useCallback(
    async (f: File) => {
      setResult(null);
      setUrls(null);
      setPage(0);
      await single.open(f);
    },
    [single],
  );

  return { ...single, openFile, level, setLevel, result, busy, page, setPage, urls };
}
