"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { cn } from "@/lib/cn";
import { Check, MoreHorizontal, Plus, Settings2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { FILE_INPUT_ACCEPT } from "../image-compressor.constants";
import { QUALITY_MODE_DEFS } from "../image-compressor.modes";
import type { SortMode } from "../image-compressor.store";
import type { CompressionSettings, QualityMode } from "../image-compressor.types";
import {
  customQualityPatch,
  isWebCapOn,
  qualityReadout,
  SLIDER_MAX,
  SLIDER_MIN,
  TOOLBAR_FORMATS,
  WEB_MAX_WIDTH,
  webCapPatch,
} from "../image-compressor.view";

const NAMED_MODES = ["maximum", "high", "small"] as const;

const SORT_LABEL: Record<SortMode, string> = {
  upload: "Upload order",
  name: "Name (A–Z)",
  "size-desc": "Largest first",
  "savings-desc": "Most saved",
};

interface Props {
  settings: CompressionSettings;
  onChange: (patch: Partial<CompressionSettings>) => void;
  hasFiles: boolean;
  sortMode: SortMode;
  onSetSortMode: (mode: SortMode) => void;
  onSetAllQuality: (mode: QualityMode) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onOpenSettings: () => void;
  onClearAll: () => void;
}

/** v2 toolbar: output format · quality · "Max 1920px wide" · ⋯ for the rest. */
export function Toolbar({
  settings,
  onChange,
  hasFiles,
  sortMode,
  onSetSortMode,
  onSetAllQuality,
  onAddFiles,
  onOpenSettings,
  onClearAll,
}: Props) {
  const readout = qualityReadout(settings);
  // The slider previews locally while dragging and commits on release, so
  // a drag doesn't queue a re-compress for every step.
  const [draft, setDraft] = useState<number | null>(null);
  const commit = () => {
    if (draft === null) return;
    onChange(customQualityPatch(draft));
    setDraft(null);
  };
  const capOn = isWebCapOn(settings);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border-subtle bg-toolbar p-3">
      <div
        role="group"
        aria-label="Output format"
        className="flex flex-[1_1_100%] gap-0.5 rounded-[11px] border border-border-subtle bg-[#0d0d0c] p-[3px] sm:flex-[0_0_auto]"
      >
        {TOOLBAR_FORMATS.map((f) => {
          const on = settings.outputFormat === f.value;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={on}
              title={f.title}
              onClick={() => onChange({ outputFormat: f.value })}
              className={cn(
                "min-h-10 flex-[1_1_0] cursor-pointer rounded-lg px-2 text-[13px] font-semibold transition-colors sm:px-3.5",
                on
                  ? "bg-selected text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "text-text-tertiary hover:text-text",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div
        className="flex min-h-11 flex-[1_1_220px] items-center gap-3 rounded-[10px] border border-border pr-1.5 pl-3 text-[13px] text-text-tertiary"
        title={readout.title}
      >
        <label htmlFor="ic-quality">Quality</label>
        <input
          id="ic-quality"
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={1}
          value={draft ?? readout.value}
          onChange={(e) => setDraft(Number(e.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
          aria-valuetext={draft === null && readout.auto ? "Automatic, perceptual" : String(draft ?? readout.value)}
          className={cn("min-w-0 grow accent-accent", readout.auto && draft === null && "opacity-50")}
        />
        <span className="w-9 text-right font-mono text-text tabular-nums">
          {draft ?? (readout.auto ? "auto" : readout.value)}
        </span>
        <button
          type="button"
          aria-pressed={readout.auto}
          onClick={() =>
            onChange(readout.auto ? customQualityPatch(readout.value) : { qualityMode: "high" })
          }
          title="Auto finds the lowest quality that still looks identical to the original (SSIM)"
          className={cn(
            "min-h-8 cursor-pointer rounded-lg px-2.5 text-xs font-semibold transition-colors",
            readout.auto ? "bg-selected text-text" : "text-text-tertiary hover:bg-white/6 hover:text-text",
          )}
        >
          Auto
        </button>
      </div>

      <button
        type="button"
        aria-pressed={capOn}
        onClick={() => onChange(webCapPatch(!capOn))}
        title="Scale wider images down to 1920px; smaller ones keep their size"
        className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] border border-border px-3 text-[13px] font-semibold text-text-key transition-colors hover:bg-white/4"
      >
        <span
          aria-hidden
          className={cn("relative inline-block h-5 w-[34px] rounded-full transition-colors", capOn ? "bg-accent" : "bg-[#3a3833]")}
        >
          <span
            className={cn(
              "absolute top-0.5 size-4 rounded-full bg-text transition-[left] duration-150",
              capOn ? "left-4" : "left-0.5",
            )}
          />
        </span>
        Max {WEB_MAX_WIDTH}px wide
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More options"
            className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-border text-text-tertiary transition-colors hover:bg-white/4 hover:text-text data-[state=open]:bg-white/6 data-[state=open]:text-text max-sm:ml-auto"
          >
            <MoreHorizontal size={16} aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
            <Plus size={14} aria-hidden />
            Add images…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenSettings}>
            <Settings2 size={14} aria-hidden />
            Compression settings & presets…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs normal-case tracking-normal">Auto quality target</DropdownMenuLabel>
          {NAMED_MODES.map((m) => (
            <DropdownMenuItem key={m} onSelect={() => onChange({ qualityMode: m })}>
              <CheckSlot on={settings.qualityMode === m} />
              {QUALITY_MODE_DEFS[m].label}
              <span className="ml-auto text-xs text-text-faint">{QUALITY_MODE_DEFS[m].description}</span>
            </DropdownMenuItem>
          ))}
          {hasFiles ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs normal-case tracking-normal">Set every image to</DropdownMenuLabel>
              {NAMED_MODES.map((m) => (
                <DropdownMenuItem key={m} onSelect={() => onSetAllQuality(m)}>
                  <CheckSlot on={false} />
                  {QUALITY_MODE_DEFS[m].label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs normal-case tracking-normal">Sort images</DropdownMenuLabel>
              {(Object.keys(SORT_LABEL) as SortMode[]).map((m) => (
                <DropdownMenuItem key={m} onSelect={() => onSetSortMode(m)}>
                  <CheckSlot on={m === sortMode} />
                  {SORT_LABEL[m]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onClearAll} className="data-highlighted:text-error-text">
                <Trash2 size={14} aria-hidden />
                Clear all
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={inputRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onAddFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function CheckSlot({ on }: { on: boolean }) {
  return on ? <Check size={14} strokeWidth={2.5} aria-hidden /> : <span aria-hidden className="w-3.5" />;
}
