"use client";

import { Caveat, Dancing_Script, Sacramento } from "next/font/google";
import { FileUp, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { ToolContent } from "@/components/shared/tool-content";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools/types";
import { formatBytes } from "../pdf-shared/pdf-inspect.lib";
import { seoData } from "./content";
import { PageView } from "./parts/page-view";
import { RailThumb } from "./parts/rail-thumb";
import { SidePanel } from "./parts/side-panel";
import { SignatureDialog } from "./parts/signature-dialog";
import type { FieldKind } from "./sign-pdf.lib";
import { useSignPdf } from "./use-sign-pdf";

// Handwriting fonts for typed signatures — fetched only when this tool loads.
const caveat = Caveat({ subsets: ["latin"], weight: "600", preload: false });
const dancing = Dancing_Script({ subsets: ["latin"], weight: "600", preload: false });
const sacramento = Sacramento({ subsets: ["latin"], weight: "400", preload: false });
const FONTS = [
  { family: caveat.style.fontFamily, weight: 600 },
  { family: dancing.style.fontFamily, weight: 600 },
  { family: sacramento.style.fontFamily, weight: 400 },
] as const;

const ARMED: Record<FieldKind, string> = { sig: "signature", init: "initials", date: "date", text: "text box", check: "checkmark" };
const BASE_W = 600;

const SEG = "min-h-7 cursor-pointer rounded-md border-0 px-2.5 text-xs font-semibold max-sm:min-h-11";
const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

export function SignPdf({ tool }: { tool: Tool }) {
  const s = useSignPdf(FONTS);
  const { doc } = s;
  const fileRef = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  // Pages fit the document panel (phones) up to 600 px, then zoom on top.
  const viewRef = useRef<HTMLDivElement>(null);
  const [panelW, setPanelW] = useState(BASE_W + 40);
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPanelW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const cssWidth = Math.round(Math.min(BASE_W, Math.max(240, panelW - 8)) * s.zoom);
  const nSig = s.fields.filter((f) => f.kind === "sig").length;

  const [sigOpen, setSigOpen] = useState(false);
  const [pending, setPending] = useState<FieldKind | null>(null);
  const pickTool = (k: FieldKind) => {
    s.setSelId(null);
    if (s.tool === k) {
      s.setTool(null);
      return;
    }
    if ((k === "sig" && !s.sigAsset) || (k === "init" && !s.initAsset)) {
      setPending(k);
      setSigOpen(true);
      return;
    }
    s.setTool(k);
  };

  const chooseDoc = () => fileRef.current?.click();
  const trySample = async () => {
    const { samplePdf } = await import("./sign-pdf.sample");
    await s.openFile(await samplePdf(), "rental-agreement.pdf");
  };
  // A certificate-signed PDF needs a second, deliberate click.
  // Tied to the open document, so opening another asks again.
  const [breakFor, setBreakFor] = useState<object | null>(null);
  const breakOk = doc !== null && breakFor === doc;
  const finish = async () => {
    if (doc?.facts.digitallySigned && !breakOk) {
      setBreakFor(doc);
      return;
    }
    const r = await s.finish();
    if (r) toast.success(`Saved ${r.fileName}`, { description: r.size });
  };
  let finishLabel = nSig ? "Finish & download" : "Add a signature to finish";
  if (nSig && doc?.facts.digitallySigned) finishLabel = breakOk ? "Sign anyway & download" : "Finish & download…";
  if (s.busy) finishLabel = "Signing…";

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      if (s.tool) s.setTool(null);
      else s.setSelId(null);
    }
  };
  const go = useCallback((n: number) => document.getElementById(`sign-page-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), []);

  const dropProps = {
    onDragOver: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDropping(true);
    },
    onDragLeave: (e: DragEvent) => {
      const next = e.relatedTarget;
      if (!(next instanceof Node && e.currentTarget.contains(next))) setDropping(false);
    },
    onDrop: (e: DragEvent) => {
      setDropping(false);
      if (!hasFiles(e)) return;
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) void s.openFile(f);
    },
  };

  return (
    <ToolShell tool={tool} titleStyle="inline" relatedSlugs={seoData.relatedSlugs}>
      <div
        id="tool"
        tabIndex={-1}
        onKeyDown={onKey}
        {...dropProps}
        className={cn("relative overflow-hidden rounded-[18px] bg-[#101010] shadow-window-tool outline-none", dropping && "shadow-[0_0_0_2px_var(--color-cat-clay)]")}
      >
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void s.openFile(f);
          }}
        />

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-subtle bg-toolbar px-3 py-2.5">
          {doc ? (
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-mono text-[12.5px] text-text-key" title={doc.name}>
                {doc.name}
              </span>
              <span className="text-[11.5px] text-text-faint">
                {doc.pages.length} page{doc.pages.length === 1 ? "" : "s"} · {formatBytes(doc.size)}
              </span>
            </div>
          ) : (
            <span className="text-[13px] text-text-tertiary">No document open</span>
          )}
          <span className="grow" />
          {s.tool && (
            <span className="inline-flex items-center gap-2 rounded-lg bg-[rgba(224,160,114,.1)] px-2.5 py-1 text-xs text-tier-pro-text" aria-live="polite">
              Click on the page to place the {ARMED[s.tool]} · Esc to cancel
              <button type="button" onClick={() => s.setTool(null)} className="cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-text underline">
                Cancel
              </button>
            </span>
          )}
          {doc && (
            <div role="group" aria-label="Zoom" className="flex items-center gap-0.5 rounded-lg border border-white/7 bg-[#0d0d0c] p-0.5">
              <button type="button" onClick={() => s.setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))} aria-label="Zoom out" className={cn(SEG, "px-2 text-text-tertiary hover:text-text")}>
                <ZoomOut size={14} aria-hidden />
              </button>
              <button type="button" onClick={() => s.setZoom(1)} aria-label="Reset zoom" className={cn(SEG, "w-12 font-mono text-text-strong")}>
                {Math.round(s.zoom * 100)}%
              </button>
              <button type="button" onClick={() => s.setZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10))} aria-label="Zoom in" className={cn(SEG, "px-2 text-text-tertiary hover:text-text")}>
                <ZoomIn size={14} aria-hidden />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={chooseDoc}
            className="min-h-[30px] cursor-pointer rounded-lg border border-white/12 bg-transparent px-3 text-[12.5px] font-semibold text-text-strong hover:border-white/25 max-sm:min-h-11"
          >
            {doc ? "Open another PDF" : "Open a PDF"}
          </button>
        </div>

        <div className={cn("grid", doc ? "lg:grid-cols-[108px_minmax(0,1fr)_340px]" : "lg:grid-cols-[minmax(0,1fr)_340px]")}>
          {/* page rail */}
          {doc && (
            <nav aria-label="Pages" className="hidden max-h-[900px] flex-col gap-2.5 overflow-auto border-r border-border-subtle p-3 lg:flex">
              {doc.pages.map((pg, i) => {
                const n = s.fields.filter((f) => f.page === i).length;
                return (
                  <button
                    // Pages never reorder while a document is open.
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    type="button"
                    onClick={() => go(i + 1)}
                    aria-label={`Go to page ${i + 1}${n ? `, ${n} field${n === 1 ? "" : "s"}` : ""}`}
                    className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border-0 bg-transparent p-1 text-text-faint hover:bg-white/4 hover:text-text"
                  >
                    <RailThumb pdf={doc.pdf} index={i} aspect={`${pg.w} / ${pg.h}`} />
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      {i + 1}
                      {n > 0 && <span className="rounded-full bg-[rgba(224,160,114,.15)] px-1.5 text-[10px] text-tier-pro-text">{n}</span>}
                    </span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* document */}
          <div ref={viewRef} className="min-w-0 overflow-auto bg-[#0b0b0a] p-3 max-lg:max-h-[620px] sm:p-5 lg:h-[900px]" {...dropProps}>
            {s.error && (
              <div role="alert" className="mx-auto mb-4 max-w-[600px] rounded-[9px] border border-[rgba(224,121,95,.3)] bg-[rgba(224,121,95,.1)] px-3 py-[9px] text-[13px] text-[#f0a892]">
                {s.error}
              </div>
            )}
            {doc ? (
              <div className="mx-auto flex w-max flex-col gap-6">
                {doc.pages.map((pg, i) => (
                  <PageView
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    pdf={doc.pdf}
                    index={i}
                    count={doc.pages.length}
                    aspect={pg.h / pg.w}
                    cssWidth={cssWidth}
                    fields={s.fields.filter((f) => f.page === i)}
                    selId={s.selId}
                    tool={s.tool}
                    sigUrl={s.sigAsset?.url ?? null}
                    initUrl={s.initAsset?.url ?? null}
                    ink={s.ink}
                    onPlace={s.place}
                    onSelect={s.setSelId}
                    onMove={s.move}
                    onResize={s.resize}
                    onText={s.setText}
                    onFmt={s.setFieldFmt}
                    onRemove={s.remove}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={chooseDoc}
                  className="flex w-full max-w-[520px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-white/16 bg-transparent px-6 py-14 text-sm text-text-tertiary hover:border-white/30"
                >
                  <FileUp size={28} aria-hidden className="text-cat-clay" />
                  <span className="text-[17px] font-bold text-text">{s.opening ? "Opening…" : "Drop a PDF to sign"}</span>
                  or click to choose. It stays on your device.
                </button>
                <button type="button" onClick={() => void trySample()} className="cursor-pointer border-0 bg-transparent text-[13px] text-text-tertiary underline underline-offset-4 hover:text-text">
                  Or try it on a sample agreement
                </button>
              </div>
            )}
          </div>

          <SidePanel
            hasDoc={Boolean(doc)}
            facts={doc?.facts ?? null}
            sigAsset={s.sigAsset}
            initAsset={s.initAsset}
            initialsText={s.initialsText}
            onEditSignature={() => setSigOpen(true)}
            tool={s.tool}
            onPickTool={pickTool}
            dateText={s.dateText}
            fields={s.fields}
            selId={s.selId}
            onSelectField={(f) => {
              s.setSelId(f.id);
              go(f.page + 1);
            }}
            onRemoveField={s.remove}
            finishLabel={finishLabel}
            canFinish={Boolean(doc) && nSig > 0 && Boolean(s.sigAsset) && !s.busy}
            busy={s.busy}
            warning={breakOk ? "This PDF already carries a certificate-based signature. Signing it here will invalidate that signature. Click again to sign anyway." : ""}
            onFinish={() => void finish()}
          />
        </div>

        {/* status bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-3.5 py-[9px] font-mono text-[11.5px] text-text-faint">
          <span className="text-success-text">● Signed on this device</span>
          <span className="max-sm:hidden">Drag to move · corner to resize · Delete to remove</span>
          <span className="grow" />
          <span>0 bytes uploaded</span>
        </div>
      </div>

      <SignatureDialog
        open={sigOpen}
        onOpenChange={(v) => {
          setSigOpen(v);
          // Picked Signature/Initials before making one: place it right after.
          if (!v && pending) {
            if (pending === "sig" ? s.sigAsset : s.initAsset) s.setTool(pending);
            setPending(null);
          }
        }}
        s={s}
        fonts={FONTS}
      />

      <ToolContent {...seoData} />
    </ToolShell>
  );
}
