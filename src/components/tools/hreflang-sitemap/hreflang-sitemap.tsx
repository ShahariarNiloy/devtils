"use client";

import { Download, Eraser, RotateCcw } from "lucide-react";
import { useDeferredValue, useMemo, useState, useSyncExternalStore } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import type { Tool } from "@/lib/tools-registry";
import {
  SeoChecks,
  SeoCodePanel,
  SeoField,
  SeoTextArea,
  SeoToggles,
  SeoWorkspace,
  countChecks,
  downloadText,
} from "../seo-shared";
import { HreflangSitemapContent, seoData } from "./content";
import { SAMPLE_CSV, buildHreflangSitemap } from "./hreflang-sitemap.lib";

type OptionId = "lastmod" | "xdef";

const noopSubscribe = () => () => {};
const todayIso = () => new Date().toISOString().slice(0, 10);

export function HreflangSitemap({ tool }: { tool: Tool }) {
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [lastmod, setLastmod] = useState(true);
  const [firstIsXDefault, setFirstIsXDefault] = useState(false);
  // Today's date only exists on the client; the static HTML renders without lastmod.
  const today = useSyncExternalStore(noopSubscribe, todayIso, () => "");
  const deferredCsv = useDeferredValue(csv);

  const result = useMemo(
    () => buildHreflangSitemap(deferredCsv, { lastmod, firstIsXDefault, today }),
    [deferredCsv, lastmod, firstIsXDefault, today],
  );

  const toggle = (id: OptionId) => (id === "lastmod" ? setLastmod((v) => !v) : setFirstIsXDefault((v) => !v));

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <SeoWorkspace
        counts={countChecks(result.checks)}
        detail={tool.name}
        form={
          <>
            <SeoField
              label="One row per page: locale codes as headers, then the URL of each version"
              hint="Comma or tab separated. Empty cells are fine — that locale is skipped for that page."
            >
              <SeoTextArea label="Page × locale table" value={csv} onChange={setCsv} height="200px" placeholder={"en,de\nhttps://example.com/,https://example.com/de/"} />
            </SeoField>
            <SeoField label="Options">
              <SeoToggles<OptionId>
                items={[
                  { id: "lastmod", label: "Add lastmod", on: lastmod },
                  { id: "xdef", label: "First column is also x-default", on: firstIsXDefault },
                ]}
                onToggle={toggle}
              />
            </SeoField>
          </>
        }
        results={
          <>
            <SeoChecks checks={result.checks} />
            <SeoCodePanel
              text={result.xml}
              lang="markup"
              label="sitemap.xml"
              emptyText="Paste a header row of locale codes to build the sitemap."
              menu={[
                {
                  label: "Download sitemap.xml",
                  icon: <Download size={14} />,
                  onSelect: () => downloadText("sitemap.xml", result.xml, "application/xml"),
                  disabled: !result.xml,
                },
                { label: "Load sample", icon: <RotateCcw size={14} />, onSelect: () => setCsv(SAMPLE_CSV) },
                { label: "Clear", icon: <Eraser size={14} />, onSelect: () => setCsv("") },
              ]}
            />
          </>
        }
      />
      <HreflangSitemapContent />
    </ToolShell>
  );
}
