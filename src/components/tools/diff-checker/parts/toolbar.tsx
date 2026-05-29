"use client";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ClipboardCopy,
  Download,
  Link2,
  MoreHorizontal,
} from "lucide-react";
import type { DiffOptions } from "../diff-checker.lib";
import type { ViewMode } from "../use-diff-checker";

export interface ToolbarProps {
  added: number;
  removed: number;
  unchanged: number;
  hunkCount: number;
  activeHunk: number;
  onPrevHunk: () => void;
  onNextHunk: () => void;
  view: ViewMode;
  onChangeView: (v: ViewMode) => void;
  /** Hide the side-by-side / unified toggle (mobile locks to unified). */
  showViewToggle?: boolean;
  options: DiffOptions;
  onChangeOption: <K extends keyof DiffOptions>(
    key: K,
    value: DiffOptions[K]
  ) => void;
  editing: boolean;
  onToggleEdit: () => void;
  onShare: () => void;
  onCopyPatch: () => void;
  onDownloadPatch: () => void;
  onSwap: () => void;
  onClear: () => void;
  onLoadSample: () => void;
  /** Disables Copy / Download when there are no hunks to emit. */
  hasDiff: boolean;
}

/**
 * Single-row toolbar. Primary signals on the left (stats), navigation
 * and view-mode in the middle, secondary actions tucked into a `⋯` menu
 * on the right.
 *
 * Sticky inside the workspace so it stays anchored while the diff scrolls.
 */
export function Toolbar(props: ToolbarProps) {
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface/95 px-3 py-2 shadow-card backdrop-blur">
      <Stat label="added" value={props.added} tone="success" />
      <Stat label="removed" value={props.removed} tone="danger" />
      <Stat label="unchanged" value={props.unchanged} tone="muted" />

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <HunkNav
          count={props.hunkCount}
          active={props.activeHunk}
          onPrev={props.onPrevHunk}
          onNext={props.onNextHunk}
        />
        {(props.showViewToggle ?? true) && (
          <ViewToggle view={props.view} onChange={props.onChangeView} />
        )}

        <button
          type="button"
          onClick={props.onCopyPatch}
          disabled={!props.hasDiff}
          aria-label="Copy as patch"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-bg text-text-faint transition-colors hover:bg-surface-soft hover:text-text disabled:opacity-40 disabled:hover:bg-bg disabled:hover:text-text-faint cursor-pointer"
        >
          <ClipboardCopy size={13} aria-hidden />
        </button>
        <button
          type="button"
          onClick={props.onShare}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-subtle bg-bg px-2.5 text-sm text-text-faint transition-colors hover:bg-surface-soft hover:text-text cursor-pointer"
        >
          <Link2 size={13} aria-hidden />
          Share
        </button>
        <MoreMenu {...props} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "danger" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : "text-text-faint";
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className={`font-mono text-base font-semibold tabular-nums ${toneClass}`}
      >
        {tone === "success" ? "+" : tone === "danger" ? "−" : ""}
        {value}
      </span>
      <span className="text-sm uppercase tracking-wider text-text-faint">
        {label}
      </span>
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex h-8 items-center rounded-md border border-border-subtle bg-bg p-0.5">
      {(["side-by-side", "unified"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`inline-flex h-7 items-center rounded px-2.5 text-sm transition-colors cursor-pointer ${
            view === mode
              ? "bg-surface text-text shadow-sm"
              : "text-text-faint hover:text-text"
          }`}
        >
          {mode === "side-by-side" ? "Side-by-side" : "Unified"}
        </button>
      ))}
    </div>
  );
}

function HunkNav({
  count,
  active,
  onPrev,
  onNext,
}: {
  count: number;
  active: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="inline-flex h-8 items-center gap-0.5 rounded-md border border-border-subtle bg-bg p-0.5">
      <button
        type="button"
        onClick={onPrev}
        disabled={count === 0}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-text-faint transition-colors hover:bg-surface hover:text-text disabled:opacity-40 cursor-pointer"
        aria-label="Previous hunk"
      >
        <ArrowUp size={14} />
      </button>
      <span className="px-1.5 font-mono text-sm text-text-faint tabular-nums">
        {count === 0 ? "0/0" : `${active + 1}/${count}`}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={count === 0}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-text-faint transition-colors hover:bg-surface hover:text-text disabled:opacity-40 cursor-pointer"
        aria-label="Next hunk"
      >
        <ArrowDown size={14} />
      </button>
    </div>
  );
}

function MoreMenu({
  options,
  onChangeOption,
  onDownloadPatch,
  onSwap,
  onClear,
  onLoadSample,
  hasDiff,
}: ToolbarProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More options"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-bg text-text-faint transition-colors hover:bg-surface-soft hover:text-text cursor-pointer"
        >
          <MoreHorizontal size={14} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Ignore</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={!!options.ignoreTrailingWhitespace}
          onCheckedChange={(v) =>
            onChangeOption("ignoreTrailingWhitespace", v === true)
          }
        >
          Trailing whitespace
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={!!options.ignoreWhitespace}
          onCheckedChange={(v) =>
            onChangeOption("ignoreWhitespace", v === true)
          }
        >
          All whitespace
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={!!options.ignoreCase}
          onCheckedChange={(v) => onChangeOption("ignoreCase", v === true)}
        >
          Case
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDownloadPatch} disabled={!hasDiff}>
          <Download size={13} aria-hidden />
          Download .patch
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onSwap}>
          <ArrowLeftRight size={13} aria-hidden />
          Swap sides
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onLoadSample}>Load sample</DropdownMenuItem>
        <DropdownMenuItem onSelect={onClear}>Clear both</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
