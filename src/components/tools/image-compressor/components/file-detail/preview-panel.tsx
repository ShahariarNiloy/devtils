"use client";

import { Dialog, DialogContent } from "@/components/primitives/dialog";
import { cn } from "@/lib/cn";
import { AlertTriangle, CheckCircle2, ChevronDown, Download, Lightbulb, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { MIME_LABEL } from "../../image-compressor.constants";
import { describeCompressionError } from "../../image-compressor.errors";
import { QUALITY_MODE_DEFS } from "../../image-compressor.modes";
import type { CompressionSettings, ImageFile } from "../../image-compressor.types";
import { compressedLabel, savingsText } from "../../image-compressor.view";
import { DropZone } from "../drop-zone";
import { CompareCanvas } from "./compare-canvas";
import { FormatPicker, formatDescription } from "./format-picker";
import { QualityPicker } from "./quality-picker";

interface Props {
  /** The image shown in the compare canvas (null before anything is added). */
  file: ImageFile | null;
  onFiles: (files: FileList | File[]) => void;
  onUpdateSettings: (id: string, patch: Partial<CompressionSettings>) => void;
  onResetToGlobal: (id: string) => void;
  onDownload: (id: string) => void;
}

/**
 * Left column of the v2 workspace: drag-to-reveal comparison of the
 * selected image (with a 1:1 inspector), honest notices about what the
 * pipeline did to it, its per-image overrides, and the drop target.
 */
export function PreviewPanel({ file, onFiles, onUpdateSettings, onResetToGlobal, onDownload }: Props) {
  const [split, setSplit] = useState(50);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const result = file?.result ?? null;
  const compressedUrl = useObjectUrl(result);
  const busy = file ? file.status === "compressing" || file.status === "idle" : false;
  const ready = !!(file && result && compressedUrl);

  return (
    <div className="flex min-w-0 flex-col gap-2.5 border-border-subtle p-3.5 max-md:border-b md:flex-[1.2_1_360px] md:border-r">
      {ready && file && result && compressedUrl ? (
        <CompareCanvas
          variant="panel"
          originalUrl={file.previewUrl}
          compressedUrl={compressedUrl}
          originalSize={file.originalSize}
          compressedSize={result.newSize}
          position={split}
          onPositionChange={setSplit}
          originalLabel="Original"
          compressedLabel={compressedLabel(result)}
          onExpand={() => setInspectOpen(true)}
        />
      ) : (
        <PreviewPlaceholder file={file} busy={busy} />
      )}

      <label className="flex items-center gap-2.5 text-xs text-text-faint">
        Compare
        <input
          type="range"
          min={5}
          max={95}
          value={Math.min(95, Math.max(5, Math.round(split)))}
          disabled={!ready}
          onChange={(e) => setSplit(Number(e.target.value))}
          aria-label="Compare position"
          className="grow accent-text disabled:opacity-40"
        />
      </label>

      {file && result ? <Notices file={file} onUpdateSettings={(p) => onUpdateSettings(file.id, p)} /> : null}

      {file && result ? (
        <div className="surface-panel rounded-xl">
          <button
            type="button"
            onClick={() => setEditOpen((v) => !v)}
            aria-expanded={editOpen}
            aria-controls="ic-edit-image"
            className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl px-3 text-left text-[13px] font-semibold text-text-key transition-colors hover:bg-white/4"
          >
            <span className="grow truncate">
              {editOpen ? "Hide image settings" : "Edit this image"}
              <span className="ml-2 font-normal text-text-faint">
                {file.settingsTouched ? "custom settings" : "uses the toolbar settings"}
              </span>
            </span>
            {busy ? <Loader2 size={14} className="animate-spin text-clay-light" aria-label="Compressing" /> : null}
            <ChevronDown
              size={15}
              aria-hidden
              className={cn("text-text-faint transition-transform duration-200", editOpen && "rotate-180")}
            />
          </button>
          {editOpen ? (
            <div id="ic-edit-image" className="flex flex-col gap-4 border-t border-border-subtle p-3">
              <Field label="Quality">
                <QualityPicker
                  value={file.settings.qualityMode}
                  onChange={(qualityMode) => onUpdateSettings(file.id, { qualityMode })}
                />
                <p className="text-xs leading-relaxed text-text-faint">
                  {file.settings.qualityMode === "custom"
                    ? `Fixed quality ${file.settings.customQuality}. Pick a mode to let the encoder find the lowest quality that still looks identical.`
                    : QUALITY_MODE_DEFS[file.settings.qualityMode].helper}
                </p>
              </Field>
              <Field label="Format">
                <FormatPicker
                  value={file.settings.outputFormat}
                  inputMime={file.inputMimeType}
                  onChange={(outputFormat) => onUpdateSettings(file.id, { outputFormat })}
                />
                <p className="text-xs leading-relaxed text-text-faint">
                  {formatDescription(file.settings.outputFormat, file.inputMimeType)}
                </p>
              </Field>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg border border-border-subtle bg-white/2 p-3 sm:grid-cols-4">
                <Detail label="Size" value={`${result.dimensions.width}×${result.dimensions.height}`} />
                <Detail label="Format" value={`${MIME_LABEL[file.inputMimeType] ?? "—"} → ${MIME_LABEL[result.mimeType] ?? "—"}`} />
                <Detail
                  label="Saved"
                  value={savingsText(result.savedPct)}
                  tone={result.savedPct > 0 ? "text-success-text" : result.savedPct < 0 ? "text-warning-text" : "text-text"}
                />
                <Detail label="Time" value={`${(result.encodingTimeMs / 1000).toFixed(2)}s`} />
              </dl>
              <p className="font-mono text-[11px] text-text-faint">{result.codec}</p>
              <div className="flex flex-wrap items-center gap-3">
                {file.settingsTouched ? (
                  <button
                    type="button"
                    onClick={() => onResetToGlobal(file.id)}
                    className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-text-tertiary transition-colors hover:bg-white/6 hover:text-text"
                  >
                    <RefreshCw size={13} aria-hidden />
                    Use toolbar settings
                  </button>
                ) : (
                  <span className="text-xs text-text-faint">Changes here apply to this image only.</span>
                )}
                <button
                  type="button"
                  onClick={() => onDownload(file.id)}
                  disabled={busy}
                  className="btn-action ml-auto inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-[13px] font-bold disabled:cursor-wait disabled:opacity-60"
                >
                  <Download size={14} aria-hidden />
                  Download
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <DropZone variant="panel" onFiles={onFiles} />

      {/* Full-screen comparison for pixel-level inspection (1:1 + pan). */}
      {ready && file && result && compressedUrl ? (
        <Dialog open={inspectOpen} onOpenChange={setInspectOpen}>
          <DialogContent className="top-1/2 w-[calc(100vw-32px)] max-w-[1100px] -translate-y-1/2 p-4">
            <CompareCanvas
              variant="modal"
              originalUrl={file.previewUrl}
              compressedUrl={compressedUrl}
              originalSize={file.originalSize}
              compressedSize={result.newSize}
              compressedLabel={`${compressedLabel(result)} · ${savingsText(result.savedPct)}`}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

/** Blob URL for a result buffer; revoked a beat after it changes so an
 *  in-flight <img> read can finish (avoids a broken-image flash). */
function useObjectUrl(result: ImageFile["result"]): string | null {
  const [url, setUrl] = useState<string | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!result) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(new Blob([result.buffer], { type: result.mimeType }));
    setUrl(next);
    return () => {
      setTimeout(() => URL.revokeObjectURL(next), 100);
    };
  }, [result]);
  /* eslint-enable react-hooks/set-state-in-effect */
  return url;
}

function PreviewPlaceholder({ file, busy }: { file: ImageFile | null; busy: boolean }) {
  const copy = placeholderCopy(file, busy);
  return (
    <div
      role="img"
      aria-label="Before and after preview"
      className="relative flex h-[260px] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-border bg-[#0d0d0c] px-6 text-center"
    >
      {file ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={file.previewUrl} alt="" className="absolute inset-0 m-auto max-h-full max-w-full object-contain opacity-30" draggable={false} />
      ) : null}
      <span className="relative text-[13px] font-semibold text-text">{copy.title}</span>
      <span className="relative max-w-[36ch] text-xs text-text-faint">{copy.body}</span>
    </div>
  );
}

function placeholderCopy(file: ImageFile | null, busy: boolean): { title: string; body: string } {
  if (!file) {
    return {
      title: "Your before and after appears here",
      body: "Drag the divider to compare the original with the compressed version, or inspect it at 1:1.",
    };
  }
  const later = "The comparison opens as soon as this image is done.";
  if (busy) return { title: file.status === "compressing" ? "Compressing…" : "Queued…", body: later };
  if (file.status === "error" && file.error) {
    const info = describeCompressionError(file.error);
    const cancelled = file.error.kind === "cancelled";
    return { title: cancelled ? "Cancelled" : "Couldn’t compress this image", body: info.hint };
  }
  return { title: "No result yet", body: later };
}

function Notices({
  file,
  onUpdateSettings,
}: {
  file: ImageFile;
  onUpdateSettings: (patch: Partial<CompressionSettings>) => void;
}) {
  const result = file.result;
  if (!result) return null;
  const notices: ReactNode[] = [];

  // Quality-floor refusal: the encoder returned the original because it
  // couldn't hit this mode's quality bar. Offer the two ways out.
  if (result.qualityFloorMissed) {
    notices.push(
      <Notice key="floor" tone="warning" title="Couldn’t reach this quality target — returned unchanged.">
        This image won’t compress at the selected quality without visible loss. Try a smaller target or a more
        efficient format.
        <span className="mt-2 flex flex-wrap gap-2">
          <NoticeAction onClick={() => onUpdateSettings({ qualityMode: "small" })}>Try Smallest</NoticeAction>
          <NoticeAction onClick={() => onUpdateSettings({ outputFormat: "image/webp" })}>Switch to WebP</NoticeAction>
        </span>
      </Notice>,
    );
  }
  if (result.iccStatus === "converted") {
    notices.push(
      <Notice key="icc-converted" tone="success">
        Display P3 → sRGB colour-managed. Saturated colours preserved within the sRGB range.
      </Notice>,
    );
  }
  if (result.iccStatus === "lost") {
    notices.push(
      <Notice key="icc-lost" tone="warning">
        Colour profile dropped. Wide-gamut photos (Display P3 from iPhone) may look less saturated. Pick{" "}
        <b>Auto</b> format to keep the profile.
      </Notice>,
    );
  }
  if (result.iccStatus === "cmyk") {
    notices.push(
      <Notice key="cmyk" tone="warning">
        This JPEG uses a <b>CMYK</b> colour profile (common from Photoshop or print exports). It’s decoded only
        approximately, so colours may shift. For accurate colour, re-export the source as <b>sRGB</b> first.
      </Notice>,
    );
  }
  if (result.iccStatus !== "lost" && result.iccStatus !== "converted" && file.settings.outputFormat !== "auto" && file.hasIcc) {
    notices.push(
      <Notice key="swap" tone="warning">
        Display P3 / Adobe RGB photos may look less saturated after a format swap. Pick <b>Auto</b> to keep the
        source profile.
      </Notice>,
    );
  }
  if (result.pngPhotoAdvisory) {
    notices.push(
      <Notice key="png-photo" tone="info" title="Tip: this looks like a photo.">
        Saved as a colour-accurate PNG. JPEG or WebP compress photos like this 2–3× smaller with no visible
        difference.
        <span className="mt-2 flex flex-wrap gap-2">
          <NoticeAction onClick={() => onUpdateSettings({ outputFormat: "image/jpeg" })}>Switch to JPEG</NoticeAction>
          <NoticeAction onClick={() => onUpdateSettings({ outputFormat: "image/webp" })}>Use WebP</NoticeAction>
        </span>
      </Notice>,
    );
  }
  if (notices.length === 0) return null;
  return <div className="flex flex-col gap-2">{notices}</div>;
}

const NOTICE_TONE = {
  warning: "border-warning-border bg-warning-bg text-warning-text",
  success: "border-success-border bg-success-bg text-success-text",
  info: "border-info-border bg-info-bg text-info-text",
} as const;

function Notice({ tone, title, children }: { tone: keyof typeof NOTICE_TONE; title?: string; children: ReactNode }) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Lightbulb : AlertTriangle;
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs leading-relaxed", NOTICE_TONE[tone])}>
      <Icon size={14} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-col">
        {title ? <span className="font-semibold text-text">{title}</span> : null}
        <span>{children}</span>
      </div>
    </div>
  );
}

function NoticeAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-8 cursor-pointer items-center rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-text transition-colors hover:border-border-strong hover:bg-surface-soft"
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold text-text-faint">{label}</span>
      {children}
    </div>
  );
}

function Detail({ label, value, tone = "text-text" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[11px] font-semibold text-text-faint">{label}</dt>
      <dd className={cn("truncate font-mono text-xs tabular-nums", tone)}>{value}</dd>
    </div>
  );
}
