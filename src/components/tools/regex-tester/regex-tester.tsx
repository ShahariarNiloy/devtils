"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import type { Tool } from "@/lib/tools-registry";
import { RegexTesterContent, seoData } from "./content";
import { useRegexTester } from "./hooks/use-regex-tester";
import { ExamplesPanel } from "./panels/examples-panel";
import { RegexBanners } from "./workspace/banners";
import { PatternToolbar } from "./workspace/pattern-toolbar";
import { HistoryDialog, PatternLibraryDialog } from "./workspace/regex-dialogs";
import { ResultsPane } from "./workspace/results-pane";
import { RegexStatusBar } from "./workspace/status-bar";
import { TestStringPane } from "./workspace/test-string-pane";

export function RegexTester({ tool }: { tool: Tool }) {
  const state = useRegexTester();
  const reduceMotion = useReducedMotion();

  const appendSamples = (values: string[]) => {
    const sep = state.text === "" || state.text.endsWith("\n") ? "" : "\n";
    state.setText(state.text + sep + values.join("\n"));
    state.setSelectedMatch(null);
    toast(`Added ${values.length} samples to the test string`, { duration: 1800 });
  };

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px] md:flex md:h-[max(var(--ws-min,560px),calc(100dvh-var(--chrome-top,165px)-24px))] md:flex-col">
        <PatternToolbar
          state={state}
          onOpenLibrary={() => state.setPatternsOpen(true)}
          onOpenHistory={() => state.setHistoryOpen(true)}
        />
        <RegexBanners state={state} />

        <AnimatePresence initial={false}>
          {state.showExamples && (
            <motion.div
              key="examples"
              initial={reduceMotion ? false : { height: 0 }}
              animate={{ height: "auto" }}
              exit={reduceMotion ? { opacity: 0 } : { height: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              className="overflow-hidden border-b border-border-subtle bg-surface"
            >
              <ExamplesPanel compiled={state.compiled} isActive={state.showExamples} onAddAll={appendSamples} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex min-h-[420px] md:min-h-0 md:flex-1 md:[&>*]:min-h-0 md:[&>*]:overflow-auto flex-col md:flex-row">
          <TestStringPane state={state} />
          <ResultsPane state={state} />
        </div>

        <RegexStatusBar state={state} />
      </div>

      <PatternLibraryDialog
        open={state.patternsOpen}
        onOpenChange={state.setPatternsOpen}
        onPick={(pattern, flags) => {
          state.setPattern(pattern);
          state.setFlags(flags.split("").filter(Boolean));
          state.setSelectedMatch(null);
        }}
      />
      <HistoryDialog
        open={state.historyOpen}
        onOpenChange={state.setHistoryOpen}
        history={state.history}
        onPick={state.applyHistoryEntry}
        onClear={state.clearHistory}
      />

      <RegexTesterContent />
    </ToolShell>
  );
}
