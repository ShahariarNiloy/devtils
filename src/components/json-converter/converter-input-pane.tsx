"use client";

import { useCallback } from "react";
import { Clipboard, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tooltip } from "@/components/primitives/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { CodeView } from "@/components/tools/json-formatter/views/code-view";
import type { Lang } from "@/lib/highlight";
import { JSON_SAMPLES, type JsonSample } from "./samples";

interface ConverterInputPaneProps {
  value: string;
  onChange: (v: string) => void;
  onLoadSample: (sample: JsonSample) => void;
  inputBytes: number;
  parseError: { message: string; line?: number; col?: number } | null;
  /** Language for the input editor; defaults to JSON for forward conversions. */
  inputLang?: Lang;
  /** Header label shown above the editor; defaults to JSON. */
  inputLabel?: string;
}

/**
 * Read-only chrome around the shared JSON CodeView. The input is editable
 * and JSON-aware (auto-format on full-document paste); samples + clear +
 * paste-from-clipboard live in the header so a fresh visitor can get to a
 * meaningful output in two clicks.
 */
export function ConverterInputPane({
  value,
  onChange,
  onLoadSample,
  inputBytes,
  parseError,
  inputLang = "json",
  inputLabel = "JSON",
}: ConverterInputPaneProps) {
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text);
        toast.success(`Pasted ${text.length.toLocaleString()} characters`);
      }
    } catch {
      toast.error("Clipboard read denied");
    }
  }, [onChange]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface">
      <div className="flex h-11 shrink-0 items-center gap-0.5 border-b border-border-subtle px-2">
        <span className="ml-1 text-sm uppercase tracking-wider font-semibold text-text-faint">
          {inputLabel}
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          <DropdownMenu>
            <Tooltip content="Load a sample" side="bottom">
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Load sample"
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm text-text-faint hover:bg-surface-soft hover:text-text transition-colors cursor-pointer"
                >
                  Sample
                </button>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-72">
              {JSON_SAMPLES.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => onLoadSample(s)}
                  className="flex-col items-start gap-0.5"
                >
                  <span className="font-medium">{s.label}</span>
                  <span className="text-xs text-text-faint">{s.description}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip content="Paste from clipboard" side="bottom">
            <button
              type="button"
              onClick={handlePaste}
              aria-label="Paste from clipboard"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors cursor-pointer"
            >
              <Clipboard size={16} aria-hidden />
            </button>
          </Tooltip>

          <Tooltip content="Clear input" side="bottom">
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Clear input"
              disabled={!value}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-danger transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-faint"
            >
              <Trash2 size={16} aria-hidden />
            </button>
          </Tooltip>
        </div>
      </div>

      {parseError && (
        <div className="shrink-0 border-b border-error-border bg-error-bg px-3 py-2 text-sm text-error-text">
          <div className="font-medium">Invalid {inputLabel}</div>
          <div className="text-xs text-text-faint">
            {parseError.message}
            {parseError.line !== undefined && (
              <> · line {parseError.line}{parseError.col !== undefined ? `, column ${parseError.col}` : ""}</>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <CodeView
          value={value}
          onChange={onChange}
          indent="2"
          lang={inputLang}
          errorLine={parseError?.line}
        />
      </div>

      <div
        aria-live="polite"
        className="h-8 shrink-0 border-t border-border-subtle bg-surface px-3 flex items-center justify-between text-sm font-mono text-text-faint"
      >
        <span>{value.length.toLocaleString()} chars · {inputBytes.toLocaleString()} B</span>
        <span className={parseError ? "text-danger" : "text-success"}>
          {(() => {
            if (!value.trim()) return "Empty";
            if (parseError) return "Invalid";
            return "Valid";
          })()}
        </span>
      </div>
    </div>
  );
}
