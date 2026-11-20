"use client";

import { Eraser, RotateCcw } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import type { Tool } from "@/lib/tools-registry";
import {
  SeoChecks,
  SeoCodePanel,
  SeoField,
  SeoSegmented,
  SeoSerpCard,
  SeoTextArea,
  SeoTextInput,
  SeoWorkspace,
  countChecks,
} from "../seo-shared";
import {
  DEVICES,
  EMPTY_META,
  SAMPLE_META,
  TITLE_MAX,
  buildMeta,
  estimateWidth,
  pxTone,
  type Device,
  type MetaFields,
} from "./meta-preview.lib";
import { MetaPreviewContent, seoData } from "./content";

let ctx: CanvasRenderingContext2D | null | undefined;

/** Real text width via canvas; falls back to the Arial estimate. */
function canvasMeasure(text: string, font: string): number {
  if (ctx === undefined) ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return estimateWidth(text, font);
  ctx.font = font;
  return ctx.measureText(text).width;
}

const noopSubscribe = () => () => {};

export function MetaPreview({ tool }: { tool: Tool }) {
  const [f, setF] = useState<MetaFields>(SAMPLE_META);
  const [device, setDevice] = useState<Device>("desktop");
  // Server render (and hydration) use the estimate; the browser then measures with canvas.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const measure = isClient ? canvasMeasure : estimateWidth;
  const result = useMemo(() => buildMeta(f, device, measure), [f, device, measure]);
  const set = (k: keyof MetaFields) => (v: string) => setF((o) => ({ ...o, [k]: v }));

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <SeoWorkspace
        counts={countChecks(result.checks)}
        detail={tool.name}
        top={<SeoSegmented label="Device" options={DEVICES} value={device} onChange={setDevice} />}
        form={
          <>
            <SeoField
              label="Title tag"
              counter={`${Math.round(result.titleWidth)} / ${TITLE_MAX} px`}
              counterTone={pxTone(result.titleWidth, TITLE_MAX)}
            >
              <SeoTextInput label="Title tag" value={f.title} onChange={set("title")} placeholder="Your page title" />
            </SeoField>
            <SeoField
              label="Meta description"
              counter={`${Math.round(result.descWidth)} / ${result.descMax} px`}
              counterTone={pxTone(result.descWidth, result.descMax)}
            >
              <SeoTextArea
                label="Meta description"
                value={f.desc}
                onChange={set("desc")}
                height="96px"
                mono={false}
              />
            </SeoField>
            <SeoField label="URL">
              <SeoTextInput
                label="URL"
                value={f.url}
                onChange={set("url")}
                placeholder="https://example.com/blog/post"
                mono
              />
            </SeoField>
          </>
        }
        results={
          <>
            <SeoChecks checks={result.checks} />
            <SeoSerpCard {...result.serp} />
            <SeoCodePanel
              text={result.html}
              lang="markup"
              label="Paste into <head>"
              menu={[
                { label: "Load sample", icon: <RotateCcw size={14} />, onSelect: () => setF(SAMPLE_META) },
                { label: "Clear all fields", icon: <Eraser size={14} />, onSelect: () => setF(EMPTY_META) },
              ]}
            />
          </>
        }
      />
      <MetaPreviewContent />
    </ToolShell>
  );
}
