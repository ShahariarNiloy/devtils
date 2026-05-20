"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { useColorConverter } from "./useColorConverter";
import { FORMATS, FORMAT_LABEL } from "./color-converter.types";
import { HeroCard, type HeroCardHandle } from "./panels/hero-card";
import { PickerPanel } from "./panels/picker-panel";
import { FormatsPanel } from "./panels/formats-panel";
import { ShadesPanel } from "./panels/shades-panel";
import { WcagPanel } from "./panels/wcag-panel";
import { PreviewBackgrounds } from "./panels/preview-backgrounds";
import { HistoryStrip } from "./panels/history-strip";

export function ColorConverter({ tool }: { tool: Tool }) {
  const s = useColorConverter();
  const heroRef = useRef<HeroCardHandle>(null);

  const copyHex = useCallback(() => {
    void navigator.clipboard.writeText(s.formatted.hex);
    toast.success("Copied HEX");
  }, [s.formatted.hex]);

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

  useShortcut({ key: "c", meta: true, shift: true, ignoreInEditable: true }, (e) => {
    e.preventDefault();
    copyHex();
  });
  useShortcut({ key: "l", meta: true }, (e) => {
    e.preventDefault();
    copyPermalink();
  });
  useShortcut({ key: "k", meta: true }, (e) => {
    e.preventDefault();
    heroRef.current?.focus();
  });

  const handleSwap = useCallback(() => {
    const bg = s.bgRgb;
    s.setBgRgb(s.rgb);
    s.setFromRgb(bg);
  }, [s]);

  return (
    <ToolShell tool={tool}>
      <div className="flex flex-col gap-5 px-4 sm:px-0">

        {/* ─── Hero ──────────────────────────────────────── */}
        <HeroCard
          ref={heroRef}
          formatted={s.formatted}
          primaryFormat={s.primaryFormat}
          onPrimaryFormatChange={s.setPrimaryFormat}
          named={s.named}
          onColorParsed={s.setFromRgb}
          onCopyAll={copyAll}
        />

        {/* ─── 3-column workspace ────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)_300px] xl:grid-cols-[340px_minmax(0,1fr)_320px]">

          {/* LEFT — picker + recents (sticky) */}
          <div className="flex flex-col gap-3 lg:sticky lg:top-[calc(var(--spacing-header)+1rem)] lg:self-start">
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
              onPickerRelease={s.addToHistory}
              setFromRgb={s.setFromRgb}
            />
            <HistoryStrip
              history={s.history}
              onSelect={s.restoreFromHistory}
              onClear={s.clearHistory}
            />
          </div>

          {/* MIDDLE — formats grid */}
          <FormatsPanel
            formatted={s.formatted}
            primaryFormat={s.primaryFormat}
            tailwind={s.tailwind}
          />

          {/* RIGHT — contrast / preview */}
          <div className="flex flex-col gap-3 min-w-0">
            <WcagPanel
              rgb={s.rgb}
              bgRgb={s.bgRgb}
              wcag={s.wcag}
              onBgChange={s.setBgRgb}
              onSwap={handleSwap}
            />
            <PreviewBackgrounds
              fgRgb={s.rgb}
              bgRgb={s.bgRgb}
              onBgChange={s.setBgRgb}
            />
          </div>
        </div>

        {/* ─── Ramp (full width) ─────────────────────────── */}
        <ShadesPanel shades={s.shades} />

      </div>
    </ToolShell>
  );
}
