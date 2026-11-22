"use client";

import { ChevronLeft, ChevronRight, FileUp, TriangleAlert } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { ToolContent } from "@/components/shared/tool-content";
import { CompareCanvas } from "@/components/tools/image-compressor/components/file-detail/compare-canvas";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools/types";
import { formatBytes, pdfFileName } from "../pdf-shared/pdf-inspect.lib";
import { downloadPdf } from "../pdf-shared/pdf-ops";
import { seoData } from "./content";
import { LEVELS, verdict, type Level } from "./compress-pdf.lib";
import { useCompressPdf } from "./use-compress-pdf";

const LEVEL_IDS = Object.keys(LEVELS) as Level[];
const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** −62% in green when smaller; +3% with a warning when it isn't. */
function Savings({ pct, smaller }: { pct: number; smaller: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-sm font-bold",
        smaller ? "bg-[rgba(132,179,106,.14)] text-success-text" : "bg-[rgba(224,160,114,.14)] text-tier-pro-text",
      )}
    >
      {!smaller && <TriangleAlert size={13} aria-hidden />}
      {pct > 0 ? `+${pct}%` : `${pct === 0 ? "±" : "−"}${Math.abs(pct)}%`}
    </span>
  );
}

export function CompressPdf({ tool }: { tool: Tool }) {
  const c = useCompressPdf();
  const { doc, result } = c;
  const [split, setSplit] = useState(50);
  const [dropping, setDropping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const v = doc && result ? verdict(doc.size, result.bytes.byteLength) : null;
  const stats = result?.stats;
  const stale = c.busy || (result !== null && result.level !== c.level);

  const download = () => {
    if (!doc || !result || !v) return;
    const base = doc.name.replace(/\.pdf$/i, "");
    if (v.smaller) {
      const name = pdfFileName(`${base}-compressed`, "compressed");
      downloadPdf(result.bytes, name);
      toast.success(`Saved ${name}`, { description: `${formatBytes(result.bytes.byteLength)} · ${v.pct}%` });
    } else {
      downloadPdf(doc.bytes, doc.name);
      toast(`Saved the original ${doc.name}`, { description: "It was already as small as we could make it." });
    }
  };

  let label = "Download compressed PDF";
  if (v && !v.smaller) label = "Download the original";
  if (c.busy && !result) label = "Compressing…";

  return (
    <ToolShell tool={tool} titleStyle="inline" relatedSlugs={seoData.relatedSlugs}>
      <div
        id="tool"
        onDragOver={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setDropping(true);
        }}
        onDragLeave={(e) => {
          const next = e.relatedTarget;
          if (!(next instanceof Node && e.currentTarget.contains(next))) setDropping(false);
        }}
        onDrop={(e) => {
          setDropping(false);
          if (!hasFiles(e)) return;
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) void c.openFile(f);
        }}
        className={cn("relative overflow-hidden rounded-[18px] bg-[#101010] shadow-window-tool", dropping && "shadow-[0_0_0_2px_var(--color-cat-clay)]")}
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
            if (f) void c.openFile(f);
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
                {plural(doc.pages, "page")} · {formatBytes(doc.size)}
              </span>
            </div>
          ) : (
            <span className="text-[13px] text-text-tertiary">No document open</span>
          )}
          <span className="grow" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="min-h-[30px] cursor-pointer rounded-lg border border-white/12 bg-transparent px-3 text-[12.5px] font-semibold text-text-strong hover:border-white/25 max-sm:min-h-11"
          >
            {doc ? "Open another PDF" : "Open a PDF"}
          </button>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* compare */}
          <div className="flex min-w-0 flex-col gap-3 p-[18px] lg:h-[700px]">
            {c.error && (
              <div role="alert" className="rounded-[9px] border border-[rgba(224,121,95,.3)] bg-[rgba(224,121,95,.1)] px-3 py-[9px] text-[13px] text-[#f0a892]">
                {c.error}
              </div>
            )}
            {doc ? (
              <>
                <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-xl bg-[#0b0b0a]">
                  {c.urls ? (
                    <CompareCanvas
                      variant="modal"
                      originalUrl={c.urls.before}
                      compressedUrl={c.urls.after}
                      position={split}
                      onPositionChange={setSplit}
                      originalLabel={`Original · ${formatBytes(doc.size)}`}
                      compressedLabel={result ? `Compressed · ${formatBytes(result.bytes.byteLength)}` : "Compressed"}
                      stale={stale}
                      // Fill the panel (the component's own height would overflow it),
                      // so "fit" shows the whole page.
                      className="absolute inset-0 h-auto w-auto"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-text-faint" aria-live="polite">
                      {c.busy ? "Compressing on your device…" : "Preparing the comparison…"}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2 text-[12.5px] text-text-tertiary">
                  <button
                    type="button"
                    onClick={() => c.setPage((p) => Math.max(0, p - 1))}
                    disabled={c.page === 0}
                    aria-label="Previous page"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-transparent text-text-strong hover:border-white/25 disabled:cursor-default disabled:opacity-40 max-sm:size-11"
                  >
                    <ChevronLeft size={15} aria-hidden />
                  </button>
                  <span className="min-w-[110px] text-center font-mono">
                    Page {c.page + 1} of {doc.pages}
                  </span>
                  <button
                    type="button"
                    onClick={() => c.setPage((p) => Math.min(doc.pages - 1, p + 1))}
                    disabled={c.page >= doc.pages - 1}
                    aria-label="Next page"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-transparent text-text-strong hover:border-white/25 disabled:cursor-default disabled:opacity-40 max-sm:size-11"
                  >
                    <ChevronRight size={15} aria-hidden />
                  </button>
                  <span className="ml-2 hidden text-text-faint sm:inline">Drag the divider to compare · 1:1 to check fine detail</span>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex min-h-[320px] w-full flex-1 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-white/16 bg-transparent text-sm text-text-tertiary hover:border-white/30"
              >
                <FileUp size={28} aria-hidden className="text-cat-clay" />
                <span className="text-[17px] font-bold text-text">{c.opening ? "Opening…" : "Drop a PDF to compress"}</span>
                or click to choose. It stays on your device.
              </button>
            )}
          </div>

          {/* settings + result */}
          <div className="flex min-w-0 flex-col border-t border-border-subtle lg:border-t-0 lg:border-l">
            <div className="flex flex-col gap-2 p-3.5">
              <span className="text-[11.5px] font-bold tracking-[.05em] text-text-faint uppercase">Compression</span>
              <div role="radiogroup" aria-label="Compression level" className="flex flex-col gap-1">
                {LEVEL_IDS.map((id) => {
                  const on = c.level === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => c.setLevel(id)}
                      className={cn(
                        "flex min-h-12 cursor-pointer flex-col justify-center rounded-[10px] border px-3 text-left transition-colors",
                        on ? "border-[rgba(224,160,114,.55)] bg-[rgba(224,160,114,.1)]" : "border-white/7 bg-[#0d0d0c] hover:border-white/20",
                      )}
                    >
                      <span className="text-[13.5px] font-semibold text-text">{LEVELS[id].label}</span>
                      <span className="text-[11.5px] text-text-faint">{LEVELS[id].note}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {doc && (
              <div className="flex flex-col gap-3 border-t border-border-subtle p-3.5" aria-live="polite">
                <span className="text-[11.5px] font-bold tracking-[.05em] text-text-faint uppercase">Result</span>
                {v && result ? (
                  <>
                    <div className="flex items-end gap-3">
                      <div className="flex flex-col">
                        <span className="font-mono text-[12.5px] text-text-faint line-through decoration-white/30">{formatBytes(doc.size)}</span>
                        <span className={cn("font-mono text-[26px] leading-tight font-bold", stale ? "text-text-faint" : "text-text")}>{formatBytes(result.bytes.byteLength)}</span>
                      </div>
                      <span className="grow" />
                      <Savings pct={v.pct} smaller={v.smaller} />
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8" aria-hidden="true">
                      <div
                        className={cn("h-full rounded-full transition-[width] duration-300", v.smaller ? "bg-success-text" : "bg-cat-clay")}
                        style={{ width: `${Math.min(100, Math.max(2, (result.bytes.byteLength / doc.size) * 100))}%` }}
                      />
                    </div>
                    {!v.smaller && (
                      <p className="m-0 text-[12.5px] leading-normal text-tier-pro-text">
                        This PDF is already compact — we couldn&apos;t make it meaningfully smaller, so you&apos;ll get the original back unchanged.
                      </p>
                    )}
                    {stats && (
                      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[12.5px] text-text-tertiary">
                        <li>
                          {stats.images ? `${stats.recompressed} of ${plural(stats.images, "image")} made smaller` : "No images inside — only page data could be packed"}
                        </li>
                        {stats.keptForColour > 0 && <li className="text-text-faint">{plural(stats.keptForColour, "image")} left exactly as they were, so their colours can&apos;t shift (print/CMYK or special colour)</li>}
                        {stats.streamsDeflated > 0 && <li>{stats.streamsDeflated} uncompressed page streams packed</li>}
                        <li className="text-text-faint">Text and drawings are untouched — still sharp and selectable.</li>
                      </ul>
                    )}
                  </>
                ) : (
                  <span className="text-[13px] text-text-faint">{c.busy ? "Compressing on your device…" : "—"}</span>
                )}
              </div>
            )}

            <span className="grow" />
            <div className="flex flex-col gap-2 border-t border-border-subtle bg-[#121211] p-3.5">
              <button
                type="button"
                onClick={download}
                disabled={!doc || !result || stale}
                className="btn-action min-h-[46px] cursor-pointer rounded-[11px] text-[14.5px] font-bold disabled:cursor-default disabled:opacity-40"
              >
                {stale && result ? "Compressing…" : label}
              </button>
              <span className="text-center text-[11.5px] text-text-faint">No upload · no size limit · no daily cap</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-3.5 py-[9px] font-mono text-[11.5px] text-text-faint">
          <span className="text-success-text">● Compressed on this device</span>
          <span>{doc && result ? `${formatBytes(doc.size)} → ${formatBytes(result.bytes.byteLength)}` : ""}</span>
          <span className="grow" />
          <span>0 bytes uploaded</span>
        </div>
      </div>

      <ToolContent {...seoData} />
    </ToolShell>
  );
}
