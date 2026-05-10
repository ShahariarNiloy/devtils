"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type { ConvertTarget } from "../json-formatter.types";
import { parseJson, queryJsonPath, SAMPLE_DATA } from "../json-formatter.lib";
import { toCSV, toYAML, toTypeScript, toXML, toZod, fromCSV, fromYAML } from "../json-convert";
import type { JsonState } from "./use-json-state";

export function useJsonIoActions(state: JsonState) {
  const {
    input, setInput,
    output, setOutput,
    parsedValue, parsedOutput,
    setValidation, setStats,
    setMinifyStats, setConversionResult,
    setRepairLog, setRepairError,
    setFileName,
    setQueryResults,
    queryPath,
  } = state;

  const convert = useCallback(
    (target: ConvertTarget) => {
      const source = output || input;
      if (!source.trim()) { toast.error("Nothing to convert"); return; }
      try {
        let result;
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
    [input, output, setOutput, setConversionResult, setMinifyStats],
  );

  const loadSample = useCallback((key: string) => {
    const sample = SAMPLE_DATA[key];
    if (!sample) return;
    setInput(sample.json);
    setOutput("");
    setMinifyStats(null);
    setConversionResult(null);
    setRepairLog([]);
    setRepairError(null);
    setFileName(null);
  }, [setInput, setOutput, setMinifyStats, setConversionResult, setRepairLog, setRepairError, setFileName]);

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
  }, [setInput, setOutput, setValidation, setStats, setMinifyStats, setConversionResult, setRepairLog, setRepairError, setFileName]);

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
      setRepairLog([]);
      setRepairError(null);
      setFileName(`${file.name}  (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.readAsText(file);
  }, [setInput, setOutput, setMinifyStats, setConversionResult, setRepairLog, setRepairError, setFileName]);

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
