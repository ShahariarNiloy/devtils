"use client";

import { startTransition, useCallback } from "react";
import { toast } from "sonner";
import type { SortOrder } from "../json-formatter.types";
import {
  validateJson,
  formatJson,
  minifyJson,
  parseJson,
  sortJsonKeys,
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
    setValidation,
    setMinifyStats, setConversionResult,
    repairPreview, setRepairPreview,
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
      // Batch setters into a non-urgent transition so the heavy re-render
      // of CodeView / TreeView interleaves with any UI clicks the user just
      // made (button highlight, toast appearance). Stats are derived lazily
      // by the StatsPanel itself, so we don't compute them here.
      startTransition(() => {
        setOutput(formatted);
        setMinifyStats(null);
        setConversionResult(null);
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Format failed");
    }
  }, [indent, sortOrder, setValidation, setOutput, setMinifyStats, setConversionResult]);

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
      startTransition(() => {
        setOutput(result.output);
        setMinifyStats({ before: result.before, after: result.after, savedPct: result.savedPct });
        setConversionResult(null);
      });
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

  /**
   * Run the repair pipeline but DON'T apply the result. We surface a
   * preview that the user can inspect and accept. Even on failure (partial
   * repair) we show what we did manage to fix alongside the actual parse
   * error — that's usually all the user needs to fix the last bit by hand.
   */
  const repair = useCallback(() => {
    if (!input.trim()) return;
    try {
      const result = repairJson(input);
      if (result.wasValid) {
        toast.info("JSON is already valid — no repairs needed");
        return;
      }
      setRepairPreview({
        original: input,
        fixed: result.fixed,
        changes: result.changes,
      });
    } catch (err) {
      if (err instanceof RepairError) {
        setRepairPreview({
          original: input,
          fixed: err.partialFixed,
          changes: err.partialChanges,
          error: err.parseError,
        });
      } else {
        toast.error(err instanceof Error ? err.message : "Repair failed");
      }
    }
  }, [input, setRepairPreview]);

  /** Apply the previewed repair to the input and trigger a format. */
  const applyRepair = useCallback(() => {
    if (!repairPreview) return;
    const { fixed, changes } = repairPreview;
    setInput(fixed);
    setRepairPreview(null);
    // Only attempt to format if the repair actually produced valid JSON.
    // Partial repairs (with an unresolved parse error) get loaded as-is so
    // the user can keep editing in the input pane.
    if (!repairPreview.error) runFormat(fixed);
    toast.success(
      changes.length > 0
        ? `Applied ${changes.length} repair${changes.length !== 1 ? "s" : ""}`
        : "Applied",
    );
  }, [repairPreview, setInput, setRepairPreview, runFormat]);

  const cancelRepair = useCallback(() => setRepairPreview(null), [setRepairPreview]);

  const restoreFromMinify = useCallback(() => {
    if (!output) return;
    try {
      const value = parseJson(output);
      setOutput(formatJson(value, indent));
      setMinifyStats(null);
    } catch { /* ignore */ }
  }, [output, indent, setOutput, setMinifyStats]);

  return {
    format, formatFrom, minify, validate, sortKeys,
    repair, applyRepair, cancelRepair,
    restoreFromMinify, runFormat,
  };
}
