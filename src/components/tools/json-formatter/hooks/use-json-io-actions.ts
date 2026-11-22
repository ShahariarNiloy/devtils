"use client";

import { startTransition, useCallback, useRef } from "react";
import { toast } from "sonner";
import { flushPendingEdits } from "@/components/primitives/code-editor";
import type { ConvertTarget } from "../json-formatter.types";
import { parseJson, SAMPLE_DATA } from "../json-formatter.lib";
// Code generators + js-yaml load on the first Convert, not with the page.
const loadConvert = () => import("../json-convert");
import { runConversion } from "../convert-client";
import { encodeUtf8Steps } from "../json-sliced.lib";
import { runSliced, type SlicedJob } from "../run-sliced";
import { WORKER_THRESHOLD } from "./use-async-parsed";
import type { ConversionResult } from "../json-formatter.types";
import type { JsonState } from "./use-json-state";

/**
 * Upload cap. The editor (virtualized) and the worker parse handle tens of
 * MB; 50 MB keeps a single document well inside the tab's memory budget.
 */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

const formatFileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;

export function useJsonIoActions(state: JsonState) {
  const {
    input, setInput, getLatestInput,
    output, setOutput,
    parsedValue, parsedOutput,
    conversionResult,
    setValidation,
    setMinifyStats, setConversionResult,
    setRepairPreview,
    setFileName,
    setViewMode,
    setIsConverting,
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
        let value: unknown = parsedOutput ?? parsedValue;
        loadConvert()
          .then(({ convertValue }) => {
            if (value === null || value === undefined) value = parseJson(jsonText);
            applyResult(convertValue(target, value), target);
          })
          .catch((err: unknown) => {
            toast.error(err instanceof Error ? err.message : "Conversion failed");
          });
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
    // Deliver a pending debounced edit now, so it can't land after the clear.
    flushPendingEdits();
    setInput("");
    setOutput("");
    setValidation({ status: "idle" });
    setMinifyStats(null);
    setConversionResult(null);
    setRepairPreview(null);
    setFileName(null);
  }, [setInput, setOutput, setValidation, setMinifyStats, setConversionResult, setRepairPreview, setFileName]);

  /**
   * What Copy / Download hand out: the output, or the input when there's
   * none. Flushes a pending editor edit first (keyboard shortcuts keep focus
   * in the editor); if that edit changed the input, the output on screen is
   * stale, so the live input is used.
   */
  const currentText = useCallback(() => {
    flushPendingEdits();
    const live = getLatestInput();
    return (live === input ? output : "") || live;
  }, [getLatestInput, input, output]);

  const copyOutput = useCallback(async () => {
    const text = currentText();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }, [currentText]);

  // Latest download wins (a second click while a big one encodes replaces it).
  const downloadJob = useRef<SlicedJob<Uint8Array<ArrayBuffer>[]> | null>(null);
  const downloadOutput = useCallback((fmt: string) => {
    const text = currentText();
    if (!text) return;
    const save = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `output.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
    };
    downloadJob.current?.cancel();
    downloadJob.current = null;
    if (text.length <= WORKER_THRESHOLD) {
      save(new Blob([text], { type: "text/plain" }));
      return;
    }
    // `new Blob([text])` UTF-8-encodes the whole string in one task (~200 ms
    // at 50 MB); encode it in slices instead — the same bytes.
    const job = runSliced(encodeUtf8Steps(text));
    downloadJob.current = job;
    void job.promise.then((parts) => {
      if (downloadJob.current === job) downloadJob.current = null;
      save(new Blob(parts, { type: "text/plain" }));
    });
  }, [currentText]);

  const loadFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File too large — maximum 50 MB", {
        description: `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
      });
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
      setFileName(`${file.name}  (${formatFileSize(file.size)})`);
    };
    reader.readAsText(file);
  }, [setInput, setOutput, setMinifyStats, setConversionResult, setRepairPreview, setFileName]);

  return { convert, loadSample, clear, copyOutput, downloadOutput, loadFile };
}
