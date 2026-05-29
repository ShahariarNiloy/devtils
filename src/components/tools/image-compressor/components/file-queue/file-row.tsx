"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { MIME_LABEL } from "../../image-compressor.constants";
import { describeCompressionError } from "../../image-compressor.errors";
import { formatBytes } from "../../image-compressor.lib";
import type { CompressionSettings, ImageFile } from "../../image-compressor.types";
import { ExpandedRow } from "../file-detail/expanded-row";
import { BusyIndicator, IconButton, SavingsBadge } from "./file-row-controls";

interface RowProps {
  file: ImageFile;
  expanded: boolean;
  isLast: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onDownload: () => void;
  onUpdateSettings: (patch: Partial<CompressionSettings>) => void;
  onResetToGlobal: () => void;
  onRecompress: () => void;
  onCancel: () => void;
  onSetDisplayName: (name: string | null) => void;
  reduceMotion: boolean;
  entryDelay: number;
}

export function FileRow({
  file,
  expanded,
  isLast,
  onToggle,
  onRemove,
  onDownload,
  onUpdateSettings,
  onResetToGlobal,
  onRecompress,
  onCancel,
  onSetDisplayName,
  reduceMotion,
  entryDelay,
}: RowProps) {
  const formatLabel = MIME_LABEL[file.inputMimeType] ?? "IMG";
  const showDone = file.status === "done" && !!file.result;
  const isBusy = file.status === "compressing" || file.status === "idle";
  // Display name without extension; the row shows this, the expanded
  // section lets the user edit it, and download time re-attaches the
  // output extension.
  const baseName =
    file.displayName ?? file.file.name.replace(/\.[^.]+$/, "");

  // Inline rename lives in the row header now: click the name (or its
  // pencil) to edit; commit on Enter/blur, cancel on Escape.
  const [editing, setEditing] = useState(false);
  const commitName = (value: string) => {
    onSetDisplayName(value);
    setEditing(false);
  };

  // Kind-specific failure copy. Cancelled renders as a muted, non-scary
  // state; everything else gets the danger treatment + a recovery hint.
  const errorDetail = file.status === "error" ? file.error : null;
  const errorInfo = errorDetail ? describeCompressionError(errorDetail) : null;
  const cancelled = errorDetail?.kind === "cancelled";

  return (
    <motion.li
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -2 }}
      transition={{
        duration: 0.22,
        ease: [0.23, 1, 0.32, 1],
        delay: entryDelay,
      }}
      className={cn(
        "group/row relative",
        !isLast && "border-b border-border-subtle",
        expanded && "bg-surface-soft/40",
      )}
    >
      {/* Left-edge directional indicator — clay sliver appears on hover/expand. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-clay transition-opacity duration-200 ease-out-strong",
          expanded ? "opacity-100" : "opacity-0 group-hover/row:opacity-60",
        )}
      />

      {/* Flat layout — no nested buttons. Toggle is its own <button>,
          action icons sit beside it as siblings. */}
      <div className="flex items-center">
        <div
          role="button"
          tabIndex={0}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (
              (e.key === "Enter" || e.key === " ") &&
              e.currentTarget === e.target
            ) {
              e.preventDefault();
              onToggle();
            }
          }}
          aria-expanded={expanded}
          aria-controls={`row-${file.id}-expanded`}
          className="flex flex-1 min-w-0 items-center gap-3.5 px-4 py-3.5 text-left transition-[background-color] duration-150 ease-out-strong hover:bg-surface-soft/30 cursor-pointer"
        >
          {/* Thumbnail */}
          <span
            aria-hidden
            className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-surface-soft"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </span>

          {/* Name + meta — read-only here. Renaming lives inside the
              expanded section so the row stays uncluttered. */}
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                autoFocus
                defaultValue={baseName}
                aria-label="Rename file"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") commitName(e.currentTarget.value);
                  else if (e.key === "Escape") setEditing(false);
                }}
                onBlur={(e) => commitName(e.currentTarget.value)}
                className="w-full rounded-md border border-brand bg-canvas px-2 py-0.5 text-sm font-semibold text-text outline-none"
              />
            ) : (
              <button
                type="button"
                title="Rename"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(true);
                }}
                className="flex min-w-0 items-center gap-1.5 text-left cursor-text"
              >
                <span className="truncate text-sm font-semibold text-text">
                  {baseName}
                </span>
                <Pencil
                  size={12}
                  strokeWidth={1.7}
                  className="shrink-0 text-text-faint opacity-0 transition-opacity duration-150 group-hover/row:opacity-100"
                  aria-hidden
                />
              </button>
            )}
            <p className="mt-0.5 truncate font-mono text-sm text-text-faint tabular-nums">
              {formatBytes(file.originalSize)}
              <span aria-hidden className="mx-1.5 opacity-50">·</span>
              {formatLabel}
            </p>
          </div>

          {/* Status / metrics — read-only display */}
          <div className="flex shrink-0 items-center gap-3 pl-3">
            {isBusy ? (
              <BusyIndicator
                label={
                  file.status === "compressing"
                    ? file.inputMimeType === "image/avif"
                      ? "Compressing AVIF"
                      : "Compressing"
                    : "Queued"
                }
                active={file.status === "compressing"}
                reduceMotion={reduceMotion}
              />
            ) : errorInfo ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-mono text-sm",
                  cancelled ? "text-text-faint" : "text-danger",
                )}
                title={errorInfo.hint}
              >
                {!cancelled ? (
                  <AlertTriangle size={12} strokeWidth={2.5} aria-hidden />
                ) : null}
                {errorInfo.label}
              </span>
            ) : showDone && file.result ? (
              <motion.div
                className="flex items-center gap-3"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                <span className="font-mono text-sm font-semibold tabular-nums text-text">
                  {formatBytes(file.result.newSize)}
                </span>
                <SavingsBadge savedPct={file.result.savedPct} />
              </motion.div>
            ) : null}
          </div>
        </div>

        {/* Action icons — separate sibling buttons (no nesting). */}
        {showDone && file.result ? (
          <div className="flex shrink-0 items-center gap-1 pr-3">
            <IconButton
              label={`Download ${file.file.name}`}
              onClick={onDownload}
            >
              <Download size={16} strokeWidth={1.7} />
            </IconButton>
            <IconButton
              label={`Remove ${file.file.name}`}
              hoverClass="hover:text-danger"
              onClick={onRemove}
            >
              <Trash2 size={16} strokeWidth={1.7} />
            </IconButton>
            {/* Labeled expand toggle — the icon alone gave users no hint
                that there's a compare/tweak panel below. The verb makes
                the affordance explicit. */}
            <button
              type="button"
              aria-label={expanded ? "Hide details" : "Show before / after and settings"}
              aria-expanded={expanded}
              aria-controls={`row-${file.id}-expanded`}
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-subtle bg-surface px-2.5 text-sm font-medium text-text-muted transition-[color,background-color,border-color,transform] duration-150 ease-out-strong hover:border-border-strong/60 hover:bg-surface-soft hover:text-text active:scale-[0.97] cursor-pointer"
            >
              {expanded ? "Hide" : "Edit & Preview"}
              <ChevronDown
                size={13}
                strokeWidth={1.7}
                className={cn(
                  "transition-transform duration-200 ease-out-strong",
                  expanded && "rotate-180",
                )}
              />
            </button>
          </div>
        ) : null}

        {/* While a compression is in flight the user can abort it — the
            pool terminates the worker and the row falls back to its
            pre-run state. Queued (not-yet-started) files have no worker
            yet, so the button only appears once work is actually running. */}
        {file.status === "compressing" ? (
          <div className="flex shrink-0 items-center gap-1 pr-3">
            <IconButton
              label={`Cancel compressing ${file.file.name}`}
              hoverClass="hover:text-danger"
              onClick={onCancel}
            >
              <X size={16} strokeWidth={1.7} />
            </IconButton>
          </div>
        ) : null}
      </div>

      {/* Expanded preview + per-file controls. Kept mounted while a result
          exists so the panel doesn't collapse during a re-compress. */}
      <AnimatePresence initial={false}>
        {expanded && file.result ? (
          <motion.div
            key="expanded"
            id={`row-${file.id}-expanded`}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
            }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : {
                    height: 0,
                    opacity: 0,
                    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
                  }
            }
            className="overflow-hidden"
          >
            <ExpandedRow
              file={file}
              onUpdateSettings={onUpdateSettings}
              onResetToGlobal={onResetToGlobal}
              onRecompress={onRecompress}
              onDownload={onDownload}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}
