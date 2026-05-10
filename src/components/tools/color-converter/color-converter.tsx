"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { ToolShell } from '@/components/layout/tool-shell';
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { useColorConverter } from "./useColorConverter";
import { PickerPanel } from './panels/picker-panel';
import { FormatsPanel } from './panels/formats-panel';
import { ShadesPanel } from './panels/shades-panel';
import { WcagPanel } from './panels/wcag-panel';
import { HistoryStrip } from './panels/history-strip';

export function ColorConverter({ tool }: { tool: Tool }) {
  const state = useColorConverter();

  const copyHex = useCallback(() => {
    navigator.clipboard.writeText(state.formatted.hex);
    toast.success("Copied HEX");
  }, [state.formatted.hex]);

  useShortcut(
    { key: "c", meta: true, shift: true, ignoreInEditable: true },
    (e) => { e.preventDefault(); copyHex(); },
  );

  const handleSwap = useCallback(() => {
    const bg = state.bgRgb;
    state.setBgRgb(state.rgb);
    state.setFromRgb(bg);
  }, [state]);

  return (
    <ToolShell tool={tool}>
      <div className="flex flex-col lg:flex-row gap-4 items-start">

        {/* Left column — picker + history */}
        <div className="w-full lg:w-[300px] xl:w-[340px] shrink-0 flex flex-col gap-3 lg:sticky lg:top-[calc(var(--spacing-header)+1rem)] lg:self-start">
          <PickerPanel
            hue={state.hue}
            sat={state.sat}
            bri={state.bri}
            alpha={state.alpha}
            previewHex={state.formatted.hex}
            pureHex={state.pureHex}
            onSatBriChange={(s, b) => { state.setSat(s); state.setBri(b); }}
            onHueChange={state.setHue}
            onAlphaChange={state.setAlpha}
            onPickerRelease={state.addToHistory}
            setFromRgb={state.setFromRgb}
          />
          <HistoryStrip
            history={state.history}
            onSelect={state.restoreFromHistory}
            onClear={state.clearHistory}
          />
        </div>

        {/* Right column — formats + shades + wcag */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <FormatsPanel
            formatted={state.formatted}
            currentHex={state.formatted.hex}
            onColorParsed={state.setFromRgb}
          />
          <ShadesPanel
            shades={state.shades}
            tailwind={state.tailwind}
          />
          <WcagPanel
            rgb={state.rgb}
            bgRgb={state.bgRgb}
            wcag={state.wcag}
            onBgChange={state.setBgRgb}
            onSwap={handleSwap}
          />
        </div>

      </div>
    </ToolShell>
  );
}
