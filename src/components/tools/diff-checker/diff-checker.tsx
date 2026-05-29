"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { ToolShell } from "@/components/layout/tool-shell";
import { useShortcut } from "@/lib/keyboard";
import { useIsMobile } from "@/lib/use-is-mobile";
import type { Tool } from "@/lib/tools-registry";
import { DiffCheckerContent } from "./content";
import { SideBySideView, UnifiedView } from "./parts/diff-view";
import { DropOverlay } from "./parts/drop-overlay";
import { InputsPanel, InputsStrip } from "./parts/inputs";
import { Toolbar } from "./parts/toolbar";
import { useDiffChecker } from "./use-diff-checker";

/**
 * Orchestrator. Owns:
 *   - The drag-and-drop counter (enter / leave bracket so quickly-moved
 *     children don't flicker the overlay).
 *   - Keyboard shortcuts (n / p / /, e to toggle edit).
 *   - The hunk refs array shared between the toolbar and the diff view.
 *   - Toast feedback for clipboard / share / drop outcomes.
 *
 * All other concerns live in `parts/*` or the `useDiffChecker` hook.
 */
export function DiffChecker({ tool }: { tool: Tool }) {
  const s = useDiffChecker();
  const isMobile = useIsMobile();
  // Side-by-side at <768px gives each content column ~140px — about a
  // dozen monospace characters before wrap. Force unified there so the
  // diff stays legible; the toggle hides too so users don't try to fight
  // the lock. On tablet rotation / wider viewports, their preferred view
  // returns immediately because `s.view` itself is untouched.
  const effectiveView = isMobile ? "unified" : s.view;
  const leftRef = useRef<HTMLTextAreaElement>(null);
  const rightRef = useRef<HTMLTextAreaElement>(null);
  const hunkRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragDepth = useRef(0);
  const [dragOver, setDragOver] = useState(false);

  // ── Hunk navigation ─────────────────────────────────────────────────
  const gotoHunk = useCallback(
    (idx: number) => {
      if (s.hunks.length === 0) return;
      const wrapped = ((idx % s.hunks.length) + s.hunks.length) % s.hunks.length;
      s.setActiveHunk(wrapped);
      hunkRefs.current[wrapped]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    },
    [s],
  );

  useShortcut({ key: "n" }, (e) => {
    if (s.hunks.length === 0) return;
    e.preventDefault();
    gotoHunk(s.activeHunk + 1);
  });
  useShortcut({ key: "p" }, (e) => {
    if (s.hunks.length === 0) return;
    e.preventDefault();
    gotoHunk(s.activeHunk - 1);
  });
  useShortcut({ key: "e", ignoreInEditable: true }, (e) => {
    e.preventDefault();
    s.setEditing(!s.editing);
  });
  useShortcut({ key: "/", ignoreInEditable: true }, (e) => {
    e.preventDefault();
    s.setEditing(true);
    // Defer focus to the next tick so the textarea is mounted.
    queueMicrotask(() => leftRef.current?.focus());
  });

  // ── Actions ─────────────────────────────────────────────────────────
  const onShare = useCallback(async () => {
    const url = await s.share();
    if (url) {
      toast.success("Share link copied", {
        description: "Anyone with the link will see the same diff.",
        duration: 2400,
      });
    } else {
      toast.error("Couldn't generate share link");
    }
  }, [s]);

  const onCopyPatch = useCallback(async () => {
    const ok = await s.copyAsPatch();
    if (ok) {
      toast.success("Patch copied", {
        description: `${s.hunks.length} hunk${s.hunks.length === 1 ? "" : "s"} · ready for \`git apply\``,
        duration: 2000,
      });
    } else {
      toast.error("Couldn't copy patch");
    }
  }, [s]);

  const onDownloadPatch = useCallback(() => {
    const ok = s.downloadPatch();
    if (ok) toast.success("diff.patch downloaded", { duration: 1600 });
  }, [s]);

  const onSwap = useCallback(() => {
    s.swap();
    toast("Swapped Original ↔ Changed", { duration: 1200 });
  }, [s]);

  const onClear = useCallback(() => {
    s.clearBoth();
    toast("Cleared both sides", { duration: 1200 });
  }, [s]);

  // ── Drag-and-drop ───────────────────────────────────────────────────
  // We bracket enter/leave with a depth counter rather than a boolean so
  // that dragging over child elements doesn't flicker the overlay (each
  // child fires its own leave before its parent fires enter).
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
      await s.acceptDroppedFiles(files);
      const used = Math.min(files.length, 2);
      toast.success(`Loaded ${used} file${used === 1 ? "" : "s"}`, {
        description: files.length > 2 ? `${files.length - 2} ignored.` : undefined,
        duration: 1800,
      });
    },
    [s],
  );

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <ToolShell tool={tool}>
      <div
        className="relative flex flex-col gap-3"
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <DropOverlay visible={dragOver} />

        <Toolbar
          added={s.stats.added}
          removed={s.stats.removed}
          unchanged={s.stats.unchanged}
          hunkCount={s.hunks.length}
          activeHunk={s.activeHunk}
          onPrevHunk={() => gotoHunk(s.activeHunk - 1)}
          onNextHunk={() => gotoHunk(s.activeHunk + 1)}
          view={effectiveView}
          onChangeView={s.setView}
          showViewToggle={!isMobile}
          options={s.options}
          onChangeOption={s.setOption}
          editing={s.editing}
          onToggleEdit={() => s.setEditing(!s.editing)}
          onShare={onShare}
          onCopyPatch={onCopyPatch}
          onDownloadPatch={onDownloadPatch}
          hasDiff={s.hunks.length > 0}
          onSwap={onSwap}
          onClear={onClear}
          onLoadSample={s.loadSample}
        />

        {s.editing ? (
          <InputsPanel
            left={s.left}
            right={s.right}
            onChangeLeft={s.setLeft}
            onChangeRight={s.setRight}
            onCollapse={() => s.setEditing(false)}
            leftRef={leftRef}
            rightRef={rightRef}
          />
        ) : (
          <InputsStrip
            leftLines={s.stats.leftLines}
            rightLines={s.stats.rightLines}
            onEdit={() => s.setEditing(true)}
          />
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          {s.hunks.length === 0 ? (
            <EmptyDiff
              leftEmpty={s.left === ""}
              rightEmpty={s.right === ""}
              unchanged={s.stats.unchanged}
            />
          ) : effectiveView === "side-by-side" ? (
            <SideBySideView
              rows={s.sideRows}
              hunks={s.hunks}
              activeHunk={s.activeHunk}
              onActiveHunkChange={s.setActiveHunk}
              hunkRefs={hunkRefs}
            />
          ) : (
            <UnifiedView
              hunks={s.hunks}
              activeHunk={s.activeHunk}
              onActiveHunkChange={s.setActiveHunk}
              hunkRefs={hunkRefs}
            />
          )}
        </div>

        {!isMobile && <Hints />}
        <DiffCheckerContent />
      </div>
    </ToolShell>
  );
}

function EmptyDiff({
  leftEmpty,
  rightEmpty,
  unchanged,
}: {
  leftEmpty: boolean;
  rightEmpty: boolean;
  unchanged: number;
}) {
  const bothEmpty = leftEmpty && rightEmpty;
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <p className="font-serif italic text-text">
        {bothEmpty ? "Drop files or paste both sides to begin." : "No differences detected."}
      </p>
      <p className="text-sm text-text-faint">
        {bothEmpty
          ? "First file becomes the Original, second becomes the Changed."
          : `Both sides have ${unchanged.toLocaleString()} unchanged line${unchanged === 1 ? "" : "s"}. Toggle the whitespace / case options to surface subtler changes.`}
      </p>
    </div>
  );
}

function Hints() {
  return (
    <p className="px-1 font-mono text-sm text-text-faint">
      <Kbd>n</Kbd> / <Kbd>p</Kbd> jump hunks · <Kbd>e</Kbd> edit inputs ·{" "}
      <Kbd>/</Kbd> focus Original
    </p>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border-subtle bg-bg px-1 font-mono text-[11px] text-text-faint">
      {children}
    </kbd>
  );
}
