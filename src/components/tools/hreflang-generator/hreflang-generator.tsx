"use client";

import { Download, Eraser, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import type { Tool } from "@/lib/tools-registry";
import {
  SeoChecks,
  SeoCodePanel,
  SeoField,
  SeoPresets,
  SeoRows,
  SeoTextInput,
  SeoWorkspace,
  countChecks,
  downloadText,
  isAbsUrl,
  type SeoRowColumn,
} from "../seo-shared";
import { HreflangGeneratorContent, seoData } from "./content";
import {
  FORMATS,
  PRESETS,
  SAMPLE_ROWS,
  SAMPLE_XDEFAULT,
  buildHreflang,
  checkHreflang,
  hreflangSitemapFile,
  isBadCell,
  presetRows,
  type HreflangFormat,
  type HreflangRow,
} from "./hreflang-generator.lib";

const COLUMNS: readonly SeoRowColumn<keyof HreflangRow>[] = [
  { key: "lang", label: "en-GB", flex: "0 1 110px" },
  { key: "url", label: "https://example.com/uk/", flex: "1 1 200px" },
];

const FILE: Record<HreflangFormat, [string, string]> = {
  html: ["hreflang.html", "text/html"],
  http: ["hreflang-header.txt", "text/plain"],
  xml: ["hreflang-sitemap.xml", "application/xml"],
};

export function HreflangGenerator({ tool }: { tool: Tool }) {
  const [rows, setRows] = useState<HreflangRow[]>(SAMPLE_ROWS);
  const [xdef, setXdef] = useState(SAMPLE_XDEFAULT);
  const [format, setFormat] = useState<HreflangFormat>("html");

  const checks = useMemo(() => checkHreflang(rows, xdef), [rows, xdef]);
  const output = useMemo(() => buildHreflang(rows, xdef, format), [rows, xdef, format]);

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <SeoWorkspace
        counts={countChecks(checks)}
        detail={tool.name}
        top={
          <SeoPresets
            presets={PRESETS}
            onPick={(id) => {
              const p = presetRows(id);
              setRows(p.rows);
              setXdef(p.xdef);
            }}
          />
        }
        form={
          <>
            <SeoField label="Language versions">
              <SeoRows
                columns={COLUMNS}
                rows={rows}
                onChange={setRows}
                newRow={{ lang: "", url: "" }}
                addLabel="Add a language"
                isBad={(r, k) => isBadCell(r, k)}
              />
            </SeoField>
            <SeoField label="x-default (fallback for everyone else)" hint="Usually your language picker or main homepage.">
              <SeoTextInput
                label="x-default URL"
                value={xdef}
                onChange={setXdef}
                placeholder="https://example.com/"
                mono
                invalid={xdef.trim() !== "" && !isAbsUrl(xdef.trim())}
              />
            </SeoField>
          </>
        }
        results={
          <>
            <SeoChecks checks={checks} />
            <SeoCodePanel
              text={output}
              lang={format === "http" ? "plain" : "markup"}
              label="Hreflang tags"
              tabs={FORMATS}
              tab={format}
              onTab={setFormat}
              emptyText="Add a language version to generate tags."
              menu={[
                {
                  label: `Download ${FILE[format][0]}`,
                  icon: <Download size={14} />,
                  onSelect: () =>
                    downloadText(FILE[format][0], format === "xml" ? hreflangSitemapFile(rows, xdef) : output, FILE[format][1]),
                  disabled: !output,
                },
                {
                  label: "Load sample",
                  icon: <RotateCcw size={14} />,
                  onSelect: () => {
                    setRows(SAMPLE_ROWS);
                    setXdef(SAMPLE_XDEFAULT);
                  },
                },
                {
                  label: "Clear all",
                  icon: <Eraser size={14} />,
                  onSelect: () => {
                    setRows([{ lang: "", url: "" }]);
                    setXdef("");
                  },
                },
              ]}
            />
          </>
        }
      />
      <HreflangGeneratorContent />
    </ToolShell>
  );
}
