"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools-registry";
import { seoData, WordCounterContent } from "./content";
import { analyzeText, formatDuration, SAMPLE_TEXT, type LimitCheck } from "./word-counter.lib";

const TONE_TEXT: Record<LimitCheck["tone"], string> = {
  ok: "text-success",
  near: "text-warning",
  over: "text-error",
};
const TONE_BG: Record<LimitCheck["tone"], string> = {
  ok: "bg-success",
  near: "bg-warning",
  over: "bg-error",
};

const fmt = (n: number) => n.toLocaleString("en");

export function WordCounter({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE_TEXT);
  // Counting follows typing at low priority so long documents stay smooth.
  const text = useDeferredValue(input);
  const stats = useMemo(() => analyzeText(text), [text]);

  const tiles: [string, string][] = [
    ["Words", fmt(stats.words)],
    ["Characters", fmt(stats.characters)],
    ["No spaces", fmt(stats.charactersNoSpaces)],
    ["Sentences", fmt(stats.sentences)],
    ["Paragraphs", fmt(stats.paragraphs)],
    ["Reading time", formatDuration(stats.readSeconds)],
  ];

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
        {/* Stat tiles */}
        <div
          aria-live="polite"
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,130px),1fr))] gap-2 border-b border-border-subtle bg-toolbar p-3"
        >
          {tiles.map(([k, v]) => (
            <div key={k} className="surface-panel flex flex-col gap-0.5 rounded-xl px-3.5 py-3">
              <span className="text-2xl font-bold tracking-[-0.02em] tabular-nums">{v}</span>
              <span className="text-xs text-text-faint">{k}</span>
            </div>
          ))}
        </div>

        <div className="flex min-h-[440px] flex-wrap">
          {/* Text */}
          <div className="flex min-w-0 flex-[1.4_1_360px] flex-col border-r border-border-subtle">
            <div className="flex min-h-11 items-center gap-2 border-b border-border-subtle pr-2 pl-4">
              <label htmlFor="wc-in" className="text-[13px] font-bold">
                Text
              </label>
              <span className="grow" />
              <button
                type="button"
                onClick={() => setInput("")}
                disabled={!input}
                className="min-h-9 rounded-lg px-2.5 text-xs font-semibold text-text-tertiary transition-colors hover:bg-white/6 hover:text-text disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Clear
              </button>
            </div>
            <textarea
              id="wc-in"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or paste your text…"
              className="m-0 min-h-[320px] grow resize-none border-0 bg-transparent p-4 text-[15px] leading-[1.7] text-text outline-none placeholder:text-placeholder"
            />
          </div>

          {/* Limits + keywords */}
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 p-3.5">
            <div className="flex flex-col gap-2.5">
              <div className="text-xs text-text-faint">Fits in…</div>
              {stats.limits.map((l) => (
                <div key={l.label} className="flex flex-col gap-[5px]">
                  <div className="flex text-[13px]">
                    <span className="grow">{l.label}</span>
                    <span className={cn("font-mono text-xs", TONE_TEXT[l.tone])}>
                      {fmt(l.count)} / {fmt(l.max)}
                      {l.tone === "over" && <span className="sr-only"> (over the limit)</span>}
                    </span>
                  </div>
                  <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-white/6">
                    <div className={cn("h-full rounded-full", TONE_BG[l.tone])} style={{ width: `${l.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="text-xs text-text-faint">Top keywords</div>
              {stats.keywords.length === 0 ? (
                <p className="m-0 text-[13px] text-text-faint">Keywords appear once there are a few longer words.</p>
              ) : (
                stats.keywords.map((k) => (
                  <div key={k.word} className="flex items-center gap-2.5 text-[13px]">
                    <span className="shrink-0 basis-24 font-semibold break-all">{k.word}</span>
                    <span aria-hidden className="h-1.5 grow overflow-hidden rounded-full bg-white/6">
                      <span className="block h-full rounded-full bg-cat-teal" style={{ width: `${k.pct}%` }} />
                    </span>
                    <span className="shrink-0 basis-16 text-right font-mono text-xs text-text-faint">
                      {k.count} · {k.density.toFixed(1)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
          {stats.words > 0 ? (
            <span className="text-success">
              ● {fmt(stats.words)} {stats.words === 1 ? "word" : "words"}
            </span>
          ) : (
            <span>● Waiting for input</span>
          )}
          <span>
            {fmt(stats.characters)} characters · speaking time {formatDuration(stats.speakSeconds)}
          </span>
          <span className="grow" />
          <span className="text-success-text">Local-only</span>
        </div>
      </div>

      <WordCounterContent />
    </ToolShell>
  );
}
