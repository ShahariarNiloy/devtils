"use client";

import { CodeView } from "@/components/tools/json-formatter/views/code-view";
import type { Lang } from "@/lib/highlight";
import { cn } from "@/lib/cn";

interface ConverterInputPaneProps {
  value: string;
  onChange: (v: string) => void;
  parseError: { message: string; line?: number; col?: number } | null;
  /** Language for the input editor; defaults to JSON for forward conversions. */
  inputLang?: Lang;
  /** Header label shown above the editor; defaults to JSON. */
  inputLabel?: string;
  placeholder?: string;
}

/**
 * v2 input pane: bold label + a live validity dot in the header, then the
 * editable CodeView. Sample / paste / clear live in the toolbar's ⋯ menu.
 */
export function ConverterInputPane({
  value,
  onChange,
  parseError,
  inputLang = "json",
  inputLabel = "JSON",
  placeholder,
}: ConverterInputPaneProps) {
  const empty = !value.trim();
  let status = { text: `Valid ${inputLabel}`, tone: "text-success", dot: "bg-success" };
  if (empty) status = { text: "Empty", tone: "text-text-faint", dot: "bg-text-faint" };
  else if (parseError) status = { text: `Invalid ${inputLabel}`, tone: "text-error", dot: "bg-error" };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-[46px] shrink-0 items-center gap-2 border-b border-border-subtle px-4">
        <span className="text-[13px] font-bold">{inputLabel}</span>
        <span aria-live="polite" className={cn("inline-flex items-center gap-1.5 text-xs", status.tone)}>
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", status.dot)} />
          {status.text}
          {parseError?.line !== undefined && <span className="text-text-faint">· line {parseError.line}</span>}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <CodeView
          variant="v2"
          value={value}
          onChange={onChange}
          indent="2"
          lang={inputLang}
          errorLine={parseError?.line}
          errorLines={parseError?.line !== undefined ? [parseError.line] : undefined}
          placeholder={placeholder ?? `Paste ${inputLabel} here…`}
        />
      </div>
    </div>
  );
}
