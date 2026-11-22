"use client";

import { useMemo, useRef, type DragEvent } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools-registry";
import { FORMATS, buildCode, kb, valueOf } from "./blur-placeholder.lib";
import { BlurPlaceholderContent, seoData } from "./content";
import { BatchView } from "./parts/batch-view";
import { CodePanel } from "./parts/code-panel";
import { FormatCards } from "./parts/format-cards";
import { SettingsPanel } from "./parts/settings-panel";
import { Stage } from "./parts/stage";
import { CHECKER, Chip, Seg, useCopy } from "./parts/ui";
import { SAMPLES, useBlurPlaceholder } from "./use-blur-placeholder";

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

export function BlurPlaceholder({ tool }: { tool: Tool }) {
  const bp = useBlurPlaceholder();
  const { item, result, settings, pick, outTab, mode } = bp;
  const fileRef = useRef<HTMLInputElement>(null);
  const { copied, announce, copy } = useCopy();

  const format = FORMATS.find((f) => f.id === pick) ?? FORMATS[0];
  const code = useMemo(() => (item && result ? buildCode(outTab, pick, item, result) : ""), [item, result, outTab, pick]);
  const choose = () => fileRef.current?.click();

  const onDragOver = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    if (!bp.drag) bp.setDrag(true);
  };
  const onDragLeave = (e: DragEvent) => {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    bp.setDrag(false);
  };
  const onDrop = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    bp.setDrag(false);
    void bp.readFiles(e.dataTransfer.files);
  };

  const meta = item
    ? `${item.w}×${item.h} · ${kb(item.bytes)}${result?.hasAlpha ? " · transparent" : ""}`
    : "Loading sample…";

  return (
    <ToolShell tool={tool} titleStyle="inline" relatedSlugs={seoData.relatedSlugs}>
      <div
        id="tool"
        className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple={mode === "batch"}
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            void bp.readFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-border-subtle bg-toolbar px-3.5 py-3">
          <div role="tablist" aria-label="Mode" className="flex gap-0.5 rounded-[10px] border border-white/7 bg-[#0d0d0c] p-[3px]">
            {(
              [
                ["single", "Single image"],
                ["batch", "Batch"],
              ] as const
            ).map(([id, label]) => (
              <Seg key={id} role="tab" on={mode === id} onClick={() => bp.setMode(id)} className="min-h-8 rounded-[7px] px-[13px] text-[13px]">
                {label}
              </Seg>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-text-faint">Try</span>
            {SAMPLES.map((s) => (
              <Chip key={s.key} mono on={!bp.upload && bp.sampleKey === s.key && mode === "single"} onClick={() => bp.pickSample(s.key)}>
                {s.label}
              </Chip>
            ))}
          </div>
          <span className="grow" />
          <span className="hidden text-xs text-text-faint sm:inline">
            Drop, paste{" "}
            <span className="surface-key rounded-[5px] border border-white/12 px-[5px] py-px font-mono text-[11px]">⌘V</span> or choose an
            image
          </span>
        </div>

        {mode === "single" ? (
          <div
            className={cn(
              "grid items-stretch gap-3.5 px-3 py-3.5 lg:p-4",
              "grid-cols-[minmax(0,1fr)] [grid-template-areas:'src'_'stage'_'cards'_'code'_'set']",
              "lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:[grid-template-areas:'src_stage'_'set_stage'_'cards_cards'_'code_code']",
            )}
          >
            {/* source */}
            <div className="flex min-w-0 flex-col gap-2.5 [grid-area:src]">
              <div
                className={cn(
                  "flex items-center gap-3.5 rounded-[14px] border-[1.5px] border-dashed p-3",
                  bp.drag ? "border-cat-clay bg-[rgba(224,160,114,0.07)]" : "border-border-strong bg-[#0d0d0c]",
                )}
              >
                <div
                  className="flex h-16 w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-[9px]"
                  style={{ background: result?.hasAlpha ? CHECKER : "#121211" }}
                >
                  {item && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.srcUrl} alt="" className="block max-h-full max-w-full" />
                  )}
                </div>
                <div className="flex min-w-0 grow flex-col gap-[3px]">
                  <span className="truncate font-mono text-[13px] text-text-key">{item?.label ?? "—"}</span>
                  <span className="text-xs text-text-faint">{meta}</span>
                  <div className="mt-[5px] flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={choose}
                      className="min-h-[30px] cursor-pointer rounded-lg border border-border-strong bg-white/4 px-3 text-xs font-semibold text-text hover:bg-white/8 max-sm:min-h-11"
                    >
                      Choose image
                    </button>
                    {bp.upload && (
                      <button
                        type="button"
                        onClick={bp.clearUpload}
                        className="min-h-[30px] cursor-pointer rounded-lg border-0 bg-transparent px-2.5 text-xs text-text-tertiary hover:text-text max-sm:min-h-11"
                      >
                        Back to samples
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {bp.err && (
                <div role="alert" className="rounded-[10px] bg-[rgba(224,121,95,0.12)] px-3 py-2.5 text-[13px] text-error-text">
                  {bp.err}
                </div>
              )}
            </div>

            <SettingsPanel settings={settings} setSettings={bp.setSettings} result={result} />
            <Stage item={item} result={result} format={format} />
            <FormatCards result={result} pick={pick} onPick={bp.setPick} />
            <CodePanel
              code={code}
              tab={outTab}
              onTab={bp.setOutTab}
              format={format}
              result={result}
              originalBytes={item?.bytes ?? 0}
              copied={copied === "code"}
              onCopy={() => void copy("code", code, outTab === "value" ? format.name : `${format.name} code`)}
            />
          </div>
        ) : (
          <BatchView
            items={bp.batchItems}
            resultOf={bp.batchResult}
            isExample={bp.isExample}
            progress={bp.progress}
            drag={bp.drag}
            onDragLeave={() => bp.setDrag(false)}
            onChoose={choose}
            onClear={bp.clearBatch}
            copied={copied}
            copy={(id, text, what) => void copy(id, text, what)}
            err={bp.err}
          />
        )}

        {/* status bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-3.5 py-[9px] font-mono text-[11.5px] text-text-faint">
          <span className="text-success-text">● Canvas</span>
          <span>Base64 · ThumbHash · BlurHash · CSS · SVG · colour</span>
          <span>same output as the npm packages</span>
          <span className="grow" />
          <span className="text-success-text">Processed on this device</span>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {announce ||
          (item && result && mode === "single"
            ? `${item.label}: ${format.name}, ${kb(valueOf(format.id, result).length)}`
            : "")}
      </p>

      <BlurPlaceholderContent />
    </ToolShell>
  );
}
