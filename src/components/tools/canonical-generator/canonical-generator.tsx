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
  SeoTextInput,
  SeoToggles,
  SeoWorkspace,
  countChecks,
} from "../seo-shared";
import {
  DEFAULT_OPTIONS,
  FORMATS,
  SAMPLE_URL,
  TOGGLES,
  canonicalize,
  formatCanonical,
  type CanonicalFormat,
  type CanonicalOptions,
  type SlashRule,
  type ToggleId,
  type WwwRule,
} from "./canonical-generator.lib";
import { CanonicalGeneratorContent, seoData } from "./content";

const WWW: readonly { value: WwwRule; label: string }[] = [
  { value: "keep", label: "Keep as is" },
  { value: "remove", label: "Remove www" },
  { value: "add", label: "Add www" },
];

const SLASH: readonly { value: SlashRule; label: string }[] = [
  { value: "keep", label: "Keep as is" },
  { value: "add", label: "Always add" },
  { value: "remove", label: "Always remove" },
];

export function CanonicalGenerator({ tool }: { tool: Tool }) {
  const [url, setUrl] = useState(SAMPLE_URL);
  const [opts, setOpts] = useState<CanonicalOptions>(DEFAULT_OPTIONS);
  const [format, setFormat] = useState<CanonicalFormat>("html");

  const result = useMemo(() => canonicalize(url, opts), [url, opts]);
  const output = result.canonical ? formatCanonical(result.canonical, format) : "";
  const set = <K extends keyof CanonicalOptions>(k: K, v: CanonicalOptions[K]) => setOpts((o) => ({ ...o, [k]: v }));

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <SeoWorkspace
        counts={countChecks(result.checks)}
        detail={tool.name}
        form={
          <>
            <SeoField label="Page URL">
              <SeoTextInput
                label="Page URL"
                value={url}
                onChange={setUrl}
                placeholder="https://www.Example.com/Blog/post/index.html?utm_source=x"
                mono
                invalid={url.trim() !== "" && result.canonical === null}
              />
            </SeoField>
            <SeoField label="www">
              <SeoSelect label="www" value={opts.www} onChange={(v) => set("www", v)} options={WWW} />
            </SeoField>
            <SeoField label="Trailing slash">
              <SeoSelect label="Trailing slash" value={opts.slash} onChange={(v) => set("slash", v)} options={SLASH} />
            </SeoField>
            <SeoField label="Clean up">
              <SeoToggles<ToggleId>
                items={TOGGLES.map((t) => ({ ...t, on: opts[t.id] }))}
                onToggle={(id) => set(id, !opts[id])}
              />
            </SeoField>
          </>
        }
        results={
          <>
            <SeoChecks checks={result.checks} />
            <SeoCodePanel
              text={output}
              lang={format === "html" ? "markup" : "plain"}
              label="Canonical"
              tabs={FORMATS}
              tab={format}
              onTab={setFormat}
              emptyText="Enter a full URL to build the canonical."
              menu={[
                {
                  label: "Load sample",
                  icon: <RotateCcw size={14} />,
                  onSelect: () => {
                    setUrl(SAMPLE_URL);
                    setOpts(DEFAULT_OPTIONS);
                  },
                },
                { label: "Clear", icon: <Eraser size={14} />, onSelect: () => setUrl("") },
              ]}
            />
          </>
        }
      />
      <CanonicalGeneratorContent />
    </ToolShell>
  );
}
