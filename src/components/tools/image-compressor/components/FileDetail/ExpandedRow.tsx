"use client";

import { Dialog, DialogContent } from "@/components/primitives/dialog";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/primitives/popover";
import { cn } from "@/lib/cn";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Lightbulb,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MIME_LABEL } from "../../image-compressor.constants";
import { CUSTOM_MODE_COPY, QUALITY_MODE_DEFS } from "../../image-compressor.modes";
import type { CompressionSettings, ImageFile } from "../../image-compressor.types";
import { CompareCanvas } from "./CompareCanvas";
import { FormatPicker, formatDescription } from "./FormatPicker";
import { QualityPicker } from "./QualityPicker";

interface Props {
  file: ImageFile;
  onUpdateSettings: (patch: Partial<CompressionSettings>) => void;
  onResetToGlobal: () => void;
  onRecompress: () => void;
  onDownload: () => void;
}

export function ExpandedRow({
  file,
  onUpdateSettings,
  onResetToGlobal,
  onRecompress,
  onDownload,
}: Props) {
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!file.result) {
      setCompressedUrl(null);
      return;
    }
    const blob = new Blob([file.result.buffer], { type: file.result.mimeType });
    const url = URL.createObjectURL(blob);
    setCompressedUrl(url);
    // Defer revoke so any in-flight <img> reads from the previous URL
    // finish before the browser frees the blob. Without this, a fast
    // re-compress can flash a broken-image icon between paints.
    return () => {
      setTimeout(() => URL.revokeObjectURL(url), 100);
    };
  }, [file.result]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!file.result || !compressedUrl) return null;

  const dimensions = file.result.dimensions;
  const formatLabel = MIME_LABEL[file.result.mimeType] ?? file.result.mimeType;
  const busy = file.status === "compressing" || file.status === "idle";

  // Signed savings for the readout strip: positive = smaller (good),
  // negative = output grew (warn).
  const savedPctSigned = file.result.savedPct;
  const savedLabel =
    savedPctSigned >= 0
      ? `−${savedPctSigned}%`
      : `+${Math.abs(savedPctSigned)}%`;
  let savedTone: "good" | "warn" | "muted" = "muted";
  if (savedPctSigned > 0) savedTone = "good";
  else if (savedPctSigned < 0) savedTone = "warn";

  return (
    <div className="border-t border-border-subtle bg-surface px-6 py-7 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-5">
        {/* Quality-floor refusal — the encoder returned the original
            because it couldn't hit this mode's quality bar. Offer the two
            ways out rather than silently shipping a degraded file. */}
        {file.result.qualityFloorMissed ? (
          <div className="flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3.5">
            <div className="flex items-start gap-2.5 text-sm">
              <AlertTriangle
                size={15}
                strokeWidth={2}
                className="mt-0.5 shrink-0 text-warning"
                aria-hidden
              />
              <div className="flex flex-col gap-1">
                <p className="font-medium text-text">
                  Couldn&apos;t reach this quality target — returned unchanged.
                </p>
                <p className="leading-relaxed text-text-muted">
                  This image won&apos;t compress at the selected quality without
                  visible loss. Try a smaller target or a more efficient format.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pl-[26px]">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateSettings({ qualityMode: "small" });
                }}
                className="inline-flex h-8 items-center rounded-md border border-border-subtle bg-surface px-3 text-sm font-medium text-text transition-[color,background-color,border-color,transform] duration-150 ease-out-strong hover:border-border-strong/60 hover:bg-surface-soft active:scale-[0.97] cursor-pointer"
              >
                Try Smallest
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateSettings({ outputFormat: "image/webp" });
                }}
                className="inline-flex h-8 items-center rounded-md border border-border-subtle bg-surface px-3 text-sm font-medium text-text transition-[color,background-color,border-color,transform] duration-150 ease-out-strong hover:border-border-strong/60 hover:bg-surface-soft active:scale-[0.97] cursor-pointer"
              >
                Switch to WebP
              </button>
            </div>
          </div>
        ) : null}

        {/* Stacks on mobile; comparison (≈2/3) beside the controls (≈1/3)
            at lg+. items-start so the short controls column doesn't stretch
            to the canvas height. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
          <div className="lg:col-span-2">
            <CompareCanvas
              variant="inline"
              originalUrl={file.previewUrl}
              compressedUrl={compressedUrl}
              originalSize={file.originalSize}
              compressedSize={file.result.newSize}
              onExpand={() => setCompareModalOpen(true)}
            />
          </div>
          {/* Per-file controls — Quality, Format, and actions stacked
              beside the comparison. (Renaming lives inline in the row
              header now.) */}
          <div className="grid gap-4">
            <div className="rounded-lg border border-border-subtle bg-surface-soft/30 p-4">
              <span className="mb-2.5 block font-mono text-sm uppercase tracking-eyebrow text-text-faint">
                Quality
              </span>
              <QualityPicker
                value={file.settings.qualityMode}
                onChange={(qualityMode) => onUpdateSettings({ qualityMode })}
              />
              <p className="mt-2.5 text-sm leading-relaxed text-text-muted">
                {file.settings.qualityMode === "custom"
                  ? CUSTOM_MODE_COPY.helper
                  : QUALITY_MODE_DEFS[file.settings.qualityMode].helper}
              </p>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-soft/30 p-4">
              <span className="mb-2.5 block font-mono text-sm uppercase tracking-eyebrow text-text-faint">
                Format
              </span>
              <FormatPicker
                value={file.settings.outputFormat}
                inputMime={file.inputMimeType}
                onChange={(outputFormat) => onUpdateSettings({ outputFormat })}
              />
              <p className="mt-2.5 text-sm leading-relaxed text-text-muted">
                {formatDescription(
                  file.settings.outputFormat,
                  file.inputMimeType
                )}
              </p>
              {file.settings.outputFormat !== "auto" && file.hasIcc ? (
                <div className="mt-2.5 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-2.5 py-2 text-sm text-warning">
                  <AlertTriangle
                    size={13}
                    strokeWidth={2}
                    className="mt-0.5 shrink-0"
                    aria-hidden
                  />
                  <p className="leading-relaxed">
                    Display P3 / Adobe RGB photos may look less saturated after
                    format swap. Pick <b>Auto</b> to keep the source profile.
                  </p>
                </div>
              ) : null}
            </div>
            {/* Action row — override state on the left, Apply + Download right. */}
            <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-4">
              {file.settingsTouched ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResetToGlobal();
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors duration-150 hover:text-text cursor-pointer"
                >
                  <RefreshCw size={13} strokeWidth={1.8} aria-hidden />
                  Reset to global
                </button>
              ) : (
                <span className="text-sm text-text-faint">
                  Inherits global settings
                </span>
              )}

              <div className="ml-auto flex items-center gap-2">
                {file.settingsDirty || busy ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!busy) onRecompress();
                    }}
                    disabled={busy}
                    className={cn(
                      "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-[opacity,transform,background-color,border-color,color] duration-150 ease-out-strong",
                      busy
                        ? "cursor-wait border-border bg-surface-soft text-text-muted opacity-70"
                        : "border-border bg-surface-soft text-text hover:border-border-strong active:scale-[0.98] cursor-pointer"
                    )}
                  >
                    {busy ? (
                      <Loader2
                        size={14}
                        strokeWidth={1.8}
                        className="animate-spin"
                        aria-hidden
                      />
                    ) : (
                      <RefreshCw size={14} strokeWidth={1.8} aria-hidden />
                    )}
                    {busy
                      ? file.status === "compressing"
                        ? "Compressing…"
                        : "Queued…"
                      : "Apply changes"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload();
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-text-on-sage transition-[opacity,transform] duration-150 ease-out-strong hover:bg-brand-hover active:scale-[0.98] cursor-pointer"
                >
                  <Download size={15} strokeWidth={1.9} aria-hidden />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Technical readout strip — with a compact "pro tip" popover in
            the corner when there's a photographic-PNG suggestion. */}
        <div className="relative rounded-xl border border-border-subtle bg-surface-soft/40 px-4 py-3.5">
          <dl
            className={cn(
              "grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4",
              file.result.pngPhotoAdvisory && "pr-9"
            )}
          >
            <DetailItem
              label="Dimensions"
              value={`${dimensions.width} × ${dimensions.height}`}
            />

            <DetailItem
              label="Format"
              value={`${MIME_LABEL[file.inputMimeType] ?? "—"} → ${formatLabel}`}
            />
            <DetailItem label="Saved" value={savedLabel} tone={savedTone} />
            <DetailItem
              label="Time"
              value={`${(file.result.encodingTimeMs / 1000).toFixed(2)}s`}
            />
          </dl>
          {file.result.pngPhotoAdvisory ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Compression tip"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-brand transition-[background-color] duration-150 ease-out-strong hover:bg-brand/15 cursor-pointer"
                >
                  <Lightbulb size={15} strokeWidth={1.9} aria-hidden />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end">
                <div className="flex flex-col gap-2.5">
                  <span className="flex items-center gap-1.5 font-mono text-sm uppercase tracking-eyebrow text-text-faint">
                    <Lightbulb
                      size={12}
                      strokeWidth={2}
                      className="text-brand"
                      aria-hidden
                    />
                    Pro tip
                  </span>
                  <p className="leading-relaxed text-text-muted">
                    Saved as a color-accurate PNG. For a photo like this,{" "}
                    <span className="text-text">JPEG or WebP</span> compress
                    2–3× smaller with no visible difference.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <PopoverClose asChild>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSettings({ outputFormat: "image/jpeg" })
                        }
                        className="inline-flex h-8 items-center rounded-md border border-border-subtle bg-surface px-3 text-sm font-medium text-text transition-[color,background-color,border-color,transform] duration-150 ease-out-strong hover:border-border-strong/60 hover:bg-surface-soft active:scale-[0.97] cursor-pointer"
                      >
                        Switch to JPEG
                      </button>
                    </PopoverClose>
                    <PopoverClose asChild>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSettings({ outputFormat: "image/webp" })
                        }
                        className="inline-flex h-8 items-center rounded-md border border-border-subtle bg-surface px-3 text-sm font-medium text-text transition-[color,background-color,border-color,transform] duration-150 ease-out-strong hover:border-border-strong/60 hover:bg-surface-soft active:scale-[0.97] cursor-pointer"
                      >
                        Use WebP
                      </button>
                    </PopoverClose>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
        </div>

        {/* Wide-gamut handling on a format swap. "converted" = we
            color-managed P3 → sRGB (good news); "lost" = a profile we
            couldn't convert was dropped (warn). */}
        {file.result.iccStatus === "converted" ? (
          <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 px-3.5 py-2.5 text-sm text-success">
            <CheckCircle2
              size={14}
              strokeWidth={2}
              className="mt-0.5 shrink-0"
              aria-hidden
            />
            <p className="leading-relaxed">
              Display P3 → sRGB color-managed. Saturated colors preserved within
              the sRGB range.
            </p>
          </div>
        ) : null}
        {file.result.iccStatus === "lost" ? (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3.5 py-2.5 text-sm text-warning">
            <AlertTriangle
              size={14}
              strokeWidth={2}
              className="mt-0.5 shrink-0"
              aria-hidden
            />
            <p className="leading-relaxed">
              Color profile dropped. Wide-gamut photos (Display P3 from iPhone)
              may look less saturated. Pick <b>Auto</b> format to preserve the
              profile.
            </p>
          </div>
        ) : null}
      </div>

      {/* Full-screen comparison for pixel-level inspection. */}
      <Dialog open={compareModalOpen} onOpenChange={setCompareModalOpen}>
        <DialogContent className="top-1/2 w-[calc(100vw-32px)] max-w-[1100px] -translate-y-1/2 p-4">
          <CompareCanvas
            variant="modal"
            originalUrl={file.previewUrl}
            compressedUrl={compressedUrl}
            originalSize={file.originalSize}
            compressedSize={file.result.newSize}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "muted";
}) {
  const toneClass = {
    good: "text-success",
    warn: "text-warning",
    muted: "text-text",
  }[tone];
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-sm uppercase tracking-eyebrow text-text-faint">
        {label}
      </dt>
      <dd className={cn("font-mono text-sm tabular-nums", toneClass)}>
        {value}
      </dd>
    </div>
  );
}
