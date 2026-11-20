"use client";

import { ToolShell } from "@/components/layout/tool-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { Clipboard, MoreHorizontal, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CaseConverterContent, seoData } from "./content";
import { cases, convertLines, SAMPLE_INPUT, textStats } from "./text-case.lib";

const PRIMARY_COUNT = cases.filter((c) => c.primary).length;
const EXTRA_COUNT = cases.length - PRIMARY_COUNT;

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export function TextCase({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE_INPUT);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // `/` focuses the input — consistent with the other tools. ignoreInEditable
  // so typing a literal "/" inside the textarea still works.
  useShortcut({ key: "/", ignoreInEditable: true, label: "Focus input" }, (e) => {
    e.preventDefault();
    inputRef.current?.focus();
  });

  // "Copied" reverts after a beat.
  useEffect(() => {
    if (!copiedId) return;
    const t = setTimeout(() => setCopiedId(null), 1400);
    return () => clearTimeout(t);
  }, [copiedId]);

  const stats = useMemo(() => textStats(input), [input]);
  const visible = useMemo(() => (showAll ? cases : cases.filter((c) => c.primary)), [showAll]);
  const conversions = useMemo(
    () => visible.map((c) => ({ ...c, output: convertLines(c, input) })),
    [visible, input],
  );

  const onPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInput(text);
    } catch {
      toast.error("Couldn't read clipboard");
    }
  };

  const onCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
    } catch {
      toast.error("Couldn't access clipboard");
    }
  };

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
        <div className="flex min-h-[460px] flex-wrap">
          {/* Input */}
          <div className="flex min-w-0 flex-[1_1_320px] flex-col border-border-subtle max-sm:border-b sm:border-r">
            <div className="flex min-h-[46px] items-center gap-2 border-b border-border-subtle pr-2 pl-4">
              <label htmlFor="cs-in" className="text-[13px] font-bold text-text">
                Text
              </label>
              <span className="text-xs text-text-faint">
                {plural(stats.lines, "line")} · {plural(stats.words, "word")}
              </span>
              <span className="grow" />
              <button
                type="button"
                onClick={() => setInput("")}
                disabled={!input}
                className="min-h-9 cursor-pointer rounded-lg px-2.5 text-xs font-semibold text-text-tertiary transition-colors hover:bg-white/6 hover:text-text disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-tertiary"
              >
                Clear
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="More actions"
                    className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-white/6 hover:text-text data-[state=open]:bg-white/6 data-[state=open]:text-text"
                  >
                    <MoreHorizontal size={16} aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={onPaste}>
                    <Clipboard size={14} aria-hidden />
                    Paste from clipboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setInput(SAMPLE_INPUT)}>
                    <RotateCcw size={14} aria-hidden />
                    Load sample
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <textarea
              id="cs-in"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              placeholder="Type or paste words, one item per line"
              className="m-0 min-h-[220px] grow resize-none border-0 bg-transparent p-4 font-mono text-[12.5px] leading-[1.8] text-text outline-none placeholder:text-placeholder sm:text-[13px]"
            />
          </div>

          {/* Results */}
          <div className="grid min-w-0 flex-[1.6_1_380px] grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] content-start gap-2 p-3">
            {conversions.map((c) => {
              const empty = !c.output.trim();
              const copied = copiedId === c.id;
              return (
                <div key={c.id} className="surface-panel flex min-w-0 flex-col gap-2 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <span className="grow text-xs font-bold text-text-faint">{c.label}</span>
                    <button
                      type="button"
                      aria-label={`Copy ${c.label}`}
                      onClick={() => onCopy(c.id, c.output)}
                      disabled={empty}
                      className={`min-h-8 cursor-pointer rounded-lg border border-border bg-transparent px-2.5 text-xs font-semibold transition-colors hover:bg-white/6 hover:text-text disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent ${copied ? "text-success-text" : "text-text-tertiary"}`}
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre
                    className={`m-0 font-mono text-[13px] leading-[1.6] break-all whitespace-pre-wrap ${empty ? "text-text-ghost" : "text-text"}`}
                  >
                    {empty ? "—" : c.output}
                  </pre>
                </div>
              );
            })}
            {EXTRA_COUNT > 0 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                aria-expanded={showAll}
                className="col-span-full min-h-10 cursor-pointer rounded-xl border border-dashed border-border-strong text-xs font-semibold text-text-tertiary transition-colors hover:bg-white/4 hover:text-text"
              >
                {showAll ? "Show fewer formats" : `Show ${EXTRA_COUNT} more formats`}
              </button>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
          <span className={stats.words ? "text-success" : "text-text-faint"}>
            ● {stats.words ? `${visible.length} formats` : "Waiting for input"}
          </span>
          <span>
            {plural(stats.words, "word")} across {plural(stats.totalLines, "line")}
          </span>
          <span className="grow" />
          <span className="text-success-text">Local-only</span>
        </div>
      </div>
      <CaseConverterContent />
    </ToolShell>
  );
}
