"use client";

import { Clipboard, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { Tooltip } from '@/components/primitives/tooltip';
import { ValidationError } from '../components/validation-error';
import type { ValidationResult } from "../base64.types";

interface InputPaneProps {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  onPaste: () => void;
  validation: ValidationResult | null;
  inputCharCount: number;
  inputByteCount: number;
}

export function InputPane({
  value, onChange, onClear, onPaste,
  validation,
  inputCharCount, inputByteCount,
}: InputPaneProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden border-r border-border-subtle bg-surface">
      {/* Toolbar */}
      <div className="flex h-11 shrink-0 items-center gap-0.5 border-b border-border-subtle px-2">
        <span className="ml-1 text-sm uppercase tracking-wider font-semibold text-text-faint">
          Input
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip content="Paste from clipboard into the input" side="bottom">
            <button
              type="button"
              onClick={onPaste}
              aria-label="Paste from clipboard"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors cursor-pointer"
            >
              <Clipboard size={16} aria-hidden />
            </button>
          </Tooltip>

          <Tooltip content="Copy the input pane's contents" side="bottom">
            <button
              type="button"
              onClick={async () => {
                if (!value) return;
                await navigator.clipboard.writeText(value);
                toast.success(`Copied ${value.length.toLocaleString()} chars from input`);
              }}
              aria-label="Copy input"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors cursor-pointer"
            >
              <Copy size={16} aria-hidden />
            </button>
          </Tooltip>

          <Tooltip content="Clear the input" side="bottom">
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear input"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-danger transition-colors cursor-pointer"
            >
              <Trash2 size={16} aria-hidden />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Validation error */}
      {validation && !validation.valid && (
        <div className="shrink-0 px-3 py-2 border-b border-border-subtle">
          <ValidationError result={validation} />
        </div>
      )}

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="Paste text or Base64 here…"
        aria-label="Input"
        className="flex-1 min-h-0 px-3 py-3 bg-transparent border-0 outline-none resize-none font-mono text-sm leading-relaxed text-text placeholder:text-text-faint"
      />

      {/* Status bar */}
      <div
        aria-live="polite"
        className="h-8 shrink-0 border-t border-border-subtle bg-surface px-3 flex items-center justify-between text-sm font-mono text-text-faint"
        title="Counts of the input pane's content"
      >
        <span>{inputCharCount.toLocaleString()} chars · {inputByteCount.toLocaleString()} B</span>
        {validation && (
          <span className={cn("ml-2", validation.valid ? "text-success" : "text-danger")}>
            {validation.valid ? "Looks like valid Base64" : "Has problems, see error above"}
          </span>
        )}
      </div>
    </div>
  );
}
