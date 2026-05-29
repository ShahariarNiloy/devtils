"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ConversionResult,
  ConvertTarget,
} from "@/components/tools/json-formatter/json-formatter.types";
import { runConversion } from "@/components/tools/json-formatter/convert-client";
import { consumeHandoffInput } from "./handoff";

/**
 * Above this byte count the converter dispatches to a Web Worker rather than
 * running on the main thread. Picked from real-world experiments: at ~50KB
 * the schema walk + emitter passes start to take long enough that a fast
 * typist sees keystroke latency on the main thread. The worker has ~5ms
 * postMessage overhead, which dominates below this threshold — so small
 * inputs stay synchronous to keep latency invisible.
 */
const WORKER_THRESHOLD = 50_000;

export interface ParseState {
  parsed: unknown;
  error: { message: string; line?: number; col?: number } | null;
}

export interface UseConverterArgs {
  /**
   * Pure conversion function: parsed input → result. Runs synchronously on
   * the main thread for small inputs. The function should not have side
   * effects.
   */
  convert: (value: unknown) => ConversionResult;
  /**
   * Custom input parser. Defaults to `JSON.parse(text.trim())` for forward
   * (JSON → X) conversions. Pass `yaml.load` or a CSV parser for reverse
   * directions. The function should throw on invalid input — the error
   * surfaces in the parse status pill.
   */
  parseInput?: (text: string) => unknown;
  /**
   * Target + options for the worker dispatch path. When set, large inputs
   * (above WORKER_THRESHOLD) run in the worker instead of on the main thread.
   * When omitted, the hook always runs synchronously. Disable for reverse
   * directions, where the worker doesn't know how to parse non-JSON inputs.
   */
  worker?: {
    target: ConvertTarget;
    options: unknown;
  };
  /** Initial input value (e.g. a default sample). */
  initialInput?: string;
}

export interface UseConverterState {
  input: string;
  setInput: (v: string) => void;
  loadInput: (v: string) => void;
  clearInput: () => void;
  parse: ParseState;
  output: string;
  outputResult: ConversionResult | null;
  conversionError: string | null;
  inputBytes: number;
  outputBytes: number;
  isComputing: boolean;
}

function locateParseError(input: string, message: string) {
  const posMatch = message.match(/position (\d+)/i)
    || message.match(/at position (\d+)/i)
    || message.match(/at (\d+)/i);
  if (!posMatch) return { line: undefined, col: undefined };
  const pos = Number(posMatch[1]);
  let line = 1;
  let col = 1;
  for (let i = 0; i < pos && i < input.length; i++) {
    if (input.charCodeAt(i) === 10) { line++; col = 1; }
    else { col++; }
  }
  return { line, col };
}

export function useConverter({
  convert,
  parseInput,
  worker,
  initialInput = "",
}: UseConverterArgs): UseConverterState {
  const [input, setInput] = useState(initialInput);

  const loadInput = useCallback((v: string) => setInput(v), []);
  const clearInput = useCallback(() => setInput(""), []);

  useEffect(() => {
    const handoff = consumeHandoffInput();
    // One-shot read on mount — intentional setState; React's strict rule
    // assumes this is wrong, but for an external-state pull (sessionStorage
    // hand-off from the JSON formatter) it's the simplest correct shape.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (handoff !== null) setInput(handoff);
  }, []);

  const parse = useMemo<ParseState>(() => {
    const trimmed = input.trim();
    if (!trimmed) return { parsed: null, error: null };
    try {
      const parser = parseInput ?? ((text: string) => JSON.parse(text.trim()) as unknown);
      return { parsed: parser(input), error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const { line, col } = locateParseError(input, message);
      return { parsed: null, error: { message, line, col } };
    }
  }, [input, parseInput]);

  // ── Synchronous path (small inputs) ──────────────────────────────────────
  const syncResult = useMemo(() => {
    if (parse.error || parse.parsed === null) return null;
    if (worker && input.length >= WORKER_THRESHOLD) return null;
    try {
      return convert(parse.parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: message } as const;
    }
  }, [parse, convert, worker, input.length]);

  // ── Worker path (large inputs) ───────────────────────────────────────────
  const [asyncResult, setAsyncResult] = useState<
    ConversionResult | { error: string } | null
  >(null);
  const [isComputing, setIsComputing] = useState(false);
  const workerSeq = useRef(0);

  // Stash worker options in a ref so changes don't break the run effect's
  // identity — the effect already depends on parse + input.length, and we
  // re-fire when the JSON-stringified options actually change.
  const workerOptionsKey = useMemo(
    () => (worker ? `${worker.target}::${JSON.stringify(worker.options)}` : ""),
    [worker],
  );

  useEffect(() => {
    if (!worker) return;
    if (parse.error || parse.parsed === null) return;
    if (input.length < WORKER_THRESHOLD) return;
    const id = ++workerSeq.current;
    // The worker run IS the external system this effect synchronises with —
    // these setStates are the callback path the lint rule explicitly carves
    // out. Re-disable for the synchronous isComputing flip below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsComputing(true);
    runConversion(worker.target, input, worker.options)
      .then((result) => {
        if (id !== workerSeq.current) return; // superseded
        setAsyncResult(result);
        setIsComputing(false);
      })
      .catch((err: unknown) => {
        if (id !== workerSeq.current) return;
        setAsyncResult({
          error: err instanceof Error ? err.message : "Conversion failed",
        });
        setIsComputing(false);
      });
    // `input` is the JSON text we send to the worker; `workerOptionsKey`
    // captures option changes; `parse` covers validity transitions. `worker`
    // itself isn't deeply compared — its target rarely changes for a given
    // tool, so identity is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, parse, workerOptionsKey]);

  // ── Pick the active result ───────────────────────────────────────────────
  const result = syncResult ?? asyncResult;

  const { output, outputResult, conversionError } = useMemo<{
    output: string;
    outputResult: ConversionResult | null;
    conversionError: string | null;
  }>(() => {
    if (!result) return { output: "", outputResult: null, conversionError: null };
    if ("error" in result) {
      return { output: "", outputResult: null, conversionError: result.error };
    }
    return { output: result.output, outputResult: result, conversionError: null };
  }, [result]);

  const inputBytes = useMemo(() => new Blob([input]).size, [input]);
  const outputBytes = outputResult?.size ?? 0;

  return {
    input,
    setInput,
    loadInput,
    clearInput,
    parse,
    output,
    outputResult,
    conversionError,
    inputBytes,
    outputBytes,
    isComputing,
  };
}
