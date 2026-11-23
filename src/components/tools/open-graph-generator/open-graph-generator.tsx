"use client";

import { Eraser, ImageUp, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  type ImageProbe,
  type OgFields,
} from "./open-graph-generator.lib";
import { OpenGraphGeneratorContent, seoData } from "./content";
import { allTitles, metaContent } from "../seo-shared/page-meta.lib";
import { SeoLoadUrl, type LoadedPage } from "../seo-shared";
import { isAbsUrl } from "../seo-shared/seo.lib";

export function OpenGraphGenerator({ tool }: { tool: Tool }) {
  const [f, setF] = useState<OgFields>(SAMPLE_OG);
  const set = <K extends keyof OgFields>(k: K) => (v: OgFields[K]) => setF((o) => ({ ...o, [k]: v }));
  // A local file previews the card without touching the tags.
  const [local, setLocal] = useState<{ url: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => {
    if (local) URL.revokeObjectURL(local.url);
  }, [local]);
  const shown = local?.url ?? f.image.trim();
  // What loading `shown` found; anything recorded for another URL is stale.
  const [probe, setProbe] = useState<{ src: string; probe: ImageProbe } | null>(null);
  let current: ImageProbe | null = null;
  if (shown) current = probe?.src === shown ? probe.probe : { state: "loading" };
  // Only the real og:image URL's size belongs in the tags and checks.
  const tagProbe = local ? null : current;
  const result = useMemo(() => buildOg(f, tagProbe), [f, tagProbe]);
  const tLen = charCount(f.title.trim());
  const dLen = charCount(f.desc.trim());

  const large = f.card === "summary_large_image";
  const imageLabel = "Image URL";
  const imageHint = large
    ? "1200 × 630 (1.91:1) looks sharp everywhere. The preview loads it and checks its real size."
    : "Small cards crop to a square; use at least 144 × 144. The preview loads it and checks its real size.";

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <SeoWorkspace
        top={
          <SeoLoadUrl
            label="Load a page's tags"
            onLoad={(p: LoadedPage) => {
              const html = p.page.body;
              const m = (k: string) => metaContent(html, k) ?? "";
              const img = m("og:image") || m("og:image:url") || m("twitter:image");
              const type = OG_TYPES.find((t) => t.value === m("og:type"))?.value ?? "website";
              const card = OG_CARDS.find((c) => c.value === m("twitter:card"))?.value ?? "summary_large_image";
              setLocal(null);
              setF({
                title: m("og:title") || (allTitles(html)[0] ?? ""),
                desc: m("og:description") || m("description"),
                url: m("og:url") || p.page.finalUrl,
                // Relative images are resolved so the preview can load them; the checks still flag them.
                image: img && !isAbsUrl(img) ? new URL(img, p.page.finalUrl).href : img,
                alt: m("og:image:alt") || m("twitter:image:alt"),
                site: m("og:site_name"),
                type,
                card,
                handle: m("twitter:site"),
              });
              const found = ["og:title", "og:description", "og:image"].filter((k) => m(k)).length;
              return found ? `Loaded ${found} of 3 Open Graph essentials from ${new URL(p.page.finalUrl).hostname}.` : "That page has no Open Graph tags — the fields show what platforms would fall back to.";
            }}
          />
        }
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
            <SeoField
              label={imageLabel}
              hint={
                local ? (
                  <span className="flex flex-wrap items-center gap-x-2">
                    Previewing <span className="font-mono">{local.name}</span> from your device — the tags still use the URL.
                    <button type="button" onClick={() => setLocal(null)} className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-text-strong underline">
                      <X size={12} aria-hidden /> Stop
                    </button>
                  </span>
                ) : (
                  imageHint
                )
              }
            >
              <SeoTextInput
                label={imageLabel}
                value={f.image}
                onChange={set("image")}
                placeholder="https://example.com/og.png"
                mono
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) setLocal({ url: URL.createObjectURL(file), name: file.name });
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex min-h-8 w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-white/12 bg-transparent px-2.5 text-[12.5px] text-text-strong hover:border-white/25 max-sm:min-h-11"
              >
                <ImageUp size={14} aria-hidden />
                Preview a local image
              </button>
            </SeoField>
            <SeoField label="Image alt text" hint="What the image shows, for screen readers. X shows it too.">
              <SeoTextInput label="Image alt text" value={f.alt} onChange={set("alt")} placeholder="Describe the image" />
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
            <SeoSocialCards
              {...result.preview}
              imgLabel={local ? `${local.name} · ${current?.state === "ok" ? `${current.w}×${current.h}` : ""}` : result.preview.imgLabel}
              image={shown || undefined}
              status={current ? current.state : "none"}
              onProbe={(src, p) =>
                // Reports repeat (load event, and the cached-image check on
                // every render); keep the same state when nothing changed.
                setProbe((old) => (old?.src === src && JSON.stringify(old.probe) === JSON.stringify(p) ? old : { src, probe: p }))
              }
            />
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
