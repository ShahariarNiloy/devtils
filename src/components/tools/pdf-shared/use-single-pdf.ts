"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { looksLikePdf, type PdfFacts } from "./pdf-inspect.lib";
import { closePdf, openPdf, pageThumbnail, pdfFacts, PdfPasswordError, type PDFDocumentProxy } from "./pdfjs";
import { ThumbStore } from "./thumb-store";

export interface SinglePdf {
  name: string;
  size: number;
  bytes: Uint8Array;
  pdf: PDFDocumentProxy;
  pages: number;
  facts: PdfFacts;
}

/** Thumbnails are drawn once at the largest tile size and scaled by CSS. */
const THUMB_PX = 176;

/**
 * One open PDF plus lazily drawn page thumbnails — shared by Split and
 * Compress. Thumbnails render one at a time, in the order they're asked for.
 */
export function useSinglePdf({ thumbPx = THUMB_PX }: { thumbPx?: number } = {}) {
  const [doc, setDoc] = useState<SinglePdf | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  // Thumbnails live outside React state: each tile subscribes to its own.
  const [thumbs] = useState(() => new ThumbStore());
  const queue = useRef<number[]>([]);
  const running = useRef(false);
  const current = useRef<PDFDocumentProxy | null>(null);

  const reset = useCallback(() => {
    thumbs.drop(() => true);
    queue.current = [];
  }, [thumbs]);

  useEffect(
    () => () => {
      thumbs.drop(() => true);
      if (current.current) closePdf(current.current);
    },
    [thumbs],
  );

  const open = useCallback(
    async (file: File) => {
      setError("");
      setOpening(true);
      try {
        if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) throw new Error(`“${file.name}” isn't a PDF.`);
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!looksLikePdf(bytes)) throw new Error(`“${file.name}” isn't a PDF.`);
        let pdf: PDFDocumentProxy;
        try {
          pdf = await openPdf(bytes);
        } catch (e) {
          throw new Error(e instanceof PdfPasswordError ? `“${file.name}” is password-protected. Unlock it first, then open it again.` : `“${file.name}” couldn't be opened. It may be damaged.`);
        }
        const facts = await pdfFacts(pdf);
        if (facts.encrypted) {
          closePdf(pdf);
          throw new Error(`“${file.name}” is password-protected. Unlock it first, then open it again.`);
        }
        reset();
        if (current.current) closePdf(current.current);
        current.current = pdf;
        setDoc({ name: file.name, size: file.size, bytes, pdf, pages: pdf.numPages, facts });
      } catch (e) {
        setError(e instanceof Error ? e.message : "That file couldn't be opened.");
      } finally {
        setOpening(false);
      }
    },
    [reset],
  );

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (let i = queue.current.shift(); i !== undefined; i = queue.current.shift()) {
        const pdf = current.current;
        if (!pdf || thumbs.has(String(i))) continue;
        try {
          const page = await pdf.getPage(i + 1);
          const url = await pageThumbnail(page, thumbPx);
          page.cleanup();
          if (current.current !== pdf) {
            URL.revokeObjectURL(url);
            continue;
          }
          thumbs.set(String(i), url);
        } catch {
          /* leave the placeholder */
        }
      }
    } finally {
      running.current = false;
    }
  }, [thumbs, thumbPx]);

  const requestThumb = useCallback(
    (index: number) => {
      if (thumbs.has(String(index)) || queue.current.includes(index)) return;
      queue.current.push(index);
      void pump();
    },
    [pump, thumbs],
  );

  return { doc, opening, error, setError, open, thumbs, requestThumb };
}

/**
 * One IntersectionObserver for many tiles: `observe(el, index)` asks for a
 * thumbnail when the tile nears view, and returns the tile's cleanup.
 */
export function useThumbObserver(request: (index: number) => void) {
  const io = useRef<IntersectionObserver | null>(null);
  const targets = useRef(new Map<Element, number>());
  useEffect(() => {
    const t = targets.current;
    io.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = t.get(e.target);
          if (i !== undefined) request(i);
          io.current?.unobserve(e.target);
        }
      },
      { rootMargin: "400px 0px" },
    );
    for (const el of t.keys()) io.current.observe(el);
    return () => io.current?.disconnect();
  }, [request]);
  return useCallback((el: Element, index: number) => {
    targets.current.set(el, index);
    io.current?.observe(el);
    return () => {
      targets.current.delete(el);
      io.current?.unobserve(el);
    };
  }, []);
}
