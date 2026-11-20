"use client";

import type { ReactNode } from "react";
import { ClipboardPaste, Download, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/primitives/resizable";
import { formatBytes } from "@/components/tools/json-formatter/json-formatter.lib";
import type { Lang } from "@/lib/highlight";
import type { Tool } from "@/lib/tools-registry";
import type { TablePreview } from "./converter.lib";
import { ConverterInputPane } from "./converter-input-pane";
import { ConverterOutputPane } from "./converter-output-pane";
import { JSON_SAMPLES, type JsonSample } from "./samples";
import { useIsNarrow } from "./use-narrow";

type ParseError = { message: string; line?: number; col?: number };

interface ConverterShellProps {
  tool: Tool;
  /** Curated related tools (seoData.relatedSlugs). */
  relatedSlugs?: readonly string[];

  input: string;
  onInputChange: (v: string) => void;
  parseError: ParseError | null;
  /** Loads a shared JSON sample (each tool maps it to its own input format). */
  onLoadSample?: (sample: JsonSample) => void;
  /** Override the input pane's language (default JSON — for reverse-direction tools). */
  inputLang?: Lang;
  /** Override the input pane's header label (default JSON). */
  inputLabel?: string;

  /** Converted output text. Empty while invalid. */
  output: string;
  outputBytes: number;
  outputLang: Lang;
  outputLabel: string;
  /** Shape summary for the output header + status bar ("4 types"). */
  summary?: string;
  downloadExt: string;
  downloadMime: string;
  downloadName?: string;
  conversionError: string | null;
  isComputing?: boolean;
  /** Table preview under the output (CSV tools). */
  preview?: (TablePreview & { totalRows?: number }) | null;

  /** Toolbar controls: ToolbarField / Segmented / ToggleChip. */
  toolbar?: ReactNode;
  /** Extra ⋯ menu items for options the mockup doesn't surface. */
  menu?: ReactNode;
  /** Status bar verb on success (default "Generated"). */
  statusVerb?: string;
  /** Extra status detail after the summary (e.g. the root type name). */
  statusNote?: string;
  /** Extra status bar node (e.g. a round-trip validation result). */
  statusExtra?: ReactNode;

  /** SEO content block rendered below the workspace (use ToolContent). */
  content?: ReactNode;
}

/**
 * The page-level shell every converter renders inside (mockup "conv"
 * family): toolbar of options, an input | output split (stacked on
 * phones), and a mono status bar. Each tool owns its options and passes
 * them in as `toolbar` / `menu`; this shell owns layout, sample / paste /
 * clear / download, and honest status reporting.
 */
export function ConverterShell({
  tool,
  relatedSlugs,
  input,
  onInputChange,
  parseError,
  onLoadSample,
  inputLang = "json",
  inputLabel = "JSON",
  output,
  outputBytes,
  outputLang,
  outputLabel,
  summary,
  downloadExt,
  downloadMime,
  downloadName = "output",
  conversionError,
  isComputing,
  preview,
  toolbar,
  menu,
  statusVerb = "Generated",
  statusNote,
  statusExtra,
  content,
}: ConverterShellProps) {
  const narrow = useIsNarrow();
  const empty = !input.trim();

  let error: { title: string; message: string } | null = null;
  if (parseError) {
    const where =
      parseError.line !== undefined && !/line \d+/i.test(parseError.message)
        ? ` (line ${parseError.line}${parseError.col !== undefined ? `, column ${parseError.col}` : ""})`
        : "";
    error = { title: `Invalid ${inputLabel}`, message: parseError.message + where };
  } else if (conversionError) {
    error = { title: "Conversion failed", message: conversionError };
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onInputChange(text);
        toast.success(`Pasted ${text.length.toLocaleString()} characters`);
      }
    } catch {
      toast.error("Clipboard read denied");
    }
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

  let status: { text: string; tone: string };
  if (empty) status = { text: "Waiting for input", tone: "text-text-faint" };
  else if (parseError) status = { text: `Invalid ${inputLabel}`, tone: "text-error" };
  else if (conversionError) status = { text: "Conversion failed", tone: "text-error" };
  else if (isComputing && !output) status = { text: "Converting…", tone: "text-text-faint" };
  else status = { text: statusVerb, tone: "text-success" };

  const ok = !empty && !error && output;
  const detail = ok
    ? [outputLabel, summary, statusNote, narrow ? null : formatBytes(outputBytes)].filter(Boolean).join(" · ")
    : "";

  const inputPane = (
    <ConverterInputPane
      value={input}
      onChange={onInputChange}
      parseError={parseError}
      inputLang={inputLang}
      inputLabel={inputLabel}
    />
  );
  const outputPane = (
    <ConverterOutputPane
      output={error ? "" : output}
      outputLang={outputLang}
      outputLabel={outputLabel}
      summary={summary}
      error={empty ? null : error}
      isComputing={isComputing}
      preview={preview}
    />
  );

  return (
    <ToolShell tool={tool} relatedSlugs={relatedSlugs}>
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
        {/* TOOLBAR */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border-subtle bg-toolbar p-3">
          {toolbar}
          <span className="grow" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
                title="More options"
                className="flex size-11 shrink-0 items-center justify-center rounded-[10px] text-text-tertiary transition-colors hover:bg-white/6 hover:text-text"
              >
                <MoreHorizontal size={16} aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[70dvh] min-w-60 overflow-y-auto">
              {menu && (
                <>
                  {menu}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => void handlePaste()}>
                <ClipboardPaste size={14} aria-hidden className="text-text-faint" />
                Paste from clipboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onInputChange("")} disabled={empty}>
                <Trash2 size={14} aria-hidden className="text-text-faint" />
                Clear input
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload} disabled={!output || Boolean(error)}>
                <Download size={14} aria-hidden className="text-text-faint" />
                Download .{downloadExt}
              </DropdownMenuItem>
              {onLoadSample && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Load a sample</DropdownMenuLabel>
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
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* PANES */}
        {narrow ? (
          <div className="flex flex-col">
            <div className="h-[300px] border-b border-border-subtle">{inputPane}</div>
            <div className="h-[max(340px,55dvh)]">{outputPane}</div>
          </div>
        ) : (
          <ResizablePanelGroup
            direction="horizontal"
            className="h-[max(var(--ws-min,440px),calc(100dvh-var(--chrome-top,165px)-130px))]"
          >
            <ResizablePanel defaultSize={50} minSize={25}>
              {inputPane}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50} minSize={25}>
              {outputPane}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {/* STATUS BAR */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
          <span className={status.tone}>● {status.text}</span>
          {detail && <span>{detail}</span>}
          {statusExtra}
          <span className="grow" />
          <span className="text-success-text">Local-only</span>
        </div>
      </div>

      {content && <div data-full-window-hide>{content}</div>}
    </ToolShell>
  );
}
