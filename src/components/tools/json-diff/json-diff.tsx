"use client";

import { useRef } from "react";
import { ToolShell } from "@/components/layout/tool-shell";
import { DiffStatusBar, type StatusTone } from "@/components/tools/diff-checker/parts/chrome";
import type { Tool } from "@/lib/tools-registry";
import { JsonDiffContent, seoData } from "./content";
import { ControlsBar, strategyLabel } from "./panels/controls-bar";
import { InputPanel, ParseErrorBanner } from "./panels/input-panel";
import { PatchView } from "./panels/patch-view";
import { ResultTree } from "./panels/result-tree";
import { SideBySideView } from "./panels/side-by-side-view";
import { useJsonDiff } from "./use-json-diff";

/**
 * JSON diff — v2 workspace window: toolbar (count pills · Swap · ⋯), the
 * Original / Changed inputs, a parse-error strip, the result (change list
 * by default; JSON Patch or text side-by-side via ⋯) and the status bar.
 * All state lives in `useJsonDiff`; panels are presentational.
 */
export function JsonDiff({ tool }: { tool: Tool }) {
  const s = useJsonDiff();
  const leftRef = useRef<HTMLTextAreaElement>(null);
  const rightRef = useRef<HTMLTextAreaElement>(null);

  const invalid = Boolean(s.leftParse.error || s.rightParse.error);
  const waiting = !invalid && (s.leftParse.isEmpty || s.rightParse.isEmpty);

  let status: { tone: StatusTone; text: string };
  if (s.leftParse.error) status = { tone: "error", text: "Original JSON isn't valid" };
  else if (s.rightParse.error) status = { tone: "error", text: "Changed JSON isn't valid" };
  else if (waiting || !s.result) status = { tone: "idle", text: "Waiting for input" };
  else if (s.result.stats.total === 0) status = { tone: "ok", text: "Identical" };
  else {
    const n = s.result.stats.total;
    status = { tone: "diff", text: `${n} ${n === 1 ? "difference" : "differences"}` };
  }
  const detail = invalid
    ? ""
    : [
        "structural compare",
        s.arrayStrategy !== "ordered" && `arrays: ${strategyLabel(s.arrayStrategy).toLowerCase()}`,
        s.sortKeys && "sorted keys",
      ]
        .filter(Boolean)
        .join(" · ");

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
        <ControlsBar
          result={s.result}
          view={s.view}
          onView={s.setView}
          arrayStrategy={s.arrayStrategy}
          onArrayStrategy={s.setArrayStrategy}
          identityKey={s.identityKey}
          onIdentityKey={s.setIdentityKey}
          sortKeys={s.sortKeys}
          onSortKeys={s.setSortKeys}
          hideUnchanged={s.hideUnchanged}
          onHideUnchanged={s.setHideUnchanged}
          pointerStyle={s.pointerStyle}
          onPointerStyle={s.setPointerStyle}
          onSwap={s.swap}
          onCopyPatch={s.copyPatch}
          onShare={s.copyShareLink}
          onLoadSample={s.loadSample}
          onClear={s.clear}
          canClear={Boolean(s.left || s.right)}
        />

        <div className="flex flex-wrap border-b border-border-subtle">
          <InputPanel id="df-l" side="left" label="Original JSON" value={s.left} onChange={s.setLeft} textareaRef={leftRef} />
          <InputPanel id="df-r" side="right" label="Changed JSON" value={s.right} onChange={s.setRight} textareaRef={rightRef} />
        </div>

        <ParseErrorBanner
          sides={[
            { label: "Original JSON", parse: s.leftParse, value: s.left, textareaRef: leftRef },
            { label: "Changed JSON", parse: s.rightParse, value: s.right, textareaRef: rightRef },
          ]}
        />

        {s.view === "changes" && <ResultTree result={invalid ? null : s.result} pointerStyle={s.pointerStyle} waiting={waiting} />}
        {s.view === "patch" &&
          (s.result && !invalid ? (
            <PatchView patch={s.patch} />
          ) : (
            <ResultTree result={null} pointerStyle={s.pointerStyle} waiting={waiting} />
          ))}
        {s.view === "side-by-side" && (
          <SideBySideView
            leftValue={s.leftParse.value}
            rightValue={s.rightParse.value}
            sortKeys={s.sortKeys}
            hideUnchanged={s.hideUnchanged}
          />
        )}
        {s.view !== "changes" && (
          <div className="flex justify-end border-t border-border-subtle px-3 py-2">
            <button
              type="button"
              onClick={() => s.setView("changes")}
              className="inline-flex min-h-9 cursor-pointer items-center rounded-lg px-2.5 text-[13px] font-semibold text-text-key transition-colors hover:bg-surface-soft"
            >
              Back to change list
            </button>
          </div>
        )}

        <DiffStatusBar tone={status.tone} text={status.text} detail={detail} />
      </div>

      <JsonDiffContent />
    </ToolShell>
  );
}
