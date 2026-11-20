"use client";

import { Braces, Eraser, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import type { Tool } from "@/lib/tools-registry";
import {
  SeoChecks,
  SeoCodePanel,
  SeoField,
  SeoRows,
  SeoSegmented,
  SeoSelect,
  SeoTextArea,
  SeoTextInput,
  SeoWorkspace,
  countChecks,
} from "../seo-shared";
import {
  AVAILABILITY,
  CURRENCIES,
  LD_TYPES,
  SAMPLE_LD,
  buildJsonLd,
  clearType,
  sampleType,
  type LdFields,
  type LdType,
} from "./json-ld-generator.lib";
import { JsonLdGeneratorContent, seoData } from "./content";

const FAQ_COLUMNS = [
  { key: "q", label: "Question", flex: "1 1 100%" },
  { key: "a", label: "Answer", flex: "1 1 100%" },
] as const;

const CRUMB_COLUMNS = [
  { key: "name", label: "Name", flex: "1 1 120px" },
  { key: "url", label: "URL", flex: "2 1 180px" },
] as const;

export function JsonLdGenerator({ tool }: { tool: Tool }) {
  const [type, setType] = useState<LdType>("Article");
  const [f, setF] = useState<LdFields>(SAMPLE_LD);
  const result = useMemo(() => buildJsonLd(type, f), [type, f]);

  const article = <K extends keyof LdFields["article"]>(k: K) => (v: string) =>
    setF((o) => ({ ...o, article: { ...o.article, [k]: v } }));
  const product = <K extends keyof LdFields["product"]>(k: K) => (v: LdFields["product"][K]) =>
    setF((o) => ({ ...o, product: { ...o.product, [k]: v } }));
  const org = <K extends keyof LdFields["org"]>(k: K) => (v: string) =>
    setF((o) => ({ ...o, org: { ...o.org, [k]: v } }));

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(result.json);
      toast.success("JSON copied without the script tag");
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  };

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <SeoWorkspace
        counts={countChecks(result.checks)}
        detail={tool.name}
        top={<SeoSegmented label="Schema type" options={LD_TYPES} value={type} onChange={setType} />}
        form={
          <>
            {type === "Article" && (
              <>
                <SeoField label="Headline">
                  <SeoTextInput
                    label="Headline"
                    value={f.article.headline}
                    onChange={article("headline")}
                    placeholder="How we made utilyx private by default"
                  />
                </SeoField>
                <SeoField label="Image URL">
                  <SeoTextInput
                    label="Image URL"
                    value={f.article.image}
                    onChange={article("image")}
                    placeholder="https://example.com/cover.png"
                    mono
                  />
                </SeoField>
                <SeoField label="Author">
                  <SeoTextInput label="Author" value={f.article.author} onChange={article("author")} placeholder="Ada Lovelace" />
                </SeoField>
                <SeoField label="Published (YYYY-MM-DD)">
                  <SeoTextInput
                    label="Published (YYYY-MM-DD)"
                    value={f.article.date}
                    onChange={article("date")}
                    placeholder="2026-11-20"
                    mono
                  />
                </SeoField>
                <SeoField label="Publisher">
                  <SeoTextInput label="Publisher" value={f.article.publisher} onChange={article("publisher")} placeholder="utilyx" />
                </SeoField>
              </>
            )}
            {type === "Product" && (
              <>
                <SeoField label="Name">
                  <SeoTextInput label="Name" value={f.product.name} onChange={product("name")} placeholder="utilyx Pro" />
                </SeoField>
                <SeoField label="Image URL">
                  <SeoTextInput
                    label="Image URL"
                    value={f.product.image}
                    onChange={product("image")}
                    placeholder="https://example.com/product.png"
                    mono
                  />
                </SeoField>
                <SeoField label="Description">
                  <SeoTextArea label="Description" value={f.product.desc} onChange={product("desc")} height="70px" mono={false} />
                </SeoField>
                <SeoField label="Price">
                  <SeoTextInput label="Price" value={f.product.price} onChange={product("price")} placeholder="9.00" mono />
                </SeoField>
                <SeoField label="Currency">
                  <SeoSelect label="Currency" value={f.product.currency} onChange={product("currency")} options={CURRENCIES} />
                </SeoField>
                <SeoField label="Availability">
                  <SeoSelect
                    label="Availability"
                    value={f.product.availability}
                    onChange={product("availability")}
                    options={AVAILABILITY}
                  />
                </SeoField>
              </>
            )}
            {type === "Organization" && (
              <>
                <SeoField label="Name">
                  <SeoTextInput label="Name" value={f.org.name} onChange={org("name")} placeholder="utilyx" />
                </SeoField>
                <SeoField label="Website">
                  <SeoTextInput label="Website" value={f.org.url} onChange={org("url")} placeholder="https://utilyx.dev" mono />
                </SeoField>
                <SeoField label="Logo URL">
                  <SeoTextInput
                    label="Logo URL"
                    value={f.org.logo}
                    onChange={org("logo")}
                    placeholder="https://utilyx.dev/logo.png"
                    mono
                  />
                </SeoField>
                <SeoField label="Profiles (one URL per line)">
                  <SeoTextArea
                    label="Profiles (one URL per line)"
                    value={f.org.sameAs}
                    onChange={org("sameAs")}
                    height="84px"
                    placeholder={"https://github.com/you\nhttps://x.com/you"}
                  />
                </SeoField>
              </>
            )}
            {type === "FAQPage" && (
              <SeoField label="Questions and answers">
                <SeoRows
                  columns={FAQ_COLUMNS}
                  rows={f.faq}
                  onChange={(faq) => setF((o) => ({ ...o, faq }))}
                  newRow={{ q: "", a: "" }}
                  addLabel="Add a question"
                />
              </SeoField>
            )}
            {type === "BreadcrumbList" && (
              <SeoField label="Trail, from home to this page">
                <SeoRows
                  columns={CRUMB_COLUMNS}
                  rows={f.crumbs}
                  onChange={(crumbs) => setF((o) => ({ ...o, crumbs }))}
                  newRow={{ name: "", url: "" }}
                  addLabel="Add a level"
                />
              </SeoField>
            )}
          </>
        }
        results={
          <>
            <SeoChecks checks={result.checks} />
            <SeoCodePanel
              text={result.script}
              lang="json"
              label="Paste into <head> or <body>"
              menu={[
                { label: "Copy JSON only", icon: <Braces size={14} />, onSelect: copyJson },
                { label: "Load sample", icon: <RotateCcw size={14} />, onSelect: () => setF((o) => sampleType(o, type)) },
                { label: "Clear this type", icon: <Eraser size={14} />, onSelect: () => setF((o) => clearType(o, type)) },
              ]}
            />
          </>
        }
      />
      <JsonLdGeneratorContent />
    </ToolShell>
  );
}
