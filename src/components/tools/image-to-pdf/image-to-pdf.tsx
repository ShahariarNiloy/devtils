"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDownAZ, ImagePlus, Plus, RotateCw, Undo2, X } from "lucide-react";
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { ToolContent } from "@/components/shared/tool-content";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools/types";
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
import {
  estimatePdfBytes,
  layoutPage,
  turned,
  type Fit,
  type LayoutOpts,
  type Margin,
  type Orient,
  type PageSize,
  type SizeMode,
} from "../pdf-shared/image-layout.lib";
import { formatBytes, pdfFileName } from "../pdf-shared/pdf-inspect.lib";
import { downloadPdf, runPdfJob } from "../pdf-shared/pdf-ops";
import { useThumb, type ThumbStore } from "../pdf-shared/thumb-store";
import { seoData } from "./content";
import { isImageFile, useImageToPdf, type ImageItem } from "./use-image-to-pdf";

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
/** Buttons inside a draggable tile act as buttons, not drag handles. */
const stop = (e: { stopPropagation(): void }) => e.stopPropagation();
const hasFiles = (e: DragEvent) =>
  Array.from(e.dataTransfer?.types ?? []).includes("Files");
const TOOL_BTN =
  "min-h-[30px] cursor-pointer rounded-[7px] border-0 bg-transparent px-2 text-[12.5px] text-text-strong hover:bg-white/6 hover:text-text disabled:cursor-default disabled:opacity-40 max-sm:min-h-11";
const ICON_BTN =
  "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-text-tertiary hover:bg-white/8 hover:text-text max-sm:size-9";

const PAGE_SIZES = [
  { id: "a4", label: "A4" },
  { id: "letter", label: "Letter" },
  { id: "fit", label: "Same as image" },
] as const satisfies readonly { id: PageSize; label: string }[];
const PAGE_NOTE: Record<PageSize, string> = {
  a4: "A4 · 210 × 297 mm",
  letter: "Letter · 8.5 × 11 in",
  fit: "Each page takes the shape of its image — nothing is cropped or padded.",
};
const ORIENTS = [
  { id: "auto", label: "Auto" },
  { id: "portrait", label: "Portrait" },
  { id: "landscape", label: "Landscape" },
] as const satisfies readonly { id: Orient; label: string }[];
const FITS = [
  { id: "contain", label: "Fit whole image" },
  { id: "cover", label: "Fill the page" },
] as const satisfies readonly { id: Fit; label: string }[];
const MARGINS = [
  { id: "none", label: "None" },
  { id: "small", label: "Small" },
  { id: "large", label: "Large" },
] as const satisfies readonly { id: Margin; label: string }[];
const MODES = [
  { id: "original", label: "Original", sub: "Untouched" },
  { id: "balanced", label: "Balanced", sub: "Max 2400 px" },
  { id: "small", label: "Small", sub: "For email" },
] as const satisfies readonly { id: SizeMode; label: string; sub: string }[];
const MODE_NOTE: Record<SizeMode, string> = {
  original:
    "No quality lost. JPEGs go in exactly as they are; other formats are stored losslessly, which can be larger than the file.",
  balanced:
    "Photos re-saved as JPEG at 85%, up to 2400 px. Looks the same on screen and in print. Screenshots stay lossless.",
  small:
    "Photos re-saved at 1600 px, JPEG 70%. Fine for reading, not for zooming in. Screenshots stay lossless.",
};

/** The page as it will print: paper, margin, and the image placed (and cropped) exactly as in the PDF. */
function PagePreview({
  item,
  layout,
  thumb,
  n,
}: {
  item: ImageItem;
  layout: LayoutOpts;
  thumb: string | undefined;
  n: number;
}) {
  const info = item.info;
  const shown = info ? turned(info.w, info.h, item.rotate) : { w: 3, h: 4 };
  const L = layoutPage(shown.w, shown.h, layout);
  const { inner, box } = L;
  const quarter = item.rotate % 180 !== 0;
  const wide = L.pw / L.ph >= 1 / 1.2;
  return (
    <div className="flex aspect-[1/1.2] items-center justify-center">
      <div
        className={cn(
          "relative overflow-hidden rounded-[4px] bg-[#fbfaf7] shadow-[0_6px_18px_rgba(0,0,0,.35)]",
          wide ? "w-full" : "h-full",
        )}
        style={{ aspectRatio: `${L.pw} / ${L.ph}` }}
      >
        <div
          className="absolute overflow-hidden"
          style={{
            left: pct(inner.x / L.pw),
            top: pct(inner.y / L.ph),
            width: pct(inner.w / L.pw),
            height: pct(inner.h / L.ph),
          }}
        >
          <div
            className="absolute"
            style={{
              left: pct((box.x - inner.x) / inner.w),
              top: pct((inner.y + inner.h - box.y - box.h) / inner.h),
              width: pct(box.w / inner.w),
              height: pct(box.h / inner.h),
            }}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt=""
                draggable={false}
                className="absolute top-1/2 left-1/2 max-w-none transition-transform duration-200"
                style={{
                  width: quarter ? pct(box.h / box.w) : "100%",
                  height: quarter ? pct(box.w / box.h) : "100%",
                  transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
                }}
              />
            ) : (
              <span className="absolute inset-0 animate-pulse bg-[#e6e2d8]" />
            )}
          </div>
        </div>
        <span className="absolute right-1.5 bottom-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#0b0b0a]/72 px-[5px] font-mono text-[10.5px] font-bold text-text">
          {n}
        </span>
      </div>
    </div>
  );
}

const PageTile = memo(function PageTile({
  item,
  n,
  layout,
  store,
  onRotate,
  onRemove,
}: {
  item: ImageItem;
  n: number;
  layout: LayoutOpts;
  store: ThumbStore;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const thumb = useThumb(store, item.id);
  const info = item.info;
  const shown = info ? turned(info.w, info.h, item.rotate) : null;
  const cropped = shown ? layoutPage(shown.w, shown.h, layout).cropped : false;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={`Page ${n}: ${item.name}`}
      className={cn(
        "group relative flex touch-none flex-col gap-[7px] rounded-lg outline-none select-none focus-visible:shadow-[0_0_0_2px_var(--color-cat-rose)] [contain-intrinsic-size:auto_260px] [content-visibility:auto]",
        isDragging ? "z-10 opacity-30" : "cursor-grab",
      )}
    >
      <PagePreview item={item} layout={layout} thumb={thumb} n={n} />
      <div className="flex items-center gap-1">
        <div className="flex min-w-0 grow flex-col">
          <span
            className="truncate font-mono text-[11.5px] text-text-key"
            title={item.name}
          >
            {item.name}
          </span>
          <span
            className={cn(
              "truncate text-[11px]",
              cropped ? "text-cat-clay" : "text-text-faint",
            )}
          >
            {info
              ? `${info.w} × ${info.h}${cropped ? " · cropped" : ""}`
              : "Reading…"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRotate(item.id)}
          onPointerDown={stop}
          onKeyDown={stop}
          aria-label={`Rotate ${item.name}`}
          title="Rotate"
          className={ICON_BTN}
        >
          <RotateCw size={13} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          onPointerDown={stop}
          onKeyDown={stop}
          aria-label={`Remove ${item.name}`}
          title="Remove"
          className={ICON_BTN}
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </li>
  );
});

export function ImageToPdf({ tool }: { tool: Tool }) {
  const s = useImageToPdf();
  const { items, setItems } = s;
  const [page, setPage] = useState<PageSize>("a4");
  const [orient, setOrient] = useState<Orient>("auto");
  const [fit, setFit] = useState<Fit>("contain");
  const [margin, setMargin] = useState<Margin>("small");
  const [mode, setMode] = useState<SizeMode>("balanced");
  const [name, setName] = useState("images.pdf");
  const [size, setSize] = useState<PreviewSize>("M");
  const [full, setFull] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useFullScreen(full, setFull);

  const layout = useMemo<LayoutOpts>(
    () => ({ page, orient, margin, fit }),
    [page, orient, margin, fit],
  );
  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const ready = items.filter((i) => i.info);
  const reading = items.length - ready.length;
  const n = items.length;
  const rawBytes = items.reduce((t, i) => t + i.file.size, 0);
  const estimate = estimatePdfBytes(
    ready.map((i) => ({
      type: i.info?.type ?? "",
      bytes: i.file.size,
      w: i.info?.w ?? 0,
      h: i.info?.h ?? 0,
    })),
    mode,
  );
  const choose = () => fileRef.current?.click();

  // Paste screenshots straight in (⌘V / Ctrl+V), unless typing in a field.
  const { add } = s;
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      )
        return;
      const files = Array.from(e.clipboardData?.files ?? []).filter(
        isImageFile,
      );
      if (!files.length) return;
      e.preventDefault();
      add(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [add]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const to = e.over?.id;
    if (to === undefined || to === e.active.id) return;
    setItems((xs) =>
      arrayMove(
        xs,
        xs.findIndex((x) => x.id === e.active.id),
        xs.findIndex((x) => x.id === to),
      ),
    );
  };

  const build = async () => {
    if (!n || reading || busy) return;
    const file = pdfFileName(name, "images");
    setBusy({ done: 0, total: n });
    try {
      const { outputs } = await runPdfJob(
        {
          kind: "images",
          images: items.map((i) => ({
            blob: i.file,
            name: i.name,
            rotate: i.rotate,
          })),
          layout,
          mode,
        },
        (done, total) => setBusy({ done, total }),
      );
      downloadPdf(outputs[0], file);
      toast.success(`Saved ${file}`, {
        description: `${plural(n, "page")} · ${formatBytes(outputs[0].byteLength)}`,
      });
    } catch (e) {
      s.setProblems([
        e instanceof Error ? e.message : "The PDF couldn't be built.",
      ]);
    } finally {
      setBusy(null);
    }
  };

  let label = "Add images first";
  if (n)
    label = reading
      ? `Reading ${plural(reading, "image")}…`
      : `Create PDF · ${plural(n, "page")}`;
  if (busy)
    label =
      busy.done < busy.total
        ? `Building… ${busy.done} of ${busy.total}`
        : "Saving…";
  const grid = PREVIEW_SIZES.find((z) => z.short === size)?.cols;
  const active = activeId ? items.find((i) => i.id === activeId) : undefined;

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
          add(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          windowClass(full),
          dropping && "shadow-[0_0_0_2px_var(--color-cat-rose)]",
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.heic,.heif,.avif"
          multiple
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            add(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-border-subtle bg-toolbar px-3 py-2.5">
          <button
            type="button"
            onClick={choose}
            className="inline-flex min-h-[34px] cursor-pointer items-center gap-[7px] rounded-[9px] border border-white/14 bg-white/4 px-[13px] text-[13px] font-semibold text-text hover:border-white/25 max-sm:min-h-11"
          >
            <Plus size={14} aria-hidden className="text-cat-rose" />
            Add images
          </button>
          <span aria-hidden="true" className="h-5 w-px bg-white/8 max-sm:hidden" />
          <button
            type="button"
            disabled={n < 2}
            onClick={() =>
              setItems((xs) =>
                [...xs].sort((a, b) =>
                  a.name.localeCompare(b.name, undefined, {
                    numeric: true,
                    sensitivity: "base",
                  }),
                ),
              )
            }
            className={cn(TOOL_BTN, "inline-flex items-center gap-1.5")}
          >
            <ArrowDownAZ size={14} aria-hidden />
            Sort A–Z
          </button>
          <button
            type="button"
            disabled={n < 2}
            onClick={() => setItems((xs) => [...xs].reverse())}
            className={cn(TOOL_BTN, "inline-flex items-center gap-1.5")}
          >
            <Undo2 size={14} aria-hidden />
            Reverse
          </button>
          <span className="text-[12.5px] text-text-faint">
            {n
              ? `${plural(n, "image")} · drag to reorder`
              : "Images become pages, in order"}
          </span>
          <span className="grow" />
          <FullScreenButton on={full} onToggle={() => setFull((f) => !f)} />
          <SizePicker value={size} onChange={setSize} label="Preview size" />
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
            {s.problems.length > 0 && (
              <div
                role="alert"
                className="mb-3.5 flex items-start gap-2 rounded-[9px] border border-[rgba(224,121,95,.3)] bg-[rgba(224,121,95,.1)] px-3 py-[9px] text-[13px] text-[#f0a892]"
              >
                <div className="flex grow flex-col gap-1">
                  {s.problems.map((p) => (
                    <span key={p}>{p}</span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => s.setProblems([])}
                  aria-label="Dismiss"
                  className="cursor-pointer border-0 bg-transparent p-0 text-[#f0a892]"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            )}
            {n ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(e) => setActiveId(String(e.active.id))}
                onDragEnd={onDragEnd}
                onDragCancel={() => setActiveId(null)}
              >
                <SortableContext items={ids} strategy={rectSortingStrategy}>
                  <ol
                    aria-label="Pages in order"
                    className={cn(
                      "m-0 grid list-none grid-cols-2 items-start gap-x-3.5 gap-y-[18px] p-0",
                      grid,
                    )}
                  >
                    {items.map((item, i) => (
                      <PageTile
                        key={item.id}
                        item={item}
                        n={i + 1}
                        layout={layout}
                        store={s.thumbs}
                        onRotate={s.rotate}
                        onRemove={s.remove}
                      />
                    ))}
                    <li className="list-none">
                      <button
                        type="button"
                        onClick={choose}
                        className="flex aspect-[1/1.2] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-white/14 bg-transparent text-[12.5px] text-text-tertiary hover:border-white/30 hover:text-text"
                      >
                        <Plus size={22} aria-hidden className="text-cat-rose" />
                        Add images
                      </button>
                    </li>
                  </ol>
                </SortableContext>
                <DragOverlay>
                  {active ? (
                    <div className="w-[180px] cursor-grabbing opacity-95">
                      <PagePreview
                        item={active}
                        layout={layout}
                        thumb={s.thumbs.get(active.id)}
                        n={items.indexOf(active) + 1}
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
              <button
                type="button"
                onClick={choose}
                className="flex min-h-[320px] w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-white/16 bg-transparent text-sm text-text-tertiary hover:border-white/30 lg:h-full"
              >
                <ImagePlus size={28} aria-hidden className="text-cat-rose" />
                <span className="text-[17px] font-bold text-text">
                  Drop images here
                </span>
                JPG, PNG, WebP, HEIC, GIF — they stay on your device.
                <span className="text-[12.5px] text-text-faint">
                  or paste a screenshot
                </span>
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
              <Setting first title="Page size" hint={PAGE_NOTE[page]}>
                <Segmented
                  label="Page size"
                  value={page}
                  options={PAGE_SIZES}
                  onChange={setPage}
                  cols="grid-cols-[1fr_1fr_1.6fr]"
                />
              </Setting>
              {page !== "fit" && (
                <>
                  <Setting
                    title="Orientation"
                    hint={
                      orient === "auto"
                        ? "Wide images get landscape pages."
                        : undefined
                    }
                  >
                    <Segmented
                      label="Orientation"
                      value={orient}
                      options={ORIENTS}
                      onChange={setOrient}
                      cols="grid-cols-3"
                    />
                  </Setting>
                  <Setting title="Image on the page">
                    <Segmented
                      label="Image on the page"
                      value={fit}
                      options={FITS}
                      onChange={setFit}
                      cols="grid-cols-2"
                    />
                  </Setting>
                </>
              )}
              <Setting title="Margin">
                <Segmented
                  label="Margin"
                  value={margin}
                  options={MARGINS}
                  onChange={setMargin}
                  cols="grid-cols-3"
                />
              </Setting>
              <Setting title="File size" hint={MODE_NOTE[mode]}>
                <Segmented
                  label="File size"
                  value={mode}
                  options={MODES}
                  onChange={setMode}
                  cols="grid-cols-3"
                />
              </Setting>
              <div className="flex flex-col gap-2 border-t border-border-subtle p-3.5">
                <label htmlFor="ipdf-name" className="text-[13px] font-bold">
                  File name
                </label>
                <input
                  id="ipdf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  spellCheck={false}
                  className="min-h-9 rounded-lg border border-white/10 bg-[#0d0d0c] px-2.5 font-mono text-[12.5px] text-[#f0ece2] outline-none focus-visible:border-border-strong max-sm:min-h-11"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-border-subtle bg-[#121211] p-3.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-[12.5px] text-text-key">
                  {n
                    ? `${plural(n, "page")} · about ${formatBytes(estimate)}`
                    : "No images yet"}
                </span>
                {n > 0 && mode !== "original" && (
                  <span className="text-xs text-text-faint">
                    from {formatBytes(rawBytes)} of images
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => void build()}
                disabled={!n || reading > 0 || Boolean(busy)}
                aria-busy={Boolean(busy) || undefined}
                className="btn-action min-h-[46px] cursor-pointer rounded-[11px] text-[14.5px] font-bold disabled:cursor-default disabled:opacity-40"
              >
                {label}
              </button>
              <span className="text-center text-[11.5px] text-text-faint">
                No upload · no watermark · no image cap
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-3.5 py-[9px] font-mono text-[11.5px] text-text-faint">
          <span className="text-success-text">● Built on this device</span>
          <span>
            {n ? `${plural(n, "page")} · about ${formatBytes(estimate)}` : ""}
          </span>
          <span className="grow" />
          <span>0 bytes uploaded</span>
        </div>
      </div>

      <ToolContent {...seoData} />
    </ToolShell>
  );
}
