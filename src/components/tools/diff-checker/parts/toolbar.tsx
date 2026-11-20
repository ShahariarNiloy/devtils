"use client";

import { ArrowDown, ArrowUp, ClipboardCopy, Download, Eraser, FileText, Link2, PanelTopClose, PanelTopOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import type { DiffOptions } from "@/lib/diff";
import type { ViewMode } from "../use-diff-checker";
import { CountPill, MoreButton, Segmented, SwapButton, ToggleButton } from "./chrome";

export interface ToolbarProps {
  added: number;
  removed: number;
  unchanged: number;
  view: ViewMode;
  onChangeView: (v: ViewMode) => void;
  /** Split is hidden below 640px — unified is the phone layout. */
  canSplit: boolean;
  options: DiffOptions;
  onChangeOption: <K extends keyof DiffOptions>(key: K, value: DiffOptions[K]) => void;
  changeCount: number;
  activeChange: number | null;
  onPrevChange: () => void;
  onNextChange: () => void;
  editing: boolean;
  onToggleEdit: () => void;
  onShare: () => void;
  onCopyPatch: () => void;
  onDownloadPatch: () => void;
  onSwap: () => void;
  onClear: () => void;
  onLoadSample: () => void;
}

const VIEWS = [
  ["unified", "Unified"],
  ["side-by-side", "Split"],
] as const;

/**
 * v2 diff toolbar: count pills · Ignore whitespace · Unified/Split · Swap,
 * then ⋯ for change navigation, finer ignore options, patch export,
 * sharing and input management.
 */
export function Toolbar(p: ToolbarProps) {
  const hasDiff = p.changeCount > 0;
  const position = p.activeChange === null ? "" : ` · ${p.activeChange + 1}/${p.changeCount}`;
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-border-subtle bg-toolbar p-3">
      <div className="flex flex-wrap gap-1.5">
        <CountPill tone="added">{p.added.toLocaleString()} added</CountPill>
        <CountPill tone="removed">{p.removed.toLocaleString()} removed</CountPill>
        <CountPill tone="neutral">{p.unchanged.toLocaleString()} unchanged</CountPill>
      </div>
      <span className="grow" />
      <ToggleButton on={!!p.options.ignoreWhitespace} onClick={() => p.onChangeOption("ignoreWhitespace", !p.options.ignoreWhitespace)}>
        Ignore whitespace
      </ToggleButton>
      {p.canSplit && <Segmented label="Diff view" value={p.view} options={VIEWS} onChange={p.onChangeView} />}
      <SwapButton onClick={p.onSwap} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MoreButton />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            Changes{hasDiff ? ` · ${p.changeCount}${position}` : ""}
          </DropdownMenuLabel>
          <DropdownMenuItem onSelect={p.onNextChange} disabled={!hasDiff}>
            <ArrowDown size={13} aria-hidden />
            Next change
            <Shortcut>n</Shortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={p.onPrevChange} disabled={!hasDiff}>
            <ArrowUp size={13} aria-hidden />
            Previous change
            <Shortcut>p</Shortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Also ignore</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={!!p.options.ignoreTrailingWhitespace}
            onCheckedChange={(v) => p.onChangeOption("ignoreTrailingWhitespace", v === true)}
          >
            Trailing whitespace
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={!!p.options.ignoreCase} onCheckedChange={(v) => p.onChangeOption("ignoreCase", v === true)}>
            Letter case
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={p.onCopyPatch} disabled={!hasDiff}>
            <ClipboardCopy size={13} aria-hidden />
            Copy as patch
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={p.onDownloadPatch} disabled={!hasDiff}>
            <Download size={13} aria-hidden />
            Download .patch
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={p.onShare}>
            <Link2 size={13} aria-hidden />
            Copy share link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={p.onToggleEdit}>
            {p.editing ? <PanelTopClose size={13} aria-hidden /> : <PanelTopOpen size={13} aria-hidden />}
            {p.editing ? "Hide inputs" : "Show inputs"}
            <Shortcut>e</Shortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={p.onLoadSample}>
            <FileText size={13} aria-hidden />
            Load sample
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={p.onClear}>
            <Eraser size={13} aria-hidden />
            Clear both
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Shortcut({ children }: { children: string }) {
  return <kbd className="ml-auto rounded border border-border px-1.5 font-mono text-[11px] text-text-faint">{children}</kbd>;
}
