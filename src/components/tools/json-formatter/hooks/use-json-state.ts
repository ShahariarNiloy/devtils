"use client";

import { useCallback, useEffect, useMemo, useState, useDeferredValue } from "react";
import type {
  ConversionResult,
  CursorPosition,
  IndentStyle,
  JsonStats,
  MinifyStats,
  SortOrder,
  ValidationState,
  ViewMode,
} from "../json-formatter.types";
import {
  validateJson,
  parseJson,
  queryJsonPath,
  isArrayOfObjects,
  computeStats,
} from "../json-formatter.lib";

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function useJsonState() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState<IndentStyle>("2");
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [validation, setValidation] = useState<ValidationState>({ status: "idle" });
  const [stats, setStats] = useState<JsonStats | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");
  const [queryPath, setQueryPath] = useState("$");
  const [queryResults, setQueryResults] = useState<unknown[]>([]);
  const [diffInput, setDiffInput] = useState("");
  const [repairLog, setRepairLog] = useState<string[]>([]);
  const [repairError, setRepairError] = useState<string | null>(null);
  const [isProcessing] = useState(false);
  const [inputCursor, setInputCursor] = useState<CursorPosition>({ ln: 1, col: 1 });
  const [outputCursor, setOutputCursor] = useState<CursorPosition>({ ln: 1, col: 1 });
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [minifyStats, setMinifyStats] = useState<MinifyStats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showQuery, setShowQuery] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [treeExpandAll, setTreeExpandAll] = useState<number>(0);
  const [treeCollapseAll, setTreeCollapseAll] = useState<number>(0);

  const deferredInput = useDeferredValue(input);
  const deferredOutput = useDeferredValue(output);

  const parsedValue = useMemo(() => {
    if (!deferredInput.trim()) return null;
    try { return parseJson(deferredInput); } catch { return null; }
  }, [deferredInput]);

  const parsedOutput = useMemo(() => {
    if (!deferredOutput.trim()) return null;
    try { return parseJson(deferredOutput); } catch { return null; }
  }, [deferredOutput]);

  const isValid = validation.status === "valid";
  const canUseTableView = isArrayOfObjects(parsedOutput ?? parsedValue);

  const validateDebounced = useMemo(
    () =>
      debounce((...args: unknown[]) => {
        const raw = args[0] as string;
        const state = validateJson(raw);
        setValidation(state);
        if (state.status === "valid") {
          try {
            const v = parseJson(raw);
            const s = computeStats(v);
            s.size = new TextEncoder().encode(raw).length;
            s.lines = raw.split("\n").length;
            setStats(s);
          } catch { /* ignore */ }
        }
      }, 300),
    [],
  );

  useEffect(() => {
    validateDebounced(input);
  }, [input, validateDebounced]);

  const queryDebounced = useMemo(
    () =>
      debounce((...args: unknown[]) => {
        const [path, value] = args as [string, unknown];
        if (!path || !value) { setQueryResults([]); return; }
        try {
          setQueryResults(queryJsonPath(value, path));
        } catch {
          setQueryResults([]);
        }
      }, 200),
    [],
  );

  useEffect(() => {
    if (showQuery) queryDebounced(queryPath, parsedOutput ?? parsedValue);
  }, [queryPath, parsedOutput, parsedValue, showQuery, queryDebounced]);

  const setStatsExternal = useCallback((s: JsonStats | null) => setStats(s), []);
  const setValidationExternal = useCallback((v: ValidationState) => setValidation(v), []);
  const setRepairLogExternal = useCallback((log: string[]) => setRepairLog(log), []);
  const setRepairErrorExternal = useCallback((err: string | null) => setRepairError(err), []);
  const setConversionResultExternal = useCallback((r: ConversionResult | null) => setConversionResult(r), []);
  const setMinifyStatsExternal = useCallback((m: MinifyStats | null) => setMinifyStats(m), []);
  const setFileNameExternal = useCallback((n: string | null) => setFileName(n), []);
  const setSortOrderExternal = useCallback((o: SortOrder) => setSortOrder(o), []);

  return {
    input, setInput,
    output, setOutput,
    indent, setIndent,
    viewMode, setViewMode,
    validation,
    setValidation: setValidationExternal,
    stats,
    setStats: setStatsExternal,
    sortOrder,
    setSortOrder: setSortOrderExternal,
    queryPath, setQueryPath,
    queryResults, setQueryResults,
    diffInput, setDiffInput,
    repairLog,
    setRepairLog: setRepairLogExternal,
    repairError,
    setRepairError: setRepairErrorExternal,
    isProcessing,
    inputCursor, setInputCursor,
    outputCursor, setOutputCursor,
    conversionResult,
    setConversionResult: setConversionResultExternal,
    minifyStats,
    setMinifyStats: setMinifyStatsExternal,
    showStats, setShowStats,
    showQuery, setShowQuery,
    fileName,
    setFileName: setFileNameExternal,
    treeExpandAll, setTreeExpandAll,
    treeCollapseAll, setTreeCollapseAll,
    parsedValue,
    parsedOutput,
    isValid,
    canUseTableView,
  };
}

export type JsonState = ReturnType<typeof useJsonState>;
