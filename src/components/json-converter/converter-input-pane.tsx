"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { flushPendingEdits, LazyCodeEditor } from "@/components/primitives/code-editor";
import type { Lang } from "@/lib/highlight";
import { cn } from "@/lib/cn";
import { editorLanguage } from "./editor-language";

export interface JumpTarget {
  line: number;
  col: number;
  nonce: number;
}

interface ConverterInputPaneProps {
  value: string;
  onChange: (v: string) => void;
  parseError: { message: string; line?: number; col?: number } | null;
  /** Language for the input editor; defaults to JSON for forward conversions. */
  inputLang?: Lang;
  /** Header label shown above the editor; defaults to JSON. */
  inputLabel?: string;
  placeholder?: string;
  /** Set by "Go to line N"; cleared once the editor has moved its caret. */
  jumpTo?: JumpTarget;
  onJump?: (line: number, col: number) => void;
  onJumped?: () => void;
}

/** Reads a dropped / opened file into the input, after any pending keystrokes. */
export function loadFileInto(onChange: (v: string) => void) {
  return (file: File) => {
    file.text().then(
      (text) => {
        flushPendingEdits();
        onChange(text);
        toast.success(`Loaded ${file.name}`);
      },
      () => toast.error(`Couldn't read ${file.name}`),
    );
  };
}

/**
 * v2 input pane: bold label + a live validity dot in the header, then the
 * shared code editor (CodeMirror, loaded in its own chunk). Sample / paste /
 * open / clear live in the toolbar's ⋯ menu; files can also be dropped on
 * the editor.
 */
export function ConverterInputPane({
  value,
  onChange,
  parseError,
  inputLang = "json",
  inputLabel = "JSON",
  placeholder,
  jumpTo,
  onJump,
  onJumped,
}: ConverterInputPaneProps) {
  const empty = !value.trim();
  let status = { text: `Valid ${inputLabel}`, tone: "text-success", dot: "bg-success" };
  if (empty) status = { text: "Empty", tone: "text-text-faint", dot: "bg-text-faint" };
  else if (parseError) status = { text: `Invalid ${inputLabel}`, tone: "text-error", dot: "bg-error" };

  const errLine = parseError?.line ?? 0;
  const errorLines = useMemo(() => (errLine ? [errLine] : []), [errLine]);
  const onDropFile = useMemo(() => loadFileInto(onChange), [onChange]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-[46px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
        <span className="text-[13px] font-bold">{inputLabel}</span>
        <span aria-live="polite" className={cn("inline-flex min-w-0 items-center gap-1.5 text-xs", status.tone)}>
          <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", status.dot)} />
          {status.text}
        </span>
        {parseError?.line !== undefined && (
          <button
            type="button"
            onClick={() => onJump?.(parseError.line ?? 1, parseError.col ?? 1)}
            className="-mx-1 shrink-0 rounded px-1 text-xs text-text-faint underline-offset-2 transition-colors hover:text-text hover:underline"
          >
            Go to line {parseError.line}
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <LazyCodeEditor
          language={editorLanguage(inputLang)}
          value={value}
          onChange={onChange}
          onDropFile={onDropFile}
          errorLines={errorLines}
          jumpTo={jumpTo}
          onJumped={onJumped}
          ariaLabel={`${inputLabel} input`}
          placeholder={placeholder ?? `Paste or drop ${inputLabel} here…`}
        />
      </div>
    </div>
  );
}
