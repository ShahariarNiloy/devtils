"use client";

import { ArrowRight, Globe, Loader2, ScanSearch, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import { ToolContent } from "@/components/shared/tool-content";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools-registry";
import { imageChecks, type ImageProbe } from "../open-graph-generator/open-graph-generator.lib";
import { useTextMeasure } from "../seo-shared/measure";
import type { AssetInfo } from "@/lib/seo-fetch/asset-types";
import { inspectAssets } from "../seo-shared/load-page";
import { loadPage, SeoChecks, SeoSegmented, SeoSerpCard, SeoSocialCards } from "../seo-shared";
import { countChecks, type Check } from "../seo-shared/seo.lib";
import { seoData } from "./content";
import { useImageProbes } from "../seo-shared/use-image-probes";
import { assetChecks, auditPage, iconChecks, type PageInput, type Report, type SectionId } from "./seo-checker.lib";

type Mode = "url" | "paste";

/** Where to fix what a section reports. */
const FIX: Partial<Record<SectionId, { slug: string; label: string }>> = {
  indexing: { slug: "canonical-generator", label: "Canonical generator" },
  search: { slug: "meta-preview", label: "Meta preview" },
  social: { slug: "open-graph-generator", label: "Open Graph generator" },
  hreflang: { slug: "hreflang-generator", label: "Hreflang generator" },
  data: { slug: "json-ld-generator", label: "JSON-LD generator" },
};

const EXAMPLES = ["www.utilyx.dev", "example.com", "github.com"];

const FIELD = "min-h-11 rounded-[10px] border border-white/10 bg-[#0d0d0c] px-3 text-[14px] text-[#f0ece2] outline-none placeholder:text-placeholder focus-visible:border-border-strong";

function worst(checks: readonly Check[]): "err" | "warn" | "ok" | "info" {
  if (checks.some((c) => c.level === "err")) return "err";
  if (checks.some((c) => c.level === "warn")) return "warn";
  if (checks.some((c) => c.level === "ok")) return "ok";
  return "info";
}
const DOT = { err: "bg-[#e0795f]", warn: "bg-[#e0a072]", ok: "bg-success", info: "bg-text-faint" } as const;

export function SeoChecker({ tool }: { tool: Tool }) {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState<(PageInput & { ms?: number; requested?: string }) | null>(null);
  const [probe, setProbe] = useState<{ src: string; probe: ImageProbe } | null>(null);
  const measure = useTextMeasure();

  const report: Report | null = useMemo(() => (input ? auditPage(input, measure) : null), [input, measure]);

  // The share image is loaded by the preview; its real size feeds the Sharing checks.
  const image = report?.social.image ?? "";
  let current: ImageProbe | null = null;
  if (image) current = probe?.src === image ? probe.probe : { state: "loading" };
  // Every favicon candidate is loaded; the first that works is the one Google shows.
  const iconUrls = useMemo(() => report?.icons.map((c) => c.href) ?? [], [report]);
  const iconProbes = useImageProbes(iconUrls);
  const favicon = report?.icons.find((c) => iconProbes[c.href]?.state === "ok")?.href;

  // Server-side crawler view of the share image and favicons (fetched pages only).
  const assetUrls = useMemo(() => {
    if (!report || input?.status === undefined) return [];
    const share = /^https?:/i.test(report.social.image) ? [report.social.image] : [];
    const icons = report.icons.map((c) => c.href).filter((h) => /^https?:/i.test(h));
    return [...new Set([...share, ...icons])].slice(0, 4);
  }, [report, input?.status]);
  const [assets, setAssets] = useState<{ key: string; list: AssetInfo[] } | null>(null);
  const assetKey = assetUrls.join("\n");
  useEffect(() => {
    if (!assetKey) return;
    let live = true;
    void inspectAssets(assetKey.split("\n")).then((list) => {
      if (live) setAssets({ key: assetKey, list });
    });
    return () => {
      live = false;
    };
  }, [assetKey]);
  const assetFor = (href: string | undefined) => (href && assets?.key === assetKey ? assets.list.find((a) => a.url === href) : undefined);
  const shareAsset = assetFor(report?.social.image);
  const faviconAsset = assetFor(favicon);
  const hasUrl = Boolean(input?.url);
  // Cheap to rebuild, and the probes object is new each render, so no memo.
  const sections = !report
    ? []
    : report.sections.map((s) => {
        if (s.id === "social") {
          const extra = [...(current ? imageChecks(current, report.social.large) : []), ...(shareAsset ? assetChecks("share", shareAsset) : [])];
          return { ...s, checks: [...s.checks, ...extra] };
        }
        if (s.id === "search") return { ...s, checks: [...s.checks, ...iconChecks(report.icons, iconProbes, hasUrl), ...(faviconAsset ? assetChecks("favicon", faviconAsset) : [])] };
        return s;
      });
  const all = sections.flatMap((s) => s.checks);
  const counts = countChecks(all);

  const run = async (target: string) => {
    if (!target.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const { page, robots } = await loadPage(target);
      if (!page.body && page.status < 400) throw new Error(`That address isn't a web page (${page.contentType || "unknown type"}).`);
      setInput({
        url: page.finalUrl,
        html: page.body,
        status: page.status,
        hops: page.hops,
        headers: page.headers,
        robotsTxt: robots && robots.status === 200 ? robots.text : null,
        truncated: page.truncated,
        ms: page.ms,
        requested: target,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The page couldn't be checked.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "url") void run(url);
    else if (source.trim()) {
      setError("");
      setInput({ url: url.trim(), html: source });
    }
  };

  const fetched = input?.status !== undefined;

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div id="tool" className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
        {/* input */}
        <form onSubmit={submit} className="flex flex-col gap-3 border-b border-border-subtle bg-toolbar p-4">
          <div className="flex flex-wrap items-center gap-3">
            <SeoSegmented
              label="What to check"
              value={mode}
              onChange={setMode}
              options={[
                { id: "url", label: "Live URL" },
                { id: "paste", label: "Paste source" },
              ]}
            />
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-text-faint">
              <ShieldCheck size={14} aria-hidden className="text-success-text" />
              {mode === "url"
                ? "Our server fetches the page like a search engine would. Only the URL is sent; nothing is stored."
                : "Nothing leaves your browser — for staging and private pages."}
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <label className="relative flex min-w-0 grow basis-[320px] items-center">
              <Globe size={16} aria-hidden className="pointer-events-none absolute left-3 text-text-faint" />
              <span className="sr-only">{mode === "url" ? "Page URL" : "Page URL (optional)"}</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={mode === "url" ? "example.com/page" : "Page URL (optional, enables canonical and hreflang checks)"}
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                className={cn(FIELD, "w-full pl-9 font-mono text-[13.5px]")}
              />
            </label>
            <button
              type="submit"
              disabled={busy || (mode === "url" ? !url.trim() : !source.trim())}
              className="btn-action inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-5 text-[14px] font-bold disabled:cursor-default disabled:opacity-40"
            >
              {busy ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <ScanSearch size={15} aria-hidden />}
              {busy ? "Checking…" : "Check page"}
            </button>
          </div>
          {mode === "paste" && (
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Paste the page's HTML — View Source (Ctrl+U / ⌥⌘U), select all, copy."
              aria-label="Page source"
              spellCheck={false}
              className={cn(FIELD, "min-h-[140px] resize-y py-2.5 font-mono text-[12.5px] leading-[1.6]")}
            />
          )}
        </form>

        <div className="p-4">
          {error && (
            <div role="alert" className="mb-4 rounded-[10px] border border-[rgba(224,121,95,.3)] bg-[rgba(224,121,95,.1)] px-3.5 py-2.5 text-[13.5px] text-[#f0a892]">
              {error}
            </div>
          )}

          {!report && !busy && (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
              <ScanSearch size={30} aria-hidden className="text-cat-teal" />
              <p className="m-0 max-w-[460px] text-[15px] text-text-tertiary">
                Enter any public page to see whether search engines can index it, how it looks in Google and when shared, and what to fix.
              </p>
              {mode === "url" && (
                <div className="flex flex-wrap justify-center gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => {
                        setUrl(ex);
                        void run(ex);
                      }}
                      className="min-h-8 cursor-pointer rounded-full border border-white/12 bg-transparent px-3 font-mono text-[12.5px] text-text-strong hover:border-white/25"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {busy && !report && (
            <div className="flex min-h-[280px] items-center justify-center gap-2.5 text-[14px] text-text-tertiary">
              <Loader2 size={18} aria-hidden className="animate-spin" /> Fetching the page and its robots.txt…
            </div>
          )}

          {report && (
            <div className={cn("flex flex-col gap-4 transition-opacity", busy && "opacity-50")}>
              {/* verdict */}
              <div
                className={cn(
                  "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3.5",
                  report.indexable === false ? "border-[rgba(224,121,95,.35)] bg-[rgba(224,121,95,.08)]" : "border-white/8 bg-[#141413]",
                )}
              >
                <div className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="text-[16px] font-bold">
                    {report.indexable === true && "✓ Search engines can index this page"}
                    {report.indexable === false && `✕ Not indexable — ${report.blockers.join(", ")}`}
                    {report.indexable === null && "Checked from pasted source"}
                  </span>
                  <span className="min-w-0 truncate font-mono text-[12px] text-text-faint">
                    {input?.url || "No URL given"}
                    {fetched && input?.ms !== undefined && ` · ${input.status} · ${input.ms} ms`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                  {counts.err > 0 && <span className="rounded-full bg-[rgba(224,121,95,.15)] px-2.5 py-1 text-[#f0a892]">{counts.err} to fix</span>}
                  {counts.warn > 0 && <span className="rounded-full bg-[rgba(224,160,114,.14)] px-2.5 py-1 text-clay-light">{counts.warn} to improve</span>}
                  <span className="rounded-full bg-[rgba(169,206,146,.12)] px-2.5 py-1 text-success-text">{counts.ok} passed</span>
                </div>
              </div>

              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                {/* previews */}
                <div className="flex flex-col gap-4 lg:sticky lg:top-4">
                  <section aria-label="Google result preview" className="flex flex-col gap-2.5 rounded-xl border border-white/8 bg-[#141413] py-3.5">
                    <span className="px-3.5 text-[13px] font-bold">In Google</span>
                    <div className="overflow-x-auto px-3.5">
                      <SeoSerpCard {...report.serp} icon={favicon} />
                    </div>
                  </section>
                  <section aria-label="Share preview" className="flex flex-col rounded-xl border border-white/8 bg-[#141413] pt-3.5 pb-3.5">
                    <span className="px-3.5 text-[13px] font-bold">When shared</span>
                    <SeoSocialCards
                      imgLabel={current?.state === "ok" ? `og:image · ${current.w}×${current.h}` : "og:image"}
                      domain={report.social.domain || "example.com"}
                      title={report.social.title || "No title"}
                      titleShort={report.social.title || "No title"}
                      desc={report.social.desc || "No description"}
                      image={image || undefined}
                      large={report.social.large}
                      status={current ? current.state : "none"}
                      onProbe={(src, p) => setProbe((old) => (old?.src === src && JSON.stringify(old.probe) === JSON.stringify(p) ? old : { src, probe: p }))}
                    />
                  </section>
                </div>

                {/* sections */}
                <div className="flex flex-col gap-3">
                  {sections.map((s) => {
                    const level = worst(s.checks);
                    const fix = FIX[s.id];
                    const shouldFix = fix && (level === "err" || level === "warn");
                    return (
                      <section key={s.id} aria-labelledby={`seo-sec-${s.id}`} className="overflow-hidden rounded-xl border border-white/8 bg-[#141413]">
                        <div className="flex items-center gap-2.5 px-3.5 pt-3">
                          <span aria-hidden="true" className={cn("size-2 rounded-full", DOT[level])} />
                          <h2 id={`seo-sec-${s.id}`} className="m-0 grow text-[14px]">
                            {s.title}
                          </h2>
                          {shouldFix && (
                            <Link href={`/tools/${fix.slug}`} className="inline-flex items-center gap-1 text-[12.5px] text-text-tertiary hover:text-text">
                              Fix it in {fix.label} <ArrowRight size={13} aria-hidden />
                            </Link>
                          )}
                        </div>
                        <SeoChecks checks={s.checks} />
                        {s.id === "data" && report.jsonLd.length > 0 && (
                          <details className="mx-3.5 mb-3">
                            <summary className="cursor-pointer text-[12.5px] text-text-tertiary hover:text-text">Show the JSON-LD ({report.jsonLd.length})</summary>
                            {report.jsonLd.map((b, i) => (
                              // Blocks are positional; their text may repeat.
                              // eslint-disable-next-line react/no-array-index-key
                              <pre key={i} className="mt-2 max-h-64 overflow-auto rounded-lg bg-[#0d0d0c] p-3 font-mono text-[12px] leading-[1.6] whitespace-pre-wrap text-text-key">
                                {b.text}
                              </pre>
                            ))}
                          </details>
                        )}
                        {s.id === "hreflang" && report.hreflang && report.hreflang.rows.length > 0 && (
                          <ul className="m-0 mx-3.5 mb-3 flex list-none flex-col gap-1 p-0">
                            {report.hreflang.rows.map((r) => (
                              <li key={`${r.a}${r.b}`} className="flex gap-2 font-mono text-[12px]">
                                <span className={cn("w-16 shrink-0", r.level === "ok" ? "text-success-text" : "text-[#f0a892]")}>{r.a}</span>
                                <span className="min-w-0 truncate text-text-tertiary">{r.b}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ToolContent {...seoData} />
    </ToolShell>
  );
}
