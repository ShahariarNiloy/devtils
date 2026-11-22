"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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
  isArrayOfObjects,
} from "../json-formatter.lib";
import { tryJsToJson, type Transform } from "../js-to-json.lib";
import { useAsyncJsToJson } from "./use-async-js-to-json";
import { useAsyncParsed, WORKER_THRESHOLD } from "./use-async-parsed";
import { useImpreciseCount } from "./use-imprecise-count";
import { cancelWorkerAction } from "../json-worker-client";

/** JS-object → JSON banner state. Non-null when the transformer found a
 *  conversion candidate for the current invalid input. */
export interface JsConversionState {
  /** The strict-JSON output that Apply will swap in. */
  output: string;
  /** Which transforms were applied — shown in the banner. */
  transforms: Transform[];
}

/** A heavy action running in the JSON worker (large inputs only). */
export type BusyAction = "format" | "minify" | "sort" | "repair" | "validate";

/** Busy labels appear only for jobs that outlast this — no flash on fast ones. */
const BUSY_REVEAL_MS = 150;

interface ActionJob {
  id: number;
  kind: BusyAction;
  /** Inputs this job is still valid for; once the input is anything else the
   *  job is stale and its busy state disappears (its result is dropped). */
  sources: readonly string[];
  /** The result will replace the input (large paste) — hold off parsing it. */
  replacesInput: boolean;
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function useJsonState() {
  const [input, setInputRaw] = useState("");
  // The result of the last action (Format, Minify, Convert, Repair, paste)
  // and the exact input text it was produced from. Once the input changes,
  // that result is stale: the views fall back to the live input instead of
  // showing data that's no longer in the editor (e.g. after clearing it).
  // `sameValue`: the output is a whitespace-only rewrite of that input
  // (Format / Minify / Repair+Format with source key order), so it parses to
  // the same value — the views reuse the input's parse instead of parsing
  // (and, for large docs, structured-cloning) the same tree a second time.
  const [outputState, setOutputState] = useState<{ text: string; source: string; sameValue: boolean }>({
    text: "",
    source: "",
    sameValue: false,
  });
  // Latest input written this tick — set synchronously so an action that
  // calls setInput(x) then setOutput(y) in one go ties y to x, not to the
  // previous render's input.
  const latestInput = useRef("");
  const setInput = useCallback((v: string) => {
    latestInput.current = v;
    setInputRaw(v);
  }, []);
  const setOutput = useCallback((v: string, sameValue = false) => {
    setOutputState({ text: v, source: latestInput.current, sameValue });
  }, []);
  const getLatestInput = useCallback(() => latestInput.current, []);
  const outputIsCurrent = outputState.text !== "" && outputState.source === input;
  const output = outputIsCurrent ? outputState.text : "";
  const outputSameValue = outputIsCurrent && outputState.sameValue;

  // ── Worker action jobs (large inputs) ──────────────────────────────────────
  // One job at a time: starting any action (sync or async) supersedes the
  // previous one, whose result is then dropped by id.
  const jobSeq = useRef(0);
  const [job, setJob] = useState<ActionJob | null>(null);
  const [revealedJob, setRevealedJob] = useState(0);
  /** Supersede whatever is running. Returns the new job id. */
  const startJob = useCallback(
    (kind: BusyAction | null, sources: readonly string[] = [], replacesInput = false) => {
      const id = ++jobSeq.current;
      // A synchronous action supersedes a running worker job: stop it.
      if (!kind) cancelWorkerAction();
      setJob(kind ? { id, kind, sources, replacesInput } : null);
      return id;
    },
    [],
  );
  const isJobCurrent = useCallback((id: number) => id === jobSeq.current, []);
  const endJob = useCallback((id: number) => {
    setJob((j) => (j && j.id === id ? null : j));
  }, []);
  useEffect(() => {
    if (!job) return;
    const t = setTimeout(() => setRevealedJob(job.id), BUSY_REVEAL_MS);
    return () => clearTimeout(t);
  }, [job]);
  const jobLive = job !== null && job.sources.includes(input);
  /** Set immediately while a worker action is pending for the current input. */
  const actionPending: BusyAction | null = jobLive ? job.kind : null;
  /** Same, but only once the job has run past BUSY_REVEAL_MS (for labels). */
  const busyAction: BusyAction | null = jobLive && revealedJob === job.id ? job.kind : null;
  const [indent, setIndent] = useState<IndentStyle>("2");
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [validation, setValidation] = useState<ValidationState>({ status: "idle" });
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");
  const [diffInput, setDiffInput] = useState("");
  const [repairPreview, setRepairPreview] = useState<RepairPreview | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [inputCursor, setInputCursor] = useState<CursorPosition>({ ln: 1, col: 1 });
  const [outputCursor, setOutputCursor] = useState<CursorPosition>({ ln: 1, col: 1 });
  const [conversionResultState, setConversionResult] = useState<ConversionResult | null>(null);
  const [minifyStatsState, setMinifyStats] = useState<MinifyStats | null>(null);
  // Results describe the output above, so they go stale with it.
  const conversionResult = outputIsCurrent ? conversionResultState : null;
  const minifyStats = outputIsCurrent ? minifyStatsState : null;
  const [showStats, setShowStats] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [schemaText, setSchemaText] = useState("");
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
  // Also hold while the deferred text lags a newer input (e.g. the render
  // right after a large paste's formatted text lands): that parse would be
  // stale on arrival, and its tree costs the main thread to receive.
  const holdParse =
    (deferredInput !== input && deferredInput.length > WORKER_THRESHOLD) ||
    (job !== null && job.replacesInput && job.sources.includes(deferredInput));
  const { value: parsedValue, validation: workerValidation, validationFor } =
    useAsyncParsed(deferredInput, holdParse);
  // After a plain paste/format the output is the input's text — reuse that
  // parse instead of parsing the same document twice.
  const outputSameAsInput = outputSameValue || deferredOutput === deferredInput;
  const { value: parsedOutputOwn } = useAsyncParsed(outputSameAsInput ? "" : deferredOutput);
  const parsedOutput = outputSameAsInput ? parsedValue : parsedOutputOwn;
  const inputIsLarge = input.length > WORKER_THRESHOLD;

  // For large inputs the banner is driven by the worker parse; for small
  // inputs by the synchronous debounced validate below.
  const effectiveValidation: ValidationState = inputIsLarge
    ? workerValidation ?? validation
    : validation;

  const isValid = effectiveValidation.status === "valid";

  // Tree / Table / Graph / Path render JS values, so numbers beyond double
  // precision show rounded there. Count them so the panel can say so
  // honestly. Code view, Copy and Download keep the exact source digits, so
  // the scan is skipped while Code view is active.
  // A same-value output keeps every number token verbatim (or had none to
  // lose), so its count is the input's — no rescan after Format / Minify.
  const precisionSource = conversionResult || outputSameValue ? deferredInput : deferredOutput || deferredInput;
  const impreciseNumbers = useImpreciseCount(viewMode === "code" ? "" : precisionSource);
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
  // Large inputs: only once the worker's verdict is for THIS text — a stale
  // "invalid" from the previous document (e.g. right after Repair) would
  // otherwise launch a multi-second JS → JSON check on valid JSON.
  const jsConversionEnabled =
    effectiveValidation.status === "invalid" &&
    (!inputIsLarge || validationFor === input) &&
    jsConversionDismissedFor !== input;
  const jsTransform = useAsyncJsToJson(input, jsConversionEnabled);
  const jsConversion: JsConversionState | null = jsTransform.result;
  const isAnalysingJs = jsTransform.isAnalysing;

  const applyJsConversion = useCallback(() => {
    // Recompute synchronously on the CURRENT input. The banner is sticky —
    // it stays visible while you keep typing — so the worker-computed result
    // may lag a few keystrokes behind. Converting fresh here guarantees Apply
    // always acts on exactly what's on screen, never a stale snapshot.
    const r = tryJsToJson(input);
    if (r.ok && r.output) {
      setInput(r.output);
      setJsConversionDismissedFor(null);
    }
  }, [input, setInput]);

  const dismissJsConversion = useCallback(() => {
    setJsConversionDismissedFor(input);
  }, [input]);


  const setValidationExternal = useCallback((v: ValidationState) => setValidation(v), []);
  const setRepairPreviewExternal = useCallback((p: RepairPreview | null) => setRepairPreview(p), []);
  const setConversionResultExternal = useCallback((r: ConversionResult | null) => setConversionResult(r), []);
  const setMinifyStatsExternal = useCallback((m: MinifyStats | null) => setMinifyStats(m), []);
  const setFileNameExternal = useCallback((n: string | null) => setFileName(n), []);
  const setSortOrderExternal = useCallback((o: SortOrder) => setSortOrder(o), []);

  return {
    input, setInput, getLatestInput,
    output, setOutput,
    startJob, isJobCurrent, endJob,
    actionPending, busyAction,
    indent, setIndent,
    viewMode, setViewMode,
    validation: effectiveValidation,
    setValidation: setValidationExternal,
    sortOrder,
    setSortOrder: setSortOrderExternal,
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
    showSchema, setShowSchema,
    schemaText, setSchemaText,
    fileName,
    setFileName: setFileNameExternal,
    treeExpandAll, setTreeExpandAll,
    treeCollapseAll, setTreeCollapseAll,
    wrapText, setWrapText,
    parsedValue,
    /** The text `parsedValue` was parsed from (deferred input). */
    parsedSource: deferredInput,
    parsedOutput,
    impreciseNumbers,
    isValid,
    canUseTableView,
    jsConversion,
    isAnalysingJs,
    applyJsConversion,
    dismissJsConversion,
  };
}

export type JsonState = ReturnType<typeof useJsonState>;
