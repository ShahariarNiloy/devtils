"use client";

import { Download, Eraser, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools-registry";
import {
  SeoChecks,
  SeoCodePanel,
  SeoField,
  SeoPanel,
  SeoPresets,
  SeoRows,
  SeoTextInput,
  SeoWorkspace,
  countChecks,
  downloadText,
  isAbsUrl,
  type SeoRowColumn,
} from "../seo-shared";
import { RobotsTxtGeneratorContent, seoData } from "./content";
import {
  PRESETS,
  SAMPLE_RULES,
  SAMPLE_SITEMAP,
  TEST_AGENTS,
  buildRobots,
  checkRobots,
  describeTest,
  isBadCell,
  presetRules,
  testPath,
  type RobotsRule,
  parseRobotsTxt,
} from "./robots-txt-generator.lib";
import { Dropdown } from "@/components/primitives/select";
import { SeoLoadUrl, type LoadedPage } from "../seo-shared";

const COLUMNS: readonly SeoRowColumn<keyof RobotsRule>[] = [
  { key: "ua", label: "User-agent", flex: "1 1 110px" },
  { key: "type", label: "allow / disallow", flex: "0 1 100px" },
  { key: "path", label: "/path", flex: "1 1 120px" },
];

const TESTER_BOX =
  "flex min-h-[42px] items-center rounded-[9px] border border-white/10 bg-[#0d0d0c] px-2.5 transition-colors focus-within:border-clay-light/50";

export function RobotsTxtGenerator({ tool }: { tool: Tool }) {
  const [rules, setRules] = useState<RobotsRule[]>(SAMPLE_RULES);
  const [sitemap, setSitemap] = useState(SAMPLE_SITEMAP);
  const [delay, setDelay] = useState("");
  const [testUrl, setTestUrl] = useState("/admin/settings");
  const [testUa, setTestUa] = useState("Googlebot");

  const txt = useMemo(() => buildRobots({ rules, sitemap, delay }), [rules, sitemap, delay]);
  const checks = useMemo(() => checkRobots({ rules, sitemap, delay }), [rules, sitemap, delay]);
  const test = useMemo(() => testPath(rules, testUa, testUrl), [rules, testUa, testUrl]);

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <SeoWorkspace
        counts={countChecks(checks)}
        detail={tool.name}
        top={
          <>
            <SeoPresets presets={PRESETS} onPick={(id) => setRules(presetRules(id))} />
            <SeoLoadUrl
              label="Load a site's robots.txt"
              placeholder="example.com"
              onLoad={(p: LoadedPage) => {
                const site = new URL(p.page.finalUrl).hostname;
                if (!p.robots || p.robots.status !== 200) throw new Error(`${site} has no robots.txt — everything may be crawled.`);
                const parsed = parseRobotsTxt(p.robots.text);
                setRules(parsed.rules);
                setSitemap(parsed.sitemaps[0] ?? "");
                setDelay(parsed.delay);
                return `Loaded ${parsed.rules.length} rule${parsed.rules.length === 1 ? "" : "s"} from ${site}/robots.txt${parsed.sitemaps.length > 1 ? ` (${parsed.sitemaps.length} sitemaps; the first is shown)` : ""}.`;
              }}
            />
          </>
        }
        form={
          <>
            <SeoField label="Rules (user-agent · allow or disallow · path)">
              <SeoRows
                columns={COLUMNS}
                rows={rules}
                onChange={setRules}
                newRow={{ ua: "*", type: "disallow", path: "/" }}
                addLabel="Add a rule"
                isBad={(r, k) => isBadCell(r, k)}
              />
            </SeoField>
            <SeoField label="Sitemap URL">
              <SeoTextInput
                label="Sitemap URL"
                value={sitemap}
                onChange={setSitemap}
                placeholder="https://example.com/sitemap.xml"
                mono
                invalid={sitemap.trim() !== "" && !isAbsUrl(sitemap.trim())}
              />
            </SeoField>
            <SeoField label="Crawl-delay (seconds, optional)" hint="Google ignores this. Bing and some others respect it.">
              <SeoTextInput label="Crawl-delay in seconds" value={delay} onChange={setDelay} mono />
            </SeoField>

            <SeoPanel title="Test a URL path">
              <div className="flex flex-wrap gap-1.5">
                <label className={cn(TESTER_BOX, "flex-[2_1_160px]")}>
                  <span className="sr-only">Path</span>
                  <input
                    type="text"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    className="min-w-0 grow border-0 bg-transparent font-mono text-[13px] text-text outline-none"
                  />
                </label>
                <div className={cn(TESTER_BOX, "flex-[1_1_140px]")}>
                  <Dropdown
                    bare
                    aria-label="User agent"
                    value={testUa}
                    onChange={setTestUa}
                    options={TEST_AGENTS}
                    className="min-h-10 grow text-[13px] text-text"
                  />
                </div>
              </div>
              <span
                aria-live="polite"
                className={cn(
                  "inline-flex min-h-[34px] items-center self-start rounded-full px-3 text-[13px] font-bold",
                  test.allowed ? "bg-success/14 text-success-text" : "bg-error/14 text-error-text",
                )}
              >
                {describeTest(test)}
              </span>
            </SeoPanel>
          </>
        }
        results={
          <>
            <SeoChecks checks={checks} />
            <SeoCodePanel
              text={txt}
              lang="robots"
              label="robots.txt"
              emptyText="Add a rule or a sitemap to build robots.txt."
              menu={[
                {
                  label: "Download robots.txt",
                  icon: <Download size={14} />,
                  onSelect: () => downloadText("robots.txt", `${txt}\n`, "text/plain"),
                  disabled: !txt,
                },
                {
                  label: "Load sample",
                  icon: <RotateCcw size={14} />,
                  onSelect: () => {
                    setRules(SAMPLE_RULES);
                    setSitemap(SAMPLE_SITEMAP);
                    setDelay("");
                  },
                },
                {
                  label: "Clear",
                  icon: <Eraser size={14} />,
                  onSelect: () => {
                    setRules([]);
                    setSitemap("");
                    setDelay("");
                  },
                },
              ]}
            />
          </>
        }
      />
      <RobotsTxtGeneratorContent />
    </ToolShell>
  );
}
