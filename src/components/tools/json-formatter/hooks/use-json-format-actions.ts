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
   * Repair, with a risk-gated flow:
   *   - all-`safe` fixes (reformatting only — quotes, commas; zero data
   *     loss) apply INSTANTLY with an Undo toast. No dialog, no extra click.
   *   - any `lossy`/`structural` fix (Infinity→null, dropped text, wrapped
   *     roots, closed brackets) opens the preview so the user reviews the
   *     data-changing edits before committing.
   *   - a partial repair (still invalid) always opens the preview, since
   *     there's a real error + best-effort result to inspect.
   */
  const repair = useCallback(() => {
    if (!input.trim()) return;
    try {
      const result = repairJson(input);
      if (result.wasValid) {
        toast.info("JSON is already valid — no repairs needed");
        return;
      }

      const hasRisk = result.events.some((e) => e.risk !== "safe");
      if (hasRisk) {
        setRepairPreview({
          original: input,
          fixed: result.fixed,
          changes: result.changes,
          events: result.events,
        });
        return;
      }

      // All safe → apply immediately. Keep the pre-repair input so the toast
      // can offer a one-tap Undo.
      const original = input;
      const n = result.changes.length;
      setInput(result.fixed);
      runFormat(result.fixed);
      toast.success(
        `Fixed ${n} issue${n !== 1 ? "s" : ""}`,
        { action: { label: "Undo", onClick: () => setInput(original) } },
      );
    } catch (err) {
      if (err instanceof RepairError) {
        setRepairPreview({
          original: input,
          fixed: err.partialFixed,
          changes: err.partialChanges,
          events: err.partialEvents,
          error: err.parseError,
        });
      } else {
        toast.error(err instanceof Error ? err.message : "Repair failed");
      }
    }
  }, [input, setRepairPreview, setInput, runFormat]);

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
