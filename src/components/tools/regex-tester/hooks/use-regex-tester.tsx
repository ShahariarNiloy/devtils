"use client";

import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  compile,
  matchAll,
  replaceText,
  splitText,
  detectReDoS,
  explainPattern,
  formatMatches,
  PATTERN_LIBRARY,
  type CopyFormat,
} from "../regex.lib";
import { useShortcut } from "@/lib/keyboard";
import type { MobileView } from "../mobile/types";
import { SAMPLE_TEXT, saveHistory, type HistoryEntry } from "./use-regex-state";
import { buildHighlighted } from "./build-highlighted";
import {
  useHydration,
  useTextPersistence,
  useSplitDirection,
  useKeyboardDetection,
  useHistorySave,
} from "./use-regex-side-effects";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRegexTester() {
  const [pattern, setPattern]             = useState("\\b[\\w.-]+@[\\w.-]+\\.[a-z]{2,}\\b");
  const [flags, setFlags]                 = useState<string[]>(["g", "i"]);
  const [mode, setMode]                   = useState("match");
  const [text, setText]                   = useState(SAMPLE_TEXT);
  const [replacement, setReplacement]     = useState("[$&]");
  const [patternSearch, setPatternSearch] = useState("");
  const [patternsOpen, setPatternsOpen]   = useState(false);
  const [hoveredToken, setHoveredToken]   = useState<number | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [showExamples, setShowExamples]   = useState(false);
  const [history, setHistory]             = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen]     = useState(false);
  const [copyOpen, setCopyOpen]           = useState(false);
  const [splitDirection, setSplitDirection] = useState<"horizontal" | "vertical">("horizontal");
  const [mobileActiveView, setMobileActiveView] = useState<MobileView>("editor");
  const [isKeyboardOpen, setIsKeyboardOpen]     = useState(false);

  const patternRef   = useRef<HTMLInputElement>(null);
  const lineNumRef   = useRef<HTMLDivElement>(null);
  const marksPreRef  = useRef<HTMLPreElement>(null);
  const breakdownRef = useRef<HTMLDivElement>(null);

  const deferredPattern     = useDeferredValue(pattern);
  const deferredText        = useDeferredValue(text);
  const deferredReplacement = useDeferredValue(replacement);
  const flagsKey            = flags.join("");

  const compiled = useMemo(() => compile(deferredPattern, flagsKey), [deferredPattern, flagsKey]);

  const { matches, execMs } = useMemo(() => {
    if (!compiled.ok) return { matches: [] as ReturnType<typeof matchAll>, execMs: 0 };
    // eslint-disable-next-line react-hooks/purity
    const t0 = performance.now();
    const m = matchAll(compiled.regex, deferredText);
    // eslint-disable-next-line react-hooks/purity
    return { matches: m, execMs: Math.round((performance.now() - t0) * 10) / 10 };
  }, [compiled, deferredText]);

  const replaced = useMemo(
    () => (compiled.ok ? replaceText(compiled.regex, deferredText, deferredReplacement) : deferredText),
    [compiled, deferredText, deferredReplacement],
  );
  const parts = useMemo(
    () => (compiled.ok ? splitText(compiled.regex, deferredText) : [deferredText]),
    [compiled, deferredText],
  );
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
    () => (matches.length && compiled.ok ? buildHighlighted(matches, deferredText, validSelected) : null),
    [matches, deferredText, compiled.ok, validSelected],
  );

  const filteredLibrary = useMemo(() => {
    const q = patternSearch.trim().toLowerCase();
    if (!q) return PATTERN_LIBRARY;
    return PATTERN_LIBRARY.map((c) => ({
      ...c,
      patterns: c.patterns.filter(
        (p) => p.label.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q),
      ),
    })).filter((c) => c.patterns.length > 0);
  }, [patternSearch]);

  const lineCount = deferredText.split("\n").length;

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useShortcut({ key: "/", ignoreInEditable: true }, (e) => {
    e.preventDefault();
    patternRef.current?.focus();
  });
  useShortcut({ key: "k", meta: true }, (e) => {
    e.preventDefault();
    setPatternsOpen(true);
  });

  // ── Side effects ───────────────────────────────────────────────────────────
  useHydration({ setPattern, setFlags, setText, setHistory });
  useTextPersistence(text);
  useSplitDirection(setSplitDirection);
  useKeyboardDetection(setIsKeyboardOpen);
  useHistorySave({ compiledOk: compiled.ok, pattern, flagsKey, setHistory });

  // ── Callbacks ──────────────────────────────────────────────────────────────

  function scrollToBreakdown() {
    breakdownRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

  const handleShare = useCallback(() => {
    const params = new URLSearchParams({ p: pattern, f: flagsKey });
    if (text !== SAMPLE_TEXT) params.set("t", text);
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?${params}`);
    toast.success("Link copied to clipboard");
  }, [pattern, flagsKey, text]);

  return {
    pattern, setPattern, flags, setFlags, mode, setMode, text, setText,
    replacement, setReplacement, patternSearch, setPatternSearch,
    patternsOpen, setPatternsOpen, hoveredToken, setHoveredToken,
    selectedMatch, setSelectedMatch, showExamples, setShowExamples,
    history, setHistory, historyOpen, setHistoryOpen, copyOpen, setCopyOpen,
    splitDirection, mobileActiveView, setMobileActiveView, isKeyboardOpen,
    patternRef, lineNumRef, marksPreRef, breakdownRef,
    flagsKey, compiled, matches, execMs, replaced, parts, redos, tokens,
    execMsDisplay, validSelected, highlighted, filteredLibrary, lineCount,
    scrollToBreakdown, applyHistoryEntry, clearHistory, handleCopyMatches, handleShare,
  };
}
