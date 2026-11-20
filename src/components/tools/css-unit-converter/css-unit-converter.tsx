"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { CssUnitConverterContent, getSeoData } from "./content";
import { format, toPx } from "./css-unit-converter.lib";
import { BulkPanel } from "./panels/bulk-panel";
import { ClampPanel } from "./panels/clamp-panel";
import { ScaleMatches } from "./panels/scale-matches";
import { ContextRow, MoreMenu, RemTable, ResultsGrid, ValueToolbar } from "./panels/units-workspace";
import { CORE_UNITS, PRINT_UNITS, useCssUnitConverter, type TabKey } from "./use-css-unit-converter";

const MODE_TITLE: Record<Exclude<TabKey, "convert">, string> = {
  bulk: "Bulk-convert a stylesheet",
  clamp: "Build a fluid clamp()",
};

/**
 * v2 CSS unit converter: value + from-unit toolbar, root/viewport context,
 * result cards and a px → rem table. Bulk and Clamp modes, print units,
 * design-scale matches, presets and precision live in the ⋯ menu. Also
 * serves the `<a>-to-<b>-converter` alias slugs.
 */
export function CssUnitConverter({ tool }: { tool: Tool }) {
  const s = useCssUnitConverter(tool.slug);
  const seo = getSeoData(tool.slug);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showScales, setShowScales] = useState(false);

  useShortcut({ key: "/", label: "Focus input" }, (e) => {
    e.preventDefault();
    inputRef.current?.focus();
    inputRef.current?.select();
  });

  const value = parseFloat(s.valueText);
  const valid = Number.isFinite(value);
  const valuePx = valid ? toPx(value, s.from, s.ctx) : NaN;
  const units = showPrint || PRINT_UNITS.includes(s.from) ? [...CORE_UNITS, ...PRINT_UNITS] : CORE_UNITS;
  // Alias pages light up the answer; elsewhere the unit you typed in.
  const highlight = s.alias && s.alias.from === s.from ? s.alias.to : s.from;
  const mathTo = highlight !== s.from ? highlight : s.from === "px" ? "rem" : "px";

  const nudge = useCallback(
    (delta: number) => {
      const v = parseFloat(s.valueText);
      if (Number.isFinite(v)) s.setValueText(format(v + delta, s.ctx.precision));
    },
    [s],
  );

  const pickPx = useCallback(
    (px: number) => {
      s.setValueText(String(px));
      s.setFrom("px");
    },
    [s],
  );

  const menu = (cls: string) => (
    <MoreMenu
      className={cls}
      tab={s.tab}
      onTab={s.setTab}
      showPrint={showPrint}
      onShowPrint={setShowPrint}
      showScales={showScales}
      onShowScales={setShowScales}
      baseFontSize={s.ctx.baseFontSize}
      onBase={s.setBaseFontSize}
      precision={s.ctx.precision}
      onPrecision={s.setPrecision}
      onShare={s.copyShareLink}
    />
  );

  const ctxDetail = `root ${format(s.ctx.baseFontSize, 4)}px · viewport ${format(s.ctx.viewportWidth, 4)}×${format(s.ctx.viewportHeight, 4)}`;

  return (
    <ToolShell tool={tool} relatedSlugs={seo.relatedSlugs}>
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
        {s.tab === "convert" ? (
          <ValueToolbar
            ref={inputRef}
            valueText={s.valueText}
            onValueText={s.setValueText}
            invalid={!valid && s.valueText.trim() !== ""}
            units={units}
            from={s.from}
            onFrom={s.setFrom}
            onNudge={nudge}
            menu={menu("h-[52px] w-11")}
          />
        ) : (
          <div className="flex items-center gap-2 border-b border-border-subtle bg-toolbar px-3 py-2.5">
            <button
              type="button"
              onClick={() => s.setTab("convert")}
              className="inline-flex min-h-10 items-center gap-2 rounded-[9px] px-3 text-[13px] font-semibold text-text-tertiary transition-colors hover:bg-white/6 hover:text-text"
            >
              <ArrowLeft size={14} aria-hidden />
              Back to converter
            </button>
            <span className="text-[13px] font-semibold text-text">{MODE_TITLE[s.tab]}</span>
            <span className="grow" />
            {menu("size-10")}
          </div>
        )}

        <ContextRow
          fields={[
            { label: "Root font", field: s.base },
            { label: "Viewport W", field: s.vw },
            { label: "Viewport H", field: s.vh },
          ]}
        />

        {s.tab === "convert" && (
          <div className="flex flex-col md:min-h-[360px] md:flex-row">
            <ResultsGrid units={units} valuePx={valuePx} highlight={highlight} ctx={s.ctx} />
            <RemTable ctx={s.ctx} activePx={s.from === "px" && valid ? value : null} onPick={pickPx}>
              {showScales && (
                <ScaleMatches
                  value={value}
                  from={s.from}
                  to={mathTo}
                  valuePx={valuePx}
                  ctx={s.ctx}
                  onCopy={(t) => {
                    void navigator.clipboard.writeText(t);
                    toast.success(`Copied ${t}`);
                  }}
                />
              )}
            </RemTable>
          </div>
        )}
        {s.tab === "bulk" && (
          <div className="p-3 sm:p-4">
            <BulkPanel ctx={s.ctx} onSetBase={s.setBaseFontSize} />
          </div>
        )}
        {s.tab === "clamp" && (
          <div className="p-3 sm:p-4">
            <ClampPanel baseFontSize={s.ctx.baseFontSize} precision={s.ctx.precision} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
          {s.tab !== "convert" ? (
            <span className="text-success">● {s.tab === "bulk" ? "Bulk CSS" : "clamp()"}</span>
          ) : valid ? (
            <span className="text-success">● {format(valuePx, s.ctx.precision)}px</span>
          ) : (
            <span className="text-error">● Enter a number</span>
          )}
          {(s.tab !== "convert" || valid) && <span>{ctxDetail}</span>}
          <span className="grow" />
          <span className="text-success-text">Local-only</span>
        </div>
      </div>

      <CssUnitConverterContent slug={tool.slug} />
    </ToolShell>
  );
}
