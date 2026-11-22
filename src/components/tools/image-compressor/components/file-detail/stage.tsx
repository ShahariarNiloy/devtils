"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/primitives/dialog";
import { cn } from "@/lib/cn";
import { AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import { memo, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { MAX_WIDTH_CHIPS, MIME_LABEL, OUTPUT_FORMAT_LABEL, type OutputMime } from "../../image-compressor.constants";
import { describeCompressionError } from "../../image-compressor.errors";
import { formatBytes } from "../../image-compressor.lib";
import { sliderValue } from "../../image-compressor.quality";
import { imgSnippet } from "../../image-compressor.snippet";
import { selectFocused, selectFocusedId, summarize } from "../../image-compressor.selectors";
import { useCompressorStore, type DiffState } from "../../image-compressor.store";
import type { CandidateSummary, CompressionSettings, ImageFile, OutputFormat } from "../../image-compressor.types";
import { compareTitle, maxWidthPatch, outputFileName, probeKey, usedQuality } from "../../image-compressor.view";
import { DesignSwitch } from "../design-switch";
import { CompareCanvas, type CompareFocus, type CompareZoom } from "./compare-canvas";

interface Props {
  /** The image shown on the stage (null before anything is added). */
  file: ImageFile | null;
  diff: DiffState | undefined;
  /** No images at all — show the empty-state call to action. */
  empty: boolean;
  /** Nothing compressing or queued (comparison probes wait for this). */
  queueIdle: boolean;
  onEnsureDiff: (id: string) => void;
  onEnsureProbes: (id: string) => void;
  onEditSettings: (patch: Partial<CompressionSettings>) => void;
  /** A format for this image (or every image, with Apply to all on). */
  onPickFormat: (id: string, format: OutputFormat) => void;
  convertAll: boolean;
  onConvertAll: (on: boolean) => void;
  /** The settings column's (applied) format, for the per-image cue. */
  globalFormat: OutputFormat;
  /** Drop this image's own format. */
  onFollowGlobal: (id: string) => void;
  onDownload: (id: string) => void;
  onChooseFiles: () => void;
  onExamples: () => void;
}

const ZOOMS: readonly { value: CompareZoom; label: string }[] = [
  { value: "fit", label: "Fit" },
  { value: 1, label: "100%" },
  { value: 2, label: "200%" },
];

const BAR_FORMATS: readonly OutputMime[] = ["image/avif", "image/webp", "image/jpeg", "image/png"];

/**
 * Centre column: drag-to-reveal comparison (Fit / 100% / 200%, click a
 * spot to inspect it, "Show what changed"), then the selected image's
 * summary, the <img> tag, and every format's real size side by side.
 */
type StageActions = Omit<Props, "file" | "diff" | "empty" | "queueIdle" | "convertAll" | "globalFormat">;

/** Connects the stage to the store: re-renders for the focused file only. */
export const Stage = memo(function Stage(actions: StageActions) {
  const file = useCompressorStore(selectFocused);
  const { diff, empty, queueIdle, convertAll, globalFormat } = useCompressorStore(
    useShallow((s) => {
      const t = summarize(s.files);
      const id = selectFocusedId(s);
      return {
        diff: id ? s.diffs[id] : undefined,
        empty: t.fileCount === 0,
        queueIdle: t.compressingCount + t.queuedCount === 0,
        convertAll: s.convertAll,
        globalFormat: s.globalSettings.outputFormat,
      };
    }),
  );
  return (
    <StageView {...actions} file={file} diff={diff} empty={empty} queueIdle={queueIdle} convertAll={convertAll} globalFormat={globalFormat} />
  );
});

const StageView = memo(function StageView({
  file,
  diff,
  empty,
  queueIdle,
  onEnsureDiff,
  onEnsureProbes,
  onEditSettings,
  onPickFormat,
  convertAll,
  onConvertAll,
  globalFormat,
  onFollowGlobal,
  onDownload,
  onChooseFiles,
  onExamples,
}: Props) {
  const [split, setSplit] = useState(50);
  const [zoom, setZoom] = useState<CompareZoom>("fit");
  const [focus, setFocus] = useState<CompareFocus>({ fx: 0.5, fy: 0.5 });
  const [diffOn, setDiffOn] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // A new image starts at Fit (like the design's row pick).
  const [shownId, setShownId] = useState<string | null>(null);
  if ((file?.id ?? null) !== shownId) {
    setShownId(file?.id ?? null);
    setZoom("fit");
    setFocus({ fx: 0.5, fy: 0.5 });
  }

  const result = file?.result ?? null;
  const compressedUrl = useObjectUrl(result);
  const busy = file ? file.status === "compressing" || file.status === "idle" : false;
  const ready = !!(file && result && compressedUrl);

  // Diff map: rendered in a worker once per result, only while asked for.
  const wantDiff = diffOn && !!file && !!result && !result.keptOriginal;
  useEffect(() => {
    if (wantDiff && file) onEnsureDiff(file.id);
  }, [wantDiff, file, result, onEnsureDiff]);
  const diffReady = wantDiff && diff?.status === "ready" && diff.result === result ? diff : null;

  // Comparison bars: fill in the formats this result didn't try.
  const done = file?.status === "done";
  useEffect(() => {
    if (file && done && queueIdle) onEnsureProbes(file.id);
  }, [file, done, queueIdle, onEnsureProbes]);

  if (!file || !ready || !result) {
    return (
      <div className="flex min-w-0 flex-col gap-3 p-3 [grid-area:stage] sm:p-3.5">
        <Placeholder file={file} busy={busy} empty={empty} onChooseFiles={onChooseFiles} onExamples={onExamples} />
      </div>
    );
  }

  const inputLabel = MIME_LABEL[file.inputMimeType] ?? "Image";
  // Phones drop the format so the size survives the half-width label.
  const originalLabel = (
    <>
      Original<span className="max-sm:hidden"> · {inputLabel.toUpperCase()}</span> · {formatBytes(file.originalSize)}
    </>
  );
  const outLabel = (MIME_LABEL[result.mimeType] ?? "Output").toUpperCase();
  const q = usedQuality(result.codec);
  let rightLabel: string;
  if (diffOn && result.keptOriginal) rightLabel = "Kept original · nothing changed";
  else if (diffOn && diffReady) rightLabel = "Changed pixels · brighter = more loss";
  else if (diffOn && diff?.status === "error") rightLabel = "Couldn't render the difference";
  else if (diffOn) rightLabel = "Finding what changed…";
  else if (busy) rightLabel = "Updating…";
  else if (result.keptOriginal) rightLabel = `Kept original · ${formatBytes(result.newSize)}`;
  else rightLabel = `${outLabel}${q !== null && result.mimeType !== "image/png" ? ` q${q}` : ""} · ${formatBytes(result.newSize)}`;

  const name = outputFileName(file, result);
  const dims = result.dimensions;
  const saved = result.savedPct;
  let savedText = saved >= 0 ? `${saved}% smaller` : `${Math.abs(saved)}% larger`;
  let savedTone = saved >= 0 ? "text-success-text" : "text-warning-text";
  if (result.keptOriginal) {
    savedText = "Already well compressed";
    savedTone = "text-text-tertiary";
  }

  const copyTag = async () => {
    const tag = imgSnippet({ fileName: name, width: dims.width, height: dims.height });
    try {
      await navigator.clipboard.writeText(tag);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-3 p-3 [grid-area:stage] sm:p-3.5">
      <CompareCanvas
        variant="stage"
        originalUrl={file.previewUrl}
        compressedUrl={diffReady ? diffReady.url : compressedUrl}
        position={split}
        onPositionChange={setSplit}
        originalLabel={originalLabel}
        compressedLabel={rightLabel}
        alpha={result.hasAlpha}
        zoom={zoom}
        focus={focus}
        onFocusChange={setFocus}
        onZoomAt={(f) => {
          setFocus(f);
          setZoom(1);
        }}
        onInspect={() => setInspectOpen(true)}
        stale={busy}
      />

      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
        <label className="flex min-w-0 flex-[1_1_220px] items-center gap-2.5 text-xs text-text-faint">
          <span aria-hidden>Original</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(split)}
            onChange={(e) => setSplit(Number(e.target.value))}
            aria-label="Compare original and compressed"
            className="m-0 min-w-0 grow accent-text max-sm:h-11"
          />
          <span aria-hidden>Compressed</span>
        </label>
        <div role="group" aria-label="Zoom" className="flex gap-0.5 rounded-lg border border-white/7 bg-[#0d0d0c] p-0.5">
          {ZOOMS.map((z) => (
            <button
              key={z.label}
              type="button"
              aria-pressed={zoom === z.value}
              onClick={() => {
                setFocus({ fx: 0.5, fy: 0.5 });
                setZoom(z.value);
              }}
              className={cn(
                "min-h-7 cursor-pointer rounded-md px-2.5 font-mono text-[11.5px] transition-colors max-sm:min-h-11 max-sm:px-3.5",
                zoom === z.value ? "bg-selected text-text" : "text-text-tertiary hover:text-text",
              )}
            >
              {z.label}
            </button>
          ))}
        </div>
        <DesignSwitch
          checked={diffOn}
          onCheckedChange={setDiffOn}
          label="Show what changed"
          title={
            diffReady
              ? `${Math.round(diffReady.changedShare * 100)}% of pixels changed noticeably · mean error ${diffReady.mean.toFixed(1)} / 255`
              : "Overlay an amplified map of every pixel compression changed"
          }
        />
      </div>

      <Notices file={file} onEditSettings={onEditSettings} onPickFormat={(f) => onPickFormat(file.id, f)} />

      <div className="flex flex-col overflow-hidden rounded-[14px] border border-white/7 bg-[#0d0d0c]">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b border-border-subtle px-3.5 py-3">
          <div className="flex min-w-0 grow flex-col">
            <span className="truncate font-mono text-[13px] text-text-key">{name}</span>
            <span className="text-xs text-text-faint">
              {dims.width} × {dims.height} px · <span className={savedTone}>{savedText}</span>
              {result.autoPicked ? <span> · Auto picked {MIME_LABEL[result.mimeType]}</span> : null}
            </span>
          </div>
          <button
            type="button"
            onClick={copyTag}
            className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border-strong px-3 text-xs font-semibold text-text transition-colors hover:bg-white/6 max-sm:min-h-11"
          >
            <span aria-live="polite">{copied ? "Copied" : "Copy tag"}</span>
            <span className="font-mono text-[10.5px] text-text-faint">&lt;img&gt;</span>
          </button>
          <button
            type="button"
            onClick={() => onDownload(file.id)}
            disabled={busy}
            className="btn-action inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-bold disabled:cursor-wait disabled:opacity-60 max-sm:min-h-11"
          >
            Download
          </button>
        </div>
        <FormatBars
          file={file}
          convertAll={convertAll}
          onConvertAll={onConvertAll}
          onPick={(outputFormat) => onPickFormat(file.id, outputFormat)}
          globalFormat={globalFormat}
          onFollowGlobal={() => onFollowGlobal(file.id)}
        />
      </div>

      {/* Full-screen comparison for pixel-level inspection (1:1 + pan). */}
      <Dialog open={inspectOpen} onOpenChange={setInspectOpen}>
        <DialogContent aria-describedby={undefined} className="top-1/2 w-[calc(100vw-32px)] max-w-[1100px] -translate-y-1/2 p-4">
          <DialogTitle className="sr-only">Compare original and compressed</DialogTitle>
          <CompareCanvas
            variant="modal"
            originalUrl={file.previewUrl}
            compressedUrl={diffReady ? diffReady.url : compressedUrl}
            position={split}
            onPositionChange={setSplit}
            originalLabel={originalLabel}
            compressedLabel={rightLabel}
            alpha={result.hasAlpha}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
});

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

// ── Every format, real sizes ───────────────────────────────────────

function FormatBars({
  file,
  onPick,
  convertAll,
  onConvertAll,
  globalFormat,
  onFollowGlobal,
}: {
  file: ImageFile;
  onPick: (m: OutputMime) => void;
  convertAll: boolean;
  onConvertAll: (on: boolean) => void;
  globalFormat: OutputFormat;
  onFollowGlobal: () => void;
}) {
  const result = file.result;
  if (!result) return null;
  const s = file.settings;
  const busy = file.status === "compressing" || file.status === "idle";
  const probes = file.probes?.key === probeKey(s) ? file.probes.candidates : [];
  const byMime = new Map<string, CandidateSummary>();
  // Real encodes win over estimates for the same format.
  for (const c of [...probes, ...result.candidates]) byMime.set(c.mimeType, c);
  const probing = file.probes?.key !== probeKey(s);
  const alpha = result.hasAlpha;
  const valid = BAR_FORMATS.map((m) => byMime.get(m)).filter((c): c is CandidateSummary => !!c && !(c.mimeType === "image/jpeg" && alpha));
  const budget = s.goal === "budget";
  // In budget mode an estimate that fits is "somewhere under the budget" —
  // too coarse to rank, so only real encodes compete for "smallest" there.
  const ranked = budget ? valid.filter((c) => !c.estimated) : valid;
  const smallest = [...ranked].sort((a, b) => a.size - b.size)[0];
  const max = Math.max(file.originalSize, ...valid.map((c) => c.size));
  const pct = (n: number) => `${Math.max(1.5, (n / max) * 100).toFixed(1)}%`;
  const anyEstimate = valid.some((c) => c.estimated);

  return (
    <div className="flex flex-col gap-2 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 grow text-xs text-text-faint">
          {compareTitle(s, sliderValue(s))}
          {anyEstimate ? " · ≈ estimated (~ rough), exact once chosen" : ""}
        </span>
        <span className="flex items-center gap-2">
          <DesignSwitch
            checked={convertAll}
            onCheckedChange={onConvertAll}
            label="Apply to all images"
            aria-describedby="ic-convert-all-hint"
            className="text-xs"
          />
          <span id="ic-convert-all-hint" className="text-[11.5px] text-text-faint">
            {convertAll ? "On: a bar converts every image" : "Off: only this image changes"}
          </span>
        </span>
      </div>
      {file.formatOverride !== null ? (
        <span className="flex flex-wrap items-center gap-2 text-xs text-[#f0c9a0]">
          This image uses its own format ({OUTPUT_FORMAT_LABEL[file.formatOverride]}); the others use {OUTPUT_FORMAT_LABEL[globalFormat]}.
          <button
            type="button"
            onClick={onFollowGlobal}
            className="cursor-pointer rounded px-1 font-semibold text-text-tertiary underline decoration-white/20 underline-offset-2 hover:text-text max-sm:min-h-11"
          >
            Use {OUTPUT_FORMAT_LABEL[globalFormat]} like the others
          </button>
        </span>
      ) : null}
      <Bar
        label={`Original ${(MIME_LABEL[file.inputMimeType] ?? "").toUpperCase()}`}
        size={formatBytes(file.originalSize)}
        width={pct(file.originalSize)}
        tone="orig"
        chosen={result.keptOriginal}
      />
      {BAR_FORMATS.map((m) => {
        const c = byMime.get(m);
        const est = !!c?.estimated;
        const noAlpha = m === "image/jpeg" && alpha;
        const label = `${MIME_LABEL[m].toUpperCase()}${c && c.quality !== null && m !== "image/png" ? ` q${c.quality}` : ""}`;
        const chosen = !result.keptOriginal && result.mimeType === m;
        const over = budget && c?.fits === false;
        const isSmallest = !!smallest && c === smallest;
        let size = probing ? "…" : "—";
        let sizeLabel: string | undefined;
        if (c && est && budget && c.fits && c.quality === null) {
          size = `≤ ${formatBytes(c.size)}`;
          sizeLabel = `estimated to fit under ${formatBytes(c.size)}`;
        } else if (c && est && c.rough) {
          // Screenshots, flat graphics and palette PNG estimate loosely (up
          // to ~±75% in the benchmark), so they're shown as rough figures.
          size = `~ ${roughBytes(c.size)}`;
          sizeLabel = `rough estimate ${roughBytes(c.size)}`;
        } else if (c) {
          size = `${est ? "≈ " : ""}${formatBytes(c.size)}`;
          if (est) sizeLabel = `estimated ${formatBytes(c.size)}`;
        }
        if (noAlpha) size = "—";
        let tag = "";
        let tagTone = "text-text-faint";
        if (isSmallest) {
          tag = "smallest";
          if (est) tag = c?.rough ? "maybe smallest" : "likely smallest";
          tagTone = "text-success-text";
        }
        if (budget && c?.fits === true && !isSmallest) tag = est ? "≈ fits" : "fits";
        if (over) [tag, tagTone] = [est ? "≈ over budget" : "over budget", "text-error-text"];
        if (noAlpha) [tag, tagTone] = ["drops transparency", "text-text-faint"];
        return (
          <Bar
            key={m}
            label={label}
            size={size}
            sizeLabel={sizeLabel}
            width={c && !noAlpha ? pct(c.size) : "0%"}
            tone={isSmallest ? "best" : "fmt"}
            estimated={est}
            tag={tag}
            tagTone={tagTone}
            chosen={chosen}
            dim={noAlpha}
            onPick={noAlpha || chosen || busy ? undefined : () => onPick(m)}
            pickLabel={`Convert ${convertAll ? "every image" : "this image"} to ${MIME_LABEL[m]} (exact size after encoding)`}
          />
        );
      })}
      {busy ? (
        <span aria-live="polite" className="text-xs text-[#f0c9a0]">
          {s.outputFormat === "auto"
            ? "Encoding AVIF, WebP and JPEG to pick the smallest…"
            : `Encoding ${s.outputFormat === "original" ? "in the original format" : `as ${OUTPUT_FORMAT_LABEL[s.outputFormat]}`}… sizes become exact when it’s done.`}
        </span>
      ) : null}
    </div>
  );
}

/** Two significant figures: "230 KB", "1.4 MB". */
function roughBytes(n: number): string {
  const kb = n / 1024;
  if (kb < 10) return formatBytes(n);
  if (kb < 1024) {
    const step = kb < 100 ? 1 : 10;
    return `${Math.round(kb / step) * step} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}

function Bar({
  label,
  size,
  sizeLabel,
  width,
  tone,
  estimated = false,
  tag = "",
  tagTone = "text-text-faint",
  chosen,
  dim = false,
  onPick,
  pickLabel,
}: {
  label: string;
  size: string;
  /** Accessible name for the size ("estimated 172 KB"). */
  sizeLabel?: string;
  width: string;
  tone: "orig" | "best" | "fmt";
  /** Draw the bar hatched-light: an approximation, not a real encode. */
  estimated?: boolean;
  tag?: string;
  tagTone?: string;
  chosen: boolean;
  dim?: boolean;
  onPick?: () => void;
  pickLabel?: string;
}) {
  const fill = { orig: "bg-white/22", best: "bg-success-text", fmt: "bg-clay-light" }[tone];
  const body = (
    <>
      <span className="flex items-center gap-1.5 font-mono text-[11.5px] whitespace-nowrap text-text-strong">
        <span aria-hidden className="w-2 text-clay-light">{chosen ? "●" : ""}</span>
        {label}
        {chosen ? <span className="sr-only"> (delivered)</span> : null}
      </span>
      <span className="relative h-[18px] overflow-hidden rounded-[5px] bg-white/4">
        <span className={cn("absolute inset-y-0 left-0 rounded-[5px] transition-[width] duration-300", fill, estimated ? "opacity-45" : "opacity-85")} style={{ width }} />
        <span className={cn("absolute top-0 text-[10.5px] leading-[18px] font-semibold whitespace-nowrap", tagTone)} style={{ left: `calc(${width} + 8px)` }}>
          {tag}
        </span>
      </span>
      <span className={cn("text-right font-mono text-[11.5px] tabular-nums", estimated ? "text-text-tertiary" : "text-text-key")}>
        {sizeLabel ? (
          <>
            <span aria-hidden>{size}</span>
            <span className="sr-only">{sizeLabel}</span>
          </>
        ) : (
          size
        )}
      </span>
    </>
  );
  const cls = cn("grid grid-cols-[112px_minmax(0,1fr)_74px] items-center gap-2.5 text-left max-sm:grid-cols-[96px_minmax(0,1fr)_64px]", dim && "opacity-35");
  return onPick ? (
    <button type="button" onClick={onPick} title={pickLabel} className={cn(cls, "cursor-pointer rounded-md hover:bg-white/3 max-sm:min-h-11")}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

// ── Empty / waiting ────────────────────────────────────────────────

function Placeholder({
  file,
  busy,
  empty,
  onChooseFiles,
  onExamples,
}: {
  file: ImageFile | null;
  busy: boolean;
  empty: boolean;
  onChooseFiles: () => void;
  onExamples: () => void;
}) {
  let title = "Your before and after appears here";
  let body = "Drag the divider to compare, click a spot to see it at 100%, and turn on “Show what changed” to see every pixel compression touched.";
  if (file && busy) {
    title = file.status === "compressing" ? "Compressing…" : "Queued…";
    body = "The comparison opens as soon as this image is done.";
  } else if (file && file.status === "error" && file.error) {
    title = file.error.kind === "cancelled" ? "Cancelled" : "Couldn’t compress this image";
    body = describeCompressionError(file.error).hint;
  }
  return (
    <div className="relative flex h-[300px] flex-col items-center justify-center gap-2 overflow-hidden rounded-[14px] border border-white/7 bg-[#0b0b0a] px-6 text-center sm:h-[440px] lg:h-[520px]">
      {file ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={file.previewUrl} alt="" className="absolute inset-0 m-auto max-h-full max-w-full object-contain opacity-30" draggable={false} />
      ) : null}
      <span className="relative text-sm font-bold text-text">{empty ? "Drop images to compress" : title}</span>
      <span className="relative max-w-[44ch] text-[13px] text-text-faint">
        {empty ? "Any number, any of PNG, JPEG, WebP, AVIF, GIF or HEIC. Nothing leaves your device — the sizes you see are the real files." : body}
      </span>
      {empty ? (
        <span className="relative mt-2 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onChooseFiles} className="btn-action inline-flex min-h-10 cursor-pointer items-center rounded-[10px] px-4 text-[13px] font-bold max-sm:min-h-11">
            Choose images
          </button>
          <button
            type="button"
            onClick={onExamples}
            className="inline-flex min-h-10 cursor-pointer items-center rounded-[10px] border border-border-strong px-4 text-[13px] font-semibold text-text transition-colors hover:bg-white/6 max-sm:min-h-11"
          >
            Try examples
          </button>
        </span>
      ) : null}
    </div>
  );
}

// ── Honest notices about what the pipeline did ─────────────────────

const ANIMATED_LABEL = { gif: "GIF", apng: "animated PNG", webp: "animated WebP" } as const;

function Notices({
  file,
  onEditSettings,
  onPickFormat,
}: {
  file: ImageFile;
  onEditSettings: (patch: Partial<CompressionSettings>) => void;
  onPickFormat: (format: OutputFormat) => void;
}) {
  const result = file.result;
  if (!result) return null;
  const s = file.settings;
  const notices: ReactNode[] = [];
  // Offer WebP only when it's a real change and possible: the kept file
  // isn't already WebP, WebP wasn't already tried (Auto), and WebP's
  // 16383px side limit isn't exceeded.
  const canOfferWebp =
    result.mimeType !== "image/webp" &&
    s.outputFormat !== "auto" &&
    Math.max(result.sourceDimensions.width, result.sourceDimensions.height) <= 16383;

  if (result.keptOriginal) {
    notices.push(
      <Notice key="kept" tone="success" title="Already well optimised — kept your original.">
        {s.outputFormat === "auto"
          ? "Every format came out bigger than your file, so the download is the original, byte for byte."
          : "Re-encoding this image came out no smaller, so the download is the original file, byte for byte."}
        {canOfferWebp && " Converting to WebP or AVIF can still shrink it."}
        {canOfferWebp && (
          <span className="mt-2 flex flex-wrap gap-2">
            <NoticeAction onClick={() => onPickFormat("image/webp")}>Convert to WebP</NoticeAction>
          </span>
        )}
      </Notice>,
    );
  }
  const budget = result.budget;
  if (budget && !budget.fits) {
    const w = result.dimensions.width;
    const smaller = MAX_WIDTH_CHIPS.filter((c) => c > 0 && c < w).sort((a, b) => b - a)[0];
    notices.push(
      <Notice key="budget" tone="warning" title={`Can't fit ${Math.round(budget.targetBytes / 1024)} KB at this size — try a smaller max width.`}>
        {result.keptOriginal
          ? `Your original (${formatBytes(result.newSize)}) is already smaller than any re-encode, and still over budget.`
          : `Even the lowest quality we allow comes to ${formatBytes(result.newSize)}, so this file is over budget. It isn’t pushed further: below that, images visibly break up.`}
        <span className="mt-2 flex flex-wrap gap-2">
          {smaller ? <NoticeAction onClick={() => onEditSettings(maxWidthPatch(smaller))}>Try {smaller}px wide</NoticeAction> : null}
          {result.mimeType === "image/png" ? <NoticeAction onClick={() => onPickFormat("image/webp")}>Use WebP</NoticeAction> : null}
        </span>
      </Notice>,
    );
  } else if (budget && budget.soft && budget.quality !== null) {
    notices.push(
      <Notice key="soft" tone="info" title={`Fits the budget at q${budget.quality} — softer than Smallest.`}>
        Turn on “Show what changed” to check edges and gradients, or allow a little more budget.
      </Notice>,
    );
  }
  if (result.animatedSource) {
    notices.push(
      <Notice key="animated" tone="warning" title="Animated image — only the first frame was kept.">
        This {ANIMATED_LABEL[result.animatedSource]} has several frames; the output is a still image of the first one. Keep the
        original if you need the animation.
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
        Colour profile dropped. Wide-gamut photos (Adobe RGB from cameras) may look less saturated in{" "}
        {MIME_LABEL[result.mimeType]}. Pick <b>Original</b> format to keep the profile.
        <span className="mt-2 flex flex-wrap gap-2">
          <NoticeAction onClick={() => onPickFormat("original")}>Keep the original format</NoticeAction>
        </span>
      </Notice>,
    );
  }
  if (result.iccStatus === "cmyk") {
    notices.push(
      <Notice key="cmyk" tone="warning">
        This JPEG uses a <b>CMYK</b> colour profile (common from Photoshop or print exports). It’s decoded only approximately, so
        colours may shift. For accurate colour, re-export the source as <b>sRGB</b> first.
      </Notice>,
    );
  }
  if (result.pngPhotoAdvisory) {
    notices.push(
      <Notice key="png-photo" tone="info" title="Tip: this looks like a photo.">
        Saved as a colour-accurate PNG. JPEG or WebP compress photos like this 2–3× smaller with no visible difference.
        <span className="mt-2 flex flex-wrap gap-2">
          <NoticeAction onClick={() => onPickFormat("image/jpeg")}>Switch to JPEG</NoticeAction>
          <NoticeAction onClick={() => onPickFormat("image/webp")}>Use WebP</NoticeAction>
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
  const Icon = { success: CheckCircle2, info: Lightbulb, warning: AlertTriangle }[tone];
  return (
    <div className={cn("flex items-start gap-2 rounded-[10px] border px-3 py-2.5 text-xs leading-relaxed", NOTICE_TONE[tone])}>
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
      className="inline-flex min-h-8 cursor-pointer items-center rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold text-text transition-colors hover:border-border-strong hover:bg-surface-soft max-sm:min-h-11"
    >
      {children}
    </button>
  );
}
