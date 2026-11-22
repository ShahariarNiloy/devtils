"use client";

import { startTransition, useCallback } from "react";
import { toast } from "sonner";
import { flushPendingEdits } from "@/components/primitives/code-editor";
import type { IndentStyle, RepairPreview, SortOrder, ValidationState } from "../json-formatter.types";
import {
  validateJson,
  formatJsonText,
  minifyJson,
} from "../json-formatter.lib";
import { repairJson, RepairError } from "../json-repair";
import type { RepairResult } from "../json-formatter.types";
import { runWorkerAction, WORKER_THRESHOLD } from "../json-worker-client";
import type { ActionOp, ActionResult } from "../json-worker-protocol";
import type { BusyAction, JsonState } from "./use-json-state";

/** Large texts go to the JSON worker; small ones stay synchronous (instant). */
const isLarge = (s: string) => s.length > WORKER_THRESHOLD;

/** CodeMirror stores line breaks as "\n"; a pasted doc reads back that way. */
const normalizeBreaks = (s: string) => s.replace(/\r\n?/g, "\n");

export function useJsonFormatActions(state: JsonState) {
  const {
    input, setInput, getLatestInput,
    output, setOutput,
    indent, setIndent,
    sortOrder,
    conversionResult, minifyStats,
    setSortOrder,
    setValidation,
    setMinifyStats, setConversionResult,
    repairPreview, setRepairPreview,
    setViewMode,
    startJob, isJobCurrent, endJob,
  } = state;

  /**
   * The input as the editor holds it right now. The shared editor debounces
   * edits on big documents, so a keyboard shortcut fired mid-typing would
   * otherwise act on the text from before the last keystrokes: deliver the
   * pending edit, then read the ref `setInput` updates synchronously (this
   * render's `input` closure is still the old value).
   */
  const liveInput = useCallback(() => {
    flushPendingEdits();
    return getLatestInput();
  }, [getLatestInput]);

  /**
   * Run `op` in the worker and hand the result to `apply` — unless a newer
   * action superseded it or the input changed meanwhile (typing during a
   * long job never applies stale output). `sources` are the inputs the job
   * stays valid for (default: the input at dispatch).
   */
  const dispatch = useCallback(
    (
      kind: BusyAction,
      op: ActionOp,
      apply: (r: ActionResult) => void,
      opts: { sources?: readonly string[]; replacesInput?: boolean } = {},
    ) => {
      const sources = opts.sources ?? [getLatestInput()];
      const id = startJob(kind, sources, opts.replacesInput ?? false);
      void runWorkerAction(op).then((r) => {
        endJob(id);
        if (r.status === "superseded" || !isJobCurrent(id)) return;
        if (!sources.includes(getLatestInput())) return;
        apply(r);
      });
    },
    [getLatestInput, startJob, endJob, isJobCurrent],
  );

  const showFormatted = useCallback(
    (formatted: string, sameValue: boolean) => {
      // Batch setters into a non-urgent transition so the heavy re-render
      // of CodeView / TreeView interleaves with any UI clicks the user just
      // made (button highlight, toast appearance). Stats are derived lazily
      // by the StatsPanel itself, so we don't compute them here.
      startTransition(() => {
        setOutput(formatted, sameValue);
        setMinifyStats(null);
        setConversionResult(null);
      });
    },
    [setOutput, setMinifyStats, setConversionResult],
  );

  const rejectInvalid = useCallback(
    (vState: Extract<ValidationState, { status: "invalid" }>) => {
      setValidation(vState);
      toast.error("Invalid JSON — fix the error before formatting");
    },
    [setValidation],
  );

  const runFormat = useCallback((raw: string, order: SortOrder = sortOrder, indentStyle: IndentStyle = indent) => {
    const sameValue = order === "none";
    if (isLarge(raw)) {
      dispatch(order === "none" ? "format" : "sort", { op: "format", src: raw, indent: indentStyle, sort: order, validate: true }, (r) => {
        if (r.status === "invalid") rejectInvalid(r.validation);
        else if (r.status === "error") toast.error(r.message);
        else if (r.status === "formatted") showFormatted(r.output, sameValue);
      });
      return;
    }
    startJob(null);
    const vState = validateJson(raw);
    if (vState.status === "invalid") {
      rejectInvalid(vState);
      return;
    }
    try {
      showFormatted(formatJsonText(raw, indentStyle, order), sameValue);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Format failed");
    }
  }, [indent, sortOrder, dispatch, startJob, rejectInvalid, showFormatted]);

  /**
   * Change the indent and, if the output on screen is a Format / Sort result
   * of the current input, re-format it right away so the choice is visible.
   * Minified or converted output is left as is (indent doesn't apply).
   */
  const changeIndent = useCallback((next: IndentStyle) => {
    setIndent(next);
    const cur = liveInput();
    // An edit just flushed makes the output on screen stale — nothing to re-indent.
    if (cur !== input || !output || conversionResult || minifyStats || !cur.trim()) return;
    runFormat(cur, sortOrder, next);
  }, [setIndent, liveInput, output, conversionResult, minifyStats, input, sortOrder, runFormat]);

  /**
   * Format the input into the output with an explicit key order. Drives the
   * toolbar's Format / Sort keys segments — the input is never rewritten.
   */
  const formatWith = useCallback((order: SortOrder) => {
    const cur = liveInput();
    if (!cur.trim()) return;
    setSortOrder(order);
    runFormat(cur, order);
  }, [liveInput, setSortOrder, runFormat]);

  const format = useCallback(() => {
    const cur = liveInput();
    if (!cur.trim()) return;
    runFormat(cur);
  }, [liveInput, runFormat]);

  /**
   * The editor's paste formatter. Small pastes format synchronously (the
   * editor inserts the formatted text). A large paste is handed back as-is
   * so it lands at once; `formatFrom` then formats it in the worker and
   * swaps the result in — unless the user edited it meanwhile.
   */
  const formatPaste = useCallback((text: string): string | null => {
    if (isLarge(text)) return text;
    try {
      return formatJsonText(text.trim(), indent, "none");
    } catch {
      return null;
    }
  }, [indent]);

  /**
   * Paste path: `formatted` was already produced (and validated) by the
   * editor's paste handler with the current indent and source key order, so
   * with no sort requested it IS the output — no re-parse, no re-format.
   * A large paste arrives unformatted (see `formatPaste`) and is formatted
   * off the main thread here.
   */
  const formatFrom = useCallback((formatted: string) => {
    if (!formatted.trim()) return;
    if (isLarge(formatted)) {
      const before = getLatestInput();
      dispatch(
        "format",
        { op: "format", src: formatted.trim(), indent, sort: "none", validate: false },
        (r) => {
          // Not JSON → it stays pasted as typed, exactly like a sync paste
          // the formatter rejected.
          if (r.status !== "formatted") return;
          setInput(r.output);
          if (sortOrder === "none") showFormatted(r.output, true);
          else runFormat(r.output);
        },
        // Valid for the pasted text, and for the pre-paste input while the
        // editor's debounced flush of a big doc is still pending.
        { sources: [normalizeBreaks(formatted), formatted, before], replacesInput: true },
      );
      setViewMode("tree");
      return;
    }
    if (sortOrder === "none") {
      startJob(null);
      showFormatted(formatted, true);
    } else {
      runFormat(formatted);
    }
    setViewMode("tree");
  }, [sortOrder, indent, getLatestInput, dispatch, startJob, setInput, runFormat, showFormatted, setViewMode]);

  const minify = useCallback(() => {
    const src = liveInput();
    if (!src.trim()) return;
    const show = (r: { output: string; before: number; after: number; savedPct: number }) =>
      startTransition(() => {
        setOutput(r.output, true);
        setMinifyStats({ before: r.before, after: r.after, savedPct: r.savedPct });
        setConversionResult(null);
      });
    if (isLarge(src)) {
      dispatch("minify", { op: "minify", src }, (r) => {
        if (r.status === "error") toast.error(r.message);
        else if (r.status === "minified") show(r);
      });
      return;
    }
    startJob(null);
    try {
      show(minifyJson(src));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Minify failed");
    }
  }, [liveInput, dispatch, startJob, setOutput, setMinifyStats, setConversionResult]);

  const validate = useCallback(() => {
    const src = liveInput();
    const report = (vState: ValidationState) => {
      setValidation(vState);
      if (vState.status === "valid") {
        toast.success(`Valid JSON · ${vState.lines} lines`);
      } else if (vState.status === "invalid") {
        toast.error(`Error on line ${vState.line}, col ${vState.col}`);
      }
    };
    if (isLarge(src)) {
      dispatch("validate", { op: "validate", src }, (r) => {
        if (r.status === "validated") report(r.validation);
      });
      return;
    }
    startJob(null);
    report(validateJson(src));
  }, [liveInput, dispatch, startJob, setValidation]);

  const sortKeys = useCallback(
    (order: SortOrder) => {
      const src = liveInput();
      setSortOrder(order);
      if (!src.trim() || order === "none") return;
      if (isLarge(src)) {
        dispatch("sort", { op: "format", src, indent, sort: order, validate: false }, (r) => {
          if (r.status === "error") toast.error(r.message || "Sort failed");
          else if (r.status === "formatted") setInput(r.output);
        });
        return;
      }
      startJob(null);
      try {
        setInput(formatJsonText(src, indent, order));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sort failed");
      }
    },
    [liveInput, indent, dispatch, startJob, setSortOrder, setInput],
  );

  /**
   * Apply a repair outcome. Risk-gated flow:
   *   - all-`safe` fixes (reformatting only — quotes, commas; zero data
   *     loss) apply INSTANTLY with an Undo toast. No dialog, no extra click.
   *   - any `lossy`/`structural` fix (Infinity→null, dropped text, wrapped
   *     roots, closed brackets) opens the preview so the user reviews the
   *     data-changing edits before committing.
   *   - a partial repair (still invalid) always opens the preview, since
   *     there's a real error + best-effort result to inspect.
   * `applySafe` sets the input and its formatted output.
   */
  const handleRepair = useCallback(
    (original: string, result: RepairResult, applySafe: () => void) => {
      if (result.wasValid) {
        toast.info("JSON is already valid — no repairs needed");
        return;
      }
      if (result.events.some((e) => e.risk !== "safe")) {
        setRepairPreview({
          original,
          fixed: result.fixed,
          changes: result.changes,
          events: result.events,
        });
        return;
      }
      // All safe → apply immediately. Keep the pre-repair input so the toast
      // can offer a one-tap Undo.
      const n = result.changes.length;
      applySafe();
      toast.success(
        `Fixed ${n} issue${n !== 1 ? "s" : ""}`,
        { action: { label: "Undo", onClick: () => setInput(original) } },
      );
    },
    [setRepairPreview, setInput],
  );

  const repair = useCallback(() => {
    const src = liveInput();
    if (!src.trim()) return;
    const original = src;
    const partialPreview = (p: Omit<RepairPreview, "original">) => setRepairPreview({ original, ...p });

    if (isLarge(src)) {
      dispatch("repair", { op: "repair", src, indent, sort: sortOrder }, (r) => {
        if (r.status === "repaired") {
          handleRepair(original, r.result, () => {
            setInput(r.result.fixed);
            if (r.formattedIsFixed) showFormatted(r.result.fixed, sortOrder === "none");
            else if (r.formatted !== undefined) showFormatted(r.formatted, sortOrder === "none");
            else if (r.formatError !== undefined) toast.error(r.formatError);
          });
        } else if (r.status === "repair-failed") {
          partialPreview({ fixed: r.partialFixed, changes: r.partialChanges, events: r.partialEvents, error: r.parseError });
        } else if (r.status === "error") {
          toast.error(r.message);
        }
      });
      return;
    }

    startJob(null);
    try {
      const result = repairJson(src);
      handleRepair(original, result, () => {
        setInput(result.fixed);
        runFormat(result.fixed);
      });
    } catch (err) {
      if (err instanceof RepairError) {
        partialPreview({
          fixed: err.partialFixed,
          changes: err.partialChanges,
          events: err.partialEvents,
          error: err.parseError,
        });
      } else {
        toast.error(err instanceof Error ? err.message : "Repair failed");
      }
    }
  }, [liveInput, indent, sortOrder, dispatch, startJob, handleRepair, setRepairPreview, setInput, runFormat, showFormatted]);

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
    if (isLarge(output)) {
      dispatch("format", { op: "format", src: output, indent, sort: "none", validate: false }, (r) => {
        if (r.status !== "formatted") return;
        setOutput(r.output, true);
        setMinifyStats(null);
      });
      return;
    }
    startJob(null);
    try {
      setOutput(formatJsonText(output, indent, "none"), true);
      setMinifyStats(null);
    } catch { /* ignore */ }
  }, [output, indent, dispatch, startJob, setOutput, setMinifyStats]);

  return {
    format, formatWith, formatFrom, formatPaste, minify, validate, sortKeys, changeIndent,
    repair, applyRepair, cancelRepair,
    restoreFromMinify, runFormat,
  };
}
