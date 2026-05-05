"use client";

import { useCallback, useEffect, useMemo, useState, useDeferredValue } from "react";
import { toast } from "sonner";
import type {
  ConvertTarget,
  ConversionResult,
  CursorPosition,
  IndentStyle,
  JsonStats,
  MinifyStats,
  SortOrder,
  ValidationState,
  ViewMode,
} from "./json-formatter.types";
import {
  validateJson,
  formatJson,
  minifyJson,
  parseJson,
  sortJsonKeys,
  deduplicateKeys,
  queryJsonPath,
  isArrayOfObjects,
  computeStats,
  SAMPLE_DATA,
} from "./json-formatter.lib";
import { repairJson, RepairError } from "./json-repair";
import { toCSV, toYAML, toTypeScript, toXML, toZod, fromCSV, fromYAML } from "./json-convert";

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function useJsonFormatter() {
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
  const [treeSearch, setTreeSearch] = useState("");
  const [treeExpandAll, setTreeExpandAll] = useState<number>(0); // increment to trigger
  const [treeCollapseAll, setTreeCollapseAll] = useState<number>(0);

  // ── Derived ──────────────────────────────────────────────────────────────────

  // Deferred so expensive JSON.parse does not block keystroke rendering
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

  // ── Auto-validate on input (300ms debounce) ──────────────────────────────────

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
          } catch {
            // ignore
          }
        }
      }, 300),
    [],
  );

  useEffect(() => {
    validateDebounced(input);
  }, [input, validateDebounced]);

  // ── Auto-run JSONPath query (200ms debounce) ──────────────────────────────────

  const queryDebounced = useMemo(
    () =>
      debounce((...args: unknown[]) => {
        const [path, value] = args as [string, unknown];
        if (!path || !value) { setQueryResults([]); return; }
        try {
          const results = queryJsonPath(value, path);
           
          setQueryResults(results);
        } catch {
           
          setQueryResults([]);
        }
      }, 200),
    [],
  );

  useEffect(() => {
    if (showQuery) queryDebounced(queryPath, parsedOutput ?? parsedValue);
  }, [queryPath, parsedOutput, parsedValue, showQuery, queryDebounced]);

  // ── Actions ───────────────────────────────────────────────────────────────────

  // Core formatting logic — shared by format() and formatFrom().
  const runFormat = useCallback((raw: string) => {
    const vState = validateJson(raw);
    if (vState.status === "invalid") {
      setValidation(vState);
      toast.error("Invalid JSON — fix the error before formatting");
      return;
    }
    try {
      const value = parseJson(raw);
      const sorted = sortOrder !== "none" ? sortJsonKeys(value, sortOrder) : value;
      const formatted = formatJson(sorted, indent);
      setOutput(formatted);
      setMinifyStats(null);
      setConversionResult(null);
      const s = computeStats(sorted);
      s.size = new TextEncoder().encode(formatted).length;
      s.lines = formatted.split("\n").length;
      setStats(s);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Format failed");
    }
  }, [indent, sortOrder]);

  const format = useCallback(() => {
    if (!input.trim()) return;
    runFormat(input);
  }, [input, runFormat]);

  // formatFrom accepts an explicit raw value — used by paste-auto-format
  // so the output panel updates without waiting for debounced state.input.
  // Also switches to tree view so developers immediately see the schema.
  const formatFrom = useCallback((raw: string) => {
    if (!raw.trim()) return;
    runFormat(raw);
    setViewMode("tree");
  }, [runFormat]);

  const minify = useCallback(() => {
    if (!input.trim()) return;
    try {
      const result = minifyJson(input);
      setOutput(result.output);
      setMinifyStats({ before: result.before, after: result.after, savedPct: result.savedPct });
      setConversionResult(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Minify failed");
    }
  }, [input]);

  const validate = useCallback(() => {
    const state = validateJson(input);
    setValidation(state);
    if (state.status === "valid") {
      toast.success(`Valid JSON · ${state.lines} lines`);
    } else if (state.status === "invalid") {
      toast.error(`Error on line ${state.line}, col ${state.col}`);
    }
  }, [input]);

  const sortKeys = useCallback(
    (order: SortOrder) => {
      setSortOrder(order);
      if (!input.trim() || order === "none") return;
      try {
        const value = parseJson(input);
        const sorted = sortJsonKeys(value, order);
        setInput(formatJson(sorted, indent));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sort failed");
      }
    },
    [input, indent],
  );

  const repair = useCallback(() => {
    if (!input.trim()) return;
    setRepairError(null);
    try {
      const result = repairJson(input);
      if (result.wasValid) {
        toast.info("JSON is already valid — no repairs needed");
        setRepairLog([]);
        return;
      }
      setInput(result.fixed);
      setRepairLog(result.changes);
      if (result.changes.length > 0) {
        toast.success(`Fixed ${result.changes.length} issue${result.changes.length !== 1 ? "s" : ""}`);
      }
    } catch (err) {
      const msg = err instanceof RepairError ? err.message : "Could not repair — too many errors";
      setRepairError(msg);
      toast.error(msg);
    }
  }, [input]);

  const deduplicate = useCallback(() => {
    if (!input.trim()) return;
    try {
      const { value, removed } = deduplicateKeys(input);
      if (removed === 0) {
        toast.info("No duplicate keys found");
        return;
      }
      setInput(formatJson(value, indent));
      toast.success(`Removed ${removed} duplicate key${removed !== 1 ? "s" : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deduplication failed");
    }
  }, [input, indent]);

  const convert = useCallback(
    (target: ConvertTarget) => {
      const source = output || input;
      if (!source.trim()) { toast.error("Nothing to convert"); return; }
      try {
        let result: ConversionResult;
        if (target === "csv-to-json") {
          result = fromCSV(source);
        } else if (target === "yaml-to-json") {
          result = fromYAML(source);
        } else {
          const value = parseJson(source);
          switch (target) {
            case "csv": result = toCSV(value); break;
            case "yaml": result = toYAML(value); break;
            case "typescript": result = toTypeScript(value); break;
            case "xml": result = toXML(value); break;
            case "zod": result = toZod(value); break;
            default: throw new Error(`Unknown target: ${target}`);
          }
        }
        setOutput(result.output);
        setConversionResult(result);
        setMinifyStats(null);
        toast.success(`Converted to ${target.toUpperCase()}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Conversion failed");
      }
    },
    [input, output],
  );

  const loadSample = useCallback(
    (key: string) => {
      const sample = SAMPLE_DATA[key];
      if (!sample) return;
      setInput(sample.json);
      setOutput("");
      setMinifyStats(null);
      setConversionResult(null);
      setRepairLog([]);
      setRepairError(null);
      setFileName(null);
    },
    [],
  );

  const clear = useCallback(() => {
    setInput("");
    setOutput("");
    setValidation({ status: "idle" });
    setStats(null);
    setMinifyStats(null);
    setConversionResult(null);
    setRepairLog([]);
    setRepairError(null);
    setFileName(null);
  }, []);

  const copyOutput = useCallback(async () => {
    const text = output || input;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }, [output, input]);

  const downloadOutput = useCallback(
    (fmt: string) => {
      const text = output || input;
      if (!text) return;
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `output.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [output, input],
  );

  const loadFile = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large — maximum 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInput(text);
      setOutput("");
      setMinifyStats(null);
      setConversionResult(null);
      setRepairLog([]);
      setRepairError(null);
      setFileName(`${file.name}  (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.readAsText(file);
  }, []);

  const runQuery = useCallback(() => {
    if (!queryPath || !(parsedOutput ?? parsedValue)) return;
    try {
      const results = queryJsonPath(parsedOutput ?? parsedValue, queryPath);
      setQueryResults(results);
    } catch {
      setQueryResults([]);
    }
  }, [queryPath, parsedOutput, parsedValue]);

  const restoreFromMinify = useCallback(() => {
    if (!output) return;
    try {
      const value = parseJson(output);
      setOutput(formatJson(value, indent));
      setMinifyStats(null);
    } catch {
      // ignore
    }
  }, [output, indent]);

  return {
    // State
    input, setInput,
    output, setOutput,
    indent, setIndent,
    viewMode, setViewMode,
    validation,
    stats,
    sortOrder,
    queryPath, setQueryPath,
    queryResults,
    diffInput, setDiffInput,
    repairLog, repairError,
    isProcessing,
    inputCursor, setInputCursor,
    outputCursor, setOutputCursor,
    conversionResult,
    minifyStats,
    showStats, setShowStats,
    showQuery, setShowQuery,
    fileName,
    treeSearch, setTreeSearch,
    treeExpandAll, setTreeExpandAll,
    treeCollapseAll, setTreeCollapseAll,
    // Derived
    parsedValue,
    parsedOutput,
    isValid,
    canUseTableView,
    // Actions
    format,
    formatFrom,
    minify,
    validate,
    sortKeys,
    repair,
    deduplicate,
    convert,
    loadSample,
    clear,
    copyOutput,
    downloadOutput,
    loadFile,
    runQuery,
    restoreFromMinify,
  };
}

export type JsonFormatterState = ReturnType<typeof useJsonFormatter>;
