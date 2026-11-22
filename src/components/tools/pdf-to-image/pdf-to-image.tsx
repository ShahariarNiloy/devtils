"use client";

import { downloadZip } from "client-zip";
import { Check, Download, FileUp, Plus } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type DragEvent,
} from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { ToolContent } from "@/components/shared/tool-content";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools/types";
import { parseRanges } from "../split-pdf/split-pdf.lib";
import {
  FullScreenButton,
  PREVIEW_SIZES,
  Segmented,
  Setting,
  SizePicker,
  useFullScreen,
  windowClass,
  type PreviewSize,
} from "../pdf-shared/controls";
import { formatBytes } from "../pdf-shared/pdf-inspect.lib";
import { downloadBlob } from "../pdf-shared/pdf-ops";
import { renderPageAt, type PDFDocumentProxy } from "../pdf-shared/pdfjs";
import { useThumb, type ThumbStore } from "../pdf-shared/thumb-store";
import { useSinglePdf, useThumbObserver } from "../pdf-shared/use-single-pdf";
import { seoData } from "./content";
import {
  fileNameFor,
  FORMAT_LABEL,
  maxCanvasArea,
  MIME,
  pickQuick,
  renderSize,
  type ImageFormat,
  type Quick,
} from "./pdf-to-image.lib";

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const hasFiles = (e: DragEvent) =>
  Array.from(e.dataTransfer?.types ?? []).includes("Files");
const EXT: Record<ImageFormat, string> = {
  png: "png",
  jpg: "jpg",
  webp: "webp",
};
const DPIS = [
  { id: 72, label: "72", sub: "Screen" },
  { id: 150, label: "150", sub: "Docs, slides" },
  { id: 300, label: "300", sub: "Print" },
] as const;
const QUICK: readonly { id: Quick; label: string }[] = [
  { id: "all", label: "All" },
  { id: "odd", label: "Odd" },
  { id: "even", label: "Even" },
  { id: "none", label: "None" },
];

/* Safari draws WebP but can't write it — it silently hands back a PNG. */
let webp: boolean | undefined;
const canWriteWebp = () => {
  if (webp === undefined) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    webp = c.toDataURL("image/webp").startsWith("data:image/webp");
  }
  return webp;
};
const noSubscribe = () => () => {};
const touchSafari = () =>
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

interface Settings {
  fmt: ImageFormat;
  dpi: number;
  /** 0–1, for JPG and WebP. */
  quality: number;
  transparent: boolean;
}
interface Rendered {
  index: number;
  blob: Blob;
  dpi: number;
  capped: boolean;
}

/** Draw one page and encode it. */
async function renderOne(
  pdf: PDFDocumentProxy,
  index: number,
  set: Settings,
  canvas: HTMLCanvasElement,
): Promise<Rendered> {
  const page = await pdf.getPage(index + 1);
  const vp = page.getViewport({ scale: 1 });
  const r = renderSize(
    vp.width,
    vp.height,
    set.dpi,
    maxCanvasArea(touchSafari()),
  );
  await renderPageAt(
    page,
    r.scale,
    r.w,
    r.h,
    canvas,
    set.transparent && set.fmt !== "jpg",
  );
  page.cleanup();
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(
      res,
      MIME[set.fmt],
      set.fmt === "png" ? undefined : set.quality,
    ),
  );
  if (!blob)
    throw new Error(`Page ${index + 1} couldn't be saved as an image.`);
  return { index, blob, dpi: r.dpi, capped: r.capped };
}

/**
 * Pages in flight at once: PDF.js parses the next ones in its worker while
 * this one draws and encodes.
 */
const IN_FLIGHT = 3;

/** Pages in order, a few in flight, stopping early when `stopped()` says so. */
async function* renderAll(
  pdf: PDFDocumentProxy,
  indices: readonly number[],
  set: Settings,
  stopped: () => boolean,
): AsyncGenerator<Rendered> {
  const canvases = Array.from({ length: IN_FLIGHT }, () =>
    document.createElement("canvas"),
  );
  const flight: Promise<Rendered>[] = [];
  try {
    for (let k = 0; k < indices.length && !stopped(); k++) {
      // Canvas k is free again: page k − IN_FLIGHT was yielded last time round.
      flight.push(renderOne(pdf, indices[k], set, canvases[k % IN_FLIGHT]));
      const next = flight.length >= IN_FLIGHT ? flight.shift() : undefined;
      if (next) yield await next;
    }
    for (let next = flight.shift(); next && !stopped(); next = flight.shift())
      yield await next;
  } finally {
    // Let anything still drawing finish before the canvases are released.
    await Promise.allSettled(flight);
    for (const c of canvases) c.width = c.height = 0;
  }
}

const Tile = memo(function Tile({
  index,
  store,
  picked,
  meta,
  seeThrough,
  onPick,
  onSave,
  observe,
}: {
  index: number;
  store: ThumbStore;
  picked: boolean;
  meta: string;
  seeThrough: boolean;
  onPick: (i: number, range: boolean) => void;
  onSave: (i: number) => void;
  observe: (el: Element, i: number) => () => void;
}) {
  const thumb = useThumb(store, String(index));
  const ref = useCallback(
    (el: HTMLLIElement | null) => (el ? observe(el, index) : undefined),
    [observe, index],
  );
  return (
    <li
      ref={ref}
      className="flex flex-col gap-[7px] [contain-intrinsic-size:auto_300px] [content-visibility:auto]"
    >
      <button
        type="button"
        aria-pressed={picked}
        aria-label={`Page ${index + 1}`}
        onClick={(e) => onPick(index, e.shiftKey)}
        className={cn(
          "relative block aspect-[1/1.414] w-full cursor-pointer rounded-md border-0 bg-transparent p-0 transition-shadow",
          picked
            ? "shadow-[0_0_0_2px_var(--color-cat-rose),0_8px_24px_rgba(0,0,0,.35)]"
            : "shadow-[0_6px_18px_rgba(0,0,0,.3)] hover:shadow-[0_0_0_1px_rgba(255,255,255,.25)]",
        )}
      >
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center overflow-hidden rounded-md transition-opacity",
            seeThrough
              ? "[background:repeating-conic-gradient(#d9d6ce_0_25%,#f4f1ea_0_50%)_0_0/12px_12px]"
              : "bg-[#2a2926]",
            !picked && "opacity-[.42]",
          )}
        >
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              draggable={false}
              className={cn(
                "size-full object-contain",
                seeThrough && "mix-blend-multiply",
              )}
            />
          ) : (
            <span className="size-full animate-pulse bg-[#f4f1ea]/90" />
          )}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-[7px] left-[7px] flex size-[18px] items-center justify-center rounded-[5px] border-[1.5px] text-[#1a1208]",
            picked
              ? "border-cat-rose bg-cat-rose"
              : "border-white/50 bg-[rgba(11,11,10,.55)]",
          )}
        >
          {picked && <Check size={12} strokeWidth={3} />}
        </span>
      </button>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[11.5px] font-bold text-text-key">
          {index + 1}
        </span>
        <span
          className={cn(
            "min-w-0 grow truncate font-mono text-[11px]",
            picked ? "text-text-tertiary" : "text-text-faint",
          )}
        >
          {picked ? meta : "skipped"}
        </span>
        <button
          type="button"
          onClick={() => onSave(index)}
          aria-label={`Save page ${index + 1} as an image`}
          title="Save just this page"
          className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-text-tertiary hover:bg-white/8 hover:text-text max-sm:size-9"
        >
          <Download size={13} aria-hidden />
        </button>
      </div>
    </li>
  );
});

export function PdfToImage({ tool }: { tool: Tool }) {
  // Tiles here go up to 260 px wide; thumbnails render at 2× that, capped by DPR.
  const s = useSinglePdf({ thumbPx: 260 });
  const { doc } = s;
  const pageCount = doc?.pages ?? 0;
  const [picked, setPicked] = useState<ReadonlySet<number> | null>(null);
  const [range, setRange] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [fmt, setFmt] = useState<ImageFormat>("png");
  const [dpi, setDpi] = useState(150);
  const [q, setQ] = useState(85);
  const [bg, setBg] = useState<"white" | "transparent">("white");
  const [pattern, setPattern] = useState("{name}-{n}");
  const [out, setOut] = useState<"zip" | "files">("zip");
  const [size, setSize] = useState<PreviewSize>("M");
  const [full, setFull] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [page1, setPage1] = useState<{
    doc: PDFDocumentProxy;
    w: number;
    h: number;
  } | null>(null);
  const [sample, setSample] = useState<{ key: string; bytes: number } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const cancel = useRef(false);
  const last = useRef<number | null>(null);
  const observe = useThumbObserver(s.requestThumb);
  const webpOk = useSyncExternalStore(noSubscribe, canWriteWebp, () => true);
  useFullScreen(full, setFull);

  const chosen = useMemo(
    () =>
      picked
        ? [...picked].sort((a, b) => a - b)
        : Array.from({ length: pageCount }, (_, i) => i),
    [picked, pageCount],
  );
  const isPicked = useCallback(
    (i: number) => (picked ? picked.has(i) : true),
    [picked],
  );
  const nSel = chosen.length;
  const format: ImageFormat = fmt === "webp" && !webpOk ? "png" : fmt;
  const set: Settings = useMemo(
    () => ({
      fmt: format,
      dpi,
      quality: q / 100,
      transparent: bg === "transparent",
    }),
    [format, dpi, q, bg],
  );
  const base = (doc?.name ?? "document").replace(/\.pdf$/i, "");
  const nameOf = (i: number) =>
    fileNameFor(pattern, base, i + 1, pageCount, EXT[format]);

  // Page 1's size, for the "pixels per page" line.
  useEffect(() => {
    if (!doc) return;
    let live = true;
    void doc.pdf.getPage(1).then((p) => {
      const vp = p.getViewport({ scale: 1 });
      if (live) setPage1({ doc: doc.pdf, w: vp.width, h: vp.height });
    });
    return () => {
      live = false;
    };
  }, [doc]);
  const dims =
    page1 && doc && page1.doc === doc.pdf
      ? renderSize(page1.w, page1.h, dpi, maxCanvasArea(touchSafari()))
      : null;

  // The size estimate: really render one picked page with these settings.
  const first = chosen[0];
  const sampleKey =
    doc && first !== undefined
      ? `${doc.name}:${doc.size}:${first}:${format}:${dpi}:${q}:${bg}`
      : "";
  useEffect(() => {
    if (!doc || first === undefined || busy) return;
    let live = true;
    const t = setTimeout(() => {
      const canvas = document.createElement("canvas");
      renderOne(doc.pdf, first, set, canvas)
        .then((r) => {
          if (live) setSample({ key: sampleKey, bytes: r.blob.size });
        })
        .catch(() => {})
        .finally(() => {
          canvas.width = canvas.height = 0;
        });
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [doc, first, set, sampleKey, busy]);
  const perPage = sample && sample.key === sampleKey ? sample.bytes : null;
  const meta = perPage ? `~${formatBytes(perPage)}` : "…";

  const openFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.type.startsWith("image/")) {
      s.setError(
        `“${f.name}” is an image. Try Image to PDF to turn pictures into a PDF.`,
      );
      return;
    }
    await s.open(f);
    setPicked(null);
    setRange("");
    setRangeError("");
  };

  const onPick = useCallback(
    (i: number, shift: boolean) => {
      setPicked((p) => {
        const next = new Set(
          p ?? Array.from({ length: pageCount }, (_, k) => k),
        );
        if (shift && last.current !== null) {
          const on = !next.has(i);
          for (
            let k = Math.min(last.current, i);
            k <= Math.max(last.current, i);
            k++
          ) {
            if (on) next.add(k);
            else next.delete(k);
          }
        } else if (next.has(i)) next.delete(i);
        else next.add(i);
        last.current = i;
        return next;
      });
      setRange("");
      setRangeError("");
    },
    [pageCount],
  );

  const onRange = (v: string) => {
    setRange(v);
    if (!v.trim()) {
      setRangeError("");
      setPicked(null);
      return;
    }
    const r = parseRanges(v, pageCount);
    setRangeError(r.error);
    if (!r.error) setPicked(new Set(r.groups.flat()));
  };

  const report = (
    files: number,
    bytes: number,
    capped: Rendered | undefined,
    name: string,
  ) => {
    toast.success(`Saved ${name}`, {
      description: [
        `${plural(files, FORMAT_LABEL[format] + " file")} · ${formatBytes(bytes)}`,
        capped &&
          `Page ${capped.index + 1} was drawn at ${capped.dpi} DPI — the most this browser can draw at that size.`,
      ]
        .filter(Boolean)
        .join(". "),
    });
  };

  const saveOne = useCallback(
    async (i: number) => {
      if (!doc) return;
      const canvas = document.createElement("canvas");
      try {
        const r = await renderOne(doc.pdf, i, set, canvas);
        const name = fileNameFor(pattern, base, i + 1, pageCount, EXT[set.fmt]);
        downloadBlob(r.blob, name);
        report(1, r.blob.size, r.capped ? r : undefined, name);
      } catch (e) {
        s.setError(
          e instanceof Error ? e.message : "That page couldn't be saved.",
        );
      } finally {
        canvas.width = canvas.height = 0;
      }
    },
    // report/s are fresh each render; the inputs that matter are listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, set, pattern, base, pageCount],
  );

  const download = async () => {
    if (!doc || !nSel || busy) return;
    cancel.current = false;
    setBusy({ done: 0, total: nSel });
    let done = 0;
    let bytes = 0;
    let capped: Rendered | undefined;
    let shown = 0;
    const counted = async function* () {
      for await (const r of renderAll(
        doc.pdf,
        chosen,
        set,
        () => cancel.current,
      )) {
        done++;
        bytes += r.blob.size;
        if (r.capped && !capped) capped = r;
        // Progress re-renders the whole grid; ~8 times a second is plenty.
        if (performance.now() - shown > 120 || done === nSel) {
          shown = performance.now();
          setBusy({ done, total: nSel });
        }
        yield r;
      }
    };
    try {
      if (nSel === 1) {
        await saveOne(chosen[0]);
      } else if (out === "zip") {
        const zipName = `${base}-images.zip`;
        const files = async function* () {
          for await (const r of counted())
            yield {
              name: nameOf(r.index),
              input: r.blob,
              lastModified: new Date(),
            };
        };
        const zip = await downloadZip(files()).blob();
        if (cancel.current) toast(`Stopped after ${plural(done, "page")}`);
        else {
          downloadBlob(zip, zipName);
          report(done, bytes, capped, zipName);
        }
      } else {
        for await (const r of counted()) {
          downloadBlob(r.blob, nameOf(r.index));
          // A short gap so the browser treats them as separate downloads.
          await new Promise((res) => setTimeout(res, 250));
        }
        if (!cancel.current) report(done, bytes, capped, plural(done, "file"));
      }
    } catch (e) {
      s.setError(
        e instanceof Error ? e.message : "The pages couldn't be saved.",
      );
    } finally {
      setBusy(null);
    }
  };

  let label = "Pick at least one page";
  if (nSel === 1) label = `Download ${nameOf(chosen[0])}`;
  else if (nSel > 1)
    label =
      out === "zip"
        ? `Download ${nSel} ${FORMAT_LABEL[format]}s · ZIP`
        : `Download ${nSel} ${FORMAT_LABEL[format]} files`;
  if (!doc) label = "Choose a PDF first";
  const grid = PREVIEW_SIZES.find((z) => z.short === size)?.cols;
  const seeThrough = bg === "transparent" && format !== "jpg";
  const summary = nSel
    ? `${plural(nSel, "image")}${perPage ? ` · about ${formatBytes(perPage * nSel)}` : ""}`
    : "No pages picked";

  return (
    <ToolShell
      tool={tool}
      titleStyle="inline"
      relatedSlugs={seoData.relatedSlugs}
    >
      <div
        id="tool"
        onDragOver={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setDropping(true);
        }}
        onDragLeave={(e) => {
          const next = e.relatedTarget;
          if (!(next instanceof Node && e.currentTarget.contains(next)))
            setDropping(false);
        }}
        onDrop={(e) => {
          setDropping(false);
          if (!hasFiles(e)) return;
          e.preventDefault();
          void openFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          windowClass(full),
          dropping && "shadow-[0_0_0_2px_var(--color-cat-rose)]",
        )}
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
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-border-subtle bg-toolbar px-3 py-2.5">
          {doc ? (
            <div className="flex min-h-9 max-w-full min-w-0 items-center gap-2.5 rounded-[9px] border border-white/8 bg-[#0d0d0c] pr-1.5 pl-2.5">
              <span
                aria-hidden="true"
                className="h-5 w-1 shrink-0 rounded-sm bg-cat-rose"
              />
              <span
                className="truncate font-mono text-[12.5px] text-text-key"
                title={doc.name}
              >
                {doc.name}
              </span>
              <span className="text-xs whitespace-nowrap text-text-faint">
                {plural(doc.pages, "page")} · {formatBytes(doc.size)}
              </span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="min-h-7 cursor-pointer rounded-[7px] border-0 bg-white/5 px-2.5 text-xs text-text-strong hover:bg-white/10 max-sm:min-h-10"
              >
                Replace
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex min-h-[34px] cursor-pointer items-center gap-[7px] rounded-[9px] border border-white/14 bg-white/4 px-[13px] text-[13px] font-semibold text-text hover:border-white/25 max-sm:min-h-11"
            >
              <Plus size={14} aria-hidden className="text-cat-rose" />
              Choose a PDF
            </button>
          )}
          {doc && (
            <>
              <span aria-hidden="true" className="h-5 w-px bg-white/8 max-sm:hidden" />
              <div
                role="group"
                aria-label="Quick select"
                className="flex gap-0.5 rounded-lg border border-white/7 bg-[#0d0d0c] p-0.5"
              >
                {QUICK.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => {
                      setPicked(
                        k.id === "all"
                          ? null
                          : new Set(pickQuick(k.id, pageCount)),
                      );
                      setRange("");
                      setRangeError("");
                    }}
                    className="min-h-7 cursor-pointer rounded-md border-0 bg-transparent px-2.5 text-xs text-text-strong hover:bg-white/6 hover:text-text max-sm:min-h-10"
                  >
                    {k.label}
                  </button>
                ))}
              </div>
              <label
                className={cn(
                  "flex min-h-[34px] items-center gap-[7px] rounded-[9px] border bg-[#0d0d0c] px-2.5",
                  rangeError
                    ? "border-[rgba(224,121,95,.6)]"
                    : "border-white/10",
                )}
              >
                <span className="text-xs text-text-faint">Pages</span>
                <input
                  value={range}
                  onChange={(e) => onRange(e.target.value)}
                  placeholder="e.g. 1-3, 6"
                  aria-label="Page range"
                  aria-invalid={Boolean(rangeError)}
                  title={rangeError || undefined}
                  spellCheck={false}
                  className="w-[104px] border-0 bg-transparent font-mono text-[12.5px] text-text outline-none placeholder:text-placeholder"
                />
              </label>
              <span
                className={cn(
                  "text-[12.5px]",
                  rangeError ? "text-[#f0a892]" : "text-text-faint",
                )}
              >
                {rangeError || `${nSel} of ${plural(pageCount, "page")}`}
              </span>
            </>
          )}
          <span className="grow" />
          <FullScreenButton on={full} onToggle={() => setFull((f) => !f)} />
          <SizePicker value={size} onChange={setSize} label="Thumbnail size" />
        </div>

        <div
          className={cn(
            "grid lg:grid-cols-[minmax(0,1fr)_340px]",
            full && "min-h-0 grow",
          )}
        >
          <div
            className={cn(
              "box-border min-w-0 overflow-auto p-[18px] [background:radial-gradient(70%_60%_at_50%_0%,rgba(208,128,112,.06),transparent_70%)]",
              full ? "h-full" : "lg:h-[760px]",
            )}
          >
            {s.error && (
              <div
                role="alert"
                className="mb-3.5 rounded-[9px] border border-[rgba(224,121,95,.3)] bg-[rgba(224,121,95,.1)] px-3 py-[9px] text-[13px] text-[#f0a892]"
              >
                {s.error}
              </div>
            )}
            {doc ? (
              <ol
                aria-label="Pages — click to include or skip"
                className={cn(
                  "m-0 grid list-none grid-cols-3 items-start gap-x-3.5 gap-y-[18px] p-0",
                  grid,
                )}
              >
                {Array.from({ length: pageCount }, (_, i) => (
                  <Tile
                    key={i}
                    index={i}
                    store={s.thumbs}
                    picked={isPicked(i)}
                    meta={meta}
                    seeThrough={seeThrough}
                    onPick={onPick}
                    onSave={saveOne}
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
                <FileUp size={28} aria-hidden className="text-cat-rose" />
                <span className="text-[17px] font-bold text-text">
                  {s.opening ? "Opening…" : "Drop a PDF here"}
                </span>
                or click to choose. It stays on your device.
              </button>
            )}
          </div>

          {/* settings */}
          <div
            className={cn(
              "flex min-w-0 flex-col border-t border-border-subtle lg:border-t-0 lg:border-l",
              full ? "min-h-0" : "lg:h-[760px]",
            )}
          >
            {/* Settings scroll; the action stays put at the bottom. */}
            <div className="flex min-h-0 grow flex-col lg:overflow-auto">
              <Setting
                first
                title="Format"
                hint={
                  !webpOk
                    ? "This browser can't write WebP — PNG and JPG only."
                    : undefined
                }
              >
                <Segmented
                  label="Format"
                  value={format}
                  onChange={setFmt}
                  cols="grid-cols-3"
                  options={[
                    { id: "png", label: "PNG", sub: "Sharp text" },
                    { id: "jpg", label: "JPG", sub: "Smallest photos" },
                    {
                      id: "webp",
                      label: "WebP",
                      sub: webpOk ? "Small + sharp" : "Not here",
                      disabled: !webpOk,
                    },
                  ]}
                />
              </Setting>
              <Setting
                title={
                  <span className="flex items-baseline justify-between">
                    Resolution{" "}
                    <span className="text-xs font-normal text-text-faint">
                      DPI
                    </span>
                  </span>
                }
                hint={
                  dims
                    ? `${dims.w} × ${dims.h} px for page 1${dims.capped ? ` — drawn at ${dims.dpi} DPI, the most this browser can manage for a page this big` : ""}`
                    : undefined
                }
              >
                <Segmented
                  label="Resolution"
                  value={dpi}
                  options={DPIS}
                  onChange={setDpi}
                  cols="grid-cols-3"
                />
              </Setting>
              {format !== "png" && (
                <div className="flex flex-col gap-2 border-t border-border-subtle p-3.5">
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="pdfi-q" className="text-[13px] font-bold">
                      Quality
                    </label>
                    <span className="font-mono text-xs text-text-tertiary">
                      {q}%
                    </span>
                  </div>
                  <input
                    id="pdfi-q"
                    type="range"
                    min={50}
                    max={100}
                    step={1}
                    value={q}
                    onChange={(e) => setQ(Number(e.target.value))}
                    className="w-full accent-[var(--color-cat-rose)]"
                  />
                </div>
              )}
              {format !== "jpg" && (
                <Setting
                  title="Background"
                  hint={
                    bg === "transparent"
                      ? "Blank paper becomes see-through — handy for logos and diagrams."
                      : undefined
                  }
                >
                  <Segmented
                    label="Background"
                    value={bg}
                    onChange={setBg}
                    cols="grid-cols-2"
                    options={[
                      { id: "white", label: "White" },
                      { id: "transparent", label: "Transparent" },
                    ]}
                  />
                </Setting>
              )}
              <div className="flex flex-col gap-2 border-t border-border-subtle p-3.5">
                <label htmlFor="pdfi-name" className="text-[13px] font-bold">
                  File names
                </label>
                <input
                  id="pdfi-name"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  spellCheck={false}
                  className="min-h-9 rounded-lg border border-white/10 bg-[#0d0d0c] px-2.5 font-mono text-[12.5px] text-[#f0ece2] outline-none focus-visible:border-border-strong max-sm:min-h-11"
                />
                <span className="text-xs text-text-faint">
                  Saves as{" "}
                  <span className="font-mono text-text-tertiary">
                    {nameOf(chosen[0] ?? 0)}
                  </span>{" "}
                  · {"{name}"} and {"{n}"} fill in
                </span>
              </div>
              {nSel > 1 && (
                <Setting title="Download as">
                  <Segmented
                    label="Download as"
                    value={out}
                    onChange={setOut}
                    cols="grid-cols-2"
                    options={[
                      { id: "zip", label: "One ZIP" },
                      { id: "files", label: "Separate files" },
                    ]}
                  />
                </Setting>
              )}
            </div>
            <div className="flex flex-col gap-2 border-t border-border-subtle bg-[#121211] p-3.5">
              <span className="text-[12.5px] text-text-key">{summary}</span>
              {busy ? (
                <div className="flex gap-2">
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={busy.total}
                    aria-valuenow={busy.done}
                    aria-label="Rendering pages"
                    className="relative flex min-h-[46px] grow items-center justify-center overflow-hidden rounded-[11px] bg-white/6 text-[14px] font-bold"
                  >
                    <span
                      className="absolute inset-y-0 left-0 bg-white/10 transition-[width]"
                      style={{ width: `${(busy.done / busy.total) * 100}%` }}
                    />
                    <span className="relative">
                      Rendering {busy.done} of {busy.total}…
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      cancel.current = true;
                    }}
                    className="min-h-[46px] cursor-pointer rounded-[11px] border border-white/14 bg-transparent px-3.5 text-[13px] font-semibold text-text-strong hover:border-white/30"
                  >
                    Stop
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void download()}
                  disabled={!doc || !nSel || Boolean(rangeError)}
                  className="btn-action min-h-[46px] cursor-pointer truncate rounded-[11px] px-3 text-[14.5px] font-bold disabled:cursor-default disabled:opacity-40"
                >
                  {label}
                </button>
              )}
              <span className="text-center text-[11.5px] text-text-faint">
                No upload · no page cap · no watermark
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-3.5 py-[9px] font-mono text-[11.5px] text-text-faint">
          <span className="text-success-text">● Rendered on this device</span>
          <span>{doc ? summary : ""}</span>
          <span className="grow" />
          <span>0 bytes uploaded</span>
        </div>
      </div>

      <ToolContent {...seoData} />
    </ToolShell>
  );
}
