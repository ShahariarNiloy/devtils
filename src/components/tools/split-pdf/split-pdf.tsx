"use client";

import { downloadZip } from "client-zip";
import { Brackets, Check, FileUp, Layers, MousePointerClick, Rows3 } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { ToolContent } from "@/components/shared/tool-content";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools/types";
import { formatBytes } from "../pdf-shared/pdf-inspect.lib";
import { downloadBlob, downloadPdf, runPdfJob } from "../pdf-shared/pdf-ops";
import { useThumb, type ThumbStore } from "../pdf-shared/thumb-store";
import { useSinglePdf, useThumbObserver } from "../pdf-shared/use-single-pdf";
import { seoData } from "./content";
import { describePages, groupOfPage, groupsFor, outputName, plural, type SplitMode } from "./split-pdf.lib";

const MODES = [
  { id: "pick", label: "Pick pages", Icon: MousePointerClick },
  { id: "every", label: "Every page", Icon: Layers },
  { id: "ranges", label: "Ranges", Icon: Brackets },
  { id: "chunks", label: "Every N pages", Icon: Rows3 },
] as const satisfies readonly { id: SplitMode; label: string; Icon: typeof Layers }[];

/** Output-file colours, cycled. */
const HUES = ["bg-cat-clay", "bg-cat-teal", "bg-cat-sage", "bg-cat-rose", "bg-syntax-boolean", "bg-text-tertiary"] as const;
const RINGS = [
  "shadow-[0_0_0_2px_var(--color-cat-clay)]",
  "shadow-[0_0_0_2px_var(--color-cat-teal)]",
  "shadow-[0_0_0_2px_var(--color-cat-sage)]",
  "shadow-[0_0_0_2px_var(--color-cat-rose)]",
  "shadow-[0_0_0_2px_var(--color-syntax-boolean)]",
  "shadow-[0_0_0_2px_var(--color-text-tertiary)]",
] as const;
const FIELD =
  "min-h-9 rounded-lg border border-white/10 bg-[#0d0d0c] px-2.5 font-mono text-[13px] text-[#f0ece2] outline-none placeholder:text-placeholder focus-visible:border-border-strong max-sm:min-h-11";
const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

const Tile = memo(function Tile({
  index,
  store,
  group,
  pickMode,
  picked,
  onPick,
  observe,
}: {
  index: number;
  store: ThumbStore;
  /** Output file this page goes to, or -1. */
  group: number;
  pickMode: boolean;
  picked: boolean;
  onPick: (i: number, range: boolean) => void;
  observe: (el: Element, i: number) => () => void;
}) {
  const thumb = useThumb(store, String(index));
  // Stable, so re-renders don't re-register every tile with the observer.
  const ref = useCallback((el: HTMLLIElement | null) => (el ? observe(el, index) : undefined), [observe, index]);
  const included = group >= 0;
  const body = (
    <>
      <span className={cn("absolute inset-0 flex items-center justify-center overflow-hidden rounded-md bg-[#2a2926] transition-opacity", !included && "opacity-35")}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" draggable={false} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="size-full animate-pulse bg-[#f4f1ea]/90" />
        )}
      </span>
      {included && <span aria-hidden="true" className={cn("absolute inset-x-0 bottom-0 h-1 rounded-b-md", HUES[group % HUES.length])} />}
      {pickMode && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-[7px] left-[7px] flex size-[18px] items-center justify-center rounded-[5px] border-[1.5px] text-[#1a1208]",
            picked ? "border-cat-clay bg-cat-clay" : "border-white/60 bg-[rgba(11,11,10,.55)]",
          )}
        >
          {picked && <Check size={12} strokeWidth={3} />}
        </span>
      )}
      {!pickMode && included && (
        <span className="absolute top-1.5 right-1.5 rounded-md bg-[#0b0b0a]/80 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-text">#{group + 1}</span>
      )}
    </>
  );
  return (
    <li ref={ref} className="flex flex-col gap-1.5 [contain-intrinsic-size:auto_200px] [content-visibility:auto]">
      {pickMode ? (
        <button
          type="button"
          aria-pressed={picked}
          aria-label={`Page ${index + 1}`}
          onClick={(e) => onPick(index, e.shiftKey)}
          className={cn(
            "relative block aspect-[1/1.414] w-full cursor-pointer rounded-md border-0 bg-transparent p-0 transition-shadow",
            picked ? RINGS[0] : "shadow-[0_6px_18px_rgba(0,0,0,.3)] hover:shadow-[0_0_0_1px_rgba(255,255,255,.25)]",
          )}
        >
          {body}
        </button>
      ) : (
        <span className={cn("relative block aspect-[1/1.414] w-full rounded-md", included ? RINGS[group % RINGS.length] : "shadow-[0_6px_18px_rgba(0,0,0,.3)]")}>{body}</span>
      )}
      <span className={cn("text-center font-mono text-[11.5px]", included ? "text-text-key" : "text-text-faint")}>
        {index + 1}
        {!included && !pickMode && " · left out"}
      </span>
    </li>
  );
});

export function SplitPdf({ tool }: { tool: Tool }) {
  const s = useSinglePdf();
  const { doc } = s;
  const [mode, setMode] = useState<SplitMode>("pick");
  const [picked, setPicked] = useState<ReadonlySet<number>>(new Set());
  const [ranges, setRanges] = useState("");
  const [every, setEvery] = useState(2);
  const [base, setBase] = useState("");
  const [busy, setBusy] = useState(false);
  const [dropping, setDropping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const last = useRef<number | null>(null);
  const observe = useThumbObserver(s.requestThumb);

  const pageCount = doc?.pages ?? 0;
  const { groups, error: rangeError } = useMemo(
    () => groupsFor({ mode, pageCount, picked, ranges, every }),
    [mode, pageCount, picked, ranges, every],
  );
  const groupOf = useMemo(() => groupOfPage(groups, pageCount), [groups, pageCount]);
  const left = groupOf.filter((g) => g < 0).length;
  const stem = (base.trim() || doc?.name || "document").replace(/\.pdf$/i, "");

  const openFile = async (f: File | undefined) => {
    if (!f) return;
    await s.open(f);
    setPicked(new Set());
    setBase("");
  };

  const onPick = useCallback((i: number, range: boolean) => {
    setPicked((p) => {
      const next = new Set(p);
      if (range && last.current !== null) {
        for (let k = Math.min(last.current, i); k <= Math.max(last.current, i); k++) next.add(k);
      } else if (next.has(i)) next.delete(i);
      else next.add(i);
      last.current = i;
      return next;
    });
  }, []);

  const download = async () => {
    if (!doc || !groups.length || busy) return;
    setBusy(true);
    try {
      const { outputs } = await runPdfJob({ kind: "split", bytes: doc.bytes.slice().buffer, groups });
      if (outputs.length === 1) {
        const name = outputName(stem, groups[0]);
        downloadPdf(outputs[0], name);
        toast.success(`Saved ${name}`, { description: `${plural(groups[0].length, "page")} · ${formatBytes(outputs[0].byteLength)}` });
      } else {
        const files = outputs.map((o, i) => ({ name: outputName(stem, groups[i]), input: new Blob([o as Uint8Array<ArrayBuffer>], { type: "application/pdf" }) }));
        const zip = await downloadZip(files).blob();
        downloadBlob(zip, `${stem}-split.zip`);
        toast.success(`Saved ${stem}-split.zip`, { description: `${plural(outputs.length, "PDF")} · ${formatBytes(zip.size)}` });
      }
    } catch (e) {
      s.setError(e instanceof Error ? e.message : "Splitting failed.");
    } finally {
      setBusy(false);
    }
  };

  let label = "Download";
  if (groups.length === 1) label = `Download PDF · ${plural(groups[0].length, "page")}`;
  else if (groups.length > 1) label = `Download ${groups.length} PDFs (.zip)`;
  if (busy) label = "Splitting…";

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
          void openFile(e.dataTransfer.files[0]);
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
            void openFile(f);
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
          <div role="tablist" aria-label="How to split" className="flex flex-wrap gap-0.5 rounded-[9px] border border-white/7 bg-[#0d0d0c] p-0.5">
            {MODES.map(({ id, label: l, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={cn(
                  "inline-flex min-h-[30px] cursor-pointer items-center gap-1.5 rounded-[7px] border-0 px-3 text-[12.5px] font-semibold max-sm:min-h-11",
                  mode === id ? "bg-selected text-text" : "bg-transparent text-text-tertiary hover:text-text",
                )}
              >
                <Icon size={14} aria-hidden />
                {l}
              </button>
            ))}
          </div>
          <span className="grow" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="min-h-[30px] cursor-pointer rounded-lg border border-white/12 bg-transparent px-3 text-[12.5px] font-semibold text-text-strong hover:border-white/25 max-sm:min-h-11"
          >
            {doc ? "Open another PDF" : "Open a PDF"}
          </button>
        </div>

        {/* mode options */}
        {doc && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-subtle px-3.5 py-2.5 text-[13px] text-text-tertiary">
            {mode === "pick" && (
              <>
                <span>Click the pages to keep · shift-click for a run. They become one PDF.</span>
                <span className="grow" />
                <button type="button" onClick={() => setPicked(new Set(Array.from({ length: pageCount }, (_, i) => i)))} className="cursor-pointer border-0 bg-transparent text-[12.5px] text-text-tertiary hover:text-text">
                  Select all
                </button>
                {picked.size > 0 && (
                  <button type="button" onClick={() => setPicked(new Set())} className="cursor-pointer border-0 bg-transparent text-[12.5px] text-text-tertiary hover:text-text">
                    Clear
                  </button>
                )}
              </>
            )}
            {mode === "every" && <span>Each page becomes its own PDF.</span>}
            {mode === "ranges" && (
              <>
                <label htmlFor="split-ranges">One PDF per range</label>
                <input
                  id="split-ranges"
                  value={ranges}
                  onChange={(e) => setRanges(e.target.value)}
                  placeholder={pageCount > 4 ? `1-3, 4-${Math.min(6, pageCount)}, ${Math.min(7, pageCount)}-` : "1-2, 3"}
                  spellCheck={false}
                  aria-invalid={Boolean(rangeError)}
                  aria-describedby="split-ranges-help"
                  className={cn(FIELD, "w-64 grow sm:grow-0", rangeError && "border-[rgba(224,121,95,.6)]")}
                />
                <span id="split-ranges-help" className={cn("text-[12.5px]", rangeError ? "text-[#f0a892]" : "text-text-faint")}>
                  {rangeError || "e.g. 1-3, 5, 8- (to the end)"}
                </span>
              </>
            )}
            {mode === "chunks" && (
              <label className="inline-flex items-center gap-2">
                Split every
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, pageCount)}
                  value={every}
                  onChange={(e) => setEvery(Math.max(1, Math.min(pageCount || 1, Number(e.target.value) || 1)))}
                  className={cn(FIELD, "w-20")}
                />
                pages
              </label>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="box-border min-w-0 overflow-auto p-[18px] [background:radial-gradient(70%_60%_at_50%_0%,rgba(197,142,94,.06),transparent_70%)] lg:h-[680px]">
            {s.error && (
              <div role="alert" className="mb-3.5 rounded-[9px] border border-[rgba(224,121,95,.3)] bg-[rgba(224,121,95,.1)] px-3 py-[9px] text-[13px] text-[#f0a892]">
                {s.error}
              </div>
            )}
            {doc ? (
              <ol aria-label="Pages" className="m-0 grid list-none grid-cols-3 items-start gap-x-3.5 gap-y-4 p-0 sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))]">
                {Array.from({ length: pageCount }, (_, i) => (
                  <Tile
                    key={i}
                    index={i}
                    store={s.thumbs}
                    group={groupOf[i]}
                    pickMode={mode === "pick"}
                    picked={picked.has(i)}
                    onPick={onPick}
                    observe={observe}
                  />
                ))}
              </ol>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex min-h-[320px] w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-white/16 bg-transparent text-sm text-text-tertiary hover:border-white/30 lg:h-full"
              >
                <FileUp size={28} aria-hidden className="text-cat-clay" />
                <span className="text-[17px] font-bold text-text">{s.opening ? "Opening…" : "Drop a PDF to split"}</span>
                or click to choose. It stays on your device.
              </button>
            )}
          </div>

          {/* outputs */}
          <div className="flex min-w-0 flex-col border-t border-border-subtle lg:max-h-[680px] lg:border-t-0 lg:border-l">
            <div className="flex min-h-0 flex-col gap-2 overflow-auto p-3.5">
              <div className="flex items-baseline">
                <span className="grow text-[13px] font-bold">You&apos;ll get</span>
                <span className="text-xs text-text-faint">{groups.length ? plural(groups.length, "PDF") : ""}</span>
              </div>
              {!doc && <span className="text-[12.5px] text-text-faint">Open a PDF to see the files it splits into.</span>}
              {doc && !groups.length && (
                <span className="text-[12.5px] text-text-faint">{mode === "pick" ? "Pick some pages." : "Type the ranges you want, like 1-3, 5."}</span>
              )}
              <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
                {groups.slice(0, 200).map((g, i) => (
                  // Output files are positional; ranges may repeat, so no content key is unique.
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={i} className="flex items-center gap-2.5 rounded-[10px] border border-white/6 bg-[#0d0d0c] py-2 pr-2.5 pl-2">
                    <span aria-hidden="true" className={cn("w-1 self-stretch rounded-sm", HUES[i % HUES.length])} />
                    <div className="flex min-w-0 grow flex-col">
                      <span className="truncate font-mono text-xs text-text-key">{outputName(stem, g)}</span>
                      <span className="text-[11.5px] text-text-faint">
                        {g.length === 1 ? `Page ${describePages(g)}` : `Pages ${describePages(g)}`} · {plural(g.length, "page")}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
              {groups.length > 200 && <span className="text-[12px] text-text-faint">…and {groups.length - 200} more</span>}
              {doc && left > 0 && groups.length > 0 && (
                <span className="text-[12px] text-text-faint">{plural(left, "page")} left out.</span>
              )}
            </div>
            <div className="flex flex-col gap-2 border-t border-border-subtle p-3.5">
              <label htmlFor="split-base" className="text-[13px] font-bold">
                File names start with
              </label>
              <input id="split-base" value={base} onChange={(e) => setBase(e.target.value)} placeholder={(doc?.name ?? "document").replace(/\.pdf$/i, "")} spellCheck={false} className={FIELD} />
            </div>
            <span className="grow" />
            <div className="flex flex-col gap-2 border-t border-border-subtle bg-[#121211] p-3.5">
              <button
                type="button"
                onClick={() => void download()}
                disabled={!doc || !groups.length || busy || Boolean(rangeError)}
                aria-busy={busy || undefined}
                className="btn-action min-h-[46px] cursor-pointer rounded-[11px] text-[14.5px] font-bold disabled:cursor-default disabled:opacity-40"
              >
                {label}
              </button>
              <span className="text-center text-[11.5px] text-text-faint">Pages are copied as they are — no quality lost</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-3.5 py-[9px] font-mono text-[11.5px] text-text-faint">
          <span className="text-success-text">● Split on this device</span>
          <span>{doc ? plural(doc.pages, "page") : ""}</span>
          <span className="grow" />
          <span>0 bytes uploaded</span>
        </div>
      </div>

      <ToolContent {...seoData} />
    </ToolShell>
  );
}
