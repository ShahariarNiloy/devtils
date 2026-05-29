"use client";

import { useMemo } from "react";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Tooltip } from "@/components/primitives/tooltip";
import { CodeView } from "@/components/tools/json-formatter/views/code-view";
import {
  highlight,
  type Lang,
} from "@/components/tools/json-formatter/highlight";

interface ConverterOutputPaneProps {
  output: string;
  outputBytes: number;
  outputLang: Lang;
  outputLabel: string;
  /** Download filename (without extension); extension comes from `downloadExt`. */
  downloadName?: string;
  downloadExt: string;
  /** Mime type used for the download blob. */
  downloadMime: string;
  conversionError: string | null;
}

/**
 * Read-only renderer for the converter output, with copy / download in the
 * header and a status line that reflects byte size. Highlighting is computed
 * up-front and handed to CodeView via `highlighted` so the readonly path
 * doesn't re-tokenize on each unrelated parent render.
 */
export function ConverterOutputPane({
  output,
  outputBytes,
  outputLang,
  outputLabel,
  downloadName = "output",
  downloadExt,
  downloadMime,
  conversionError,
}: ConverterOutputPaneProps) {
  const highlighted = useMemo(() => highlight(output, outputLang), [output, outputLang]);

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast.success(`Copied ${output.length.toLocaleString()} characters`);
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: downloadMime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${downloadName}.${downloadExt}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface">
      <div className="flex h-11 shrink-0 items-center gap-0.5 border-b border-border-subtle px-2">
        <span className="ml-1 text-sm uppercase tracking-wider font-semibold text-text-faint">
          {outputLabel}
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip content="Copy output" side="bottom">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!output}
              aria-label="Copy output"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Copy size={16} aria-hidden />
            </button>
          </Tooltip>

          <Tooltip content={`Download .${downloadExt}`} side="bottom">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!output}
              aria-label="Download output"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Download size={16} aria-hidden />
            </button>
          </Tooltip>
        </div>
      </div>

      {conversionError && (
        <div className="shrink-0 border-b border-border-subtle bg-danger/5 px-3 py-2 text-sm text-danger">
          <div className="font-medium">Conversion failed</div>
          <div className="text-xs text-text-faint">{conversionError}</div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <CodeView
          value={output}
          highlighted={highlighted}
          indent="2"
          lang={outputLang}
        />
      </div>

      <div
        aria-live="polite"
        className="h-8 shrink-0 border-t border-border-subtle bg-surface px-3 flex items-center justify-between text-sm font-mono text-text-faint"
      >
        <span>{output.length.toLocaleString()} chars · {outputBytes.toLocaleString()} B</span>
      </div>
    </div>
  );
}
