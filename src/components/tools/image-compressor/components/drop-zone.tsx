"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { FILE_INPUT_ACCEPT } from "../image-compressor.constants";

interface Props {
  onFiles: (files: FileList | File[]) => void;
  /** "full" = empty-state hero dropzone; "compact" = slim banner shown
   *  above the file list once files exist. Shares all drag/paste logic. */
  variant?: "full" | "compact";
}

const FORMATS = ["JPG", "PNG", "WebP", "AVIF", "GIF", "HEIC"];

// FileSystem Access shim — `webkitGetAsEntry` is well-supported but
// untyped in some lib.dom versions. These minimal interfaces describe
// just the surface we touch.
interface FileSystemEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}
interface FileSystemFileEntryLike extends FileSystemEntryLike {
  isFile: true;
  file: (resolve: (f: File) => void, reject?: (err: unknown) => void) => void;
}
interface FileSystemDirectoryEntryLike extends FileSystemEntryLike {
  isDirectory: true;
  createReader: () => FileSystemDirectoryReaderLike;
}
interface FileSystemDirectoryReaderLike {
  readEntries: (
    resolve: (entries: FileSystemEntryLike[]) => void,
    reject?: (err: unknown) => void,
  ) => void;
}

async function walkEntry(
  entry: FileSystemEntryLike,
  out: File[],
): Promise<void> {
  if (entry.isFile) {
    const fe = entry as FileSystemFileEntryLike;
    await new Promise<void>((resolve) => {
      fe.file(
        (f) => {
          out.push(f);
          resolve();
        },
        () => resolve(),
      );
    });
    return;
  }
  if (entry.isDirectory) {
    const de = entry as FileSystemDirectoryEntryLike;
    const reader = de.createReader();
    // readEntries can return up to 100 entries per call — loop until
    // it returns an empty batch.
    while (true) {
      const batch = await new Promise<FileSystemEntryLike[]>((resolve) => {
        reader.readEntries(
          (entries) => resolve(entries),
          () => resolve([]),
        );
      });
      if (batch.length === 0) break;
      for (const child of batch) await walkEntry(child, out);
    }
  }
}

export function DropZone({ onFiles, variant = "full" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  // Browsers expose item *count* (and a coarse kind/type) on dragover —
  // but not file sizes, for privacy. We show "Drop N files" during drag
  // as a small live signal that we noticed what the user is bringing in.
  const [dragCount, setDragCount] = useState(0);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files && files.length > 0) onFiles(files);
    },
    [onFiles],
  );

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setHover(false);
      setDragCount(0);
      // Folder support: walk the drop entries recursively so dropped
      // directories yield their image children. Falls back to the
      // flat `dataTransfer.files` list if `webkitGetAsEntry` isn't
      // available (very old browsers).
      const items = e.dataTransfer.items;
      type WithGetAsEntry = DataTransferItem & {
        webkitGetAsEntry?: () => FileSystemEntryLike | null;
      };
      const hasEntryApi =
        items && Array.from(items).some(
          (it) => typeof (it as WithGetAsEntry).webkitGetAsEntry === "function",
        );
      if (hasEntryApi) {
        const collected: File[] = [];
        const entries: FileSystemEntryLike[] = [];
        for (const it of Array.from(items)) {
          const entry = (it as WithGetAsEntry).webkitGetAsEntry?.();
          if (entry) entries.push(entry);
        }
        await Promise.all(entries.map((en) => walkEntry(en, collected)));
        if (collected.length > 0) onFiles(collected);
        return;
      }
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles, onFiles],
  );

  // Clipboard paste: when the dropzone is mounted (i.e. no files added
  // yet), listen on the document for paste events. Useful for users
  // who copy a screenshot or image from elsewhere.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) onFiles(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [onFiles]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setHover(true);
    const items = e.dataTransfer.items;
    if (items) {
      let n = 0;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") n += 1;
      }
      setDragCount(n);
    }
  }, []);

  const onDragLeave = useCallback(() => {
    setHover(false);
    setDragCount(0);
  }, []);

  // Compact banner — sits above the file list once files exist, so
  // "add more / paste" stays reachable without the big empty-state hero.
  if (variant === "compact") {
    return (
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "group flex w-full items-center gap-4 rounded-xl border border-dashed px-4 py-3.5 text-left transition-[border-color,background-color] duration-200 ease-out-strong cursor-pointer",
          hover
            ? "border-border-strong bg-surface-soft"
            : "border-border hover:border-border-strong/70 hover:bg-surface-soft/40",
        )}
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-soft text-text-muted ring-1 ring-border-subtle">
          <Upload size={18} strokeWidth={1.7} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">
            {hover && dragCount > 0
              ? `Drop ${dragCount} file${dragCount === 1 ? "" : "s"}`
              : "Drop images here or paste from clipboard"}
          </p>
          <p className="mt-0.5 truncate font-mono text-sm text-text-faint">
            {FORMATS.join(" · ")} — up to 50 MB · 20 per batch
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="inline-flex h-9 shrink-0 items-center rounded-lg border border-border bg-surface px-3.5 text-sm font-medium text-text transition-[background-color,border-color] duration-150 ease-out-strong hover:border-border-strong hover:bg-surface-soft cursor-pointer"
        >
          Browse
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={FILE_INPUT_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={cn(
        "group relative flex w-full flex-col items-center justify-center gap-7 overflow-hidden rounded-2xl border border-dashed bg-surface px-8 py-28 text-center transition-[border-color,background-color,transform] duration-300 ease-drawer cursor-pointer",
        hover
          ? "border-border-strong bg-surface-soft scale-[1.005]"
          : "border-border hover:border-border-strong/70 hover:bg-surface-soft/40",
      )}
    >
      {/* Ambient radial light — gives the empty state physical depth
          per minimalist-ui's "no flat empty sections" rule. Layered
          behind everything with pointer-events-none. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 50% 30%, color-mix(in oklab, var(--color-mist-sage) 35%, transparent), transparent 70%)",
        }}
      />

      {/* Double-bezel icon: outer shell + inner core (per high-end-visual-design). */}
      <div
        className={cn(
          "relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-soft ring-1 ring-border-subtle p-1.5 transition-transform duration-300 ease-drawer",
          hover && "scale-110",
        )}
      >
        <span className="flex h-full w-full items-center justify-center rounded-xl bg-surface text-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <Upload size={22} strokeWidth={1.6} />
        </span>
      </div>

      <div className="relative flex flex-col items-center gap-3">
        <h2 className="text-xl font-medium tracking-tight text-text">
          {hover && dragCount > 0
            ? `Drop ${dragCount} file${dragCount === 1 ? "" : "s"}`
            : "Drop images to compress"}
        </h2>
        <p className="max-w-[34ch] text-sm leading-relaxed text-text-muted">
          Drag a folder, paste from clipboard, or pick files. Everything stays on
          your device — no uploads, no signups.
        </p>
      </div>

      <div className="relative flex flex-col items-center gap-4">
        {/* Button-in-button trailing icon (per high-end-visual-design). */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-olive-ink pl-5 pr-1.5 text-sm font-semibold text-bone-cream transition-[opacity,transform] duration-150 ease-out-strong hover:opacity-95 active:scale-[0.97] cursor-pointer"
        >
          Choose files
          <span
            aria-hidden
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-bone-cream/15 transition-transform duration-200 ease-out-strong group-hover:translate-x-px"
          >
            <ArrowUpRight size={14} strokeWidth={2} />
          </span>
        </button>

        <p className="flex flex-wrap items-center justify-center gap-1.5 font-mono text-sm uppercase tracking-eyebrow text-text-faint tabular-nums">
          {FORMATS.map((f, i) => (
            <span key={f} className="flex items-center gap-1.5">
              {i > 0 ? (
                <span aria-hidden className="opacity-40">·</span>
              ) : null}
              <span>{f}</span>
            </span>
          ))}
          <span aria-hidden className="mx-2 opacity-40">|</span>
          <span>up to 50 MB · 20 per batch</span>
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
