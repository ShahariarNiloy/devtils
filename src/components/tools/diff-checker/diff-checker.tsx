"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import { ToolShell } from "@/components/layout/tool-shell";
import { useShortcut } from "@/lib/keyboard";
import type { Tool } from "@/lib/tools-registry";
import { DiffCheckerContent, seoData } from "./content";
import { differenceLabel } from "./diff-checker.lib";
import { DiffStatusBar, useBelowSm, type StatusTone } from "./parts/chrome";
import { SplitView, UnifiedView } from "./parts/diff-view";
import { DropOverlay } from "./parts/drop-overlay";
import { focusInput, InputsPanel, InputsStrip } from "./parts/inputs";
import { Toolbar } from "./parts/toolbar";
import { useDiffChecker } from "./use-diff-checker";

/**
 * Diff checker — v2 workspace window: toolbar (pills · Ignore whitespace ·
 * Unified/Split · Swap · ⋯), the two inputs, the live diff listing and the
 * status bar. Owns drag-and-drop, keyboard shortcuts (n / p / e / /) and
 * toast feedback; state lives in `useDiffChecker`.
 */
export function DiffChecker({ tool }: { tool: Tool }) {
  const s = useDiffChecker();
  const isPhone = useBelowSm();
  // Phones get unified only (mockup): split would leave ~150px per side.
  // The stored preference is untouched, so it returns on wider screens.
  const view = isPhone ? "unified" : s.view;
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const changeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragDepth = useRef(0);
  const [dragOver, setDragOver] = useState(false);

  const changeCount = s.opChangeStarts.length;

  // ── Change navigation ───────────────────────────────────────────────
  const gotoChange = useCallback(
    (idx: number) => {
      if (changeCount === 0) return;
      const wrapped = ((idx % changeCount) + changeCount) % changeCount;
      s.setActiveChange(wrapped);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      changeRefs.current[wrapped]?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    },
    [s, changeCount],
  );
  const next = () => gotoChange(s.activeChange === null ? 0 : s.activeChange + 1);
  const prev = () => gotoChange(s.activeChange === null ? changeCount - 1 : s.activeChange - 1);

  useShortcut({ key: "n", label: "Next change" }, (e) => {
    if (changeCount === 0) return;
    e.preventDefault();
    next();
  });
  useShortcut({ key: "p", label: "Previous change" }, (e) => {
    if (changeCount === 0) return;
    e.preventDefault();
    prev();
  });
  useShortcut({ key: "e", ignoreInEditable: true, label: "Toggle edit mode" }, (e) => {
    e.preventDefault();
    s.setEditing(!s.editing);
  });
  useShortcut({ key: "/", ignoreInEditable: true, label: "Edit inputs" }, (e) => {
    e.preventDefault();
    s.setEditing(true);
    // Focuses once the inputs (and the lazy editor) have mounted.
    focusInput(() => leftRef.current);
  });

  // ── Actions ─────────────────────────────────────────────────────────
  const onShare = useCallback(async () => {
    const url = await s.share();
    if (url) toast.success("Share link copied", { description: "Anyone with the link will see the same diff." });
    else toast.error("Couldn't generate share link");
  }, [s]);

  const onCopyPatch = useCallback(async () => {
    const ok = await s.copyAsPatch();
    if (ok) {
      toast.success("Patch copied", {
        description: `${s.hunks.length} hunk${s.hunks.length === 1 ? "" : "s"} · ready for \`git apply\``,
      });
    } else toast.error("Couldn't copy patch");
  }, [s]);

  const onDownloadPatch = useCallback(() => {
    if (s.downloadPatch()) toast.success("diff.patch downloaded");
  }, [s]);

  const onClear = useCallback(() => {
    s.clearBoth();
    toast("Cleared both sides");
  }, [s]);

  // ── Drag-and-drop ───────────────────────────────────────────────────
  // Enter/leave bracket with a depth counter so dragging over children
  // doesn't flicker the overlay.
  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    dragDepth.current++;
    if (dragDepth.current === 1) setDragOver(true);
  }, []);
  const onDragLeave = useCallback(() => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }, []);
  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);
  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
      const tooBig = files.slice(0, 2).filter((f) => f.size > 5 * 1024 * 1024).length;
      await s.acceptDroppedFiles(files);
      const used = Math.min(files.length, 2) - tooBig;
      if (used <= 0) {
        toast.error("File too large", { description: "The diff checker reads files up to 5 MB." });
        return;
      }
      toast.success(`Loaded ${used} file${used === 1 ? "" : "s"}`, {
        description: files.length > 2 ? `${files.length - 2} ignored — only two can be compared.` : undefined,
      });
    },
    [s],
  );

  // ── Status ──────────────────────────────────────────────────────────
  const bothEmpty = s.left === "" && s.right === "";
  const total = s.stats.added + s.stats.removed;
  let statusTone: StatusTone = "ok";
  if (bothEmpty) statusTone = "idle";
  else if (total) statusTone = "diff";
  const detail = `${s.options.ignoreWhitespace ? "ignoring whitespace · " : ""}${view === "unified" ? "unified" : "split"}`;

  return (
    <ToolShell tool={tool} relatedSlugs={seoData.relatedSlugs}>
      <div className="relative" onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}>
        <DropOverlay visible={dragOver} />

        <div className="overflow-hidden rounded-[14px] bg-canvas shadow-window-tool sm:rounded-[18px]">
          <Toolbar
            added={s.stats.added}
            removed={s.stats.removed}
            unchanged={s.stats.unchanged}
            view={view}
            onChangeView={s.setView}
            canSplit={!isPhone}
            options={s.options}
            onChangeOption={s.setOption}
            changeCount={changeCount}
            activeChange={s.activeChange}
            onPrevChange={prev}
            onNextChange={next}
            editing={s.editing}
            onToggleEdit={() => s.setEditing(!s.editing)}
            onShare={() => void onShare()}
            onCopyPatch={() => void onCopyPatch()}
            onDownloadPatch={onDownloadPatch}
            onSwap={s.swap}
            onClear={onClear}
            onLoadSample={s.loadSample}
          />

          {s.editing ? (
            <InputsPanel
              left={s.left}
              right={s.right}
              onChangeLeft={s.setLeft}
              onChangeRight={s.setRight}
              onPasteError={() => toast.error("Clipboard access was blocked", { description: "Paste into the box with ⌘V / Ctrl+V." })}
              leftRef={leftRef}
              rightRef={rightRef}
            />
          ) : (
            <InputsStrip leftLines={s.stats.leftLines} rightLines={s.stats.rightLines} onEdit={() => s.setEditing(true)} />
          )}

          {bothEmpty && (
            <p className="m-0 px-4 py-10 text-center text-[13px] text-text-faint">Paste text on both sides — or drop two files — to compare.</p>
          )}
          {!bothEmpty && <LimitsNotice approximate={s.limits.approximate} coarseRows={view === "side-by-side" ? s.limits.coarseRows : 0} />}
          {!bothEmpty && view === "unified" && (
            <UnifiedView ops={s.ops} changeStarts={s.opChangeStarts} activeChange={s.activeChange} changeRefs={changeRefs} />
          )}
          {!bothEmpty && view === "side-by-side" && (
            <SplitView rows={s.sideRows} changeStarts={s.rowChangeStarts} activeChange={s.activeChange} changeRefs={changeRefs} />
          )}

          <DiffStatusBar
            tone={statusTone}
            text={bothEmpty ? "Waiting for input" : differenceLabel(total)}
            detail={detail}
          />
        </div>
      </div>

      <DiffCheckerContent />
    </ToolShell>
  );
}

/**
 * Honest-limits notice: very large inputs are aligned on a budget, and the
 * user should know when what they see is coarser than a normal diff.
 */
function LimitsNotice({ approximate, coarseRows }: { approximate: boolean; coarseRows: number }) {
  if (!approximate && coarseRows === 0) return null;
  const parts: string[] = [];
  if (approximate)
    parts.push("These inputs are too different to align line-by-line, so part of the diff is shown as a full replace — still correct, just not the smallest diff.");
  if (coarseRows > 0)
    parts.push(
      `${coarseRows.toLocaleString()} changed line${coarseRows === 1 ? " is" : "s are"} too long to compare word-by-word and ${coarseRows === 1 ? "is" : "are"} highlighted whole.`,
    );
  return (
    <p
      role="note"
      className="m-0 flex items-start gap-2 border-b border-warning-border bg-warning-bg px-4 py-2 text-[12.5px] text-warning-text"
    >
      <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>Large diff — {parts.join(" ")}</span>
    </p>
  );
}
