"use client";

import { useRef, useState, useCallback } from "react";
import {
  UnfoldVertical,
  FoldVertical,
  ArrowUpAZ,
  Search,
  Copy,
  Trash2,
  Maximize2,
  Minimize2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/components/primitives/Tooltip";
import { CodeView } from "../views/CodeView";
import type { JsonFormatterState } from "../useJsonFormatter";
import { formatBytes } from "../json-formatter.lib";
import { lineCount } from "../json-highlighter";

interface InputPanelProps {
  state: JsonFormatterState;
}

export function InputPanel({ state }: InputPanelProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const treeSearchRef = useRef<HTMLInputElement>(null);

  const numLines = lineCount(state.input);

  const handleCopy = useCallback(async () => {
    if (!state.input) return;
    await navigator.clipboard.writeText(state.input);
    toast.success("Input copied to clipboard");
  }, [state.input]);

  const validation = state.validation;
  const errorLine =
    validation.status === "invalid" ? validation.line : undefined;

  return (
    <div
      className={cn(
        "flex flex-1 flex-col overflow-hidden border-r border-border-subtle bg-surface",
        fullscreen && "fixed inset-0 z-50 bg-surface",
      )}
    >
      {/* Toolbar */}
      <div className="flex h-11 shrink-0 items-center gap-0.5 border-b border-border-subtle px-2">
        {state.fileName && (
          <span className="mr-2 truncate text-sm text-text-faint font-mono max-w-36">
            {state.fileName}
          </span>
        )}

        <Tooltip content="Expand all" side="bottom">
          <button
            type="button"
            onClick={() => state.setTreeExpandAll((n) => n + 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
          >
            <UnfoldVertical size={16} />
          </button>
        </Tooltip>

        <Tooltip content="Collapse all" side="bottom">
          <button
            type="button"
            onClick={() => state.setTreeCollapseAll((n) => n + 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
          >
            <FoldVertical size={16} />
          </button>
        </Tooltip>

        <Tooltip content="Sort A→Z" side="bottom">
          <button
            type="button"
            onClick={() => state.sortKeys("asc")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
          >
            <ArrowUpAZ size={16} />
          </button>
        </Tooltip>

        <Tooltip content="Search tree" side="bottom">
          <button
            type="button"
            onClick={() => treeSearchRef.current?.focus()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
          >
            <Search size={16} />
          </button>
        </Tooltip>

        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip content="Copy input" side="bottom">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
            >
              <Copy size={16} />
            </button>
          </Tooltip>

          <Tooltip content="Clear" side="bottom">
            <button
              type="button"
              onClick={state.clear}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-danger transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </Tooltip>

          <Tooltip content={fullscreen ? "Exit fullscreen" : "Fullscreen"} side="bottom">
            <button
              type="button"
              onClick={() => setFullscreen((f) => !f)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
            >
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Validation error banner */}
      {validation.status === "invalid" && (
        <div className="border-b border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger flex items-center gap-2 shrink-0">
          <AlertCircle size={14} />
          Line {validation.line}, col {validation.col}: {validation.message}
        </div>
      )}

      {/* Tree search input */}
      <input
        ref={treeSearchRef}
        type="text"
        value={state.treeSearch}
        onChange={(e) => state.setTreeSearch(e.target.value)}
        placeholder="Search tree…"
        className={cn(
          "shrink-0 border-b border-border-subtle bg-surface-soft px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none transition-colors",
          state.treeSearch ? "block" : "hidden",
        )}
      />

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <CodeView
          value={state.input}
          onChange={state.setInput}
          indent={state.indent}
          onCursorChange={state.setInputCursor}
          errorLine={errorLine}
          onPasteFormatted={state.formatFrom}
        />
      </div>

      {/* Status bar */}
      <div className="h-8 shrink-0 border-t border-border-subtle bg-surface px-3 flex items-center justify-between text-sm font-mono text-text-faint">
        <span>Ln {state.inputCursor.ln} · Col {state.inputCursor.col}</span>
        <span>{numLines} lines · {formatBytes(state.input.length)}</span>
      </div>
    </div>
  );
}
