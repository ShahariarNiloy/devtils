"use client";

import { Copy, Download, ImageIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Tooltip } from '@/components/primitives/tooltip';
import type { OutputTab } from "../base64.types";

const STATIC_TABS: { mode: OutputTab; label: string; tip: string }[] = [
  { mode: "text",     label: "Text",     tip: "The result as plain text: Base64 string when encoding, decoded text when decoding." },
  { mode: "hex",      label: "Hex dump", tip: "Raw bytes of the result, in offset · hex · ASCII columns. Useful for inspecting binary." },
  { mode: "data-uri", label: "Data URI", tip: "data:<mime>;base64,… string ready to paste into HTML or CSS." },
  { mode: "diff",     label: "Diff",     tip: "Shows your input alongside the round-tripped value to verify nothing was lost." },
];

interface OutputToolbarProps {
  activeTab: OutputTab;
  hasImage: boolean;
  onTabChange: (t: OutputTab) => void;
  onCopy: () => void;
  onDownload: () => void;
  /** Hide the "Output" label (mobile already labels the pane via its switch). */
  hideTitle?: boolean;
}

export function OutputToolbar({ activeTab, hasImage, onTabChange, onCopy, onDownload, hideTitle }: OutputToolbarProps) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-0.5 border-b border-border-subtle px-2">
      {!hideTitle && (
        <span className="ml-1 text-sm uppercase tracking-wider font-semibold text-text-faint mr-3">
          Output
        </span>
      )}

      <div className="flex items-center gap-0.5 flex-1">
        {STATIC_TABS.map(({ mode, label, tip }) => {
          const active = activeTab === mode;
          const disabled = hasImage && mode === "text";
          return (
            <Tooltip key={mode} content={disabled ? "Not available for binary/image output" : tip} side="bottom">
              <button
                type="button"
                onClick={() => !disabled && onTabChange(mode)}
                aria-pressed={active}
                aria-disabled={disabled}
                aria-label={`${label}: ${tip}`}
                className={cn(
                  "inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors select-none",
                  disabled
                    ? "text-text-faint/40 cursor-not-allowed"
                    : active
                      ? "bg-surface-soft text-text cursor-pointer"
                      : "text-text-faint hover:text-text hover:bg-surface-soft cursor-pointer",
                )}
              >
                {label}
              </button>
            </Tooltip>
          );
        })}

        {/* Image tab — always rendered, disabled when no image */}
        <Tooltip
          content={hasImage ? "Preview the decoded image." : "Upload or decode an image to enable this tab."}
          side="bottom"
        >
          <button
            type="button"
            onClick={() => hasImage && onTabChange("image")}
            aria-pressed={activeTab === "image"}
            aria-disabled={!hasImage}
            aria-label="Image preview"
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors select-none",
              !hasImage
                ? "text-text-faint/40 cursor-not-allowed"
                : activeTab === "image"
                  ? "bg-surface-soft text-text cursor-pointer"
                  : "text-text-faint hover:text-text hover:bg-surface-soft cursor-pointer",
            )}
          >
            <ImageIcon size={13} aria-hidden />
            Image
          </button>
        </Tooltip>
      </div>

      <div className="flex items-center gap-0.5">
        <Tooltip content="Copy output" side="bottom">
          <button
            type="button"
            onClick={onCopy}
            aria-label="Copy output"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors cursor-pointer"
          >
            <Copy size={16} aria-hidden />
          </button>
        </Tooltip>
        <Tooltip content="Download output" side="bottom">
          <button
            type="button"
            onClick={onDownload}
            aria-label="Download output"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-faint hover:bg-surface-soft hover:text-text transition-colors cursor-pointer"
          >
            <Download size={16} aria-hidden />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
