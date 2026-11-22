"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { flushPendingEdits, LazyCodeEditor } from "@/components/primitives/code-editor";
import { CodeView } from "@/components/tools/json-formatter/views/code-view";
import { highlight, HIGHLIGHT_SIZE_THRESHOLD, type Lang } from "@/lib/highlight";
import type { TablePreview } from "./converter.lib";
import { editorHandles, editorLanguage } from "./editor-language";

interface ConverterOutputPaneProps {
  output: string;
  outputLang: Lang;
  outputLabel: string;
  /** Short shape summary next to the label ("4 types", "3 rows · 6 columns"). */
  summary?: string;
  /** Problem to show instead of output (parse or conversion error). */
  error: { title: string; message: string } | null;
  /** Where the input error is, for a "Go to line N" action in the alert. */
  errorAt?: { line: number; col: number } | null;
  onJump?: (line: number, col: number) => void;
  isComputing?: boolean;
  /** Optional table preview under the code (CSV tools). */
  preview?: (TablePreview & { totalRows?: number }) | null;
}

/**
 * v2 output pane: bold label + summary + cream Copy in the header, the
 * read-only output, and an optional "Preview" table below. Errors render as
 * an alert in place of the output — never a silent blank.
 *
 * Output view: languages the shared editor has a grammar for (JSON, YAML,
 * XML; CSV as plain text) use the read-only CodeMirror editor — it renders
 * only the visible lines, so a multi-MB result costs nothing to show or
 * replace. Code outputs (TypeScript, Go, Rust, Python) have no CodeMirror
 * grammar installed; they're usually small, so they keep the tuned
 * in-house highlighter (CodeView) — until they pass its highlight limit,
 * where it would fall back to plain text anyway and the editor's
 * virtualization wins.
 */
export function ConverterOutputPane({
  output,
  outputLang,
  outputLabel,
  summary,
  error,
  errorAt,
  onJump,
  isComputing,
  preview,
}: ConverterOutputPaneProps) {
  const inEditor = editorHandles(outputLang) || output.length > HIGHLIGHT_SIZE_THRESHOLD;
  const highlighted = useMemo(() => (inEditor ? "" : highlight(output, outputLang)), [inEditor, output, outputLang]);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = async () => {
    flushPendingEdits();
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard blocked (permissions / insecure context) — say so.
      setCopied(false);
      toast.error("Clipboard write blocked by the browser");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-[46px] shrink-0 items-center gap-2 border-b border-border-subtle pr-2 pl-4">
        <span className="text-[13px] font-bold">{outputLabel}</span>
        {!error && summary && <span className="truncate text-xs text-text-faint">{summary}</span>}
        {isComputing && <span className="text-xs text-text-faint">Converting…</span>}
        <span className="grow" />
        <button
          type="button"
          onClick={() => void handleCopy()}
          // While a newer input is still converting, the visible output is
          // stale — don't let Copy hand it out as if it were current.
          disabled={!output || isComputing}
          aria-live="polite"
          className="btn-action inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="m-3.5 shrink-0 rounded-[10px] border border-error-border bg-error-bg px-3.5 py-3 text-[13px] text-error-text"
        >
          <span className="font-semibold">{error.title}.</span> {error.message}
          {errorAt && onJump && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => onJump(errorAt.line, errorAt.col)}
                className="font-semibold underline underline-offset-2 hover:text-text"
              >
                Go to line {errorAt.line}
              </button>
            </>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1">
        {!error &&
          (inEditor ? (
            <LazyCodeEditor
              language={editorLanguage(outputLang)}
              value={output}
              ariaLabel={`${outputLabel} output`}
              emptyText="Output will appear here."
            />
          ) : (
            <CodeView variant="v2" value={output} highlighted={highlighted} indent="2" lang={outputLang} />
          ))}
      </div>

      {preview && !error && preview.cols.length > 0 && (
        <div className="max-h-[45%] shrink-0 overflow-auto border-t border-border-subtle px-3.5 pt-3 pb-4">
          <div className="mb-2 text-xs text-text-faint">
            Preview
            {preview.totalRows !== undefined && preview.totalRows > preview.rows.length && (
              <> · first {preview.rows.length} of {preview.totalRows.toLocaleString()} rows</>
            )}
          </div>
          <table className="w-full table-fixed border-collapse text-xs">
            <thead>
              <tr>
                {preview.cols.map((c, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="border-b border-white/10 px-2 py-1.5 text-left font-bold break-all text-text-strong"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r, ri) => (
                <tr key={ri}>
                  {preview.cols.map((_, ci) => {
                    const v = r[ci];
                    return (
                      <td key={ci} className="border-b border-white/5 px-2 py-1.5 break-all text-text-muted">
                        {v === undefined || v === "" ? "—" : v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
