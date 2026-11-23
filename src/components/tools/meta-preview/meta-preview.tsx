"use client";

import { Eraser, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
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
  pxTone,
  type Device,
  type MetaFields,
} from "./meta-preview.lib";
import { useTextMeasure } from "../seo-shared/measure";
import { allTitles, metaContent } from "../seo-shared/page-meta.lib";
import { SeoLoadUrl, type LoadedPage } from "../seo-shared";
import { MetaPreviewContent, seoData } from "./content";

export function MetaPreview({ tool }: { tool: Tool }) {
  const [f, setF] = useState<MetaFields>(SAMPLE_META);
  const [device, setDevice] = useState<Device>("desktop");
  const measure = useTextMeasure();
  const result = useMemo(() => buildMeta(f, device, measure), [f, device, measure]);
  const set = (k: keyof MetaFields) => (v: string) => setF((o) => ({ ...o, [k]: v }));

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <SeoWorkspace
        counts={countChecks(result.checks)}
        detail={tool.name}
        top={
          <>
            <SeoSegmented label="Device" options={DEVICES} value={device} onChange={setDevice} />
            <SeoLoadUrl
              onLoad={(p: LoadedPage) => {
                const html = p.page.body;
                const title = allTitles(html)[0] ?? "";
                const desc = metaContent(html, "description") ?? "";
                setF({ title, desc, url: p.page.finalUrl });
                if (!title && !desc) throw new Error("That page has no title or meta description.");
                return `Loaded from ${new URL(p.page.finalUrl).hostname}${!desc ? " — it has no meta description" : ""}.`;
              }}
            />
          </>
        }
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
