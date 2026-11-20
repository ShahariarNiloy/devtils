"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { ColorConverterContent, seoData } from "./content";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { parseHex } from "./color.lib";
import { contrastSummary, formatRowsV2, tintShadeScale } from "./color-converter.lib";
import { useColorConverter } from "./useColorConverter";
import { FORMATS, FORMAT_LABEL } from "./color-converter.types";
import { PickerPanel } from "./panels/picker-panel";
import { FormatsPanel } from "./panels/formats-panel";
import { ShadesPanel } from "./panels/shades-panel";
import { WcagPanel } from "./panels/wcag-panel";
import { PreviewBackgrounds } from "./panels/preview-backgrounds";
import { HistoryStrip } from "./panels/history-strip";
import { FormatsColumn, MoreMenu, SwatchColumn, type ColorExtra } from "./panels/color-workspace";

export function ColorConverter({ tool }: { tool: Tool }) {
  const s = useColorConverter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [extras, setExtras] = useState<ReadonlySet<ColorExtra>>(() => new Set());

  const hexUpper = s.formatted.hex.toUpperCase();
  const rows = useMemo(() => formatRowsV2(s.rgb), [s.rgb]);
  const scale = useMemo(() => tintShadeScale(s.rgb), [s.rgb]);
  const contrast = useMemo(() => contrastSummary(s.rgb), [s.rgb]);

  const toggleExtra = useCallback((id: ColorExtra) => {
    setExtras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const copyHex = useCallback(() => {
    void navigator.clipboard.writeText(hexUpper);
    toast.success("Copied HEX");
  }, [hexUpper]);

  const copyAll = useCallback(() => {
    const block = FORMATS
      .filter((f) => f !== "named")
      .map((f) => `${FORMAT_LABEL[f].padEnd(6, " ")} ${s.formatted[f]}`)
      .join("\n");
    void navigator.clipboard.writeText(block);
    toast.success("Copied all formats");
  }, [s.formatted]);

  const copyPermalink = useCallback(() => {
    if (typeof window === "undefined") return;
    const hex = s.formatted.hex.replace("#", "");
    const url = `${window.location.origin}${window.location.pathname}#${hex}`;
    void navigator.clipboard.writeText(url);
    toast.success("Permalink copied");
  }, [s.formatted.hex]);

  useShortcut({ key: "c", meta: true, shift: true, ignoreInEditable: true, label: "Copy HEX" }, (e) => {
    e.preventDefault();
    copyHex();
  });
  useShortcut({ key: "l", meta: true, label: "Copy permalink" }, (e) => {
    e.preventDefault();
    copyPermalink();
  });
  useShortcut({ key: "/", label: "Focus input" }, (e) => {
    e.preventDefault();
    inputRef.current?.focus();
    inputRef.current?.select();
  });

  /** Scale step or native picker: keep the current alpha. */
  const applyHex = useCallback(
    (hex: string, remember: boolean) => {
      const parsed = parseHex(hex);
      if (!parsed) return;
      s.setFromRgb({ ...parsed, a: s.alpha });
      if (remember) s.addToHistory(hex.toLowerCase());
    },
    [s],
  );

  const handleSwap = useCallback(() => {
    const bg = s.bgRgb;
    s.setBgRgb(s.rgb);
    s.setFromRgb(bg);
  }, [s]);

  const invalid = s.inputInvalid;

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
        <div className="flex flex-col md:min-h-[460px] md:flex-row">
          <SwatchColumn
            ref={inputRef}
            rgb={s.rgb}
            hexUpper={hexUpper}
            contrast={contrast}
            inputValue={s.inputValue}
            invalid={invalid}
            onInput={s.setInputText}
            onCommit={s.commitInput}
            onPick={(hex) => applyHex(hex, false)}
            onPickDone={() => s.addToHistory()}
            menu={
              <MoreMenu
                open={extras}
                onToggle={toggleExtra}
                onCopyAll={copyAll}
                onCopyPermalink={copyPermalink}
              />
            }
          />
          <FormatsColumn rows={rows} scale={scale} onUseStep={(hex) => applyHex(hex, true)} />
        </div>

        {extras.size > 0 && (
          <div className="grid grid-cols-1 gap-3 border-t border-border-subtle p-3 sm:p-4 lg:grid-cols-2">
            {(extras.has("picker") || extras.has("recent")) && (
              <div className="flex min-w-0 flex-col gap-3">
                {extras.has("picker") && (
                  <PickerPanel
                    hue={s.hue}
                    sat={s.sat}
                    bri={s.bri}
                    alpha={s.alpha}
                    previewHex={s.formatted.hex}
                    pureHex={s.pureHex}
                    onSatBriChange={(sat, bri) => { s.setSat(sat); s.setBri(bri); }}
                    onHueChange={s.setHue}
                    onAlphaChange={s.setAlpha}
                    onPickerRelease={() => s.addToHistory()}
                    setFromRgb={s.setFromRgb}
                  />
                )}
                {extras.has("recent") && (
                  <HistoryStrip history={s.history} onSelect={s.restoreFromHistory} onClear={s.clearHistory} />
                )}
              </div>
            )}
            {extras.has("formats") && (
              <FormatsPanel formatted={s.formatted} primaryFormat={s.primaryFormat} tailwind={s.tailwind} />
            )}
            {extras.has("contrast") && (
              <div className="flex min-w-0 flex-col gap-3">
                <WcagPanel rgb={s.rgb} bgRgb={s.bgRgb} wcag={s.wcag} onBgChange={s.setBgRgb} onSwap={handleSwap} />
                <PreviewBackgrounds fgRgb={s.rgb} bgRgb={s.bgRgb} onBgChange={s.setBgRgb} />
              </div>
            )}
            {extras.has("ramp") && (
              <div className="min-w-0 lg:col-span-2">
                <ShadesPanel shades={s.shades} />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
          {invalid ? (
            <span className="text-error">● Unrecognised colour</span>
          ) : (
            <>
              <span className="text-success">● {hexUpper}</span>
              <span>
                contrast {contrast.onWhite.toFixed(1)} on white · {contrast.onBlack.toFixed(1)} on black
              </span>
            </>
          )}
          <span className="grow" />
          <span className="text-success-text">Local-only</span>
        </div>
      </div>

      <ColorConverterContent />
    </ToolShell>
  );
}
