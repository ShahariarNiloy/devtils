"use client";

import { ImageUp, SlidersHorizontal } from "lucide-react";
import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/cn";
import { OUTPUT_FORMAT_LABEL } from "../image-compressor.constants";
import { QUALITY_MODE_DEFS } from "../image-compressor.modes";
import { useCompressorStore } from "../image-compressor.store";
import type { CompressionSettings } from "../image-compressor.types";

function formatPhrase(s: CompressionSettings): string {
  if (s.outputFormat === "original") return "Keeps each image's format";
  if (s.outputFormat === "auto") return "Picks the smallest format";
  return `Converts to ${OUTPUT_FORMAT_LABEL[s.outputFormat]}`;
}

function goalPhrase(s: CompressionSettings): string {
  if (s.goal === "budget") return `fits each under ${s.budgetKb} KB`;
  if (s.qualityMode === "custom") return `quality ${s.customQuality}`;
  return `${QUALITY_MODE_DEFS[s.qualityMode].label} quality`;
}

/** One plain line saying what will happen to dropped files. */
function describeDefaults(s: CompressionSettings): string {
  const size = s.resize.enabled && s.resize.width ? `max ${s.resize.width} px wide` : "original size";
  return `${formatPhrase(s)} · ${goalPhrase(s)} · ${size}`;
}

/**
 * First screen, before any image is added: one big drop target and a line
 * saying what will happen. The full workspace (queue, stage, settings)
 * appears with the first image. "Set options first" opens the settings
 * beside the drop area — worth it for big batches, so a budget or width is
 * applied on the first pass instead of re-encoding everything.
 */
export const EmptyStart = memo(function EmptyStart({
  dropHover,
  optionsOpen,
  onChoose,
  onExamples,
  onToggleOptions,
}: {
  dropHover: boolean;
  optionsOpen: boolean;
  onChoose: () => void;
  onExamples: () => void;
  onToggleOptions: () => void;
}) {
  const settings = useCompressorStore(useShallow((s) => s.draftSettings));

  return (
    <div className="flex flex-col items-center justify-center gap-5 px-5 py-12 text-center sm:px-10 sm:py-16">
      <div
        className={cn(
          "flex w-full max-w-[560px] flex-col items-center gap-4 rounded-[16px] border-2 border-dashed px-6 py-10 transition-colors sm:py-14",
          dropHover ? "border-clay-light bg-clay-light/8" : "border-white/14",
        )}
      >
        <span aria-hidden className="surface-key flex size-14 items-center justify-center rounded-2xl text-clay-light">
          <ImageUp size={26} strokeWidth={1.7} />
        </span>
        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-[19px] font-semibold text-text">Drop images to compress</p>
          <p className="m-0 text-sm text-text-tertiary">
            or paste with <kbd className="rounded-[5px] border border-white/12 px-1.5 py-px font-mono text-xs text-text-muted">⌘V</kbd> · as
            many as you like · JPEG, PNG, WebP, AVIF, HEIC
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
          <button
            type="button"
            onClick={onChoose}
            className="btn-action inline-flex min-h-11 cursor-pointer items-center rounded-[11px] px-5 text-[15px] font-semibold"
          >
            Choose images
          </button>
          <button
            type="button"
            onClick={onExamples}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[11px] border border-border-strong bg-white/[.03] px-5 text-[15px] font-medium text-text hover:border-white/25"
          >
            Try examples
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="m-0 text-[13px] text-text-tertiary">
          <span className="text-text-faint">Default: </span>
          {describeDefaults(settings)}
        </p>
        <button
          type="button"
          onClick={onToggleOptions}
          aria-expanded={optionsOpen}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-text-muted transition-colors hover:bg-white/6 hover:text-text max-sm:min-h-11"
        >
          <SlidersHorizontal size={14} aria-hidden />
          {optionsOpen ? "Hide options" : "Set options first"}
        </button>
      </div>
    </div>
  );
});
