"use client";

import { Eraser, RotateCcw } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import type { Tool } from "@/lib/tools-registry";
import {
  SeoChecks,
  SeoCodePanel,
  SeoField,
  SeoTable,
  SeoTextArea,
  SeoTextInput,
  SeoWorkspace,
  countChecks,
  isAbsUrl,
} from "../seo-shared";
import { HreflangValidatorContent, seoData } from "./content";
import { SAMPLE_HTML, SAMPLE_PAGE, auditHreflang } from "./hreflang-validator.lib";

export function HreflangValidator({ tool }: { tool: Tool }) {
  const [page, setPage] = useState(SAMPLE_PAGE);
  const [html, setHtml] = useState(SAMPLE_HTML);
  // Big pasted heads shouldn't make typing lag.
  const deferredHtml = useDeferredValue(html);
  const audit = useMemo(() => auditHreflang(page, deferredHtml), [page, deferredHtml]);

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <SeoWorkspace
        counts={countChecks(audit.checks)}
        detail={tool.name}
        form={
          <>
            <SeoField label="This page's URL">
              <SeoTextInput
                label="This page's URL"
                value={page}
                onChange={setPage}
                placeholder="https://example.com/de/"
                mono
                invalid={page.trim() !== "" && !isAbsUrl(page.trim())}
              />
            </SeoField>
            <SeoField label="Paste the page's <head> (or just the link tags)">
              <SeoTextArea
                label="Page head HTML"
                value={html}
                onChange={setHtml}
                height="230px"
                placeholder={'<link rel="alternate" hreflang="en" href="https://example.com/" />'}
              />
            </SeoField>
          </>
        }
        results={
          <>
            <SeoChecks checks={audit.checks} />
            <SeoTable label="Hreflang tags found" rows={audit.rows} />
            <SeoCodePanel
              text={audit.corrected}
              lang="markup"
              label="Corrected tags"
              menu={[
                {
                  label: "Load sample",
                  icon: <RotateCcw size={14} />,
                  onSelect: () => {
                    setPage(SAMPLE_PAGE);
                    setHtml(SAMPLE_HTML);
                  },
                },
                {
                  label: "Clear",
                  icon: <Eraser size={14} />,
                  onSelect: () => {
                    setPage("");
                    setHtml("");
                  },
                },
              ]}
            />
          </>
        }
      />
      <HreflangValidatorContent />
    </ToolShell>
  );
}
