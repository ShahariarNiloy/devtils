"use client";

import { cn } from "@/lib/cn";
import { memo, useState, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { BUDGET_KB_CHIPS, BUDGET_KB_MIN, MAX_WIDTH_CHIPS } from "../../image-compressor.constants";
import { QUALITY_MODE_DEFS } from "../../image-compressor.modes";
import { jpegScaleOf, qualityWord, sliderCodec, sliderValue } from "../../image-compressor.quality";
import { selectFocused, summarize } from "../../image-compressor.selectors";
import { useCompressorStore } from "../../image-compressor.store";
import type { CompressionSettings, QualityMode } from "../../image-compressor.types";
import {
  FORMAT_OPTIONS,
  SLIDER_MAX,
  SLIDER_MIN,
  changedSettingsCount,
  customQualityPatch,
  maxWidthOf,
  maxWidthPatch,
} from "../../image-compressor.view";
import { DesignSwitch } from "../design-switch";

interface Props {
  onEdit: (patch: Partial<CompressionSettings>) => void;
  onApply: () => void;
  onAutoUpdate: (on: boolean) => void;
  onResetOverrides: () => void;
}

const MODES = ["maximum", "high", "small"] as const;

/** Right column: update status · Format · Goal · Max width · Never bigger · Metadata. */
// Re-renders when the settings, image count or override count change — batch
// progress lives in UpdateStatus, so per-file updates skip the whole column.
export const SettingsColumn = memo(function SettingsColumn({ onEdit, onApply, onAutoUpdate, onResetOverrides }: Props) {
  const { draft, applied, autoUpdate, fileCount, overrideCount } = useCompressorStore(
    useShallow((s) => {
      const t = summarize(s.files);
      return {
        /** What the controls show (ahead of `applied` while auto-update is off). */
        draft: s.draftSettings,
        applied: s.globalSettings,
        autoUpdate: s.autoUpdate,
        fileCount: t.fileCount,
        /** Images with their own format (set from the stage's format bars). */
        overrideCount: t.overrideCount,
      };
    }),
  );
  const changed = autoUpdate ? 0 : changedSettingsCount(draft, applied);

  return (
    <aside aria-label="Compression settings" className="flex min-w-0 flex-col [grid-area:settings] max-lg:border-t max-lg:border-border-subtle lg:border-l lg:border-border-subtle">
      <div className="flex flex-col gap-2 border-b border-border-subtle bg-surface px-3.5 py-3">
        <UpdateStatus changed={changed} />
        <div className="flex items-center gap-2.5">
          <div className="flex grow flex-col">
            <span id="ic-auto-label" className="text-[13px] font-bold">Update automatically</span>
            <span id="ic-auto-hint" className="text-[11.5px] leading-[1.4] text-text-faint">
              {autoUpdate ? "Changes apply as you make them" : "Changes wait until you press Compress — handy for big batches"}
            </span>
          </div>
          <DesignSwitch checked={autoUpdate} onCheckedChange={onAutoUpdate} aria-label="Update automatically" aria-describedby="ic-auto-hint" />
        </div>
        {!autoUpdate ? (
          <button
            type="button"
            onClick={changed > 0 ? onApply : undefined}
            aria-disabled={changed === 0}
            className={cn(
              "min-h-10 rounded-[10px] text-[13.5px] font-bold max-sm:min-h-11",
              changed > 0 ? "btn-action cursor-pointer" : "cursor-default bg-white/6 text-text-faint",
            )}
          >
            {changed > 0 ? `Compress ${fileCount} image${fileCount === 1 ? "" : "s"}` : "Nothing to update"}
          </button>
        ) : null}
      </div>

      <Section title="Format" id="ic-format" first>
        <div role="radiogroup" aria-labelledby="ic-format" className="grid grid-cols-2 gap-1.5 sm:grid-cols-6 lg:grid-cols-2">
          {FORMAT_OPTIONS.map((f) => {
            const on = draft.outputFormat === f.value;
            return (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={on}
                title={f.title}
                onClick={() => onEdit({ outputFormat: f.value })}
                className={cn(
                  "flex min-h-12 cursor-pointer flex-col items-start gap-px rounded-[9px] border px-2.5 py-[7px] text-left transition-colors",
                  on ? "border-clay-light/70 bg-clay-light/8 text-text" : "border-border bg-[#0d0d0c] text-text-strong hover:border-white/14",
                )}
              >
                <span className="text-[13px] font-bold">{f.label}</span>
                <span className={cn("text-[11px]", on ? "text-[#f0c9a0]" : "text-text-faint")}>{f.note}</span>
              </button>
            );
          })}
        </div>
        {overrideCount > 0 ? (
          <span className="flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-[#f0c9a0]">
            {overrideCount} image{overrideCount === 1 ? " uses its" : "s use their"} own format ·
            <button
              type="button"
              onClick={onResetOverrides}
              className="cursor-pointer rounded font-semibold text-text-tertiary underline decoration-white/20 underline-offset-2 hover:text-text max-sm:min-h-11"
            >
              Reset
            </button>
          </span>
        ) : null}
        <span className="text-[11.5px] text-text-faint">Applies to every image. A format bar under the preview changes one image.</span>
      </Section>

      <Section
        title="Goal"
        id="ic-goal"
        aside={
          <div role="tablist" aria-labelledby="ic-goal" className="flex gap-0.5 rounded-lg bg-[#0d0d0c] p-0.5">
            {(
              [
                ["quality", "Quality"],
                ["budget", "Size budget"],
              ] as const
            ).map(([g, label]) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={draft.goal === g}
                aria-controls="ic-goal-panel"
                onClick={() => onEdit({ goal: g })}
                className={cn(
                  "min-h-7 cursor-pointer rounded-md px-2.5 text-xs font-semibold transition-colors max-sm:min-h-11",
                  draft.goal === g ? "bg-selected text-text" : "text-text-tertiary hover:text-text",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <div id="ic-goal-panel" role="tabpanel">
          {draft.goal === "quality" ? <QualityControls draft={draft} onEdit={onEdit} /> : <BudgetControls draft={draft} onEdit={onEdit} />}
        </div>
      </Section>

      <Section title="Max width" id="ic-width">
        <div role="group" aria-labelledby="ic-width" className="flex flex-wrap gap-1.5">
          {MAX_WIDTH_CHIPS.map((w) => (
            <Chip key={w} on={maxWidthOf(draft) === w} onClick={() => onEdit(maxWidthPatch(w))}>
              {w === 0 ? "Original" : w}
            </Chip>
          ))}
        </div>
        <span className="text-[11.5px] text-text-faint">Never upscales. Height keeps the aspect ratio.</span>
      </Section>

      <div className="flex items-center gap-2.5 border-t border-border-subtle px-3.5 py-3">
        <div className="flex grow flex-col">
          <span className="text-[13px] font-bold">Never make it bigger</span>
          <span id="ic-keep-hint" className="text-[11.5px] text-text-faint">Keep the original when it&apos;s already smaller</span>
        </div>
        <DesignSwitch
          checked={draft.neverBigger}
          onCheckedChange={(neverBigger) => onEdit({ neverBigger })}
          aria-label="Never make it bigger"
          aria-describedby="ic-keep-hint"
        />
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border-subtle px-3.5 py-3">
        <span className="text-[13px] font-bold">Metadata</span>
        <MetadataLine />
      </div>
    </aside>
  );
});

function Section({ title, id, aside, first = false, children }: { title: string; id: string; aside?: ReactNode; first?: boolean; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-[9px] p-3.5", !first && "border-t border-border-subtle")}>
      <div className="flex items-center gap-2">
        <span id={id} className="grow text-[13px] font-bold">
          {title}
        </span>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Chip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "min-h-7 cursor-pointer rounded-full border px-2.5 font-mono text-[11.5px] transition-colors max-sm:min-h-11 max-sm:px-3.5",
        on ? "border-clay-light/60 bg-clay-light/8 text-[#f0c9a0]" : "border-white/10 text-text-tertiary hover:border-white/20 hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

function QualityControls({ draft, onEdit }: { draft: CompressionSettings; onEdit: (p: Partial<CompressionSettings>) => void }) {
  const value = sliderValue(draft);
  // Preview while dragging, commit on release, so a drag doesn't queue a
  // re-compress for every step.
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? value;
  const codec = sliderCodec(draft.outputFormat);
  let word = qualityWord(jpegScaleOf(codec, shown));
  if (draft.outputFormat === "image/png") word = shown >= 100 ? "Lossless" : qualityWord(shown);
  const commit = () => {
    if (drag === null) return;
    if (drag !== value) onEdit(customQualityPatch(drag));
    setDrag(null);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="grow text-xs text-text-faint">{word}</span>
        <span className="font-mono text-[13px] text-[#f0c9a0] tabular-nums">{shown}</span>
      </div>
      <input
        type="range"
        min={SLIDER_MIN}
        max={SLIDER_MAX}
        step={1}
        value={shown}
        aria-label="Quality"
        aria-valuetext={`${shown}, ${word}`}
        onChange={(e) => setDrag(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="m-0 w-full accent-clay-light max-sm:h-11"
      />
      <div role="group" aria-label="Quality preset" className="flex flex-wrap gap-1.5">
        {MODES.map((m: Exclude<QualityMode, "custom">) => (
          <Chip key={m} on={draft.qualityMode === m} onClick={() => onEdit({ qualityMode: m })} label={`${QUALITY_MODE_DEFS[m].label}: ${QUALITY_MODE_DEFS[m].description}`}>
            {QUALITY_MODE_DEFS[m].label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function BudgetControls({ draft, onEdit }: { draft: CompressionSettings; onEdit: (p: Partial<CompressionSettings>) => void }) {
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    if (text === null) return;
    const v = Math.round(Number(text));
    if (Number.isFinite(v) && v >= BUDGET_KB_MIN && v !== draft.budgetKb) onEdit({ budgetKb: v });
    setText(null);
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-text-faint">Highest quality that fits under the budget, per image.</span>
      <div role="group" aria-label="Size budget" className="flex flex-wrap gap-1.5">
        {BUDGET_KB_CHIPS.map((kb) => (
          <Chip key={kb} on={draft.budgetKb === kb} onClick={() => onEdit({ budgetKb: kb })}>
            {kb} KB
          </Chip>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs text-text-faint">
        Custom
        <input
          type="number"
          inputMode="numeric"
          min={BUDGET_KB_MIN}
          value={text ?? String(draft.budgetKb)}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
          className="min-h-[30px] w-[84px] rounded-[7px] border border-white/12 bg-[#0d0d0c] px-2 font-mono text-xs text-text outline-none focus:border-brand max-sm:min-h-11"
        />
        KB
      </label>
    </div>
  );
}

/** "Updating 3 of 15…" — the only part of the column that follows the batch's progress. */
const UpdateStatus = memo(function UpdateStatus({ changed }: { changed: number }) {
  const { fileCount, workingCount } = useCompressorStore(
    useShallow((s) => {
      const t = summarize(s.files);
      return { fileCount: t.fileCount, workingCount: t.compressingCount + t.queuedCount };
    }),
  );
  let status: { dot: string; text: string; tone: string };
  if (workingCount > 0) {
    const n = Math.min(fileCount, fileCount - workingCount + 1);
    status = { dot: "◌", text: `Updating ${n} of ${fileCount}…`, tone: "text-[#f0c9a0]" };
  } else if (changed > 0) {
    status = { dot: "●", text: `${changed} setting${changed === 1 ? "" : "s"} changed · not applied yet`, tone: "text-[#f0c9a0]" };
  } else {
    status = { dot: "✓", text: "Up to date", tone: "text-success-text" };
  }
  return (
    <div aria-live="polite" className={cn("flex items-center gap-2 text-[12.5px] font-semibold", status.tone)}>
      <span aria-hidden className="inline-block w-3 text-center">{status.dot}</span>
      {status.text}
    </div>
  );
});

/** The focused image's camera / GPS facts — subscribes to just those. */
function MetadataLine() {
  const { meta, kept } = useCompressorStore(
    useShallow((s) => {
      const f = selectFocused(s);
      return { meta: f?.meta ?? null, kept: f?.result?.keptOriginal === true };
    }),
  );
  if (!meta) return <span className="text-xs text-text-faint">Camera and location data are never copied into the compressed file.</span>;
  if (!meta.exif) return <span className="text-xs text-text-faint">No camera or location data in this file.</span>;
  const camera = meta.camera ?? "camera";
  if (kept) {
    return (
      <span className="text-xs text-text-tertiary">
        Your original was kept as-is, so its {meta.gps ? "GPS location and " : ""}
        {camera} details stay in it.
      </span>
    );
  }
  if (meta.gps) {
    return (
      <div className="flex gap-[9px] rounded-[9px] border border-clay-light/25 bg-clay-light/8 px-2.5 py-[9px]">
        <span aria-hidden className="text-clay-light">⌖</span>
        <span className="text-xs leading-[1.45] text-[#e8d6c4]">
          This photo has a GPS location and {camera} details. The compressed file leaves them out.
        </span>
      </div>
    );
  }
  return meta.camera ? (
    <span className="text-xs text-text-tertiary">Camera details ({meta.camera}) are left out of the compressed file.</span>
  ) : (
    <span className="text-xs text-text-tertiary">Camera details, date and other EXIF data are left out of the compressed file.</span>
  );
}
