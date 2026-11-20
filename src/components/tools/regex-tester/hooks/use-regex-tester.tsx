"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  compile,
  detectReDoS,
  explainPattern,
  formatMatches,
  type CopyFormat,
} from "../regex.lib";
import type { RegexMatch } from "../regex.lib";
import { runRegex } from "../regex-client";

const EMPTY_MATCHES: RegexMatch[] = [];

// Above this test-string size the inline match overlay (up to ~10k React
// nodes rebuilt per keystroke) is skipped — the match list / extract still
// work; only the highlight backgrounds drop. Keeps big inputs responsive.
const HIGHLIGHT_TEXT_LIMIT = 200_000;
import { useShortcut } from "@/lib/keyboard";
import type { RegexMode } from "../regex.lib";
import { SAMPLE_FLAGS, SAMPLE_PATTERN, SAMPLE_TEXT, saveHistory, type HistoryEntry } from "./use-regex-state";
import { buildHighlighted } from "./build-highlighted";
import {
  useHydration,
  useTextPersistence,
  useHistorySave,
} from "./use-regex-side-effects";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRegexTester() {
  const [pattern, setPattern]             = useState(SAMPLE_PATTERN);
  const [flags, setFlags]                 = useState<string[]>(SAMPLE_FLAGS);
  const [mode, setMode]                   = useState<RegexMode>("match");
  const [text, setText]                   = useState(SAMPLE_TEXT);
  const [replacement, setReplacement]     = useState("[$&]");
  const [patternsOpen, setPatternsOpen]   = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [showExamples, setShowExamples]   = useState(false);
  const [history, setHistory]             = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen]     = useState(false);

  const patternRef   = useRef<HTMLInputElement>(null);

  const deferredPattern     = useDeferredValue(pattern);
  const deferredText        = useDeferredValue(text);
  const deferredReplacement = useDeferredValue(replacement);
  const flagsKey            = flags.join("");

  const compiled = useMemo(() => compile(deferredPattern, flagsKey), [deferredPattern, flagsKey]);
  const compiledOk = compiled.ok;

  // Matching runs in a worker with a hard timeout. A catastrophic pattern
  // can't be aborted from JS, so the only safe escape is terminating the
  // worker — which turns a frozen tab into a "pattern too slow" message.
  // Results are kept until the next ones arrive (stale-while-revalidate).
  const [run, setRun] = useState<{
    matches: RegexMatch[];
    execMs: number;
    replaced: string;
    parts: string[];
    timedOut: boolean;
  }>({ matches: EMPTY_MATCHES, execMs: 0, replaced: "", parts: [], timedOut: false });

  useEffect(() => {
    if (!compiledOk) return;
    let cancelled = false;
    void runRegex({
      pattern: deferredPattern,
      flags: flagsKey,
      text: deferredText,
      replacement: deferredReplacement,
      mode,
    }).then((res) => {
      if (cancelled) return;
      if (res.status === "ok") {
        setRun({
          matches: res.matches,
          execMs: res.execMs,
          replaced: res.replaced ?? deferredText,
          parts: res.parts ?? [deferredText],
          timedOut: false,
        });
      } else if (res.status === "timeout") {
        setRun({ matches: [], execMs: 0, replaced: deferredText, parts: [deferredText], timedOut: true });
      } else {
        // Exec/compile error — the `compiled` banner already explains it.
        setRun({ matches: [], execMs: 0, replaced: deferredText, parts: [deferredText], timedOut: false });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [compiledOk, deferredPattern, flagsKey, deferredText, deferredReplacement, mode]);

  const matches = compiledOk ? run.matches : EMPTY_MATCHES;
  const execMs = compiledOk ? run.execMs : 0;
  const replaced = compiledOk && run.replaced ? run.replaced : deferredText;
  const parts =
    compiledOk && run.parts.length ? run.parts : [deferredText];
  const regexTimedOut = compiledOk ? run.timedOut : false;

  const redos = useMemo(
    () => (deferredPattern ? detectReDoS(deferredPattern) : { safe: true, warning: null }),
    [deferredPattern],
  );
  const tokens = useMemo(
    () => (deferredPattern ? explainPattern(deferredPattern) : []),
    [deferredPattern],
  );

  const execMsDisplay = compiled.ok && execMs > 0
    ? `${execMs < 10 ? execMs.toFixed(1) : Math.round(execMs)}ms`
    : null;

  const validSelected = selectedMatch !== null && selectedMatch < matches.length
    ? selectedMatch
    : null;

  const highlighted = useMemo<React.ReactNode[] | null>(
    () =>
      matches.length &&
      compiledOk &&
      deferredText.length <= HIGHLIGHT_TEXT_LIMIT
        ? buildHighlighted(matches, deferredText, validSelected)
        : null,
    [matches, deferredText, compiledOk, validSelected],
  );

  const lineCount = deferredText.split("\n").length;

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useShortcut({ key: "/", ignoreInEditable: true, label: "Focus pattern" }, (e) => {
    e.preventDefault();
    patternRef.current?.focus();
  });
  useShortcut({ key: "l", meta: true, shift: true, label: "Open pattern library" }, (e) => {
    e.preventDefault();
    setPatternsOpen(true);
  });

  // ── Side effects ───────────────────────────────────────────────────────────
  useHydration({ setPattern, setFlags, setText, setHistory });
  useTextPersistence(text);
  useHistorySave({ compiledOk: compiled.ok, pattern, flagsKey, setHistory });

  // ── Callbacks ──────────────────────────────────────────────────────────────

  function applyHistoryEntry(entry: HistoryEntry) {
    setPattern(entry.pattern);
    setFlags(entry.flags.split("").filter(Boolean));
    setSelectedMatch(null);
    setHistoryOpen(false);
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
    toast("History cleared", { duration: 1500 });
  }

  const handleCopyMatches = useCallback(
    (fmt: CopyFormat) => {
      if (!matches.length) return;
      navigator.clipboard.writeText(formatMatches(matches, fmt));
      toast.success(`Copied ${matches.length} match${matches.length !== 1 ? "es" : ""} as ${fmt}`);
    },
    [matches],
  );

  /**
   * Insert a token at the pattern caret (replacing any selection); "(…)"
   * becomes "()" with the caret inside, ready to type the group body.
   */
  const insertToken = useCallback((token: string) => {
    const el = patternRef.current;
    const insert = token === "(…)" ? "()" : token;
    const start = el?.selectionStart ?? pattern.length;
    const end = el?.selectionEnd ?? pattern.length;
    const next = pattern.slice(0, start) + insert + pattern.slice(end);
    const caret = start + (token === "(…)" ? 1 : insert.length);
    setPattern(next);
    setSelectedMatch(null);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }, [pattern]);

  const handleShare = useCallback(() => {
    const params = new URLSearchParams({ p: pattern, f: flagsKey });
    if (text !== SAMPLE_TEXT) params.set("t", text);
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?${params}`);
    toast.success("Link copied to clipboard");
  }, [pattern, flagsKey, text]);

  return {
    pattern, setPattern, flags, setFlags, mode, setMode, text, setText,
    replacement, setReplacement,
    patternsOpen, setPatternsOpen,
    selectedMatch, setSelectedMatch, showExamples, setShowExamples,
    history, setHistory, historyOpen, setHistoryOpen,
    patternRef,
    flagsKey, compiled, matches, execMs, replaced, parts, redos, tokens,
    regexTimedOut, textTooLargeToHighlight: deferredText.length > HIGHLIGHT_TEXT_LIMIT,
    execMsDisplay, validSelected, highlighted, lineCount,
    applyHistoryEntry, clearHistory, handleCopyMatches, handleShare, insertToken,
  };
}

export type RegexTesterState = ReturnType<typeof useRegexTester>;
