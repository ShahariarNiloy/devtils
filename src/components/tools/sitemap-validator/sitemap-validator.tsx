"use client";

import { Eraser, RotateCcw } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import { flushPendingEdits } from "@/components/primitives/code-editor";
import type { Tool } from "@/lib/tools-registry";
import { SeoChecks, SeoCodePanel, SeoField, SeoTable, SeoTextArea, SeoWorkspace, countChecks } from "../seo-shared";
import { SAMPLE_SITEMAP, validateSitemap } from "./sitemap-validator.lib";
import { SitemapValidatorContent, seoData } from "./content";
import { SeoLoadUrl, type LoadedPage } from "../seo-shared";

export function SitemapValidator({ tool }: { tool: Tool }) {
  const [xml, setXml] = useState(SAMPLE_SITEMAP);
  // Large sitemaps: keep typing responsive while the report catches up.
  const deferred = useDeferredValue(xml);
  const report = useMemo(() => validateSitemap(deferred), [deferred]);
  // Deliver a pending (debounced) edit first so it can't land after the replacement.
  const replaceXml = (v: string) => {
    flushPendingEdits();
    setXml(v);
  };

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <SeoWorkspace
        top={
          <SeoLoadUrl
            label="Load a live sitemap"
            placeholder="example.com/sitemap.xml"
            // A bare domain means its usual sitemap.
            prepare={(u) => (/^(?:https?:\/\/)?[^/]+\/?$/i.test(u) ? `${u.replace(/\/$/, "")}/sitemap.xml` : u)}
            onLoad={(p: LoadedPage) => {
              if (p.page.status !== 200) throw new Error(`${p.page.finalUrl} answered ${p.page.status}.`);
              if (!/<(urlset|sitemapindex)\b/i.test(p.page.body)) throw new Error("That address isn't a sitemap (no <urlset> or <sitemapindex>).");
              flushPendingEdits();
              setXml(p.page.body);
              return `Loaded ${p.page.finalUrl}${p.page.truncated ? " — only the first 2 MB, so the end may be cut off" : ""}.`;
            }}
          />
        }
        counts={countChecks(report.checks)}
        detail={tool.name}
        form={
          <SeoField label="Paste your sitemap.xml">
            <SeoTextArea
              label="Paste your sitemap.xml"
              value={xml}
              onChange={setXml}
              height="300px"
              // Sitemaps run to several MB: the code editor keeps typing instant.
              code="xml"
              placeholder={'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'}
            />
          </SeoField>
        }
        results={
          <>
            <SeoChecks checks={report.checks} />
            <SeoTable label={report.kind === "sitemapindex" ? "Sitemaps" : "URLs"} rows={report.table} />
            <SeoCodePanel
              text={report.summary}
              lang="plain"
              label="Summary"
              emptyText="Paste a sitemap to see the summary."
              menu={[
                { label: "Load sample", icon: <RotateCcw size={14} />, onSelect: () => replaceXml(SAMPLE_SITEMAP) },
                { label: "Clear", icon: <Eraser size={14} />, onSelect: () => replaceXml(""), disabled: !xml },
              ]}
            />
          </>
        }
      />
      <SitemapValidatorContent />
    </ToolShell>
  );
}
