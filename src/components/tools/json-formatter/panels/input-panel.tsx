"use client";

import React, { memo, useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Globe,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/components/primitives/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { CodeView } from "../views/code-view";
import type { JsonFormatterState } from "../use-json-formatter";

interface InputPanelProps {
  state: JsonFormatterState;
  onLoadFile: (file: File) => void;
  onOpenFetchUrl: () => void;
}

function InputPanelImpl({ state, onLoadFile, onOpenFetchUrl }: InputPanelProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [jumpNonce, setJumpNonce] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCopy = useCallback(async () => {
    if (!state.input) return;
    await navigator.clipboard.writeText(state.input);
    toast.success("Input copied to clipboard");
  }, [state.input]);

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

  let statusDot: React.ReactNode;
  if (v.status === "valid") {
    statusDot = (
      <span className="inline-flex items-center gap-1 text-success">
        <CheckCircle2 size={10} />
        Valid
      </span>
    );
  } else if (v.status === "invalid") {
    statusDot = (
      <span className="inline-flex items-center gap-1 text-danger">
        <AlertCircle size={10} />
        Error
      </span>
    );
  } else {
    statusDot = (
      <span className="inline-flex items-center gap-1 text-text-faint">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-text-faint/60" />
        Empty
      </span>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden bg-surface",
        fullscreen && "fixed inset-0 z-50 bg-surface",
        isDragOver && "ring-2 ring-inset ring-brand/50",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border-subtle px-3">
        <input
          ref={fileRef}
          type="file"
          accept=".json,.txt,.csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) { onLoadFile(file); e.target.value = ""; }
          }}
        />

        <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-text-muted">
          Input
        </span>
        <span className="text-sm font-normal text-text-faint">
          {statusDot}
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip content="Upload file" side="bottom">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
              aria-label="Upload file"
            >
              <Upload size={14} />
            </button>
          </Tooltip>

          <Tooltip content="Fetch from URL" side="bottom">
            <button
              type="button"
              onClick={onOpenFetchUrl}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
              aria-label="Fetch from URL"
            >
              <Globe size={14} />
            </button>
          </Tooltip>

          <Tooltip content="Copy input" side="bottom">
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!state.input}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Copy input"
            >
              <Copy size={14} />
            </button>
          </Tooltip>

          <Tooltip content="Clear" side="bottom">
            <button
              type="button"
              onClick={state.clear}
              disabled={!state.input}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-danger transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-faint"
              aria-label="Clear input"
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>

          <Tooltip content={fullscreen ? "Exit fullscreen" : "Fullscreen"} side="bottom">
            <button
              type="button"
              onClick={() => setFullscreen((f) => !f)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
              aria-label="Toggle fullscreen"
            >
              {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </Tooltip>

          <DropdownMenu>
            <Tooltip content="More" side="bottom">
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
                  aria-label="More actions"
                >
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => state.validate()}>Validate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => state.setTreeExpandAll((n) => n + 1)}>
                Expand all (tree)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => state.setTreeCollapseAll((n) => n + 1)}>
                Collapse all (tree)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Validation banner — click to jump the caret to the error */}
      {v.status === "invalid" && (
        <button
          type="button"
          onClick={() => setJumpNonce((n) => n + 1)}
          className="group flex w-full shrink-0 items-center gap-2 border-b border-danger/30 bg-danger/10 px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/15"
          title="Jump to error"
        >
          <AlertCircle size={13} className="shrink-0" />
          <span className="truncate">
            Line {v.line}, col {v.col}: {v.message}
          </span>
          <span className="ml-auto shrink-0 text-sm font-medium opacity-60 transition-opacity group-hover:opacity-100">
            Jump →
          </span>
        </button>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <CodeView
          value={state.input}
          onChange={state.setInput}
          indent={state.indent}
          onCursorChange={state.setInputCursor}
          errorLine={errorLine}
          jumpToError={
            v.status === "invalid"
              ? { line: v.line, col: v.col, nonce: jumpNonce }
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
