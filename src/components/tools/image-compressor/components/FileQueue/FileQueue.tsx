"use client";

import { useCallback, useRef } from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Plus,
  Settings as SettingsIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import {
  FILE_INPUT_ACCEPT,
  STAGGER_CAP,
  STAGGER_STEP,
} from "../../image-compressor.constants";
import { formatBytes } from "../../image-compressor.lib";
import type {
  CompressionSettings,
  ImageFile,
  QualityMode,
} from "../../image-compressor.types";
import type { SortMode } from "../../useImageCompressor";
import { FileRow } from "./FileRow";

interface Props {
  files: ImageFile[];
  expandedFileId: string | null;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  totalSavedPct: number;
  sortMode: SortMode;
  onToggleExpanded: (id: string) => void;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onClearAll: () => void;
  onOpenSettings: () => void;
  onUpdateFileSettings: (id: string, patch: Partial<CompressionSettings>) => void;
  onResetFileSettings: (id: string) => void;
  onRecompressOne: (id: string) => void;
  onCancelOne: (id: string) => void;
  onSetAllQuality: (mode: QualityMode) => void;
  onSetDisplayName: (id: string, displayName: string | null) => void;
  onSetSortMode: (mode: SortMode) => void;
}

export function FileQueue({
  files,
  expandedFileId,
  totalOriginalBytes,
  totalCompressedBytes,
  totalSavedPct,
  sortMode,
  onToggleExpanded,
  onRemove,
  onDownload,
  onAddFiles,
  onClearAll,
  onOpenSettings,
  onUpdateFileSettings,
  onResetFileSettings,
  onRecompressOne,
  onCancelOne,
  onSetAllQuality,
  onSetDisplayName,
  onSetSortMode,
}: Props) {
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddClick = useCallback(() => inputRef.current?.click(), []);

  const onPickFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (list && list.length > 0) onAddFiles(list);
      e.target.value = "";
    },
    [onAddFiles],
  );

  return (
    <section className="flex flex-col gap-4">
      {/* ── Header strip: monospace data rail + actions ─────────── */}
      <header className="flex flex-wrap items-baseline justify-between gap-3 px-1">
        <h3 className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-sm tabular-nums">
          <span className="font-semibold text-text not-italic">
            {files.length} {files.length === 1 ? "file" : "files"}
          </span>
          <span aria-hidden className="text-text-faint">/</span>
          <span className="text-text-muted">
            {formatBytes(totalOriginalBytes)}
            <span aria-hidden className="mx-1.5 opacity-50">→</span>
            {formatBytes(totalCompressedBytes)}
          </span>
          <span aria-hidden className="text-text-faint">/</span>
          <span className="text-text-muted">
            {totalSavedPct >= 0 ? "saved " : "grew "}
            <span
              className={cn(
                "font-semibold",
                totalSavedPct > 0 && "text-success",
                totalSavedPct < 0 && "text-warning",
                totalSavedPct === 0 && "text-text-muted",
              )}
            >
              {totalSavedPct < 0 ? Math.abs(totalSavedPct) : totalSavedPct}%
            </span>
          </span>
        </h3>
        <div className="flex flex-wrap items-center gap-1">
          {/* Bulk quality menu — action menu that applies one quality
              mode to every file without affecting per-file format/resize. */}
          <HeaderMenu trigger="Set all to…">
            <DropdownMenuItem onSelect={() => onSetAllQuality("maximum")}>
              Max quality
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSetAllQuality("high")}>
              High quality
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSetAllQuality("small")}>
              Smallest file
            </DropdownMenuItem>
          </HeaderMenu>
          {/* Sort menu — stateful: shows the current sort label as part
              of the trigger and marks the active item with a check. */}
          <HeaderMenu
            trigger={SORT_LABEL[sortMode]}
            icon={<ArrowUpDown size={13} strokeWidth={1.7} aria-hidden />}
          >
            {(Object.keys(SORT_LABEL) as SortMode[]).map((m) => (
              <DropdownMenuItem
                key={m}
                onSelect={() => onSetSortMode(m)}
                className={cn(
                  m === sortMode && "text-text font-semibold",
                )}
              >
                {m === sortMode ? (
                  <Check size={12} strokeWidth={2.5} aria-hidden />
                ) : (
                  <span className="w-3" aria-hidden />
                )}
                {SORT_LABEL[m]}
              </DropdownMenuItem>
            ))}
          </HeaderMenu>
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-text-muted transition-[color,background-color,transform] duration-150 ease-out-strong hover:bg-surface-soft hover:text-text active:scale-[0.97] cursor-pointer"
          >
            <SettingsIcon size={15} strokeWidth={1.7} aria-hidden />
            Settings
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex h-9 items-center rounded-md px-2.5 text-sm font-medium text-text-muted transition-[color,background-color,transform] duration-150 ease-out-strong hover:bg-surface-soft hover:text-danger active:scale-[0.97] cursor-pointer"
          >
            Clear all
          </button>
        </div>
      </header>

      {/* ── Borderless document-style row list ──────────────────── */}
      <ul className="flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface">
        <AnimatePresence initial={false}>
          {files.map((f, i) => {
            const delay = Math.min(i * STAGGER_STEP, STAGGER_CAP);
            return (
              <FileRow
                key={f.id}
                file={f}
                expanded={f.id === expandedFileId}
                isLast={i === files.length - 1}
                onToggle={() => onToggleExpanded(f.id)}
                onRemove={() => onRemove(f.id)}
                onDownload={() => onDownload(f.id)}
                onUpdateSettings={(patch) => onUpdateFileSettings(f.id, patch)}
                onResetToGlobal={() => onResetFileSettings(f.id)}
                onRecompress={() => onRecompressOne(f.id)}
                onCancel={() => onCancelOne(f.id)}
                onSetDisplayName={(name) => onSetDisplayName(f.id, name)}
                reduceMotion={!!reduceMotion}
                entryDelay={delay}
              />
            );
          })}
        </AnimatePresence>

        {/* Inline "add more" footer — dashed top to read as separator. */}
        <li className="border-t border-dashed border-border-subtle/80">
          <button
            type="button"
            onClick={handleAddClick}
            className="flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium text-text-muted transition-[color,background-color] duration-150 ease-out-strong hover:bg-surface-soft hover:text-text cursor-pointer"
          >
            <Plus size={16} strokeWidth={1.7} aria-hidden />
            Add more files
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={FILE_INPUT_ACCEPT}
            multiple
            className="hidden"
            onChange={onPickFiles}
          />
        </li>
      </ul>
    </section>
  );
}

/**
 * Trigger button + Radix DropdownMenu wrapper used by the list header
 * for bulk quality + sort. Visually matches the other ghost buttons
 * in the header (`Settings`, `Clear all`) for a cohesive row.
 */
function HeaderMenu({
  trigger,
  icon,
  children,
}: {
  trigger: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-text-muted transition-[color,background-color,transform] duration-150 ease-out-strong hover:bg-surface-soft hover:text-text active:scale-[0.97]"
        >
          {icon}
          {trigger}
          <ChevronDown
            size={12}
            strokeWidth={1.7}
            aria-hidden
            className="opacity-60"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const SORT_LABEL: Record<SortMode, string> = {
  upload: "Upload order",
  name: "Name (A–Z)",
  "size-desc": "Largest first",
  "savings-desc": "Most saved",
};
