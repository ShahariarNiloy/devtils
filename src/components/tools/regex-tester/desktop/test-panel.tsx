"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/primitives/resizable";
import { TabsContent } from "@/components/primitives/tabs";
import { Textarea } from "@/components/primitives/textarea";
import { cn } from "@/lib/cn";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ExtractPanel } from "../panels/extract-panel";
import { MatchPanel } from "../panels/match-panel";
import { ReplacePanel } from "../panels/replace-panel";
import { SplitPanel } from "../panels/split-panel";
import type { CopyFormat, ExplainToken, RegexMatch } from "../regex.lib";
import { BreakdownContent } from "./breakdown-content";
import { CheatsheetContent } from "./cheatsheet-content";

type RightTab = "result" | "breakdown" | "cheatsheet";

const RESULT_LABEL: Record<string, string> = {
  match: "Matches",
  replace: "Replace",
  split: "Split",
  extract: "Extract",
};

interface TestPanelProps {
  text: string;
  setText: (v: string) => void;
  replacement: string;
  setReplacement: (v: string) => void;
  mode: string;
  highlighted: React.ReactNode[] | null;
  lineCount: number;
  splitDirection: "horizontal" | "vertical";
  lineNumRef: React.RefObject<HTMLDivElement | null>;
  marksPreRef: React.RefObject<HTMLPreElement | null>;
  matches: RegexMatch[];
  validSelected: number | null;
  setSelectedMatch: (v: number | null) => void;
  handleCopyMatches: (fmt: CopyFormat) => void;
  replaced: string;
  parts: string[];
  tokens: ExplainToken[];
}

export function TestPanel({
  text,
  setText,
  replacement,
  setReplacement,
  mode,
  highlighted,
  lineCount,
  splitDirection,
  lineNumRef,
  marksPreRef,
  matches,
  validSelected,
  setSelectedMatch,
  handleCopyMatches,
  replaced,
  parts,
  tokens,
}: TestPanelProps) {
  const [rightTab, setRightTab] = useState<RightTab>("result");

  // One text node instead of one <div> per line — a big paste was rebuilding
  // thousands of elements whenever the line count changed.
  const gutterContent = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1).join("\n"),
    [lineCount]
  );

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden flex flex-col">
      {/* Replace input row */}
      <AnimatePresence initial={false}>
        {mode === "replace" && (
          <motion.div
            key="replace-input"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1.5 px-4 py-3 border-b border-border-subtle bg-surface-soft/20">
              <span className="text-sm font-medium text-text-faint">
                Replacement
              </span>
              <input
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder="e.g. [$&] or $1"
                className="w-full h-9 rounded-lg border border-border bg-bg px-3 font-mono text-sm text-text placeholder:text-text-faint outline-none focus:border-brand focus:shadow-focus transition-[border-color,box-shadow]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content area — resizable split */}
      <ResizablePanelGroup
        key={splitDirection}
        direction={splitDirection}
        className="h-[560px]"
      >
        {/* Left — test string with line numbers */}
        <ResizablePanel defaultSize={50} minSize="40%">
          <div className="flex flex-col h-full min-w-0">
            <div className="flex items-center justify-between px-4 h-10 border-b border-border-subtle">
              <span className="text-sm uppercase tracking-[0.1em] font-medium text-text-faint">
                Test string
              </span>
              <span className="text-sm text-text-faint font-mono">
                {text.length} chars · {lineCount} lines
              </span>
            </div>
            <div className="flex flex-1 overflow-hidden">
              {/* Line numbers — overflow hidden but scrollTop synced with textarea */}
              <div
                ref={lineNumRef}
                aria-hidden
                className="w-12 shrink-0 bg-surface-soft/60 border-r border-border-subtle py-3 pr-3 select-none"
                style={{ overflowY: "hidden" }}
              >
                <pre
                  className="m-0 font-mono text-sm text-text-faint text-right whitespace-pre"
                  style={{ lineHeight: "1.65" }}
                >
                  {gutterContent}
                </pre>
              </div>
              {/* Editor: textarea on top, match backgrounds painted by pre underneath */}
              <div className="relative flex-1">
                <pre
                  ref={marksPreRef}
                  aria-hidden
                  className="absolute inset-0 m-0 px-4 py-3 font-mono text-sm leading-[1.65] text-transparent whitespace-pre-wrap break-words pointer-events-none select-none overflow-hidden"
                >
                  {highlighted}
                </pre>
                <Textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setSelectedMatch(null);
                  }}
                  onScroll={(e) => {
                    const st = e.currentTarget.scrollTop;
                    if (lineNumRef.current) lineNumRef.current.scrollTop = st;
                    if (marksPreRef.current) marksPreRef.current.scrollTop = st;
                  }}
                  className={cn(
                    "absolute inset-0 border-0 rounded-none bg-transparent caret-text resize-none",
                    "font-mono text-sm leading-[1.65] px-4 py-3 text-text regex-highlighted",
                    // It's an embedded editor, not a form field — kill the
                    // primitive's brand focus ring/border.
                    "outline-none focus:border-0 focus:shadow-none"
                  )}
                  placeholder="Paste or type test text…"
                />
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right — tabbed inspector: mode result · breakdown · cheatsheet */}
        <ResizablePanel defaultSize={50} minSize="20%" maxSize="60%">
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-1 px-2 h-10 border-b border-border-subtle shrink-0">
              {(
                [
                  {
                    id: "result",
                    label: RESULT_LABEL[mode] ?? "Result",
                    badge: null,
                  },
                  {
                    id: "breakdown",
                    label: "Breakdown",
                    badge: tokens.length || null,
                  },
                  { id: "cheatsheet", label: "Cheatsheet", badge: null },
                ] as { id: RightTab; label: string; badge: number | null }[]
              ).map((t) => {
                const active = rightTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRightTab(t.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-7 rounded-md px-2.5 text-sm font-medium transition-colors cursor-pointer",
                      active
                        ? "bg-surface-soft text-text"
                        : "text-text-faint hover:bg-surface-soft/60 hover:text-text"
                    )}
                  >
                    {t.label}
                    {t.badge != null && (
                      <span className="text-text-faint font-normal">
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {rightTab === "result" && (
              <>
                <TabsContent
                  value="match"
                  className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden"
                >
                  <MatchPanel
                    matches={matches}
                    selectedMatch={validSelected}
                    onSelect={setSelectedMatch}
                    onCopy={handleCopyMatches}
                  />
                </TabsContent>
                <TabsContent
                  value="replace"
                  className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden"
                >
                  <ReplacePanel replaced={replaced} />
                </TabsContent>
                <TabsContent
                  value="split"
                  className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden"
                >
                  <SplitPanel parts={parts} />
                </TabsContent>
                <TabsContent
                  value="extract"
                  className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden"
                >
                  <ExtractPanel matches={matches} />
                </TabsContent>
              </>
            )}
            {rightTab === "breakdown" && <BreakdownContent tokens={tokens} />}
            {rightTab === "cheatsheet" && <CheatsheetContent />}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
