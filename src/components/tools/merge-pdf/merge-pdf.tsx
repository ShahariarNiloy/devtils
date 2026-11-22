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
  type DragStartEvent,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowRight, Check, FileUp, Files, GripVertical, LayoutGrid, Plus, RotateCcw, RotateCw, Trash2, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { ToolContent } from "@/components/shared/tool-content";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools/types";
import { formatBytes } from "../pdf-shared/pdf-inspect.lib";
import { seoData } from "./content";
import { estimateBytes, moveFile, movePage, plural, removePages, rotatePages, shiftSelected, type PageItem, type PdfFile } from "./merge-pdf.lib";
import { useThumb, type ThumbStore } from "../pdf-shared/thumb-store";
import { useMergePdf } from "./use-merge-pdf";

/** File colour bars (board palette). */
const HUES = ["bg-cat-clay", "bg-cat-teal", "bg-cat-sage", "bg-cat-rose", "bg-syntax-boolean"] as const;
const SIZES = [
  { px: 104, short: "S", name: "Small", cols: "sm:grid-cols-[repeat(auto-fill,minmax(104px,1fr))]" },
  { px: 132, short: "M", name: "Medium", cols: "sm:grid-cols-[repeat(auto-fill,minmax(132px,1fr))]" },
  { px: 176, short: "L", name: "Large", cols: "sm:grid-cols-[repeat(auto-fill,minmax(176px,1fr))]" },
] as const;
type View = "pages" | "files";

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
const ICON_BTN =
  "inline-flex size-[34px] cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-text-strong transition-colors hover:bg-white/6 hover:text-text disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent max-sm:size-11";

/** Tile is A4-shaped: width 1, height √2. */
const TILE_H = 1.414;
/** Scale for a thumbnail of aspect `a` (w ÷ h) to fit the tile after a quarter turn. */
function quarterTurnScale(a: number): number {
  const [w0, h0] = a > 1 / TILE_H ? [1, 1 / a] : [TILE_H * a, TILE_H];
  return Math.min(1 / h0, TILE_H / w0);
}

/** A page picture, rotated the way it'll come out. */
function PageImage({ thumb, rotate }: { thumb: string | undefined; rotate: number }) {
  const [aspect, setAspect] = useState(1 / TILE_H);
  const turned = rotate % 180 !== 0;
  return (
    <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-md bg-[#2a2926]">
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          draggable={false}
          onLoad={(e) => setAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight || 1 / TILE_H)}
          className="max-h-full max-w-full object-contain transition-transform duration-200"
          style={{ transform: `rotate(${rotate}deg)${turned ? ` scale(${quarterTurnScale(aspect).toFixed(3)})` : ""}` }}
        />
      ) : (
        <span className="size-full animate-pulse bg-[#f4f1ea]/90" />
      )}
    </span>
  );
}

interface TileProps {
  page: PageItem;
  n: number;
  label: string;
  hue: string;
  selected: boolean;
  /** Some page is selected — checkboxes stay visible. */
  selecting: boolean;
  store: ThumbStore;
  onToggle: (id: string, range: boolean) => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
  observe: Observe;
}

/** Register a tile with the shared IntersectionObserver; returns its cleanup. */
type Observe = (el: Element, file: string, index: number) => () => void;

const PageTile = memo(function PageTile({ page, n, label, hue, selected, selecting, store, onToggle, onRotate, onRemove, observe }: TileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const thumb = useThumb(store, `${page.file}:${page.index}`);
  const { file, index } = page;
  // Stable, so re-renders don't re-register 3,000 tiles with the observer.
  const ref = useCallback(
    (el: HTMLLIElement | null) => {
      setNodeRef(el);
      return el ? observe(el, file, index) : undefined;
    },
    [setNodeRef, observe, file, index],
  );
  return (
    <li
      ref={ref}
      {...attributes}
      {...listeners}
      role="listitem"
      aria-roledescription="draggable page"
      aria-label={`Page ${n}, ${label}. Space to pick up, arrow keys to move.`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        // Off-screen tiles skip layout and paint until they scroll near.
        "group relative flex touch-none flex-col gap-[7px] outline-none select-none [contain-intrinsic-size:auto_220px] [content-visibility:auto]",
        isDragging ? "z-10 opacity-30" : "cursor-grab",
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${selected ? "Deselect" : "Select"} page ${n}`}
        onClick={(e) => onToggle(page.id, e.shiftKey)}
        className={cn(
          "relative block aspect-[1/1.414] w-full cursor-pointer rounded-md border-0 bg-transparent p-0 transition-shadow group-focus-visible:shadow-[0_0_0_2px_rgba(246,242,234,.5)]",
          selected ? "shadow-[0_0_0_2px_var(--color-cat-clay),0_8px_24px_rgba(0,0,0,.35)]" : "shadow-[0_6px_18px_rgba(0,0,0,.3)]",
        )}
      >
        <PageImage thumb={thumb} rotate={page.rotate} />
        <span aria-hidden="true" className={cn("absolute inset-x-0 bottom-0 h-1 rounded-b-md", hue)} />
        <span
          aria-hidden="true"
          title="Select"
          className={cn(
            "absolute top-[7px] left-[7px] flex size-[18px] items-center justify-center rounded-[5px] border-[1.5px] text-[#1a1208] transition-opacity",
            selected ? "border-cat-clay bg-cat-clay opacity-100" : "border-white/60 bg-[rgba(11,11,10,.55)]",
            !selected && (selecting ? "opacity-100" : "opacity-0 group-hover:opacity-100"),
          )}
        >
          {selected && <Check size={12} strokeWidth={3} />}
        </span>
      </button>
      <div className="flex items-center gap-1">
        <span className="font-mono text-[11.5px] font-bold text-text-key">{n}</span>
        <span className="min-w-0 grow truncate text-[11px] text-text-faint" title={label}>
          {label}
        </span>
        <button
          type="button"
          onClick={() => onRotate(page.id)}
          aria-label={`Rotate page ${n}`}
          className="flex size-6 cursor-pointer items-center justify-center rounded-md text-text-tertiary hover:bg-white/6 hover:text-text max-sm:size-9"
        >
          <RotateCw size={12} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onRemove(page.id)}
          aria-label={`Delete page ${n}`}
          className="flex size-6 cursor-pointer items-center justify-center rounded-md text-text-tertiary hover:bg-white/6 hover:text-text max-sm:size-9"
        >
          <X size={13} aria-hidden />
        </button>
      </div>
    </li>
  );
});

const FileCard = memo(function FileCard({
  file,
  n,
  kept,
  first,
  store,
  hue,
  onRemove,
  observe,
}: {
  file: PdfFile;
  n: number;
  kept: number;
  first: PageItem | undefined;
  store: ThumbStore;
  hue: string;
  onRemove: (id: string) => void;
  observe: Observe;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: file.id });
  const thumb = useThumb(store, first ? `${first.file}:${first.index}` : null);
  const fFile = first?.file;
  const fIndex = first?.index;
  const ref = useCallback(
    (el: HTMLLIElement | null) => {
      setNodeRef(el);
      return el && fFile !== undefined && fIndex !== undefined ? observe(el, fFile, fIndex) : undefined;
    },
    [setNodeRef, observe, fFile, fIndex],
  );
  return (
    <li
      ref={ref}
      {...attributes}
      {...listeners}
      role="listitem"
      aria-roledescription="draggable file"
      aria-label={`File ${n}, ${file.name}. Space to pick up, arrow keys to move.`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group relative flex touch-none flex-col gap-2 rounded-xl border border-white/7 bg-[#141413] p-2.5 outline-none select-none focus-visible:border-white/30",
        isDragging ? "z-10 opacity-30" : "cursor-grab hover:border-white/15",
      )}
    >
      <span className="relative block aspect-[1/1.414] w-full">
        <PageImage thumb={thumb} rotate={first?.rotate ?? 0} />
        <span className="absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-md bg-[#0b0b0a]/80 font-mono text-[11.5px] font-bold text-text">{n}</span>
        <span className="absolute right-1.5 bottom-2 rounded-md bg-[#0b0b0a]/80 px-1.5 py-0.5 font-mono text-[10.5px] text-text-strong">{plural(kept, "page")}</span>
      </span>
      <div className="flex items-start gap-1.5">
        <span aria-hidden="true" className={cn("mt-1 h-3 w-1 shrink-0 rounded-sm", hue)} />
        <div className="flex min-w-0 grow flex-col">
          <span className="truncate font-mono text-xs text-text-key" title={file.name}>
            {file.name}
          </span>
          <span className="text-[11px] text-text-faint">
            {kept === file.pageCount ? "All pages" : `${kept} of ${file.pageCount} pages`} · {formatBytes(file.size)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(file.id)}
          aria-label={`Remove ${file.name}`}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-tertiary hover:bg-white/6 hover:text-text max-sm:size-9"
        >
          <X size={13} aria-hidden />
        </button>
      </div>
    </li>
  );
});

export function MergePdf({ tool }: { tool: Tool }) {
  const m = useMergePdf();
  const { files, pages, sel, setPages, setSel } = m;
  const [view, setView] = useState<View>("pages");
  const [size, setSize] = useState(1);
  const [dropping, setDropping] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastClicked = useRef<string | null>(null);

  const fileById = useMemo(() => new Map(files.map((f) => [f.id, f])), [files]);
  // Same array until the order really changes, so sortables don't all re-render.
  const pageIds = useMemo(() => pages.map((p) => p.id), [pages]);
  const fileIds = useMemo(() => files.map((f) => f.id), [files]);
  const total = pages.length;
  const nSel = sel.size;
  const choose = () => fileRef.current?.click();

  // A small move before a drag starts, so a plain click still selects.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* One IntersectionObserver for every tile: thumbnails load as they scroll in. */
  const { requestThumb } = m;
  const io = useRef<IntersectionObserver | null>(null);
  const targets = useRef(new Map<Element, [string, number]>());
  useEffect(() => {
    const t = targets.current;
    io.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const hit = t.get(e.target);
          if (hit) requestThumb(hit[0], hit[1]);
          io.current?.unobserve(e.target);
        }
      },
      { rootMargin: "400px 0px" },
    );
    for (const el of t.keys()) io.current.observe(el);
    return () => io.current?.disconnect();
  }, [requestThumb]);
  const observe = useCallback<Observe>((el, file, index) => {
    targets.current.set(el, [file, index]);
    io.current?.observe(el);
    return () => {
      targets.current.delete(el);
      io.current?.unobserve(el);
    };
  }, []);

  /* ------------------------------------------------------------- edits */
  // Reads the latest pages at click time, so the handler never changes and
  // adding or moving pages doesn't re-render every tile.
  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);
  const onToggle = useCallback(
    (id: string, range: boolean) => {
      const all = pagesRef.current;
      setSel((s) => {
        const next = new Set(s);
        if (range && lastClicked.current) {
          const a = all.findIndex((p) => p.id === lastClicked.current);
          const b = all.findIndex((p) => p.id === id);
          if (a >= 0 && b >= 0) for (const p of all.slice(Math.min(a, b), Math.max(a, b) + 1)) next.add(p.id);
        } else if (next.has(id)) next.delete(id);
        else next.add(id);
        lastClicked.current = id;
        return next;
      });
    },
    [setSel],
  );
  const onRotate = useCallback((id: string) => setPages((ps) => rotatePages(ps, new Set([id]), 90)), [setPages]);
  const onRemove = useCallback(
    (id: string) => {
      setPages((ps) => removePages(ps, new Set([id])));
      setSel((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    },
    [setPages, setSel],
  );

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const from = String(e.active.id);
    const to = e.over ? String(e.over.id) : null;
    if (!to || from === to) return;
    if (view === "pages") {
      setPages((ps) => movePage(ps, ps.findIndex((p) => p.id === from), ps.findIndex((p) => p.id === to)));
    } else {
      const next = moveFile(files, pages, files.findIndex((f) => f.id === from), files.findIndex((f) => f.id === to));
      m.setFiles(next.files);
      setPages(next.pages);
    }
  };

  const rotateSel = (d: number) => nSel && setPages((ps) => rotatePages(ps, sel, d));
  const shiftSel = (d: -1 | 1) => nSel && setPages((ps) => shiftSelected(ps, sel, d));
  const deleteSel = () => {
    if (!nSel) return;
    setPages((ps) => removePages(ps, sel));
    setSel(new Set());
  };
  const allSelected = total > 0 && nSel === total;
  const selectAll = () => setSel(allSelected ? new Set() : new Set(pages.map((p) => p.id)));

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement || view !== "pages") return;
    if ((e.key === "Delete" || e.key === "Backspace") && nSel) {
      e.preventDefault();
      deleteSel();
    } else if (e.key === "Escape" && nSel) setSel(new Set());
    else if (e.key.toLowerCase() === "a" && (e.metaKey || e.ctrlKey) && total) {
      e.preventDefault();
      setSel(new Set(pages.map((p) => p.id)));
    }
  };

  const merge = async () => {
    const r = await m.merge();
    if (r) toast.success(`Saved ${r.fileName}`, { description: `${plural(r.pages, "page")} · ${r.size}` });
  };

  let addLabel = files.length ? "+ Add more PDFs" : "+ Add PDFs";
  if (m.loading) addLabel = "Opening…";
  const summary = `${plural(total, "page")} · about ${formatBytes(Math.round(estimateBytes(files, pages)))}`;
  const labelOf = (p: PageItem) => `${(fileById.get(p.file)?.name ?? "").replace(/\.pdf$/i, "")} · p${p.index + 1}`;
  const hueOf = (fileId: string) => HUES[(fileById.get(fileId)?.hue ?? 0) % HUES.length];
  const thumbOf = (p: PageItem | undefined) => (p ? m.thumbs.get(`${p.file}:${p.index}`) : undefined);
  const activePage = view === "pages" && activeId ? pages.find((p) => p.id === activeId) : undefined;
  const activeFile = view === "files" && activeId ? fileById.get(activeId) : undefined;

  let hint = "Drag pages to reorder · click pages to select several";
  if (view === "files") hint = "Drag files to set the order · each file's pages stay together";
  else if (nSel) hint = `${nSel} selected — rotate, move or delete them together`;

  return (
    <ToolShell tool={tool} titleStyle="inline" relatedSlugs={seoData.relatedSlugs}>
      <div
        id="tool"
        tabIndex={-1}
        onKeyDown={onKey}
        onDragOver={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          setDropping(true);
        }}
        onDragLeave={(e) => {
          const next = e.relatedTarget;
          if (next instanceof Node && e.currentTarget.contains(next)) return;
          setDropping(false);
        }}
        onDrop={(e) => {
          setDropping(false);
          if (!hasFiles(e)) return;
          e.preventDefault();
          void m.addFiles(e.dataTransfer.files);
        }}
        className={cn("relative overflow-hidden rounded-[18px] bg-[#101010] shadow-window-tool outline-none", dropping && "shadow-[0_0_0_2px_var(--color-cat-clay)]")}
      >
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            void m.addFiles(e.target.files);
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
            <Plus size={14} aria-hidden className="text-cat-clay" /> Add PDFs
          </button>
          <div role="tablist" aria-label="Arrange by" className="flex gap-0.5 rounded-[9px] border border-white/7 bg-[#0d0d0c] p-0.5">
            {(
              [
                ["pages", "By page", LayoutGrid],
                ["files", "By file", Files],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                onClick={() => {
                  setView(id);
                  setSel(new Set());
                  // "By file" means each file's pages stay together, in file order.
                  if (id === "files") setPages(moveFile(files, pages, 0, 0).pages);
                }}
                className={cn(
                  "inline-flex min-h-[30px] cursor-pointer items-center gap-1.5 rounded-[7px] border-0 px-3 text-[12.5px] font-semibold max-sm:min-h-11",
                  view === id ? "bg-selected text-text" : "bg-transparent text-text-tertiary hover:text-text",
                )}
              >
                <Icon size={14} aria-hidden />
                {label}
              </button>
            ))}
          </div>
          {view === "pages" && (
            <>
              <span aria-hidden="true" className="h-5 w-px bg-white/8" />
              <div role="group" aria-label="Selected pages" className="flex gap-0.5">
                <button type="button" disabled={!nSel} onClick={() => rotateSel(270)} aria-label="Rotate selected pages left" title="Rotate selected left" className={ICON_BTN}>
                  <RotateCcw size={15} aria-hidden />
                </button>
                <button type="button" disabled={!nSel} onClick={() => rotateSel(90)} aria-label="Rotate selected pages right" title="Rotate selected right" className={ICON_BTN}>
                  <RotateCw size={15} aria-hidden />
                </button>
                <button type="button" disabled={!nSel} onClick={() => shiftSel(-1)} aria-label="Move selected pages earlier" title="Move selected earlier" className={ICON_BTN}>
                  <ArrowLeft size={15} aria-hidden />
                </button>
                <button type="button" disabled={!nSel} onClick={() => shiftSel(1)} aria-label="Move selected pages later" title="Move selected later" className={ICON_BTN}>
                  <ArrowRight size={15} aria-hidden />
                </button>
                <button type="button" disabled={!nSel} onClick={deleteSel} aria-label="Delete selected pages" title="Delete selected" className={cn(ICON_BTN, "text-[#f0a892] hover:text-[#f0a892]")}>
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
            </>
          )}
          <span className="text-[12.5px] text-text-faint" aria-live="polite">
            {total > 0 ? hint : ""}
          </span>
          <span className="grow" />
          {view === "pages" && total > 0 && (
            <button type="button" onClick={selectAll} className="min-h-[30px] cursor-pointer rounded-[7px] border-0 bg-transparent px-2.5 text-[12.5px] text-text-tertiary hover:text-text max-sm:min-h-11">
              {allSelected ? "Clear selection" : "Select all"}
            </button>
          )}
          <div role="group" aria-label="Thumbnail size" className="hidden gap-0.5 rounded-lg border border-white/7 bg-[#0d0d0c] p-0.5 sm:flex">
            {SIZES.map((z, k) => (
              <button
                key={z.px}
                type="button"
                aria-pressed={size === k}
                aria-label={`${z.name} thumbnails`}
                onClick={() => setSize(k)}
                className={cn("min-h-[26px] w-7 cursor-pointer rounded-md border-0 text-[11.5px] font-semibold", size === k ? "bg-selected text-text" : "bg-transparent text-text-tertiary hover:text-text")}
              >
                {z.short}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* pages / files */}
          <div className="box-border min-w-0 overflow-auto p-[18px] [background:radial-gradient(70%_60%_at_50%_0%,rgba(197,142,94,.06),transparent_70%)] lg:h-[720px]">
            {m.error && (
              <div role="alert" className="mb-3.5 rounded-[9px] border border-[rgba(224,121,95,.3)] bg-[rgba(224,121,95,.1)] px-3 py-[9px] text-[13px] text-[#f0a892]">
                {m.error}
              </div>
            )}
            {total > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
                {view === "pages" ? (
                  <SortableContext items={pageIds} strategy={rectSortingStrategy}>
                    <ol aria-label="Pages in order" className={cn("m-0 grid list-none grid-cols-3 items-start gap-x-3.5 gap-y-[18px] p-0", SIZES[size].cols)}>
                      {pages.map((p, i) => (
                        <PageTile
                          key={p.id}
                          page={p}
                          n={i + 1}
                          label={labelOf(p)}
                          hue={hueOf(p.file)}
                          selected={sel.has(p.id)}
                          selecting={nSel > 0}
                          store={m.thumbs}
                          onToggle={onToggle}
                          onRotate={onRotate}
                          onRemove={onRemove}
                          observe={observe}
                        />
                      ))}
                    </ol>
                  </SortableContext>
                ) : (
                  <SortableContext items={fileIds} strategy={rectSortingStrategy}>
                    <ol aria-label="Files in order" className={cn("m-0 grid list-none grid-cols-2 items-start gap-4 p-0", SIZES[Math.min(2, size + 1)].cols)}>
                      {files.map((f, i) => {
                        const first = pages.find((p) => p.file === f.id);
                        return (
                          <FileCard
                            key={f.id}
                            file={f}
                            n={i + 1}
                            kept={pages.filter((p) => p.file === f.id).length}
                            first={first}
                            store={m.thumbs}
                            hue={hueOf(f.id)}
                            onRemove={m.removeFile}
                            observe={observe}
                          />
                        );
                      })}
                    </ol>
                  </SortableContext>
                )}
                <DragOverlay>
                  {activePage && (
                    <div className="relative aspect-[1/1.414] w-full rotate-2 cursor-grabbing rounded-md shadow-[0_0_0_2px_var(--color-cat-clay),0_18px_40px_rgba(0,0,0,.55)]">
                      <PageImage thumb={thumbOf(activePage)} rotate={activePage.rotate} />
                    </div>
                  )}
                  {activeFile && (
                    <div className="flex rotate-2 cursor-grabbing items-center gap-2 rounded-xl border border-cat-clay/60 bg-[#1c1c1a] px-3 py-2.5 shadow-[0_18px_40px_rgba(0,0,0,.55)]">
                      <GripVertical size={14} aria-hidden className="text-text-faint" />
                      <span className="truncate font-mono text-xs text-text-key">{activeFile.name}</span>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            ) : (
              <button
                type="button"
                onClick={choose}
                className="flex min-h-[320px] w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-white/16 bg-transparent text-sm text-text-tertiary hover:border-white/30 lg:h-full"
              >
                <FileUp size={28} aria-hidden className="text-cat-clay" />
                <span className="text-[17px] font-bold text-text">{m.loading ? "Opening…" : "Drop PDFs here"}</span>
                or click to choose. They stay on your device.
              </button>
            )}
          </div>

          {/* side panel */}
          <div className="flex min-w-0 flex-col border-t border-border-subtle lg:border-t-0 lg:border-l">
            <div className="flex flex-col gap-2 p-3.5">
              <div className="flex items-baseline">
                <span className="grow text-[13px] font-bold">Files</span>
                <span className="text-xs text-text-faint">{plural(files.length, "file")}</span>
              </div>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {files.map((f) => {
                  const kept = pages.filter((p) => p.file === f.id).length;
                  return (
                    <li key={f.id} className="flex items-center gap-2.5 rounded-[10px] border border-white/6 bg-[#0d0d0c] py-2 pr-2 pl-2.5">
                      <span aria-hidden="true" className={cn("w-1 self-stretch rounded-sm", hueOf(f.id))} />
                      <div className="flex min-w-0 grow flex-col">
                        <span className="truncate font-mono text-xs text-text-key" title={f.name}>
                          {f.name}
                        </span>
                        <span className="text-[11.5px] text-text-faint">
                          {kept} of {plural(f.pageCount, "page")} · {formatBytes(f.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => m.removeFile(f.id)}
                        aria-label={`Remove ${f.name}`}
                        className="flex size-[26px] cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-text-tertiary hover:bg-white/6 hover:text-text max-sm:size-11"
                      >
                        <X size={14} aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button type="button" onClick={choose} className="min-h-[34px] cursor-pointer rounded-[9px] border border-dashed border-white/16 bg-transparent text-[12.5px] text-text-tertiary hover:text-text max-sm:min-h-11">
                {addLabel}
              </button>
            </div>
            <div className="flex flex-col gap-2 border-t border-border-subtle p-3.5">
              <label htmlFor="pdfm-name" className="text-[13px] font-bold">
                File name
              </label>
              <input
                id="pdfm-name"
                value={m.name}
                onChange={(e) => m.setName(e.target.value)}
                spellCheck={false}
                className="min-h-9 rounded-lg border border-white/10 bg-[#0d0d0c] px-2.5 font-mono text-[12.5px] text-[#f0ece2] outline-none focus-visible:border-border-strong"
              />
            </div>
            <span className="grow" />
            <div className="flex flex-col gap-2 border-t border-border-subtle bg-[#121211] p-3.5">
              <span className="text-[12.5px] text-text-tertiary">{summary}</span>
              <button
                type="button"
                onClick={() => void merge()}
                disabled={!total || m.busy}
                aria-busy={m.busy || undefined}
                className="btn-action min-h-[46px] cursor-pointer rounded-[11px] text-[14.5px] font-bold disabled:cursor-default disabled:opacity-40"
              >
                {m.busy ? "Merging…" : `Merge & download · ${plural(total, "page")}`}
              </button>
              <span className="text-center text-[11.5px] text-text-faint">No upload · no size limit · no daily cap</span>
            </div>
          </div>
        </div>

        {/* status bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-3.5 py-[9px] font-mono text-[11.5px] text-text-faint">
          <span className="text-success-text">● Merged on this device</span>
          <span>{summary}</span>
          <span className="grow" />
          <span>0 bytes uploaded</span>
        </div>
      </div>

      <ToolContent {...seoData} />
    </ToolShell>
  );
}
