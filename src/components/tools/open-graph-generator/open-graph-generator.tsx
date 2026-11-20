"use client";

import { Eraser, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import type { Tool } from "@/lib/tools-registry";
import {
  SeoChecks,
  SeoCodePanel,
  SeoField,
  SeoSelect,
  SeoSocialCards,
  SeoTextArea,
  SeoTextInput,
  SeoWorkspace,
  countChecks,
} from "../seo-shared";
import {
  DESC_IDEAL,
  DESC_MAX,
  EMPTY_OG,
  OG_CARDS,
  OG_TYPES,
  SAMPLE_OG,
  TITLE_IDEAL,
  TITLE_MAX,
  buildOg,
  charCount,
  counterTone,
  type OgFields,
} from "./open-graph-generator.lib";
import { OpenGraphGeneratorContent, seoData } from "./content";

export function OpenGraphGenerator({ tool }: { tool: Tool }) {
  const [f, setF] = useState<OgFields>(SAMPLE_OG);
  const set = <K extends keyof OgFields>(k: K) => (v: OgFields[K]) => setF((o) => ({ ...o, [k]: v }));
  const result = useMemo(() => buildOg(f), [f]);
  const tLen = charCount(f.title.trim());
  const dLen = charCount(f.desc.trim());

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <SeoWorkspace
        counts={countChecks(result.checks)}
        detail={tool.name}
        form={
          <>
            <SeoField label="Title" counter={`${tLen} / ${TITLE_MAX}`} counterTone={counterTone(tLen, TITLE_MAX, TITLE_IDEAL)}>
              <SeoTextInput label="Title" value={f.title} onChange={set("title")} placeholder="Page title for sharing" />
            </SeoField>
            <SeoField label="Description" counter={`${dLen} / ${DESC_MAX}`} counterTone={counterTone(dLen, DESC_MAX, DESC_IDEAL)}>
              <SeoTextArea label="Description" value={f.desc} onChange={set("desc")} height="84px" mono={false} />
            </SeoField>
            <SeoField label="Page URL">
              <SeoTextInput label="Page URL" value={f.url} onChange={set("url")} placeholder="https://example.com/page" mono />
            </SeoField>
            <SeoField label="Image URL (1200 × 630)" hint="The tags declare 1200 × 630, so use an image that size.">
              <SeoTextInput
                label="Image URL (1200 × 630)"
                value={f.image}
                onChange={set("image")}
                placeholder="https://example.com/og.png"
                mono
              />
            </SeoField>
            <SeoField label="Site name">
              <SeoTextInput label="Site name" value={f.site} onChange={set("site")} placeholder="utilyx" />
            </SeoField>
            <SeoField label="Type">
              <SeoSelect label="Type" value={f.type} onChange={set("type")} options={OG_TYPES} />
            </SeoField>
            <SeoField label="Large or small card">
              <SeoSelect label="Large or small card" value={f.card} onChange={set("card")} options={OG_CARDS} />
            </SeoField>
            <SeoField label="X / Twitter handle (optional)">
              <SeoTextInput
                label="X / Twitter handle (optional)"
                value={f.handle}
                onChange={set("handle")}
                placeholder="@utilyx"
              />
            </SeoField>
          </>
        }
        results={
          <>
            <SeoChecks checks={result.checks} />
            <SeoSocialCards {...result.preview} />
            <SeoCodePanel
              text={result.html}
              lang="markup"
              label="Paste into <head>"
              emptyText="Fill in the form to build the tags."
              menu={[
                { label: "Load sample", icon: <RotateCcw size={14} />, onSelect: () => setF(SAMPLE_OG) },
                { label: "Clear all fields", icon: <Eraser size={14} />, onSelect: () => setF(EMPTY_OG) },
              ]}
            />
          </>
        }
      />
      <OpenGraphGeneratorContent />
    </ToolShell>
  );
}
