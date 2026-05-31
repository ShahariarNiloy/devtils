"use client";

import { Link2 } from "lucide-react";
import { ToolShell } from "@/components/layout/tool-shell";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/primitives/tabs";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { CssUnitConverterContent } from "./content";
import { BasePopover } from "./panels/base-popover";
import { BulkPanel } from "./panels/bulk-panel";
import { ClampPanel } from "./panels/clamp-panel";
import { ConvertPanel } from "./panels/convert-panel";
import { SettingsPopover } from "./panels/settings-popover";
import {
  useCssUnitConverter,
  type TabKey,
} from "./use-css-unit-converter";

/**
 * Top-level shell for the CSS unit converter. Three tabs (Convert / Bulk /
 * Clamp), a base-font-size chip + settings popover + share button in the
 * header, and the standard SEO content block underneath. All state lives
 * in `useCssUnitConverter`; each panel owns its own input state.
 */
export function CssUnitConverter({ tool }: { tool: Tool }) {
  const s = useCssUnitConverter(tool.slug);

  useShortcut({ key: "k", meta: true }, (e) => {
    e.preventDefault();
    document.getElementById("css-value")?.focus();
  });

  return (
    <ToolShell tool={tool}>
      <div className="flex flex-col gap-6 px-4 sm:px-0">
        <Tabs
          value={s.tab}
          onValueChange={(v) => s.setTab(v as TabKey)}
          className="flex flex-col gap-6"
        >
          {/* Header: tabs + base chip + settings + share */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="convert">Convert</TabsTrigger>
              <TabsTrigger value="bulk">Bulk CSS</TabsTrigger>
              <TabsTrigger value="clamp">Clamp()</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-1.5">
              <BasePopover
                baseFontSize={s.baseFontSize}
                onBaseFontSize={s.setBaseFontSize}
              />
              <SettingsPopover
                viewportWidth={s.viewportWidth}
                onViewportWidth={s.setViewportWidth}
                viewportHeight={s.viewportHeight}
                onViewportHeight={s.setViewportHeight}
                precision={s.precision}
                onPrecision={s.setPrecision}
              />
              <button
                type="button"
                onClick={s.copyShareLink}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs-plus text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
                aria-label="Copy share link"
              >
                <Link2 size={13} />
                Share
              </button>
            </div>
          </div>

          <TabsContent value="convert" className="mt-0">
            <ConvertPanel ctx={s.ctx} alias={s.alias} />
          </TabsContent>

          <TabsContent value="bulk" className="mt-0">
            <BulkPanel ctx={s.ctx} onSetBase={s.setBaseFontSize} />
          </TabsContent>

          <TabsContent value="clamp" className="mt-0">
            <ClampPanel
              baseFontSize={s.baseFontSize}
              precision={s.precision}
            />
          </TabsContent>
        </Tabs>

        <CssUnitConverterContent slug={tool.slug} />
      </div>
    </ToolShell>
  );
}
