"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ToolShell } from "@/components/layout/tool-shell";
import { Tabs } from "@/components/primitives/tabs";
import { ExamplesPanel } from "./panels/examples-panel";
import { MobileRegexTester } from "./mobile/mobile-regex-tester";
import type { MobileState } from "./mobile/types";
import { useIsMobile } from "@/lib/use-is-mobile";
import type { Tool } from "@/lib/tools-registry";
import { useRegexTester } from "./hooks/use-regex-tester";
import { PatternBar } from "./desktop/pattern-bar";
import { StatusBar } from "./desktop/status-bar";
import { TestPanel } from "./desktop/test-panel";
import { ToolbarRow } from "./desktop/toolbar-row";

// ─── Main component ───────────────────────────────────────────────────────────

export function RegexTester({ tool }: { tool: Tool }) {
  const {
    pattern, setPattern,
    flags, setFlags,
    mode, setMode,
    text, setText,
    replacement, setReplacement,
    patternSearch, setPatternSearch,
    patternsOpen, setPatternsOpen,
    selectedMatch, setSelectedMatch,
    showExamples, setShowExamples,
    history,
    historyOpen, setHistoryOpen,
    copyOpen, setCopyOpen,
    splitDirection,
    mobileActiveView, setMobileActiveView,
    isKeyboardOpen,
    patternRef,
    lineNumRef,
    marksPreRef,
    compiled,
    matches,
    execMs,
    replaced,
    parts,
    redos,
    tokens,
    regexTimedOut,
    execMsDisplay,
    validSelected,
    highlighted,
    filteredLibrary,
    lineCount,
    applyHistoryEntry,
    clearHistory,
    handleCopyMatches,
    handleShare,
  } = useRegexTester();

  const isMobile = useIsMobile();

  const mobileState = useMemo<MobileState>(() => ({
    pattern, setPattern,
    flags, setFlags,
    text, setText,
    replacement, setReplacement,
    selectedMatch, setSelectedMatch,
    mode, setMode,
    compiled,
    matches,
    tokens,
    highlighted,
    execMs,
    replaced,
    parts,
    activeView: mobileActiveView,
    setActiveView: setMobileActiveView,
    isKeyboardOpen,
  }), [
    pattern, flags, text, replacement, selectedMatch, mode,
    compiled, matches, tokens, highlighted, replaced, parts, execMs,
    mobileActiveView, isKeyboardOpen,
    setPattern, setFlags, setText, setReplacement, setSelectedMatch, setMode,
    setMobileActiveView,
  ]);

  return (
    <ToolShell
      tool={tool}
      classNames={{
        header: "hidden md:block",
        body: "max-md:!p-0 max-md:!max-w-none",
      }}
    >
      <Tabs value={mode} onValueChange={setMode}>
        {isMobile ? (
          <MobileRegexTester tool={tool} state={mobileState} />
        ) : (
          <div className="flex flex-col gap-3">

            {/* ── Card 1: Pattern bar + Status row ──────────────────────────── */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <PatternBar
                pattern={pattern}
                setPattern={setPattern}
                flags={flags}
                setFlags={setFlags}
                compiled={compiled}
                setSelectedMatch={setSelectedMatch}
                patternRef={patternRef}
              />
              <StatusBar
                compiled={compiled}
                matches={matches}
                tokens={tokens}
                execMsDisplay={execMsDisplay}
                redos={redos}
                timedOut={regexTimedOut}
                history={history}
                historyOpen={historyOpen}
                setHistoryOpen={setHistoryOpen}
                copyOpen={copyOpen}
                setCopyOpen={setCopyOpen}
                applyHistoryEntry={applyHistoryEntry}
                clearHistory={clearHistory}
                handleShare={handleShare}
                handleCopyMatches={handleCopyMatches}
              />
            </div>

            {/* ── Tabs + toolbar row ─────────────────────────────────────────── */}
            <ToolbarRow
              patternsOpen={patternsOpen}
              setPatternsOpen={setPatternsOpen}
              patternSearch={patternSearch}
              setPatternSearch={setPatternSearch}
              filteredLibrary={filteredLibrary}
              setPattern={setPattern}
              setFlags={setFlags}
              setSelectedMatch={setSelectedMatch}
              showExamples={showExamples}
              setShowExamples={setShowExamples}
            />

            {/* ── Card 3: Content area ───────────────────────────────────────── */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden flex flex-col">
              {/* Examples panel — slides in above test string */}
              <AnimatePresence initial={false}>
                {showExamples && (
                  <motion.div
                    key="examples-panel"
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden border-b border-border-subtle shrink-0"
                  >
                    <ExamplesPanel compiled={compiled} isActive={showExamples} />
                  </motion.div>
                )}
              </AnimatePresence>

              <TestPanel
                text={text}
                setText={setText}
                replacement={replacement}
                setReplacement={setReplacement}
                mode={mode}
                highlighted={highlighted}
                lineCount={lineCount}
                splitDirection={splitDirection}
                lineNumRef={lineNumRef}
                marksPreRef={marksPreRef}
                matches={matches}
                validSelected={validSelected}
                setSelectedMatch={setSelectedMatch}
                handleCopyMatches={handleCopyMatches}
                replaced={replaced}
                parts={parts}
                tokens={tokens}
              />
            </div>

          </div>
        )}
      </Tabs>
    </ToolShell>
  );
}
