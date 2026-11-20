"use client";

import { Check, Download, FileCode2, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { Tooltip } from "@/components/primitives/tooltip";
import { cn } from "@/lib/cn";
import type { Tool } from "@/lib/tools-registry";
import { MarkdownPreviewContent, seoData } from "./content";
import { Blocks } from "./markdown-blocks";
import {
  highlightHtml,
  htmlDocument,
  inlineToText,
  markdownStats,
  parseMarkdown,
  renderHtml,
  SAMPLE_MARKDOWN,
  type HtmlTokenKind,
} from "./markdown-preview.lib";

type View = "preview" | "html";

const VIEWS: readonly [View, string][] = [
  ["preview", "Preview"],
  ["html", "HTML"],
];

const TOKEN_CLASS: Record<HtmlTokenKind, string> = {
  text: "text-syntax-plain",
  comment: "text-text-faint",
  punct: "text-syntax-punctuation",
  tag: "text-syntax-key",
  attr: "text-syntax-boolean",
  value: "text-syntax-string",
  entity: "text-syntax-number",
};

function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  // Revoke after the download has started; revoking synchronously can cancel it.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function MarkdownPreview({ tool }: { tool: Tool }) {
  const [input, setInput] = useState(SAMPLE_MARKDOWN);
  const [view, setView] = useState<View>("preview");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parsing follows typing at low priority so big documents stay responsive.
  const source = useDeferredValue(input);
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  const html = useMemo(() => renderHtml(blocks), [blocks]);
  const stats = useMemo(() => markdownStats(blocks), [blocks]);
  const htmlLines = useMemo(() => (view === "html" ? highlightHtml(html) : []), [view, html]);

  const hasInput = input.trim().length > 0;
  const statsText = `${stats.words.toLocaleString("en")} ${stats.words === 1 ? "word" : "words"} · ${stats.readMinutes} min read`;

  const copyHtml = async () => {
    if (!html) return;
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
      toast.success("HTML copied");
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  };

  const docTitle = () => {
    const h = blocks.find((b) => b.kind === "heading");
    return h && h.kind === "heading" ? inlineToText(h.inline) || "Document" : "Document";
  };

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px] md:flex md:h-[max(var(--ws-min,580px),calc(100dvh-var(--chrome-top,165px)-24px))] md:flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border-subtle bg-toolbar p-3">
          <div role="group" aria-label="Output view" className="flex gap-0.5 rounded-[11px] border border-border-subtle bg-[#0d0d0c] p-[3px]">
            {VIEWS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => setView(id)}
                className={cn(
                  "min-h-10 rounded-lg px-4 text-[13px] font-semibold transition-colors",
                  view === id ? "bg-selected text-text shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "text-text-tertiary hover:text-text",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="grow" />
          <span className="hidden text-xs text-text-faint sm:inline" aria-live="polite">
            {statsText}
          </span>
          <DropdownMenu>
            <Tooltip content="More" side="bottom">
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More actions"
                  className="flex size-10 items-center justify-center rounded-[9px] text-text-tertiary transition-colors hover:bg-white/6 hover:text-text"
                >
                  <MoreHorizontal size={16} aria-hidden />
                </button>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuItem disabled={!html} onSelect={() => download(htmlDocument(html, docTitle()), "document.html", "text/html")}>
                <FileCode2 size={14} aria-hidden /> Download .html
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!hasInput} onSelect={() => download(input, "document.md", "text/markdown")}>
                <Download size={14} aria-hidden /> Download .md
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setInput(SAMPLE_MARKDOWN)}>
                <RotateCcw size={14} aria-hidden /> Load sample
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!input} onSelect={() => setInput("")}>
                <Trash2 size={14} aria-hidden /> Clear
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={() => void copyHtml()}
            disabled={!html}
            className="btn-action inline-flex min-h-10 items-center gap-1.5 rounded-[9px] px-3.5 text-[13px] font-bold disabled:opacity-40"
          >
            {copied && <Check size={14} aria-hidden />}
            {copied ? "Copied" : "Copy"} HTML
          </button>
        </div>

        {/* Panes */}
        {/* Desktop: no wrap, so both panes take the window height and scroll inside. */}
        <div className="flex min-h-[480px] flex-wrap md:min-h-0 md:flex-1 md:flex-nowrap md:[&>*]:min-h-0 md:[&>*]:overflow-hidden">
          <div className="flex min-w-0 flex-[1_1_340px] flex-col border-r border-border-subtle">
            <label htmlFor="md-in" className="flex min-h-11 items-center border-b border-border-subtle px-4 text-[13px] font-bold">
              Markdown
            </label>
            <textarea
              id="md-in"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              placeholder="# Start typing Markdown…"
              className="m-0 min-h-[360px] grow resize-none border-0 md:min-h-0 bg-transparent p-4 font-mono text-[12.5px] leading-[1.75] text-syntax-plain outline-none placeholder:text-placeholder sm:text-[13px]"
            />
          </div>
          <div className="flex min-w-0 flex-[1_1_340px] flex-col">
            <div className="flex min-h-11 items-center border-b border-border-subtle px-4 text-[13px] font-bold">
              {view === "preview" ? "Preview" : "HTML"}
            </div>
            {view === "preview" ? (
              <article className="md-render flex flex-col gap-3 px-[22px] py-5 md:min-h-0 md:flex-1 md:overflow-y-auto text-[15px] leading-[1.65] break-words text-text-key">
                {blocks.length > 0 ? <Blocks blocks={blocks} /> : <p className="m-0 text-text-faint">Nothing to preview yet.</p>}
              </article>
            ) : (
              <div className="py-3.5 font-mono text-[12.5px] leading-[1.75] sm:text-[13px] md:min-h-0 md:flex-1 md:overflow-y-auto">
                {htmlLines.length === 0 || !html ? (
                  <p className="m-0 px-4 font-sans text-[13px] text-text-faint">No HTML yet.</p>
                ) : (
                  htmlLines.map((tokens, i) => (
                    <div key={i} className="flex">
                      <span aria-hidden className="w-[30px] shrink-0 pr-3 text-right text-text-ghost select-none sm:w-10">
                        {i + 1}
                      </span>
                      <span className="min-w-0 pr-3.5 break-words whitespace-pre-wrap">
                        {tokens.map((t, k) => (
                          <span key={k} className={TOKEN_CLASS[t.k]}>
                            {t.v}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-toolbar px-4 py-[9px] font-mono text-xs text-text-faint">
          {hasInput ? <span className="text-success">● Rendered</span> : <span>● Waiting for input</span>}
          {hasInput && (
            <span>
              {stats.blocks} {stats.blocks === 1 ? "block" : "blocks"} · {stats.words.toLocaleString("en")} {stats.words === 1 ? "word" : "words"}
            </span>
          )}
          <span className="grow" />
          <span className="text-success-text">Local-only</span>
        </div>
      </div>

      <MarkdownPreviewContent />
    </ToolShell>
  );
}
