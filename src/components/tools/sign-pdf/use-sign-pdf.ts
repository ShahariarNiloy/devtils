"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatBytes, looksLikePdf, pdfFileName, type PdfFacts } from "../pdf-shared/pdf-inspect.lib";
import { downloadPdf, runPdfJob } from "../pdf-shared/pdf-ops";
import type { SignItem } from "../pdf-shared/pdf-ops.types";
import { closePdf, openPdf, pdfFacts, PdfPasswordError, type PDFDocumentProxy } from "../pdf-shared/pdfjs";
import { dataUrlBytes, textAsset, textImage, type HandFont, type SigAsset } from "./sign-pdf.canvas";
import {
  fieldToPdfBox,
  formatDate,
  initialsOf,
  isWinAnsi,
  moveField,
  dateFieldText,
  newField,
  todayInput,
  refitAspect,
  resizeField,
  type DateFormat,
  type Field,
  type FieldKind,
} from "./sign-pdf.lib";

export type SigMode = "draw" | "type" | "upload";

export const INKS = [
  { id: "#1d2a52", label: "Navy" },
  { id: "#111111", label: "Black" },
  { id: "#1f4fb8", label: "Blue" },
] as const;
export type Ink = (typeof INKS)[number]["id"];

/** Pen widths for the draw pad, in CSS pixels. */
export const STROKES = [
  { px: 2, label: "Fine" },
  { px: 3.4, label: "Medium" },
  { px: 5.4, label: "Bold" },
] as const;
export type Stroke = (typeof STROKES)[number]["px"];

export interface OpenDoc {
  name: string;
  size: number;
  bytes: Uint8Array;
  pdf: PDFDocumentProxy;
  /** Page sizes as displayed at scale 1 (rotation applied), in points. */
  pages: { w: number; h: number }[];
  facts: PdfFacts;
}

const STORE = "utilyx.sign.v1";
interface Remembered {
  ink: Ink;
  stroke: Stroke;
  mode: SigMode;
  drawn: SigAsset | null;
  uploaded: SigAsset | null;
  typed: string;
  font: number;
  initials: string;
}

/** Text the ink can't hold reads as near-black. */
const TEXT_RGB: [number, number, number] = [0.1, 0.1, 0.1];

function hexRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function useSignPdf(fonts: readonly HandFont[]) {
  const [doc, setDoc] = useState<OpenDoc | null>(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [tool, setTool] = useState<FieldKind | null>(null);
  /** Format for the next date placed — whatever was chosen last. */
  const [dateFmt, setDateFmt] = useState<DateFormat>("long");
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);

  const [mode, setMode] = useState<SigMode>("draw");
  const [ink, setInk] = useState<Ink>(INKS[0].id);
  const [stroke, setStroke] = useState<Stroke>(STROKES[1].px);
  const [drawn, setDrawn] = useState<SigAsset | null>(null);
  const [uploaded, setUploaded] = useState<SigAsset | null>(null);
  const [typed, setTyped] = useState("");
  const [font, setFont] = useState(0);
  const [initials, setInitials] = useState("");
  const [remember, setRemember] = useState(false);
  const [typedAsset, setTypedAsset] = useState<SigAsset | null>(null);
  const [initAsset, setInitAsset] = useState<SigAsset | null>(null);
  const idSeq = useRef(0);

  /* ---------------------------------------------- remember on this device */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE);
      // Restoring browser storage after hydration is exactly what an effect is
      // for; reading it during render would mismatch the server HTML.
      /* eslint-disable react-hooks/set-state-in-effect */
      if (!raw) return;
      const r = JSON.parse(raw) as Partial<Remembered>;
      setRemember(true);
      if (r.ink && INKS.some((k) => k.id === r.ink)) setInk(r.ink);
      const st = STROKES.find((k) => k.px === r.stroke);
      if (st) setStroke(st.px);
      if (r.mode) setMode(r.mode);
      if (r.drawn) setDrawn(r.drawn);
      if (r.uploaded) setUploaded(r.uploaded);
      if (typeof r.typed === "string") setTyped(r.typed);
      if (typeof r.font === "number") setFont(r.font);
      if (typeof r.initials === "string") setInitials(r.initials);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      /* storage blocked or corrupt — start fresh */
    }
  }, []);
  useEffect(() => {
    try {
      if (!remember) {
        localStorage.removeItem(STORE);
        return;
      }
      const r: Remembered = { ink, stroke, mode, drawn, uploaded, typed, font, initials };
      localStorage.setItem(STORE, JSON.stringify(r));
    } catch {
      /* storage full or blocked */
    }
  }, [remember, ink, stroke, mode, drawn, uploaded, typed, font, initials]);

  /* ----------------------------------------- typed signature and initials */
  const face = fonts[font] ?? fonts[0];
  useEffect(() => {
    let live = true;
    void textAsset(typed, face, ink).then((a) => live && setTypedAsset(a));
    return () => {
      live = false;
    };
  }, [typed, face, ink]);
  const initialsText = initials.trim() || initialsOf(typed);
  useEffect(() => {
    let live = true;
    void textAsset(initialsText, face, ink).then((a) => live && setInitAsset(a));
    return () => {
      live = false;
    };
  }, [initialsText, face, ink]);

  let sigAsset: SigAsset | null = typedAsset;
  if (mode === "draw") sigAsset = drawn;
  else if (mode === "upload") sigAsset = uploaded;

  // Signature and initial boxes take the current signature's shape — derived
  // at render, so changing the signature reshapes every placed box.
  const sigAspect = sigAsset?.aspect;
  const initAspect = initAsset?.aspect;
  const fit = useCallback(
    (f: Field): Field => {
      if (!doc) return f;
      const pa = doc.pages[f.page].h / doc.pages[f.page].w;
      if (f.kind === "sig" && sigAspect) return refitAspect(f, pa, sigAspect);
      if (f.kind === "init" && initAspect) return refitAspect(f, pa, initAspect);
      return f;
    },
    [doc, sigAspect, initAspect],
  );
  const shown = useMemo(() => fields.map(fit), [fields, fit]);

  /* -------------------------------------------------------------- open */
  const openFile = useCallback(async (file: File | Uint8Array, name?: string) => {
    setError("");
    setOpening(true);
    try {
      const bytes = file instanceof Uint8Array ? file : new Uint8Array(await file.arrayBuffer());
      const label = name ?? (file instanceof File ? file.name : "document.pdf");
      if (!looksLikePdf(bytes)) throw new Error(`“${label}” isn't a PDF.`);
      let pdf: PDFDocumentProxy;
      try {
        pdf = await openPdf(bytes);
      } catch (e) {
        throw new Error(e instanceof PdfPasswordError ? `“${label}” is password-protected. Unlock it first, then open it again.` : `“${label}” couldn't be opened. It may be damaged.`);
      }
      const facts = await pdfFacts(pdf);
      if (facts.encrypted) {
        closePdf(pdf);
        throw new Error(`“${label}” is password-protected. Unlock it first, then open it again.`);
      }
      const pages: OpenDoc["pages"] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        pages.push({ w: vp.width, h: vp.height });
      }
      // The previous document is released by the effect below.
      setDoc({ name: label, size: bytes.byteLength, bytes, pdf, pages, facts });
      setFields([]);
      setSelId(null);
      setTool(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That file couldn't be opened.");
    } finally {
      setOpening(false);
    }
  }, []);

  useEffect(
    () => () => {
      if (doc) closePdf(doc.pdf);
    },
    [doc],
  );

  /* ------------------------------------------------------------ fields */
  const place = useCallback(
    (page: number, cx: number, cy: number) => {
      if (!tool || !doc) return;
      const pa = doc.pages[page].h / doc.pages[page].w;
      let aspect = 0.33;
      if (tool === "sig") aspect = sigAsset?.aspect ?? 0.33;
      else if (tool === "init") aspect = initAsset?.aspect ?? 0.5;
      const id = `fld${++idSeq.current}`;
      const f = newField(tool, page, cx, cy, pa, aspect, id);
      setFields((fs) => [...fs, tool === "date" ? { ...f, text: todayInput(), fmt: dateFmt } : f]);
      setSelId(id);
      setTool(null);
    },
    [tool, doc, sigAsset, initAsset, dateFmt],
  );
  const move = useCallback((id: string, dx: number, dy: number) => setFields((fs) => fs.map((f) => (f.id === id ? moveField(fit(f), dx, dy) : f))), [fit]);
  const resize = useCallback((id: string, w: number) => setFields((fs) => fs.map((f) => (f.id === id ? resizeField(fit(f), w) : f))), [fit]);
  const setText = useCallback((id: string, text: string) => setFields((fs) => fs.map((f) => (f.id === id ? { ...f, text } : f))), []);
  const setFieldFmt = useCallback((id: string, fmt: DateFormat) => {
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, fmt } : f)));
    setDateFmt(fmt);
  }, []);
  const remove = useCallback((id: string) => {
    setFields((fs) => fs.filter((f) => f.id !== id));
    setSelId((s) => (s === id ? null : s));
  }, []);

  const dateText = useMemo(() => formatDate(new Date(), dateFmt), [dateFmt]);

  /* ---------------------------------------------------------- download */
  const finish = useCallback(async () => {
    if (!doc || busy) return null;
    setBusy(true);
    setError("");
    try {
      const sigBytes = sigAsset ? await dataUrlBytes(sigAsset.url) : null;
      const initBytes = initAsset ? await dataUrlBytes(initAsset.url) : null;
      const items: SignItem[] = [];
      for (const f of shown) {
        const page = await doc.pdf.getPage(f.page + 1);
        const vp = page.getViewport({ scale: 1 });
        const box = fieldToPdfBox(f, vp.width, vp.height, (x, y) => {
          const p = vp.convertToPdfPoint(x, y);
          return [Number(p[0]), Number(p[1])];
        });
        if (f.kind === "sig" || f.kind === "init") {
          const png = f.kind === "sig" ? sigBytes : initBytes;
          if (png) items.push({ ...box, kind: "image", png });
        } else if (f.kind === "check") {
          items.push({ ...box, kind: "check", color: hexRgb(ink) });
        } else {
          const text = f.kind === "date" ? dateFieldText(f) : f.text.trim();
          if (!text) continue;
          if (isWinAnsi(text)) items.push({ ...box, kind: "text", text, color: TEXT_RGB });
          else {
            // Helvetica can't write it (Cyrillic, CJK…): draw it as an image, fitted to the box height.
            const img = await textImage(text, "#1a1a1a");
            if (!img) continue;
            const w = Math.min(box.w, box.h / img.aspect);
            items.push({ ...box, w, h: w * img.aspect, kind: "image", png: await dataUrlBytes(img.url) });
          }
        }
      }
      const [out] = (await runPdfJob({ kind: "sign", bytes: doc.bytes.slice().buffer, items })).outputs;
      const fileName = pdfFileName(`${doc.name.replace(/\.pdf$/i, "")}-signed`, "signed");
      downloadPdf(out, fileName);
      return { fileName, size: formatBytes(out.byteLength) };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signing failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [doc, busy, shown, sigAsset, initAsset, ink]);

  return {
    doc,
    opening,
    error,
    setError,
    openFile,
    fields: shown,
    selId,
    setSelId,
    tool,
    setTool,
    place,
    move,
    resize,
    setText,
    remove,
    dateFmt,
    setFieldFmt,
    stroke,
    setStroke,
    dateText,
    zoom,
    setZoom,
    busy,
    finish,
    mode,
    setMode,
    ink,
    setInk,
    drawn,
    setDrawn,
    uploaded,
    setUploaded,
    typed,
    setTyped,
    font,
    setFont,
    initials,
    setInitials,
    initialsText,
    remember,
    setRemember,
    sigAsset,
    initAsset,
  };
}
