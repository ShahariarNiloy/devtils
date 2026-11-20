"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildHunks,
  buildSideRows,
  computeStats,
  diffLines,
  formatUnifiedDiff,
  type DiffOptions,
} from "@/lib/diff";
import { changeStarts } from "./diff-checker.lib";
import { decodeShare, encodeShare, readShareFromHash, shareHashFor } from "./diff-share";

export type ViewMode = "side-by-side" | "unified";

const SAMPLE_LEFT = "# utilyx\n\nFast, private developer tools.\nEverything runs in your browser.\n\nInstall: none\nPrice: free\nTools: 23";
const SAMPLE_RIGHT = "# utilyx\n\nFast, private, keyboard-first developer tools.\nEverything runs in your browser.\n\nInstall: none\nTools: 34\nOffline: yes";

export interface DiffCheckerState {
  left: string;
  right: string;
  setLeft: (v: string) => void;
  setRight: (v: string) => void;
  swap: () => void;
  clearBoth: () => void;
  loadSample: () => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  options: DiffOptions;
  setOption: <K extends keyof DiffOptions>(key: K, value: DiffOptions[K]) => void;
  editing: boolean;
  setEditing: (v: boolean) => void;
  hydrated: boolean;
  /** Change block the user last jumped to (n / p), or null. */
  activeChange: number | null;
  setActiveChange: (idx: number | null) => void;
  // Derived
  ops: ReturnType<typeof diffLines>;
  stats: ReturnType<typeof computeStats>;
  hunks: ReturnType<typeof buildHunks>;
  sideRows: ReturnType<typeof buildSideRows>;
  /** Op index where each change block starts (unified listing). */
  opChangeStarts: number[];
  /** Side-row index where each change block starts (split listing). */
  rowChangeStarts: number[];
  // Actions
  share: () => Promise<string | null>;
  copyAsPatch: () => Promise<boolean>;
  downloadPatch: () => boolean;
  acceptDroppedFiles: (files: File[]) => Promise<void>;
}

const PATCH_LABELS = { left: "original", right: "changed" };

/**
 * State + derived data + actions for the diff-checker. Kept in one hook
 * so the orchestrator component stays focused on layout.
 *
 * URL-hash hydration runs once on mount. If `#d=…` decodes to a valid
 * payload we adopt it and skip the sample; otherwise we keep the sample.
 * We deliberately don't write back to the hash on every keystroke —
 * sharing is an explicit action (the Share button), not implicit. That
 * keeps history clean and avoids leaking pasted content into the URL.
 */
export function useDiffChecker(): DiffCheckerState {
  const [left, setLeft] = useState(SAMPLE_LEFT);
  const [right, setRight] = useState(SAMPLE_RIGHT);
  // Unified is the v2 default: compact, and the only view on phones.
  const [view, setView] = useState<ViewMode>("unified");
  const [options, setOptions] = useState<DiffOptions>({
    ignoreTrailingWhitespace: true,
  });
  // `editingExplicit` is the user's last toggle decision. The effective
  // `editing` flag is derived from it + the both-empty fallback so we
  // don't have a setState-in-effect for the auto-expand case.
  // Defaults to open (v2 always draws the inputs); "Hide inputs" in the ⋯
  // menu / `e` collapses them to a one-line strip.
  const [editingExplicit, setEditing] = useState(true);
  const [activeChangeRaw, setActiveChange] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  // ── URL hash → state (one-shot mount-time init) ───────────────────
  // This is a legitimate effect: bridging external state (window.location)
  // into React on first mount. The set-state-in-effect lint rule flags
  // this pattern as a smell — here it's the correct tool, so we disable
  // it locally with the rationale next to the call.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const token = readShareFromHash(window.location.hash);
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHydrated(true);
      return;
    }
    void decodeShare(token).then((d) => {
      if (d) {
        setLeft(d.left);
        setRight(d.right);
      }
      setHydrated(true);
    });
  }, []);

  // ── Derived ────────────────────────────────────────────────────────
  const ops = useMemo(() => diffLines(left, right, options), [left, right, options]);
  const stats = useMemo(() => computeStats(ops), [ops]);
  const hunks = useMemo(() => buildHunks(ops), [ops]);
  const sideRows = useMemo(() => buildSideRows(ops), [ops]);
  const opChangeStarts = useMemo(() => changeStarts(ops.map((o) => o.kind === "equal")), [ops]);
  const rowChangeStarts = useMemo(() => changeStarts(sideRows.map((r) => r.kind === "equal")), [sideRows]);

  // Auto-expand inputs when both sides are empty — derived, not effect.
  const editing = editingExplicit || (left === "" && right === "");

  // Drop the active-change marker if the diff shrinks beneath it — derived,
  // not effect.
  const activeChange =
    activeChangeRaw === null || activeChangeRaw >= opChangeStarts.length ? null : activeChangeRaw;

  // ── Actions ────────────────────────────────────────────────────────
  const setOption = useCallback(
    <K extends keyof DiffOptions>(key: K, value: DiffOptions[K]) => {
      setOptions((o) => ({ ...o, [key]: value }));
    },
    [],
  );

  const swap = useCallback(() => {
    setLeft(right);
    setRight(left);
  }, [left, right]);

  const clearBoth = useCallback(() => {
    setLeft("");
    setRight("");
  }, []);

  const loadSample = useCallback(() => {
    setLeft(SAMPLE_LEFT);
    setRight(SAMPLE_RIGHT);
  }, []);

  const share = useCallback(async (): Promise<string | null> => {
    try {
      const token = await encodeShare(left, right);
      const hash = shareHashFor(token);
      const url = `${window.location.origin}${window.location.pathname}${hash}`;
      // Overwrite the hash so reload + browser-share use the same URL.
      window.history.replaceState(null, "", hash);
      await navigator.clipboard.writeText(url);
      return url;
    } catch {
      return null;
    }
  }, [left, right]);

  const copyAsPatch = useCallback(async (): Promise<boolean> => {
    const patch = formatUnifiedDiff(hunks, PATCH_LABELS);
    if (!patch) return false;
    try {
      await navigator.clipboard.writeText(patch);
      return true;
    } catch {
      return false;
    }
  }, [hunks]);

  const downloadPatch = useCallback((): boolean => {
    const patch = formatUnifiedDiff(hunks, PATCH_LABELS);
    if (!patch) return false;
    // Standard download-as-file pattern: Blob → object URL → temporary
    // anchor click → revoke the URL so the browser doesn't pin the Blob
    // in memory for the rest of the session.
    const blob = new Blob([patch], { type: "text/x-patch;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diff.patch";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }, [hunks]);

  const acceptDroppedFiles = useCallback(async (files: File[]) => {
    // Take up to two files, in the order the browser handed them to us.
    // First → left, second → right. If only one was dropped, replace the
    // currently-focused side (we default to the left when neither has
    // focus — most diffs are "original first").
    const usable = files.filter((f) => f.size <= 5 * 1024 * 1024); // 5 MB hard cap
    if (usable.length === 0) return;
    const [a, b] = await Promise.all([
      usable[0].text(),
      usable[1] ? usable[1].text() : Promise.resolve(null),
    ]);
    if (b !== null) {
      setLeft(a);
      setRight(b);
    } else {
      // Single file → put it on whichever side is empty, else the left.
      if (left === "" && right !== "") setLeft(a);
      else if (right === "" && left !== "") setRight(a);
      else setLeft(a);
    }
  }, [left, right]);

  return {
    left,
    right,
    setLeft,
    setRight,
    swap,
    clearBoth,
    loadSample,
    view,
    setView,
    options,
    setOption,
    editing,
    setEditing,
    hydrated,
    activeChange,
    setActiveChange,
    ops,
    stats,
    hunks,
    sideRows,
    opChangeStarts,
    rowChangeStarts,
    share,
    copyAsPatch,
    downloadPatch,
    acceptDroppedFiles,
  };
}
