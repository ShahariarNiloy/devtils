"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import type {
  ConversionResult,
  CursorPosition,
  IndentStyle,
  MinifyStats,
  RepairPreview,
  SortOrder,
  ValidationState,
  ViewMode,
} from "../json-formatter.types";
import {
  validateJson,
  queryJsonPath,
  isArrayOfObjects,
} from "../json-formatter.lib";
import type { Transform } from "../js-to-json.lib";
import { useAsyncJsToJson } from "./use-async-js-to-json";
import { useAsyncParsed, WORKER_THRESHOLD } from "./use-async-parsed";

/** JS-object → JSON banner state. Non-null when the transformer found a
 *  conversion candidate for the current invalid input. */
export interface JsConversionState {
  /** The strict-JSON output that Apply will swap in. */
  output: string;
  /** Which transforms were applied — shown in the banner. */
  transforms: Transform[];
}

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
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");
  const [queryPath, setQueryPath] = useState("$");
  const [queryResults, setQueryResults] = useState<unknown[]>([]);
  const [diffInput, setDiffInput] = useState("");
  const [repairPreview, setRepairPreview] = useState<RepairPreview | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [inputCursor, setInputCursor] = useState<CursorPosition>({ ln: 1, col: 1 });
  const [outputCursor, setOutputCursor] = useState<CursorPosition>({ ln: 1, col: 1 });
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [minifyStats, setMinifyStats] = useState<MinifyStats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showQuery, setShowQuery] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [treeExpandAll, setTreeExpandAll] = useState<number>(0);
  const [treeCollapseAll, setTreeCollapseAll] = useState<number>(0);
  // null = follow the size-based default; true/false = explicit user choice
  // that then sticks across documents.
  const [wrapOverride, setWrapOverride] = useState<boolean | null>(null);
  const setWrapText = useCallback((v: boolean) => setWrapOverride(v), []);

  // JS → JSON banner: non-null only when the input fails JSON.parse but
  // the transformer can produce a parseable result. Cleared on input
  // change so dismissal doesn't bleed across paste sessions.
  const [jsConversionDismissedFor, setJsConversionDismissedFor] = useState<string | null>(null);

  const deferredInput = useDeferredValue(input);
  const deferredOutput = useDeferredValue(output);

  // Small inputs parse synchronously here (unchanged); large inputs are
  // parsed off the main thread so JSON.parse can't freeze the tab. The
  // worker also reports validity, so large inputs don't get re-parsed on
  // the main thread by the validation pass below.
  const { value: parsedValue, validation: workerValidation } =
    useAsyncParsed(deferredInput);
  const { value: parsedOutput } = useAsyncParsed(deferredOutput);
  const inputIsLarge = input.length > WORKER_THRESHOLD;

  // For large inputs the banner is driven by the worker parse; for small
  // inputs by the synchronous debounced validate below.
  const effectiveValidation: ValidationState = inputIsLarge
    ? workerValidation ?? validation
    : validation;

  const isValid = effectiveValidation.status === "valid";
  const canUseTableView = isArrayOfObjects(parsedOutput ?? parsedValue);

  // Wrap is on by default for normal-size docs (readability) and off for
  // large ones (keep the virtualized fast path). An explicit toggle wins.
  const wrapText = wrapOverride ?? !inputIsLarge;

  const validateDebounced = useMemo(
    () =>
      debounce((...args: unknown[]) => {
        const raw = args[0] as string;
        // Validation result drives the red banner — keep it urgent. Stats
        // are *not* computed here anymore: that walk used to fire on every
        // 300ms debounce cycle regardless of whether the user had the Stats
        // panel open. StatsPanel now derives its own stats lazily on mount.
        setValidation(validateJson(raw));
      }, 300),
    [],
  );

  // Only the synchronous (small-input) path runs the main-thread parse.
  // Large inputs are validated by the worker (see workerValidation) so we
  // don't freeze the tab re-parsing the whole document just for the banner.
  useEffect(() => {
    if (!inputIsLarge) validateDebounced(input);
  }, [input, inputIsLarge, validateDebounced]);

  // JS → JSON detection. Runs the transform in the JSON worker so even
  // multi-MB inputs leave the main thread paint-able — the banner spinner
  // actually spins. The hook fires only when the gate below is true; when
  // the gate flips off the hook drops its result so dismissals and edits
  // never leave a stale banner behind.
  const jsConversionEnabled =
    effectiveValidation.status === "invalid" &&
    jsConversionDismissedFor !== input;
  const jsTransform = useAsyncJsToJson(input, jsConversionEnabled);
  const jsConversion: JsConversionState | null = jsTransform.result;
  const isAnalysingJs = jsTransform.isAnalysing;

  const applyJsConversion = useCallback(() => {
    const r = jsTransform.result;
    // Only apply a conversion computed for the CURRENT input — never a stale
    // one from text the user has since edited.
    if (!r || r.forInput !== input) return;
    setInput(r.output);
    setJsConversionDismissedFor(null);
  }, [jsTransform.result, input]);

  const dismissJsConversion = useCallback(() => {
    setJsConversionDismissedFor(input);
  }, [input]);

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

  const setValidationExternal = useCallback((v: ValidationState) => setValidation(v), []);
  const setRepairPreviewExternal = useCallback((p: RepairPreview | null) => setRepairPreview(p), []);
  const setConversionResultExternal = useCallback((r: ConversionResult | null) => setConversionResult(r), []);
  const setMinifyStatsExternal = useCallback((m: MinifyStats | null) => setMinifyStats(m), []);
  const setFileNameExternal = useCallback((n: string | null) => setFileName(n), []);
  const setSortOrderExternal = useCallback((o: SortOrder) => setSortOrder(o), []);

  return {
    input, setInput,
    output, setOutput,
    indent, setIndent,
    viewMode, setViewMode,
    validation: effectiveValidation,
    setValidation: setValidationExternal,
    sortOrder,
    setSortOrder: setSortOrderExternal,
    queryPath, setQueryPath,
    queryResults, setQueryResults,
    diffInput, setDiffInput,
    repairPreview,
    setRepairPreview: setRepairPreviewExternal,
    isConverting, setIsConverting,
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
    wrapText, setWrapText,
    parsedValue,
    parsedOutput,
    isValid,
    canUseTableView,
    jsConversion,
    isAnalysingJs,
    applyJsConversion,
    dismissJsConversion,
  };
}

export type JsonState = ReturnType<typeof useJsonState>;
