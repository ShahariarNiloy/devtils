"use client";

import React, { memo, useRef, useState } from "react";
import { Globe, Trash2, Upload, Wand2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/components/primitives/tooltip";
import { CodeView } from "../views/code-view";
import { TRANSFORM_LABELS } from "../js-to-json.lib";
import type { JsonFormatterState } from "../use-json-formatter";

interface InputPanelProps {
  state: JsonFormatterState;
  onLoadFile: (file: File) => void;
  onOpenFetchUrl: () => void;
  /** Problems found by the repair dry run (window banner); 0 if unknown. */
  problemCount: number;
  /** Lines with problems (gutter marks them). */
  problemLines?: readonly number[];
  /** Mobile hides the header — pane tabs and the bottom bar replace it. */
  isMobile?: boolean;
  /** Lets the parent (mobile "Upload") open this pane's file picker. */
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

function InputPanelImpl({ state, onLoadFile, onOpenFetchUrl, problemCount, problemLines, isMobile = false, fileInputRef }: InputPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const ownFileRef = useRef<HTMLInputElement>(null);
  const fileRef = fileInputRef ?? ownFileRef;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onLoadFile(file);
  };

  const v = state.validation;
  const errorLine = v.status === "invalid" ? v.line : undefined;

  let status: { text: string; tone: string; dot: string };
  if (v.status === "valid") status = { text: "Valid JSON", tone: "text-success", dot: "bg-success" };
  else if (v.status === "invalid")
    status = {
      text: problemCount > 0 ? `${problemCount} problem${problemCount === 1 ? "" : "s"}` : "Invalid",
      tone: "text-error",
      dot: "bg-error",
    };
  else if (state.input.trim()) status = { text: "Checking…", tone: "text-text-faint", dot: "bg-text-faint" };
  else status = { text: "Empty", tone: "text-text-faint", dot: "bg-text-faint" };

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden bg-canvas",
        isDragOver && "ring-2 ring-inset ring-brand/50",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".json,.txt,.csv"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { onLoadFile(file); e.target.value = ""; }
        }}
      />

      {/* Header (desktop / tablet). Mobile uses pane tabs + a bottom bar. */}
      {!isMobile && (
        <div className="flex min-h-[46px] shrink-0 items-center gap-2 border-b border-border-subtle pr-2 pl-4">
          <span className="text-[13px] font-bold">Input</span>
          <span className={cn("inline-flex items-center gap-1.5 text-xs", status.tone)}>
            <span aria-hidden="true" className={cn("size-1.5 rounded-full", status.dot)} />
            {status.text}
          </span>
          <span className="grow" />
          <PaneIcon label="Upload file" onClick={() => fileRef.current?.click()}>
            <Upload size={15} />
          </PaneIcon>
          <PaneIcon label="Load from URL" onClick={onOpenFetchUrl}>
            <Globe size={15} />
          </PaneIcon>
          <PaneIcon label="Clear input" onClick={state.clear} disabled={!state.input}>
            <Trash2 size={15} />
          </PaneIcon>
        </div>
      )}

      {/* JS-object → JSON conversion banner. Renders ONLY when there's a
          concrete conversion result — never on the transient "analysing"
          state. Showing the analysing flash caused the banner to flicker in
          and vanish on every keystroke / on inputs the converter couldn't
          handle. Detection is debounced upstream, so by the time this shows
          there's a real, current-input conversion to offer. */}
      {state.jsConversion && (
        <div
          role="region"
          aria-label="Convert JavaScript object to JSON"
          className="flex w-full shrink-0 items-center gap-3 border-b border-info-border bg-info-bg px-3 py-2 text-sm text-info-text"
        >
          <Wand2 size={14} className="shrink-0 text-info" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              Looks like a JS object — convert to JSON?
            </p>
            <p className="mt-0.5 truncate font-mono text-xs-plus opacity-80">
              Will:{" "}
              {state.jsConversion.transforms
                .map((t) => TRANSFORM_LABELS[t])
                .join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={state.applyJsConversion}
            className="inline-flex h-7 items-center rounded-md border border-info-border bg-info px-2.5 text-sm font-medium text-text-on-sage transition-opacity hover:opacity-90 cursor-pointer"
            aria-label="Apply conversion"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={state.dismissJsConversion}
            aria-label="Dismiss"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-info-text/70 transition-colors hover:bg-info/15 hover:text-info-text cursor-pointer"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <CodeView
          variant="v2"
          placeholder="Paste JSON here, or press ⌘V anywhere…"
          errorLines={problemLines}
          value={state.input}
          onChange={state.setInput}
          indent={state.indent}
          onCursorChange={state.setInputCursor}
          errorLine={errorLine}
          jumpToError={
            v.status === "invalid"
              ? { line: v.line, col: v.col, nonce: 0 }
              : undefined
          }
          onPasteFormatted={state.formatFrom}
        />
      </div>
    </div>
  );
}

// Memoized: a panel resize re-renders the ResizablePanel subtree every drag
// frame. Props are stable during a drag (parent isn't re-rendering), so this
// bails out and the multi-MB editor never re-renders mid-resize.
export const InputPanel = memo(InputPanelImpl);

function PaneIcon({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip content={label} side="bottom">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="flex size-[34px] items-center justify-center rounded-lg text-text-faint transition-colors enabled:hover:bg-white/6 enabled:hover:text-text disabled:opacity-40"
      >
        {children}
      </button>
    </Tooltip>
  );
}
