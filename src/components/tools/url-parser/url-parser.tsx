"use client";

import { Check, Copy } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools-registry";
import { seoData, UrlParserContent } from "./content";
import { parseUrl, removeParam, SAMPLE_URL, stripTracking, type PartKind } from "./url-parser.lib";

/** Same colour per part in the coloured URL, the swatches and the rows. */
const KIND_TEXT: Record<PartKind, string> = {
  scheme: "text-syntax-boolean",
  user: "text-cat-rose",
  host: "text-syntax-key",
  port: "text-syntax-number",
  path: "text-text",
  query: "text-syntax-string",
  hash: "text-clay-light",
  meta: "text-text-faint",
};
const KIND_BG: Record<PartKind, string> = {
  scheme: "bg-syntax-boolean",
  user: "bg-cat-rose",
  host: "bg-syntax-key",
  port: "bg-syntax-number",
  path: "bg-text",
  query: "bg-syntax-string",
  hash: "bg-clay-light",
  meta: "bg-text-faint",
};

export function UrlParser({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE_URL);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const result = useMemo(() => parseUrl(input), [input]);

  const invalid = !result.ok && result.reason === "invalid";
  const params = result.ok ? result.params : [];
  const trackingCount = params.filter((p) => p.tracking).length;

  const copyUrl = async () => {
    if (!result.ok) return;
    try {
      await navigator.clipboard.writeText(result.url.href);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
      toast.success("URL copied");
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  };

  const onStrip = () => {
    if (!result.ok) return;
    setInput(stripTracking(result.url.href));
    toast.success(`Removed ${trackingCount} tracking ${trackingCount === 1 ? "parameter" : "parameters"}`);
  };

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
        {/* Input + coloured URL */}
        <div className="border-b border-border-subtle bg-toolbar p-3.5">
          <div
            className={cn(
              "flex min-h-[52px] items-center gap-2 rounded-xl border bg-[#0d0d0c] pr-1.5 pl-3.5 transition-colors",
              invalid ? "border-error-border" : "border-white/10 focus-within:border-clay-light/50",
            )}
          >
            <label htmlFor="up-in" className="sr-only">
              URL
            </label>
            <input
              id="up-in"
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              placeholder="https://example.com/path?query=value#hash"
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? "up-err" : undefined}
              className="min-w-0 grow border-0 bg-transparent font-mono text-sm text-text outline-none placeholder:text-placeholder"
            />
            <button
              type="button"
              onClick={() => void copyUrl()}
              disabled={!result.ok}
              aria-label="Copy URL"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-[9px] text-text-tertiary transition-colors hover:bg-white/6 hover:text-text disabled:opacity-40 disabled:hover:bg-transparent"
            >
              {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
            </button>
          </div>
          {input.trim() && (
            <div className="mt-2.5 font-mono text-[13px] leading-[1.8] break-all">
              {result.ok ? (
                result.segments.map((s, i) => (
                  <span key={i} className={KIND_TEXT[s.kind]}>
                    {s.text}
                  </span>
                ))
              ) : (
                <span className="text-text-faint">{input}</span>
              )}
            </div>
          )}
        </div>

        {invalid && (
          <div id="up-err" role="alert" className="bg-error-bg px-4 py-3 text-[13px] text-error-text">
            That isn&apos;t a full URL yet. Include the scheme, like https://
          </div>
        )}

        <div className="flex min-h-[380px] flex-wrap">
          {/* Parts */}
          <div className="min-w-0 flex-[1_1_340px] border-r border-border-subtle p-2">
            {result.ok ? (
              <dl className="m-0">
                {result.parts.map((p) => (
                  <div key={p.label} className="flex min-h-[50px] items-center gap-3 border-b border-white/5 py-1 pr-2 pl-2.5">
                    <dt className="flex shrink-0 basis-[102px] items-center gap-3 text-xs font-bold text-text-faint">
                      <span aria-hidden className={cn("size-2 shrink-0 rounded-[2px]", KIND_BG[p.kind])} />
                      {p.label}
                    </dt>
                    <dd className={cn("m-0 min-w-0 grow font-mono text-[13px] break-all", p.empty ? "text-text-ghost" : "text-text")}>{p.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="m-0 px-2.5 py-3 text-[13px] text-text-faint">
                {invalid ? "Parts appear once the URL parses." : "Paste a URL to see its parts."}
              </p>
            )}
          </div>

          {/* Query parameters */}
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2 p-3.5">
            <div className="flex items-baseline">
              <span className="grow text-[13px] font-bold">Query parameters</span>
              <span className="text-xs text-text-faint">
                {params.length} {params.length === 1 ? "parameter" : "parameters"}
              </span>
            </div>
            {params.map((q, i) => (
              <div key={`${i}-${q.key}`} className="surface-panel flex items-center gap-2.5 rounded-[11px] py-2.5 pr-2 pl-3">
                <span className="flex min-w-0 grow flex-col">
                  <span className="font-mono text-[13px] break-all text-syntax-key">{q.key}</span>
                  <span className={cn("font-mono text-[13px] break-all", q.value === "" ? "text-text-faint" : "text-syntax-string")}>
                    {q.value === "" ? "(empty)" : q.value}
                  </span>
                </span>
                {q.tracking && (
                  <span className="shrink-0 rounded-md bg-accent-soft px-[7px] py-0.5 text-[11px] font-bold text-tier-pro-text">tracking</span>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${q.key}`}
                  onClick={() => result.ok && setInput(removeParam(result.url.href, i))}
                  className="size-10 shrink-0 rounded-[9px] border border-border bg-transparent text-base text-text-tertiary transition-colors hover:bg-white/6 hover:text-text"
                >
                  ×
                </button>
              </div>
            ))}
            {result.ok && params.length === 0 && <p className="mx-0.5 my-1 text-[13px] text-text-faint">No query string.</p>}
            {trackingCount > 0 && (
              <button
                type="button"
                onClick={onStrip}
                className="min-h-11 rounded-[10px] border border-clay-light/40 bg-clay-light/8 text-[13px] font-bold text-clay-cream transition-colors hover:bg-clay-light/14"
              >
                Remove tracking parameters
              </button>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
          {result.ok ? (
            <>
              <span className="text-success">● Valid URL</span>
              <span>
                {result.url.hostname || result.url.protocol.replace(/:$/, "")} · {params.length} {params.length === 1 ? "param" : "params"}
              </span>
            </>
          ) : invalid ? (
            <span className="text-error">● Not a full URL</span>
          ) : (
            <span>● Waiting for input</span>
          )}
          <span className="grow" />
          <span className="text-success-text">Local-only</span>
        </div>
      </div>

      <UrlParserContent />
    </ToolShell>
  );
}
