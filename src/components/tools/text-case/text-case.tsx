"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Clipboard, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { useShortcut } from "@/lib/keyboard";
import { cases } from "./text-case.lib";
import type { Tool } from "@/lib/tools-registry";

export function TextCase({ tool }: { tool: Tool }) {
  const [input, setInput] = useState("Hello world from devtils");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // `/` focuses the input — consistent with the other tools. ignoreInEditable
  // so typing a literal "/" inside the textarea still works.
  useShortcut({ key: "/", ignoreInEditable: true }, (e) => {
    e.preventDefault();
    inputRef.current?.focus();
  });

  const conversions = useMemo(
    () => cases.map((c) => ({ ...c, output: c.convert(input) })),
    [input],
  );

  const wordCount = useMemo(
    () => input.split(/\s+/).filter(Boolean).length,
    [input],
  );
  const lineCount = useMemo(
    () => (input ? input.split(/\r\n|\r|\n/).length : 0),
    [input],
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
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      toast.success(`Copied ${cases.find((c) => c.id === id)?.label}`);
      setTimeout(
        () => setCopiedId((prev) => (prev === id ? null : prev)),
        1300,
      );
    } catch {
      toast.error("Couldn't access clipboard");
    }
  };

  return (
    <ToolShell tool={tool} classNames={{ header: "hidden md:block" }}>
      {/* Mobile title bar — replaces the hidden ToolShell hero on phones,
          matching the other tools' header treatment. */}
      <header className="sticky top-0 z-30 -mx-0 mb-3 flex h-12 items-center gap-1 border-b border-border bg-bg/95 px-1 backdrop-blur md:hidden">
        <Link
          href="/tools"
          aria-label="Back to tools"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-soft hover:text-text"
        >
          <ChevronLeft size={20} aria-hidden />
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
          <span className="truncate text-base font-semibold text-text">
            {tool.name}
          </span>
          <span className="rounded-sm bg-tier-free-bg px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-wider text-tier-free-text">
            {tool.tier}
          </span>
        </div>
        <span aria-hidden className="h-10 w-10 shrink-0" />
      </header>

      <div className="flex flex-col gap-3">
        {/* Input card */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          <div className="flex h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-subtle px-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-text-faint">
              Input
            </span>
            <span className="font-mono text-sm text-text-faint">
              {input.length} chars · {wordCount} words · {lineCount} lines
            </span>
            <div className="ml-auto flex items-center gap-0.5">
              <button
                type="button"
                onClick={onPaste}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-text-faint transition-colors hover:bg-surface-soft hover:text-text cursor-pointer"
              >
                <Clipboard size={14} aria-hidden />
                Paste
              </button>
              <button
                type="button"
                onClick={() => setInput("")}
                disabled={!input}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-text-faint transition-colors hover:bg-surface-soft hover:text-danger disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-faint cursor-pointer"
              >
                <Trash2 size={14} aria-hidden />
                Clear
              </button>
            </div>
          </div>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Type or paste any text — every case updates live."
            aria-label="Text to convert"
            className="min-h-[96px] w-full resize-y border-0 bg-transparent px-3 py-3 font-sans text-base leading-relaxed text-text outline-none placeholder:text-text-faint sm:min-h-[120px]"
          />
        </div>

        {/* Results — tap a card to copy. Works on touch (no hover needed). */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {conversions.map((c) => {
            const copied = copiedId === c.id;
            const empty = !c.output;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onCopy(c.id, c.output)}
                disabled={empty}
                aria-label={`Copy ${c.label}`}
                className="group flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 text-left shadow-card transition-colors hover:border-border-strong/60 hover:bg-surface-soft/30 disabled:cursor-default disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-surface cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium uppercase tracking-wider text-text-faint">
                    {c.label}
                  </span>
                  <span
                    aria-hidden
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-faint transition-colors group-hover:text-text"
                  >
                    {copied ? (
                      <Check size={14} className="text-brand" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </span>
                </div>
                <code className="block min-h-[1.5em] break-all font-mono text-base text-text">
                  {c.output || (
                    <span className="text-text-faint">{c.example}</span>
                  )}
                </code>
              </button>
            );
          })}
        </div>
      </div>
    </ToolShell>
  );
}
