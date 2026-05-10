"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type { SortOrder } from "../json-formatter.types";
import {
  validateJson,
  formatJson,
  minifyJson,
  parseJson,
  sortJsonKeys,
  computeStats,
} from "../json-formatter.lib";
import { repairJson, RepairError } from "../json-repair";
import type { JsonState } from "./use-json-state";

export function useJsonFormatActions(state: JsonState) {
  const {
    input, setInput,
    output, setOutput,
    indent,
    sortOrder,
    setSortOrder,
    setValidation, setStats,
    setMinifyStats, setConversionResult,
    setRepairLog, setRepairError,
    setViewMode,
  } = state;

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
  }, [indent, sortOrder, setValidation, setOutput, setMinifyStats, setConversionResult, setStats]);

  const format = useCallback(() => {
    if (!input.trim()) return;
    runFormat(input);
  }, [input, runFormat]);

  const formatFrom = useCallback((raw: string) => {
    if (!raw.trim()) return;
    runFormat(raw);
    setViewMode("tree");
  }, [runFormat, setViewMode]);

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
  }, [input, setOutput, setMinifyStats, setConversionResult]);

  const validate = useCallback(() => {
    const vState = validateJson(input);
    setValidation(vState);
    if (vState.status === "valid") {
      toast.success(`Valid JSON · ${vState.lines} lines`);
    } else if (vState.status === "invalid") {
      toast.error(`Error on line ${vState.line}, col ${vState.col}`);
    }
  }, [input, setValidation]);

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
    [input, indent, setSortOrder, setInput],
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
      runFormat(result.fixed);
      if (result.changes.length > 0) {
        toast.success(`Fixed ${result.changes.length} issue${result.changes.length !== 1 ? "s" : ""}`);
      }
    } catch (err) {
      const msg = err instanceof RepairError ? err.message : "Could not repair — too many errors";
      setRepairError(msg);
      toast.error(msg);
    }
  }, [input, runFormat, setRepairError, setRepairLog, setInput]);

  const restoreFromMinify = useCallback(() => {
    if (!output) return;
    try {
      const value = parseJson(output);
      setOutput(formatJson(value, indent));
      setMinifyStats(null);
    } catch { /* ignore */ }
  }, [output, indent, setOutput, setMinifyStats]);

  return { format, formatFrom, minify, validate, sortKeys, repair, restoreFromMinify, runFormat };
}
