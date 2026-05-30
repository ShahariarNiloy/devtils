"use client";

import type { ReactNode } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/primitives/resizable";
import type { Lang } from "@/lib/highlight";
import type { Tool } from "@/lib/tools-registry";
import { ConverterInputPane } from "./converter-input-pane";
import { ConverterOutputPane } from "./converter-output-pane";
import type { JsonSample } from "./samples";

interface ConverterShellProps {
  tool: Tool;
  /** Current JSON input. */
  input: string;
  onInputChange: (v: string) => void;
  parseError: { message: string; line?: number; col?: number } | null;
  inputBytes: number;
  onLoadSample: (sample: JsonSample) => void;

  /** Converted output text. Pass empty string while invalid. */
  output: string;
  outputBytes: number;
  outputLang: Lang;
  outputLabel: string;
  downloadExt: string;
  downloadMime: string;
  downloadName?: string;
  conversionError: string | null;

  /** Tool-specific options panel rendered above the editor split. */
  optionsBar?: ReactNode;
  /** SEO content block rendered below the editor (use ToolContent). */
  content?: ReactNode;
  /** Override the input pane's language (default JSON — for reverse-direction tools). */
  inputLang?: Lang;
  /** Override the input pane's header label (default JSON). */
  inputLabel?: string;
}

/**
 * The page-level shell every JSON → X converter tool renders inside. Wraps
 * `ToolShell` (so the page chrome — title, breadcrumb, related tools — is
 * consistent across the family) and lays out an optional options strip
 * above a horizontal resizable JSON / output split.
 *
 * Each tool owns its own component file and decides what options to show —
 * this shell only owns the layout and the two CodeView-backed panes.
 */
export function ConverterShell({
  tool,
  input,
  onInputChange,
  parseError,
  inputBytes,
  onLoadSample,
  output,
  outputBytes,
  outputLang,
  outputLabel,
  downloadExt,
  downloadMime,
  downloadName,
  conversionError,
  optionsBar,
  content,
  inputLang,
  inputLabel,
}: ConverterShellProps) {
  return (
    <ToolShell tool={tool}>
      <div className="flex flex-col gap-3">
        {optionsBar && (
          <div className="overflow-hidden rounded-xl border border-border shadow-card bg-surface">
            {optionsBar}
          </div>
        )}

        <div
          className="flex flex-col overflow-hidden rounded-xl border border-border shadow-card bg-surface"
          style={{
            height: "max(540px, calc(100dvh - var(--spacing-header) - 120px))",
          }}
        >
          <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
            <ResizablePanel defaultSize={50} minSize={25}>
              <ConverterInputPane
                value={input}
                onChange={onInputChange}
                onLoadSample={onLoadSample}
                inputBytes={inputBytes}
                parseError={parseError}
                inputLang={inputLang}
                inputLabel={inputLabel}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={25}>
              <ConverterOutputPane
                output={output}
                outputBytes={outputBytes}
                outputLang={outputLang}
                outputLabel={outputLabel}
                downloadExt={downloadExt}
                downloadMime={downloadMime}
                downloadName={downloadName}
                conversionError={conversionError}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {content}
      </div>
    </ToolShell>
  );
}
