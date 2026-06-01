"use client";

import { useRef } from "react";
import { AlertCircle, CheckCircle2, Copy, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/components/primitives/tooltip";
import type { ParseState } from "../use-json-diff";

/**
 * One side of the diff workspace. Self-contained: textarea + validation
 * banner + per-side action buttons. The parent owns input state and parse
 * status; the panel only renders + dispatches changes.
 */
/** Map parse state → status-dot colour. Empty is the only neutral state;
 *  valid takes success, invalid takes danger. */
function dotClass(parse: ParseState): string {
  if (parse.isEmpty) return "bg-text-faint/60";
  if (parse.error) return "bg-danger";
  return "bg-success";
}

export function InputPanel({
  label,
  value,
  onChange,
  parse,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  parse: ParseState;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const copy = () => {
    if (!value) return;
    void navigator.clipboard.writeText(value);
    toast.success(`Copied ${label.toLowerCase()}`);
  };

  const clear = () => onChange("");

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      onChange(text);
      toast.success(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // Jump caret to the parse error line so the user lands where the issue
  // is. Defensive against very long inputs / off-by-one parse positions.
  const jumpToError = () => {
    if (!parse.error || parse.line === null) return;
    const ta = taRef.current;
    if (!ta) return;
    const lines = value.split("\n");
    let offset = 0;
    for (let i = 0; i < Math.max(0, parse.line - 1) && i < lines.length; i++) {
      offset += lines[i].length + 1;
    }
    const col = parse.col ? parse.col - 1 : 0;
    const pos = Math.min(offset + col, value.length);
    ta.focus();
    ta.setSelectionRange(pos, pos);
  };

  let statusDot: React.ReactNode;
  if (parse.isEmpty) {
    statusDot = (
      <span className="inline-flex items-center gap-1 text-xs text-text-faint">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-text-faint/60" />
        Empty
      </span>
    );
  } else if (parse.error) {
    statusDot = (
      <span className="inline-flex items-center gap-1 text-xs text-danger">
        <AlertCircle size={11} />
        Invalid
      </span>
    );
  } else {
    statusDot = (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <CheckCircle2 size={11} />
        Valid
      </span>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Header — subtle tint, status-driven dot. Side coloring on the dot
          was redundant with the label; using parse status instead is more
          honest and matches the validation banner below. */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border-subtle bg-surface-2/50 px-3">
        <input
          ref={fileRef}
          type="file"
          accept=".json,.txt"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              handleFile(f);
              e.target.value = "";
            }
          }}
        />

        <span
          className={cn("inline-flex h-1.5 w-1.5 rounded-full", dotClass(parse))}
          aria-hidden
        />
        <span className="text-sm font-semibold uppercase tracking-[0.14em] text-text-muted">
          {label}
        </span>
        <span className="ml-2">{statusDot}</span>

        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip content="Upload file" side="bottom">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-surface-2 hover:text-text"
              aria-label="Upload file"
            >
              <Upload size={12} />
            </button>
          </Tooltip>
          <Tooltip content="Copy" side="bottom">
            <button
              type="button"
              onClick={copy}
              disabled={!value}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-40"
              aria-label="Copy"
            >
              <Copy size={12} />
            </button>
          </Tooltip>
          <Tooltip content="Clear" side="bottom">
            <button
              type="button"
              onClick={clear}
              disabled={!value}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-surface-2 hover:text-danger disabled:opacity-40"
              aria-label="Clear"
            >
              <Trash2 size={12} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Error banner — click to jump caret to the offending position */}
      {parse.error && (
        <button
          type="button"
          onClick={jumpToError}
          className="group flex w-full shrink-0 items-center gap-2 border-b border-error-border bg-error-bg px-3 py-1.5 text-left text-xs text-error-text transition-colors hover:bg-error/10"
          title="Jump to error"
        >
          <AlertCircle size={11} className="shrink-0" />
          <span className="truncate">
            {parse.line !== null && `Line ${parse.line}, col ${parse.col}: `}
            {parse.error}
          </span>
          {parse.line !== null && (
            <span className="ml-auto shrink-0 text-[10px] font-medium opacity-60 transition-opacity group-hover:opacity-100">
              Jump →
            </span>
          )}
        </button>
      )}

      {/* Editor */}
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder={`Paste ${label.toLowerCase()} JSON here…`}
        className="block min-h-0 w-full flex-1 resize-none bg-transparent p-4 font-mono text-base leading-[1.6] text-text outline-none placeholder:text-text-faint"
      />
    </div>
  );
}
