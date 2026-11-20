"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { AlertTriangle, Columns2, Download, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { describeCompressionError } from "../../image-compressor.errors";
import { formatBytes } from "../../image-compressor.lib";
import type { ImageFile } from "../../image-compressor.types";
import { dimensionsLabel, sizeBarPct } from "../../image-compressor.view";
import { SavingsBadge } from "./file-row-controls";

interface RowProps {
  file: ImageFile;
  /** Shown in the compare panel. */
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDownload: () => void;
  onCancel: () => void;
  onSetDisplayName: (name: string | null) => void;
  reduceMotion: boolean;
  entryDelay: number;
}

/** v2 file card: thumb, name, dimensions, savings, size bar, before → after. */
export function FileRow({
  file,
  selected,
  onSelect,
  onRemove,
  onDownload,
  onCancel,
  onSetDisplayName,
  reduceMotion,
  entryDelay,
}: RowProps) {
  const result = file.status === "done" ? file.result : null;
  const busy = file.status === "compressing" || file.status === "idle";
  const baseName = file.displayName ?? file.file.name.replace(/\.[^.]+$/, "");
  const [editing, setEditing] = useState(false);
  // Keeps the closing menu from pulling focus back off the rename input.
  const renameRequested = useRef(false);
  const commitName = (value: string) => {
    onSetDisplayName(value);
    setEditing(false);
  };

  // Kind-specific failure copy; "cancelled" reads as a muted, non-scary state.
  const errorInfo = file.status === "error" && file.error ? describeCompressionError(file.error) : null;
  const cancelled = file.error?.kind === "cancelled";
  // A stale result (re-compressing) still shows its numbers, dimmed.
  const shown = result ?? (busy ? file.result : null);

  return (
    <motion.li
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
      transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1], delay: entryDelay }}
      className={cn(
        "surface-panel flex flex-col gap-2 rounded-xl p-3 transition-[border-color]",
        selected && "border-clay-light/45!",
      )}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`Compare ${file.file.name}`}
          title={selected ? "Shown in the compare preview" : "Compare this image"}
          className="flex min-w-0 grow cursor-pointer items-center gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span aria-hidden className="relative size-[38px] shrink-0 overflow-hidden rounded-lg bg-surface-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={file.previewUrl} alt="" className="h-full w-full object-cover" draggable={false} />
          </span>
          <span className="flex min-w-0 grow flex-col">
            {editing ? null : <span className="text-[13px] font-bold break-all text-text">{baseName}</span>}
            <span className="text-[11px] text-text-faint">
              {dimensionsLabel(file)}
              {selected ? <span className="text-clay-light"> · comparing</span> : null}
            </span>
          </span>
        </button>
        {busy ? (
          <span className={cn("shrink-0 text-xs font-semibold", file.status === "compressing" ? "text-clay-light" : "text-text-faint")}>
            {file.status === "compressing" ? "Compressing" : "Queued"}
          </span>
        ) : errorInfo ? (
          <span
            title={errorInfo.hint}
            className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-semibold", cancelled ? "text-text-faint" : "text-error-text")}
          >
            {!cancelled ? <AlertTriangle size={12} strokeWidth={2.5} aria-hidden /> : null}
            <span className="capitalize">{errorInfo.label}</span>
          </span>
        ) : result ? (
          <SavingsBadge savedPct={result.savedPct} />
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`More actions for ${file.file.name}`}
              className="-mr-1 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-white/6 hover:text-text data-[state=open]:bg-white/6 data-[state=open]:text-text"
            >
              <MoreHorizontal size={16} aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-44"
            onCloseAutoFocus={(e) => {
              if (renameRequested.current) {
                e.preventDefault();
                renameRequested.current = false;
              }
            }}
          >
            <DropdownMenuItem onSelect={onSelect}>
              <Columns2 size={14} aria-hidden />
              Compare
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDownload} disabled={!result}>
              <Download size={14} aria-hidden />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                renameRequested.current = true;
                setEditing(true);
              }}
            >
              <Pencil size={14} aria-hidden />
              Rename
            </DropdownMenuItem>
            {file.status === "compressing" ? (
              <DropdownMenuItem onSelect={onCancel}>
                <X size={14} aria-hidden />
                Cancel compressing
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onRemove} className="data-highlighted:text-error-text">
              <Trash2 size={14} aria-hidden />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {editing ? (
        <input
          autoFocus
          defaultValue={baseName}
          aria-label="Rename file (extension is added on download)"
          onKeyDown={(e) => {
            if (e.key === "Enter") commitName(e.currentTarget.value);
            else if (e.key === "Escape") setEditing(false);
          }}
          onBlur={(e) => commitName(e.currentTarget.value)}
          className="min-h-9 w-full rounded-lg border border-border-strong bg-canvas px-2.5 text-[13px] font-semibold text-text outline-none focus:border-brand"
        />
      ) : null}

      <SizeBar file={file} busy={busy} reduceMotion={reduceMotion} />

      <div className={cn("flex justify-between gap-3 font-mono text-xs text-text-faint tabular-nums", busy && shown && "opacity-60")}>
        <span>{formatBytes(file.originalSize)}</span>
        <span className="text-text">{shown ? `→ ${formatBytes(shown.newSize)}` : busy ? "→ …" : "→ —"}</span>
      </div>
    </motion.li>
  );
}

function SizeBar({ file, busy, reduceMotion }: { file: ImageFile; busy: boolean; reduceMotion: boolean }) {
  const r = file.result;
  return (
    <div aria-hidden className="relative h-1.5 overflow-hidden rounded-full bg-white/6">
      {busy && file.status === "compressing" ? (
        reduceMotion ? (
          <span className="absolute inset-0 bg-accent/50" />
        ) : (
          <span
            className="absolute top-0 left-0 h-full w-1/3 rounded-full bg-accent will-change-transform"
            style={{ animation: "indeterminate 1.1s cubic-bezier(0.65, 0, 0.35, 1) infinite" }}
          />
        )
      ) : r && !busy ? (
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full", r.savedPct < 0 ? "bg-warning" : "bg-accent")}
          style={{ width: `${sizeBarPct(file.originalSize, r.newSize)}%` }}
        />
      ) : file.status === "error" ? (
        <span className="absolute inset-0 bg-error/40" />
      ) : null}
    </div>
  );
}
