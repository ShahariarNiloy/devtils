"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatBytes, looksLikePdf, pdfFileName } from "../pdf-shared/pdf-inspect.lib";
import { downloadPdf, runPdfJob } from "../pdf-shared/pdf-ops";
import { closePdf, openPdf, pageThumbnail, pdfFacts, PdfPasswordError, type PDFDocumentProxy } from "../pdf-shared/pdfjs";
import { ThumbStore } from "../pdf-shared/thumb-store";
import { pageKey, pagesOf, type PageItem, type PdfFile } from "./merge-pdf.lib";

/** Thumbnails are drawn once at the largest size and scaled down by CSS. */
export const THUMB_PX = 176;

const isPdfFile = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

export function useMergePdf() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [sel, setSel] = useState<ReadonlySet<string>>(new Set());
  // Thumbnails live outside React state: each tile subscribes to its own.
  const [thumbs] = useState(() => new ThumbStore());
  const [name, setName] = useState("merged.pdf");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(0);
  const [busy, setBusy] = useState(false);

  const bytes = useRef(new Map<string, Uint8Array>());
  const docs = useRef(new Map<string, PDFDocumentProxy>());
  const queue = useRef<string[]>([]);
  const queued = useRef(new Set<string>());
  const running = useRef(false);
  const hue = useRef(0);

  // Release everything when the tool unmounts.
  useEffect(() => {
    const d = docs.current;
    return () => {
      thumbs.drop(() => true);
      for (const doc of d.values()) closePdf(doc);
    };
  }, [thumbs]);

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (let key = queue.current.shift(); key; key = queue.current.shift()) {
        const [file, ix] = key.split(":");
        const doc = docs.current.get(file);
        if (!doc || thumbs.has(key)) continue;
        try {
          const page = await doc.getPage(Number(ix) + 1);
          const url = await pageThumbnail(page, THUMB_PX);
          page.cleanup();
          if (!docs.current.has(file)) {
            URL.revokeObjectURL(url);
            continue;
          }
          thumbs.set(key, url);
        } catch {
          /* leave the placeholder; the page still merges */
        }
      }
    } finally {
      running.current = false;
    }
  }, [thumbs]);

  /** Ask for a page's thumbnail (called when it scrolls into view). */
  const requestThumb = useCallback(
    (file: string, index: number) => {
      const key = pageKey(file, index);
      if (thumbs.has(key) || queued.current.has(key)) return;
      queued.current.add(key);
      queue.current.push(key);
      void pump();
    },
    [pump, thumbs],
  );

  const addFiles = useCallback(async (list: FileList | readonly File[] | null) => {
    const picked = Array.from(list ?? []);
    if (!picked.length) return;
    setError("");
    const problems: string[] = [];
    setLoading((n) => n + picked.length);
    for (const f of picked) {
      try {
        if (!isPdfFile(f)) {
          problems.push(`“${f.name}” isn't a PDF.`);
          continue;
        }
        const data = new Uint8Array(await f.arrayBuffer());
        if (!looksLikePdf(data)) {
          problems.push(`“${f.name}” isn't a PDF.`);
          continue;
        }
        let doc: PDFDocumentProxy;
        try {
          doc = await openPdf(data);
        } catch (e) {
          problems.push(
            e instanceof PdfPasswordError
              ? `“${f.name}” is password-protected. Unlock it first, then add it again.`
              : `“${f.name}” couldn't be opened. It may be damaged.`,
          );
          continue;
        }
        if ((await pdfFacts(doc)).encrypted) {
          closePdf(doc);
          problems.push(`“${f.name}” is password-protected. Unlock it first, then add it again.`);
          continue;
        }
        const id = `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
        bytes.current.set(id, data);
        docs.current.set(id, doc);
        const file: PdfFile = { id, name: f.name, size: f.size, pageCount: doc.numPages, hue: hue.current++ % 5 };
        setFiles((fs) => [...fs, file]);
        setPages((ps) => [...ps, ...pagesOf(file)]);
      } finally {
        setLoading((n) => n - 1);
      }
    }
    if (problems.length) setError(problems.join(" "));
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((fs) => fs.filter((f) => f.id !== id));
    setPages((ps) => ps.filter((p) => p.file !== id));
    setSel(new Set());
    bytes.current.delete(id);
    const doc = docs.current.get(id);
    if (doc) closePdf(doc);
    docs.current.delete(id);
    thumbs.drop((k) => k.startsWith(`${id}:`));
    for (const k of queued.current) if (k.startsWith(`${id}:`)) queued.current.delete(k);
  }, [thumbs]);

  const merge = useCallback(async () => {
    if (!pages.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const used = new Set(pages.map((p) => p.file));
      const [out] = (await runPdfJob({
        kind: "merge",
        files: [...used].map((id) => {
          const b = bytes.current.get(id);
          if (!b) throw new Error("A file went missing. Add it again.");
          return { id, bytes: b.slice().buffer };
        }),
        pages: pages.map((p) => ({ file: p.file, index: p.index, rotate: p.rotate })),
      })).outputs;
      const fileName = pdfFileName(name, "merged");
      downloadPdf(out, fileName);
      return { fileName, size: formatBytes(out.byteLength), pages: pages.length };
    } catch (e) {
      setError(e instanceof Error ? e.message : "The merge failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [pages, busy, name]);

  return {
    files,
    setFiles,
    pages,
    setPages,
    sel,
    setSel,
    thumbs,
    requestThumb,
    name,
    setName,
    error,
    setError,
    loading: loading > 0,
    busy,
    addFiles,
    removeFile,
    merge,
  };
}
