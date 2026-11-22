"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import { AlertTriangle, MoreHorizontal, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState, type AnimationEvent } from "react";
import { MIME_LABEL } from "../../image-compressor.constants";
import { describeCompressionError } from "../../image-compressor.errors";
import { formatBytes } from "../../image-compressor.lib";
import { rememberFile } from "../../image-compressor.selectors";
import { useCompressorStore } from "../../image-compressor.store";
import type { ImageFile } from "../../image-compressor.types";
import { dimensionsLabel, outputFileName, sizeBarPct } from "../../image-compressor.view";

interface RowProps {
  id: string;
  selected: boolean;
  /** Removed from the store: fade out in place, then call onLeft. */
  leaving: boolean;
  onLeft: (id: string) => void;
  // Id-taking callbacks (stable across renders) so memo() can skip rows
  // whose file didn't change — a 20-image batch updates one row at a time.
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDownload: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onSetDisplayName: (id: string, name: string | null) => void;
  /** Seconds before the entrance plays; null = no entrance (was there on mount). */
  enterDelay: number | null;
}

const CHECKER = "repeating-conic-gradient(#1b1b19 0 25%, #121211 0 50%) 0 0 / 10px 10px";

/** Queue card: thumb · name · dims · saved, size bar, before → after · format, state line. */
export const QueueRow = memo(function QueueRow(props: RowProps) {
  // Subscribes to this row's file only, so a batch re-renders one row per
  // update. The selector remembers the last file, for the exit animation.
  const select = useMemo(() => rememberFile(props.id), [props.id]);
  const file = useCompressorStore(select);
  return file ? <RowBody {...props} file={file} /> : null;
});

const RowBody = memo(function RowBody({
  file,
  selected,
  leaving,
  onLeft,
  onSelect: selectId,
  onRemove: removeId,
  onDownload: downloadId,
  onCancel: cancelId,
  onRetry: retryId,
  onSetDisplayName: renameId,
  enterDelay,
}: Omit<RowProps, "id"> & { file: ImageFile }) {
  const id = file.id;
  const onSelect = () => selectId(id);
  const onDownload = () => downloadId(id);
  const onRetry = () => retryId(id);
  const onSetDisplayName = (name: string | null) => renameId(id, name);
  const busy = file.status === "compressing" || file.status === "idle";
  // A stale result (re-compressing) still shows its numbers, dimmed.
  const shown = file.result;
  const baseName = file.displayName ?? file.file.name.replace(/\.[^.]+$/, "");
  const [editing, setEditing] = useState(false);
  const startRename = useCallback(() => setEditing(true), []);
  // The input mounts while the menu's focus trap is still up, which takes
  // autoFocus back; focus it once the menu has closed instead.
  const renameRef = useRef<HTMLInputElement>(null);
  const focusRename = useCallback(() => renameRef.current?.focus(), []);
  const commitName = (value: string) => {
    onSetDisplayName(value);
    setEditing(false);
  };

  const errorInfo = file.status === "error" && file.error ? describeCompressionError(file.error) : null;
  const cancelled = file.error?.kind === "cancelled";
  const canRetry = !!errorInfo && file.error?.kind !== "decode-failed" && file.error?.kind !== "unsupported-input";

  let saved: { text: string; tone: string } | null = null;
  if (shown && !errorInfo) {
    if (shown.keptOriginal) saved = { text: "0%", tone: "text-text-tertiary" };
    else if (shown.savedPct > 0) saved = { text: `−${shown.savedPct}%`, tone: "text-success-text" };
    else if (shown.savedPct < 0) saved = { text: `+${Math.abs(shown.savedPct)}%`, tone: "text-warning-text" };
    else saved = { text: "±0%", tone: "text-text-faint" };
  }

  let state: { text: string; tone: string } | null = null;
  if (errorInfo) state = { text: cancelled ? "Cancelled" : errorInfo.hint, tone: cancelled ? "text-text-faint" : "text-error-text" };
  else if (busy) state = { text: busyText(file.status === "idle", !!shown), tone: "text-[#f0c9a0]" };
  else if (shown?.keptOriginal) state = { text: "Kept original — already small", tone: "text-text-faint" };
  else if (shown?.budget && !shown.budget.fits) state = { text: "Over budget at lowest quality", tone: "text-error-text" };
  else if (shown && shown.savedPct < 0) state = { text: `${Math.abs(shown.savedPct)}% larger than the original`, tone: "text-warning-text" };

  const fmt = shown ? (MIME_LABEL[shown.mimeType] ?? "").toUpperCase() : "";

  return (
    <li
      inert={leaving}
      style={enterDelay ? { animationDelay: `${enterDelay}s` } : undefined}
      onAnimationEnd={(e: AnimationEvent<HTMLLIElement>) => {
        if (leaving && e.target === e.currentTarget) onLeft(id);
      }}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button,input,a,[role=menu]")) onSelect();
      }}
      className={cn(
        "flex cursor-pointer flex-col gap-[7px] rounded-[11px] border px-2.5 py-[9px] transition-colors",
        leaving ? "queue-row-out" : enterDelay !== null && "queue-row-in",
        selected ? "border-clay-light/60 bg-clay-light/5" : "border-white/6 bg-[#0d0d0c] hover:border-white/12",
      )}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`Show ${file.file.name}`}
          className={cn("flex min-w-0 grow cursor-pointer items-center gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-brand max-sm:min-h-11", busy && "opacity-55")}
        >
          <span aria-hidden className="size-10 shrink-0 overflow-hidden rounded-lg" style={{ background: CHECKER }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={file.thumbUrl ?? file.previewUrl} alt="" decoding="async" className="block h-full w-full object-cover" draggable={false} />
          </span>
          <span className="flex min-w-0 grow flex-col">
            {editing ? null : <span className="truncate text-[12.5px] font-semibold text-text-key">{file.displayName ? `${baseName}` : file.file.name}</span>}
            <span className="truncate font-mono text-[10.5px] text-text-faint">{dimensionsLabel(file)}</span>
          </span>
        </button>
        {saved ? <span className={cn("shrink-0 text-[12.5px] font-bold tabular-nums", saved.tone, busy && "opacity-55")}>{saved.text}</span> : null}
        {errorInfo && !cancelled ? <AlertTriangle size={13} strokeWidth={2.5} className="shrink-0 text-error-text" aria-hidden /> : null}
      </div>

      {editing ? (
        <input
          ref={renameRef}
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

      <SizeBar file={file} busy={busy} />

      <div className={cn("flex items-center gap-1.5 font-mono text-[11px] text-text-faint tabular-nums", busy && "opacity-55")}>
        <span>{formatBytes(file.originalSize)}</span>
        <span aria-hidden>→</span>
        <span className="text-text-key">{shown ? formatBytes(shown.newSize) : "…"}</span>
        {fmt ? (
          <span
            title={file.formatOverride !== null ? "This image's own format (set from its format bars)" : undefined}
            className={cn(
              "rounded px-[5px]",
              file.formatOverride !== null ? "bg-clay-light/12 text-[#f0c9a0] ring-1 ring-clay-light/40" : "bg-white/6 text-text-tertiary",
            )}
          >
            {fmt}
            {file.formatOverride !== null ? <span className="sr-only"> (own format)</span> : null}
          </span>
        ) : null}
        <span className="grow" />
        <button
          type="button"
          onClick={onDownload}
          disabled={!shown || busy}
          aria-label={shown ? `Download ${outputFileName(file, shown)}` : "Download (not ready yet)"}
          title={shown ? `Download ${outputFileName(file, shown)}` : undefined}
          className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-text-strong transition-colors hover:bg-white/8 disabled:cursor-default disabled:opacity-40 max-sm:size-11"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M7 2v7m0 0L4 6m3 3l3-3M2.5 11.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <RowMenu
          id={id}
          name={file.file.name}
          compressing={file.status === "compressing"}
          onRename={startRename}
          onRenameReady={focusRename}
          onCancel={cancelId}
          onRemove={removeId}
        />
      </div>

      {state ? (
        <div className="flex items-center gap-2">
          <span className={cn("min-w-0 grow text-[11.5px] leading-snug", state.tone)}>{state.text}</span>
          {/* Failed / cancelled: a verb to get out, not just a status. Not for
              files that can't be read at all — retrying an empty or fake file
              can never succeed (the ⋯ menu still removes it). */}
          {canRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-semibold text-text-tertiary transition-colors hover:bg-white/6 hover:text-text max-sm:min-h-11"
            >
              <RotateCcw size={12} aria-hidden />
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
});

/**
 * The ⋯ menu. Memo'd on primitives + stable callbacks, so the Radix menu
 * tree skips the row's per-update re-renders (status, result, thumb).
 */
const RowMenu = memo(function RowMenu({
  id,
  name,
  compressing,
  onRename,
  onRenameReady,
  onCancel,
  onRemove,
}: {
  id: string;
  name: string;
  compressing: boolean;
  onRename: () => void;
  /** The menu has closed after Rename: focus the name input. */
  onRenameReady: () => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  // Keeps the closing menu from pulling focus back off the rename input.
  const renameRequested = useRef(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`More actions for ${name}`}
          className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-white/8 hover:text-text data-[state=open]:bg-white/8 max-sm:size-11"
        >
          <MoreHorizontal size={14} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-44"
        onCloseAutoFocus={(e) => {
          if (renameRequested.current) {
            e.preventDefault();
            renameRequested.current = false;
            onRenameReady();
          }
        }}
      >
        <DropdownMenuItem
          onSelect={() => {
            renameRequested.current = true;
            onRename();
          }}
        >
          <Pencil size={14} aria-hidden />
          Rename
        </DropdownMenuItem>
        {compressing ? (
          <DropdownMenuItem onSelect={() => onCancel(id)}>
            <X size={14} aria-hidden />
            Cancel compressing
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onRemove(id)} className="data-highlighted:text-error-text">
          <Trash2 size={14} aria-hidden />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

function busyText(queued: boolean, hasResult: boolean): string {
  if (queued) return hasResult ? "Queued for update…" : "Queued…";
  return hasResult ? "Updating…" : "Compressing…";
}

function barTone(r: NonNullable<ImageFile["result"]>): string {
  if (r.keptOriginal) return "bg-white/25";
  return r.savedPct < 0 ? "bg-warning" : "bg-clay-light";
}

function SizeBar({ file, busy }: { file: ImageFile; busy: boolean }) {
  const r = file.result;
  let fill: React.ReactNode = null;
  if (busy && file.status === "compressing" && !r) {
    // Reduced motion: a still, half-tone bar instead of the sweep.
    fill = (
      <>
        <span className="absolute inset-0 bg-clay-light/50 motion-safe:hidden" />
        <span
          className="absolute top-0 left-0 h-full w-1/3 rounded-sm bg-clay-light will-change-transform motion-reduce:hidden"
          style={{ animation: "indeterminate 1.1s cubic-bezier(0.65, 0, 0.35, 1) infinite" }}
        />
      </>
    );
  } else if (r) {
    fill = (
      <span
        className={cn("absolute inset-y-0 left-0 rounded-sm transition-[width] duration-250", barTone(r))}
        style={{ width: `${sizeBarPct(file.originalSize, r.newSize)}%` }}
      />
    );
  } else if (file.status === "error") {
    fill = <span className="absolute inset-0 bg-error/40" />;
  }
  return (
    <div aria-hidden className="relative h-[3px] overflow-hidden rounded-sm bg-white/7">
      {fill}
    </div>
  );
}
