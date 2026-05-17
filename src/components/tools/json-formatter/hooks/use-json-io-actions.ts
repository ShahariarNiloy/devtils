"use client";

import { startTransition, useCallback } from "react";
import { toast } from "sonner";
import type { ConvertTarget } from "../json-formatter.types";
import { parseJson, queryJsonPath, SAMPLE_DATA } from "../json-formatter.lib";
import {
  toCSV,
  toYAML,
  toTypeScript,
  toXML,
  toZod,
  toJsonSchema,
  toGo,
  toPython,
  toRust,
} from "../json-convert";
import { runConversion } from "../convert-client";
import { WORKER_THRESHOLD } from "./use-async-parsed";
import type { ConversionResult } from "../json-formatter.types";
import type { JsonState } from "./use-json-state";

function runForward(target: ConvertTarget, value: unknown): ConversionResult {
  switch (target) {
    case "csv": return toCSV(value);
    case "yaml": return toYAML(value);
    case "typescript": return toTypeScript(value);
    case "xml": return toXML(value);
    case "zod": return toZod(value);
    case "schema": return toJsonSchema(value);
    case "go": return toGo(value);
    case "python": return toPython(value);
    case "rust": return toRust(value);
    default: throw new Error(`Unknown target: ${target as string}`);
  }
}

export function useJsonIoActions(state: JsonState) {
  const {
    input, setInput,
    output, setOutput,
    parsedValue, parsedOutput,
    conversionResult,
    setValidation,
    setMinifyStats, setConversionResult,
    setRepairPreview,
    setFileName,
    setQueryResults,
    setViewMode,
    setIsConverting,
    queryPath,
  } = state;

  const applyResult = useCallback(
    (result: ConversionResult, target: ConvertTarget) => {
      // Batch the state writes into a transition so the heavy CodeView
      // re-render interleaves with paint. Flip back to Code — the result
      // is text in a foreign format, so Tree/Table would render the prior
      // parsed JSON, not the conversion result.
      startTransition(() => {
        setOutput(result.output);
        setConversionResult(result);
        setMinifyStats(null);
        setViewMode("code");
      });
      toast.success(`Converted to ${target.toUpperCase()}`);
    },
    [setOutput, setConversionResult, setMinifyStats, setViewMode],
  );

  const convert = useCallback(
    (target: ConvertTarget) => {
      // The current JSON text: prefer `output` only when it's still JSON
      // (format/minify/sort/repair). After a previous convert it's a foreign
      // format, so fall back to the raw input.
      const jsonText =
        output.trim() && !conversionResult ? output : input;
      if (!jsonText.trim()) {
        toast.error("Nothing to convert");
        return;
      }

      // Small inputs convert synchronously (instant, no loader) — unchanged
      // behaviour. Large inputs go to the worker so the JSON → X walk never
      // freezes the tab; only the resulting string crosses back.
      if (jsonText.length <= WORKER_THRESHOLD) {
        try {
          let value: unknown = parsedOutput ?? parsedValue;
          if (value === null || value === undefined) value = parseJson(jsonText);
          applyResult(runForward(target, value), target);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Conversion failed");
        }
        return;
      }

      setIsConverting(true);
      runConversion(target, jsonText)
        .then((result) => applyResult(result, target))
        .catch((err: unknown) =>
          toast.error(
            err instanceof Error ? err.message : "Conversion failed",
          ),
        )
        .finally(() => setIsConverting(false));
    },
    [
      input,
      output,
      conversionResult,
      parsedValue,
      parsedOutput,
      setIsConverting,
      applyResult,
    ],
  );

  const loadSample = useCallback((key: string) => {
    const sample = SAMPLE_DATA[key];
    if (!sample) return;
    setInput(sample.json);
    setOutput("");
    setMinifyStats(null);
    setConversionResult(null);
    setRepairPreview(null);
    setFileName(null);
  }, [setInput, setOutput, setMinifyStats, setConversionResult, setRepairPreview, setFileName]);

  const clear = useCallback(() => {
    setInput("");
    setOutput("");
    setValidation({ status: "idle" });
    setMinifyStats(null);
    setConversionResult(null);
    setRepairPreview(null);
    setFileName(null);
  }, [setInput, setOutput, setValidation, setMinifyStats, setConversionResult, setRepairPreview, setFileName]);

  const copyOutput = useCallback(async () => {
    const text = output || input;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }, [output, input]);

  const downloadOutput = useCallback((fmt: string) => {
    const text = output || input;
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `output.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [output, input]);

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
      setRepairPreview(null);
      setFileName(`${file.name}  (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.readAsText(file);
  }, [setInput, setOutput, setMinifyStats, setConversionResult, setRepairPreview, setFileName]);

  const runQuery = useCallback(() => {
    if (!queryPath || !(parsedOutput ?? parsedValue)) return;
    try {
      setQueryResults(queryJsonPath(parsedOutput ?? parsedValue, queryPath));
    } catch {
      setQueryResults([]);
    }
  }, [queryPath, parsedOutput, parsedValue, setQueryResults]);

  return { convert, loadSample, clear, copyOutput, downloadOutput, loadFile, runQuery };
}
