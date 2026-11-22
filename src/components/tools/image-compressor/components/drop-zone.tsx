"use client";

import { memo, useCallback, useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { cn } from "@/lib/cn";
import { isMac } from "@/lib/keyboard";
import { FILE_INPUT_ACCEPT } from "../image-compressor.constants";

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

/** Collect files from a drop, walking dropped folders recursively. */
async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  type WithGetAsEntry = DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntryLike | null };
  const items = dt.items;
  const hasEntryApi = items && Array.from(items).some((it) => typeof (it as WithGetAsEntry).webkitGetAsEntry === "function");
  if (!hasEntryApi) return Array.from(dt.files);
  const entries: FileSystemEntryLike[] = [];
  for (const it of Array.from(items)) {
    const entry = (it as WithGetAsEntry).webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }
  const collected: File[] = [];
  await Promise.all(entries.map((en) => walkEntry(en, collected)));
  return collected;
}

/**
 * Drag-and-drop for the whole workspace: images and folders. Browsers
 * expose the item *count* on dragover (not sizes), so the drop target can
 * say "Drop 3 files" as a small live signal.
 */
export function useImageDrop(onFiles: (files: File[]) => void) {
  const [hover, setHover] = useState(false);
  const [dragCount, setDragCount] = useState(0);
  const onDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    setHover(true);
    let n = 0;
    for (const it of Array.from(e.dataTransfer.items ?? [])) if (it.kind === "file") n += 1;
    setDragCount(n);
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
    // Only when the pointer leaves the target itself, not a child.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setHover(false);
    setDragCount(0);
  }, []);
  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLElement>) => {
      if (!Array.from(e.dataTransfer.types).includes("Files")) return;
      e.preventDefault();
      setHover(false);
      setDragCount(0);
      const files = await filesFromDrop(e.dataTransfer);
      if (files.length > 0) onFiles(files);
    },
    [onFiles],
  );
  return { hover, dragCount, handlers: { onDragOver, onDragLeave, onDrop } };
}

/** ⌘V / Ctrl+V anywhere on the page adds pasted images (not while typing). */
export function usePasteImages(onFiles: (files: File[]) => void) {
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        onFiles(files);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [onFiles]);
}

/** Hidden multi-file input shared by "Choose" and the empty state. */
export function FilePicker({ inputRef, onFiles }: { inputRef: RefObject<HTMLInputElement | null>; onFiles: (files: File[]) => void }) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept={FILE_INPUT_ACCEPT}
      multiple
      className="hidden"
      tabIndex={-1}
      aria-hidden
      onChange={(e) => {
        if (e.target.files && e.target.files.length > 0) onFiles(Array.from(e.target.files));
        e.target.value = "";
      }}
    />
  );
}

const noopSubscribe = () => () => {};

/** The queue's drop target (design): icon · "Drop images" · Choose. */
export const QueueDropZone = memo(function QueueDropZone({ hover, dragCount, onChoose }: { hover: boolean; dragCount: number; onChoose: () => void }) {
  // Server render says Ctrl+V; the client corrects it after hydration.
  const mac = useSyncExternalStore(noopSubscribe, isMac, () => false);
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border-[1.5px] border-dashed p-3 transition-colors",
        hover ? "border-clay-light bg-clay-light/8" : "border-white/14",
      )}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden className="shrink-0">
        <rect x="3.5" y="5.5" width="21" height="17" rx="3.5" stroke="rgba(246,242,234,.55)" strokeWidth="1.5" />
        <circle cx="10" cy="11" r="2" stroke="#e0a072" strokeWidth="1.5" />
        <path d="M4 20l6-5 4 3 4-4 6 5" stroke="rgba(246,242,234,.55)" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <div className="flex min-w-0 grow flex-col">
        <span className="text-[13px] font-bold">{hover && dragCount > 0 ? `Drop ${dragCount} file${dragCount === 1 ? "" : "s"}` : "Drop images"}</span>
        <span className="text-[11.5px] text-text-faint">
          or paste <span className="font-mono">{mac ? "⌘V" : "Ctrl+V"}</span> · any number
        </span>
      </div>
      <button
        type="button"
        onClick={onChoose}
        className="min-h-[30px] cursor-pointer rounded-lg border border-border-strong bg-white/4 px-[11px] text-xs font-semibold text-text transition-colors hover:bg-white/8 max-sm:min-h-11 max-sm:px-4"
      >
        Choose
      </button>
    </div>
  );
});
