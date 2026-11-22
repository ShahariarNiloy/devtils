"use client";

import { memo, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from "react";
import { cn } from "@/lib/cn";
import { renderPage, type PDFDocumentProxy } from "../../pdf-shared/pdfjs";
import { dateFieldText, FIELD_LABEL, formatDate, parseDateInput, type DateFormat, type Field, type FieldKind } from "../sign-pdf.lib";

interface Props {
  pdf: PDFDocumentProxy;
  index: number;
  count: number;
  /** Page aspect (height ÷ width) as displayed. */
  aspect: number;
  cssWidth: number;
  fields: readonly Field[];
  selId: string | null;
  tool: FieldKind | null;
  sigUrl: string | null;
  initUrl: string | null;
  ink: string;
  onPlace: (page: number, cx: number, cy: number) => void;
  onSelect: (id: string | null) => void;
  onMove: (id: string, dx: number, dy: number) => void;
  onResize: (id: string, w: number) => void;
  onText: (id: string, text: string) => void;
  onFmt: (id: string, fmt: DateFormat) => void;
  onRemove: (id: string) => void;
}

/** Paint the page when it's near the viewport, and again when the zoom settles. */
function usePageCanvas(pdf: PDFDocumentProxy, index: number, cssWidth: number) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const page = await pdf.getPage(index + 1);
        const off = await renderPage(page, cssWidth);
        const c = ref.current;
        if (!live || !c) return;
        c.width = off.width;
        c.height = off.height;
        c.getContext("2d")?.drawImage(off, 0, 0);
        off.width = 0;
      } catch {
        /* a page that won't paint stays blank; signing still works */
      }
    }, 90);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [pdf, index, cssWidth, visible]);
  return ref;
}

const FORMATS: readonly DateFormat[] = ["long", "us", "iso"];

/** Opens under a selected date field: which date, and how it's written. */
function DatePopover({ f, onText, onFmt }: { f: Field; onText: Props["onText"]; onFmt: Props["onFmt"] }) {
  const fmt = f.fmt ?? "long";
  const day = parseDateInput(f.text) ?? new Date();
  return (
    <div
      data-popover
      role="dialog"
      aria-label="Date"
      onClick={(e) => e.stopPropagation()}
      className="absolute top-full left-0 z-20 mt-2 flex w-[220px] cursor-default flex-col gap-2 rounded-xl border border-white/10 bg-[#1c1c1a] p-2.5 shadow-float"
    >
      <input
        type="date"
        value={f.text}
        aria-label="Date"
        onChange={(e) => e.target.value && onText(f.id, e.target.value)}
        className="min-h-9 rounded-lg border border-white/10 bg-[#0d0d0c] px-2.5 font-mono text-[13px] text-[#f0ece2] [color-scheme:dark] outline-none focus-visible:border-border-strong"
      />
      <div role="radiogroup" aria-label="Date format" className="flex flex-col gap-0.5">
        {FORMATS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={fmt === id}
            onClick={() => onFmt(f.id, id)}
            className={cn(
              "flex min-h-8 cursor-pointer items-center justify-between rounded-md border-0 px-2.5 font-mono text-[12.5px]",
              fmt === id ? "bg-selected text-text" : "bg-transparent text-text-tertiary hover:bg-white/4 hover:text-text",
            )}
          >
            {formatDate(day, id)}
            {fmt === id && <span aria-hidden="true" className="text-cat-clay">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function FieldBox({
  f,
  selected,
  sigUrl,
  initUrl,
  ink,
  pageEl,
  onSelect,
  onMove,
  onResize,
  onText,
  onFmt,
  onRemove,
}: {
  f: Field;
  selected: boolean;
  sigUrl: string | null;
  initUrl: string | null;
  ink: string;
  pageEl: () => HTMLElement | null;
  onSelect: (id: string) => void;
  onMove: Props["onMove"];
  onResize: Props["onResize"];
  onText: Props["onText"];
  onFmt: Props["onFmt"];
  onRemove: Props["onRemove"];
}) {
  const drag = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
    if (e.target instanceof Element && e.target.closest("[data-popover]")) return;
    const page = pageEl()?.getBoundingClientRect();
    if (!page) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(f.id);
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    let lx = e.clientX;
    let ly = e.clientY;
    const mv = (ev: PointerEvent) => {
      onMove(f.id, (ev.clientX - lx) / page.width, (ev.clientY - ly) / page.height);
      lx = ev.clientX;
      ly = ev.clientY;
    };
    const up = () => {
      el.removeEventListener("pointermove", mv);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", mv);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  const resize = (e: RPointerEvent<HTMLSpanElement>) => {
    const page = pageEl()?.getBoundingClientRect();
    if (!page) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const sx = e.clientX;
    const w0 = f.w;
    const mv = (ev: PointerEvent) => onResize(f.id, w0 + (ev.clientX - sx) / page.width);
    const up = () => {
      el.removeEventListener("pointermove", mv);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", mv);
    el.addEventListener("pointerup", up);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement || (e.target instanceof Element && e.target.closest("[data-popover]"))) return;
    const step = e.shiftKey ? 0.02 : 0.005;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = moves[e.key];
    if (d) {
      e.preventDefault();
      onMove(f.id, d[0], d[1]);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onRemove(f.id);
    }
  };

  let url: string | null = null;
  if (f.kind === "sig") url = sigUrl;
  else if (f.kind === "init") url = initUrl;
  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${FIELD_LABEL[f.kind]} field — arrow keys move it, Delete removes it`}
      onPointerDown={drag}
      onFocus={() => onSelect(f.id)}
      onKeyDown={onKey}
      className={cn(
        "absolute flex cursor-move touch-none items-center rounded-[3px] outline-none [container-type:size]",
        selected ? "border-[1.5px] border-dashed border-clay bg-[rgba(224,160,114,.08)]" : "border-[1.5px] border-dashed border-transparent hover:border-clay/50",
      )}
      style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%` }}
    >
      {(f.kind === "sig" || f.kind === "init") &&
        (url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={FIELD_LABEL[f.kind]} draggable={false} className="pointer-events-none size-full object-contain" />
        ) : (
          <span className="w-full text-center text-[10px] text-[#8b6b4f]">{f.kind === "sig" ? "Make your signature →" : "Add initials →"}</span>
        ))}
      {f.kind === "date" && (
        <span className="pointer-events-none truncate font-[Helvetica,Arial,sans-serif] text-[70cqh] leading-none text-[#1a1a1a]">{dateFieldText(f)}</span>
      )}
      {f.kind === "text" && (
        <input
          value={f.text}
          onChange={(e) => onText(f.id, e.target.value)}
          onFocus={() => onSelect(f.id)}
          aria-label="Text field"
          className="size-full min-w-0 border-0 bg-transparent p-0 font-[Helvetica,Arial,sans-serif] text-[70cqh] leading-none text-[#1a1a1a] outline-none"
        />
      )}
      {f.kind === "check" && (
        <svg viewBox="0 0 10 10" className="pointer-events-none size-full" aria-hidden="true">
          <path d="M1.2 5 L4 8.2 L9 1.4" fill="none" stroke={ink} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {selected && f.kind === "date" && <DatePopover f={f} onText={onText} onFmt={onFmt} />}
      {selected && (
        <>
          <button
            type="button"
            onClick={() => onRemove(f.id)}
            aria-label={`Remove ${FIELD_LABEL[f.kind]}`}
            className="absolute -top-3 -right-3 flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-[#1a1a18] text-sm leading-none text-text shadow-float"
          >
            ×
          </button>
          <span aria-hidden="true" onPointerDown={resize} className="absolute -right-1.5 -bottom-1.5 size-3 cursor-nwse-resize rounded-sm border-[1.5px] border-clay bg-[#f6f2ea]" />
        </>
      )}
    </div>
  );
}

/** One document page with its fields. */
export const PageView = memo(function PageView(p: Props) {
  const canvas = usePageCanvas(p.pdf, p.index, p.cssWidth);
  const pageRef = useRef<HTMLDivElement>(null);
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={pageRef}
        id={`sign-page-${p.index + 1}`}
        onClick={(e) => {
          if (!p.tool) {
            if (e.target === e.currentTarget || e.target === canvas.current) p.onSelect(null);
            return;
          }
          const r = e.currentTarget.getBoundingClientRect();
          p.onPlace(p.index, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
        }}
        className={cn("relative bg-white shadow-[0_10px_30px_rgba(0,0,0,.45)]", p.tool ? "cursor-crosshair" : "cursor-default")}
        style={{ width: p.cssWidth, height: p.cssWidth * p.aspect }}
      >
        <canvas ref={canvas} aria-label={`Page ${p.index + 1}`} className="absolute inset-0 block size-full" />
        {p.fields.map((f) => (
          <FieldBox
            key={f.id}
            f={f}
            selected={p.selId === f.id}
            sigUrl={p.sigUrl}
            initUrl={p.initUrl}
            ink={p.ink}
            pageEl={() => pageRef.current}
            onSelect={p.onSelect}
            onMove={p.onMove}
            onResize={p.onResize}
            onText={p.onText}
            onFmt={p.onFmt}
            onRemove={p.onRemove}
          />
        ))}
      </div>
      <span className="font-mono text-[11.5px] text-text-faint">
        Page {p.index + 1} of {p.count}
      </span>
    </div>
  );
});
