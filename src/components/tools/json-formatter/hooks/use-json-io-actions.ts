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
  fromCSV,
  fromYAML,
} from "../json-convert";
import type { JsonState } from "./use-json-state";

export function useJsonIoActions(state: JsonState) {
  const {
    input, setInput,
    output, setOutput,
    parsedValue, parsedOutput,
    setValidation,
    setMinifyStats, setConversionResult,
    setRepairPreview,
    setFileName,
    setQueryResults,
    setViewMode,
    queryPath,
  } = state;

  const convert = useCallback(
    (target: ConvertTarget) => {
      const isReverse = target === "csv-to-json" || target === "yaml-to-json";

      try {
        let result;
        if (isReverse) {
          // Reverse conversions need the raw paste — `output` is stale
          // (it's the previous convert's result, not CSV/YAML).
          if (!input.trim()) { toast.error("Nothing to convert"); return; }
          result = target === "csv-to-json" ? fromCSV(input) : fromYAML(input);
        } else {
          // Forward (JSON → X): cascade through already-parsed values so we
          // never re-parse a stale `output` that's no longer JSON (the
          // breakage the user hit after a previous convert).
          //   parsedOutput  – latest format / minify / repair result
          //   parsedValue   – parsed input (what they typed/pasted)
          //   parseJson(input) – last-resort if deferred memo hasn't caught up
          let value: unknown = parsedOutput ?? parsedValue;
          if (value === null || value === undefined) {
            if (!input.trim()) { toast.error("Nothing to convert"); return; }
            value = parseJson(input);
          }

          switch (target) {
            case "csv": result = toCSV(value); break;
            case "yaml": result = toYAML(value); break;
            case "typescript": result = toTypeScript(value); break;
            case "xml": result = toXML(value); break;
            case "zod": result = toZod(value); break;
            case "schema": result = toJsonSchema(value); break;
            case "go": result = toGo(value); break;
            case "python": result = toPython(value); break;
            case "rust": result = toRust(value); break;
            default: throw new Error(`Unknown target: ${target}`);
          }
        }

        // Batch the state writes into a transition so the heavy CodeView
        // re-render interleaves with paint. Also flip the view back to
        // Code — the converted output is text in a foreign format, so
        // Tree/Table/Grid would render the prior parsed JSON, not the
        // conversion result.
        startTransition(() => {
          setOutput(result.output);
          setConversionResult(result);
          setMinifyStats(null);
          setViewMode("code");
        });
        toast.success(`Converted to ${target.toUpperCase()}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Conversion failed");
      }
    },
    [input, parsedValue, parsedOutput, setOutput, setConversionResult, setMinifyStats, setViewMode],
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
