"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Copy, FileCode2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Tooltip } from '@/components/primitives/tooltip';
import { HexDumpView } from '../components/hex-dump-view';
import { ImagePreview } from '../components/image-preview';
import { DiffView } from './diff-view';
import { OutputToolbar } from './output-toolbar';
import { toDataUri } from "../base64.lib";
import type { Charset, OutputTab } from "../base64.types";

interface OutputPaneProps {
  output: string;
  outputBytes: Uint8Array;
  imageMime: string | undefined;
  activeTab: OutputTab;
  onTabChange: (t: OutputTab) => void;
  charset: Charset;
  outputCharCount: number;
  outputByteCount: number;
  sizeDelta: number;
  onCopy: () => void;
  onDownload: () => void;
  originalInput: string;
  isEncoded: boolean;
  hideTitle?: boolean;
}

const JSON_PREFILL_KEY = "utilyx_json_prefill";

export function OutputPane({
  output, outputBytes, imageMime, activeTab, onTabChange,
  charset, outputCharCount, outputByteCount, sizeDelta,
  onCopy, onDownload, originalInput, isEncoded, hideTitle,
}: OutputPaneProps) {
  const router = useRouter();
  const hasImage = !!imageMime && outputBytes.length > 0;

  const isJson = useMemo(() => {
    if (!output || hasImage) return false;
    const trimmed = output.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
    try { JSON.parse(trimmed); return true; } catch { return false; }
  }, [output, hasImage]);

  const dataUri = useMemo(() => {
    if (!output) return "";
    return toDataUri(output, imageMime ?? "text/plain");
  }, [output, imageMime]);

  const goToJson = () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(JSON_PREFILL_KEY, output);
    router.push("/tools/json-formatter");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface">
      {/* Toolbar */}
      <OutputToolbar
        activeTab={activeTab}
        hasImage={hasImage}
        onTabChange={onTabChange}
        onCopy={onCopy}
        onDownload={onDownload}
        hideTitle={hideTitle}
      />

      {/* Content */}
      <div className={cn(
        "flex-1 min-h-0",
        activeTab === "image" ? "flex flex-col" : "overflow-y-auto",
      )}>
        {activeTab === "text" && (
          <div className="px-3 py-3">
            <pre className="m-0 font-mono text-base leading-relaxed text-text whitespace-pre-wrap break-all">
              {output || <span className="text-text-faint italic">Output appears here…</span>}
            </pre>
            {isJson && (
              <button
                type="button"
                onClick={goToJson}
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-button border border-border bg-surface px-3 text-sm font-medium text-text-muted hover:border-border-strong hover:text-text transition-colors cursor-pointer"
              >
                <FileCode2 size={14} aria-hidden /> View as JSON →
              </button>
            )}
          </div>
        )}

        {activeTab === "hex" && <HexDumpView bytes={outputBytes} />}

        {activeTab === "data-uri" && (
          <div className="px-3 py-3 relative">
            <pre className="m-0 font-mono text-base leading-relaxed text-text whitespace-pre-wrap break-all">
              {dataUri || <span className="text-text-faint italic">Run an encode to see a data URI…</span>}
            </pre>
            {dataUri && (
              <Tooltip content="Copy data URI" side="left">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(dataUri)}
                  aria-label="Copy data URI"
                  className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors cursor-pointer"
                >
                  <Copy size={14} aria-hidden />
                </button>
              </Tooltip>
            )}
          </div>
        )}

        {activeTab === "diff" && (
          <div className="px-3 py-3">
            {isEncoded
              ? <DiffView original={originalInput} encoded={output} />
              : <p className="text-sm text-text-faint italic">Round-trip diff is shown after an encode operation.</p>}
          </div>
        )}

        {activeTab === "image" && (
          <div className="flex-1 min-h-0 flex flex-col p-3">
            {hasImage
              ? <ImagePreview bytes={outputBytes} mime={imageMime!} onDownload={onDownload} />
              : <p className="text-sm text-text-faint italic">No image to preview.</p>}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div
        aria-live="polite"
        className="h-8 shrink-0 border-t border-border-subtle bg-surface px-3 flex items-center justify-between gap-3 text-sm font-mono text-text-faint"
        title={
          isEncoded
            ? "Base64 always grows by ~33% because every 3 input bytes become 4 output characters."
            : "Decoded byte count of the result."
        }
      >
        <span>
          {isEncoded
            ? `${outputByteCount.toLocaleString()} B in → ${outputCharCount.toLocaleString()} chars out`
            : `${outputCharCount.toLocaleString()} chars · ${outputByteCount.toLocaleString()} B`}
        </span>
        <span className="flex items-center gap-2">
          <span>{charset.toUpperCase()}</span>
          {isEncoded && sizeDelta !== 0 && (
            <span className={cn(sizeDelta > 0 ? "text-text-muted" : "text-success")}>
              {sizeDelta > 0 ? "+" : ""}{sizeDelta}% size
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

