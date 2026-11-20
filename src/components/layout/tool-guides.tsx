"use client";

import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/primitives/dialog";
import type { ToolSeoData } from "@/lib/tool-seo";
import type { Tool } from "@/lib/tools-registry";

type GuideProps = { open: boolean; onOpenChange: (v: boolean) => void };

/**
 * Hand-written guides, loaded only when opened so they never weigh on a
 * tool's first paint. Tools without one get the generic guide below.
 */
const CUSTOM_GUIDES: Record<string, ComponentType<GuideProps>> = {
  "json-formatter": lazy(() =>
    import("@/components/tools/json-formatter/panels/json-formatter-guide").then((m) => ({ default: m.GuideDialog })),
  ),
  base64: lazy(() => import("@/components/tools/base64/components/base64-guide").then((m) => ({ default: m.Base64GuideDialog }))),
};

/** "How to use" dialog for any tool. */
export function ToolGuide({ tool, open, onOpenChange }: { tool: Tool } & GuideProps) {
  const Custom = CUSTOM_GUIDES[tool.slug];
  if (Custom) {
    return open ? (
      <Suspense fallback={null}>
        <Custom open={open} onOpenChange={onOpenChange} />
      </Suspense>
    ) : null;
  }
  return <GenericGuide tool={tool} open={open} onOpenChange={onOpenChange} />;
}

/** Built from the tool's own SEO content: what it's for + the FAQ. */
function GenericGuide({ tool, open, onOpenChange }: { tool: Tool } & GuideProps) {
  const [seo, setSeo] = useState<ToolSeoData | null>(null);
  useEffect(() => {
    if (!open || seo) return;
    let cancelled = false;
    void import("@/lib/tool-seo").then((m) => {
      if (!cancelled) setSeo(m.getToolSeoData(tool.slug) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [open, seo, tool.slug]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-1/2 flex max-h-[min(820px,calc(100dvh-48px))] w-[min(760px,calc(100vw-32px))] -translate-y-1/2 flex-col">
        <DialogHeader className="px-6 pt-6 pr-16 pb-4">
          <DialogTitle className="font-sans text-lg">How to use: {tool.name}</DialogTitle>
          <DialogDescription className="text-sm text-text-tertiary">{seo?.intro ?? tool.description}</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-col gap-7 overflow-y-auto px-6 pb-6">
          {!seo && <p className="m-0 text-sm text-text-faint">Loading…</p>}
          {seo && seo.useCases.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="m-0 text-xs font-bold tracking-wide text-text-faint uppercase">What it&apos;s good for</h3>
              <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-2.5 p-0">
                {seo.useCases.map((u) => (
                  <li key={u.title} className="surface-panel flex flex-col gap-1.5 rounded-xl p-4">
                    <span className="text-sm font-bold text-text">{u.title}</span>
                    <span className="text-[13px] text-text-tertiary">{u.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {seo && seo.faqs.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="m-0 text-xs font-bold tracking-wide text-text-faint uppercase">Questions</h3>
              <dl className="m-0 flex flex-col">
                {seo.faqs.map((f) => (
                  <div key={f.question} className="border-b border-border-subtle py-3 last:border-0">
                    <dt className="text-sm font-semibold text-text">{f.question}</dt>
                    <dd className="m-0 mt-1 text-sm text-text-tertiary">{f.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
