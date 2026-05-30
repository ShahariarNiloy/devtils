"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import { MATCH_CAP } from "../regex.lib";
import type { Compiled, RegexMatch, ReDoSResult, CopyFormat } from "../regex.lib";
import type { HistoryEntry } from "../hooks/use-regex-state";
import { MatchActions } from "./match-actions";

interface StatusBarProps {
  compiled: Compiled;
  matches: RegexMatch[];
  tokens: unknown[];
  execMsDisplay: string | null;
  redos: ReDoSResult;
  timedOut: boolean;
  history: HistoryEntry[];
  historyOpen: boolean;
  setHistoryOpen: (v: boolean) => void;
  copyOpen: boolean;
  setCopyOpen: (v: boolean) => void;
  applyHistoryEntry: (h: HistoryEntry) => void;
  clearHistory: () => void;
  handleShare: () => void;
  handleCopyMatches: (fmt: CopyFormat) => void;
}

export function StatusBar({
  compiled,
  matches,
  tokens,
  execMsDisplay,
  redos,
  timedOut,
  history,
  historyOpen,
  setHistoryOpen,
  copyOpen,
  setCopyOpen,
  applyHistoryEntry,
  clearHistory,
  handleShare,
  handleCopyMatches,
}: StatusBarProps) {
  return (
    <>
      {/* Error / ReDoS banners */}
      <AnimatePresence initial={false}>
        {!compiled.ok && (
          <motion.div
            key="err"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-error-border"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-error-bg text-sm text-error-text">
              <AlertTriangle size={15} className="shrink-0" />
              {compiled.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {!redos.safe && redos.warning && (
          <motion.div
            key="redos"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-warning-border"
          >
            <div className="flex items-start gap-2 px-4 py-2 bg-warning-bg text-sm text-warning-text">
              <AlertTriangle size={15} className="mt-px shrink-0" />
              {redos.warning}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {timedOut && (
          <motion.div
            key="timeout"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-error-border"
          >
            <div className="flex items-start gap-2 px-4 py-2 bg-error-bg text-sm text-error-text">
              <AlertTriangle size={15} className="mt-px shrink-0" />
              Pattern stopped after 2s — it&apos;s too slow on this input
              (catastrophic backtracking). Simplify the pattern or test on
              shorter text.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status row */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-2 min-h-10 border-t border-border-subtle bg-surface-soft/40">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={cn(
              "flex items-center gap-1.5 text-sm font-bold uppercase tracking-[0.08em]",
              compiled.ok ? "text-success" : "text-danger",
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                compiled.ok ? "bg-success" : "bg-danger",
              )}
            />
            {compiled.ok ? "Valid" : "Invalid"}
          </span>
          {compiled.ok && (
            <>
              <span className="text-sm text-text-muted">
                {matches.length} {matches.length === 1 ? "match" : "matches"}
                {matches.length >= MATCH_CAP && (
                  <span className="text-text-faint"> · first {MATCH_CAP}</span>
                )}
              </span>
              <span className="text-sm text-text-muted">{tokens.length} tokens</span>
              {execMsDisplay && (
                <span className="text-sm text-text-faint">{execMsDisplay}</span>
              )}
            </>
          )}
        </div>
        <MatchActions
          matches={matches}
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
    </>
  );
}
