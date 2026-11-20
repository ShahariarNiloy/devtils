"use client";

import { useMemo, useState } from "react";
import type { LineOp, SideRow, WordOp } from "@/lib/diff";
import { cn } from "@/lib/cn";
import { foldEqualRuns, type ListingItem } from "../diff-checker.lib";

/**
 * v2 diff listings. Both render the whole comparison (not just hunks) the
 * way the mockup does; only long unchanged runs fold into a
 * "Show N unchanged lines" row so big files stay scannable. The first row
 * of each change block registers in `changeRefs` for n / p navigation, and
 * the active one gets a clay edge marker.
 */

interface ListingProps {
  /** Index (into ops / rows) where each change block starts. */
  changeStarts: number[];
  activeChange: number | null;
  changeRefs: React.RefObject<Array<HTMLDivElement | null>>;
}

const CODE = "py-2 font-mono text-[12.5px] leading-[1.75] sm:text-[13px]";
const ACTIVE_EDGE = "shadow-[inset_2px_0_0_var(--color-clay-light)]";

/** Folded-run state that resets whenever the diff itself changes. */
function useFolding<T>(source: readonly T[], isEqual: (t: T) => boolean) {
  const [state, setState] = useState<{ source: readonly T[]; open: Set<number> }>({ source, open: new Set() });
  const open = state.source === source ? state.open : null;
  const items = useMemo(
    () => foldEqualRuns(source.map(isEqual), open ?? undefined),
    [source, open, isEqual],
  );
  const expand = (start: number) =>
    setState((s) => ({ source, open: new Set(s.source === source ? s.open : []).add(start) }));
  return { items, expand };
}

function useChangeIndex(changeStarts: number[]) {
  return useMemo(() => new Map(changeStarts.map((start, i) => [start, i])), [changeStarts]);
}

function GapRow({ item, onExpand }: { item: Extract<ListingItem, { type: "gap" }>; onExpand: (start: number) => void }) {
  const n = item.end - item.start;
  return (
    <button
      type="button"
      onClick={() => onExpand(item.start)}
      className="flex w-full cursor-pointer items-center gap-2 bg-text/2 py-0.5 pl-[86px] text-left text-xs text-text-faint transition-colors hover:bg-text/4 hover:text-text max-sm:pl-[52px]"
    >
      <span aria-hidden>⋯</span>
      Show {n.toLocaleString()} unchanged line{n === 1 ? "" : "s"}
    </button>
  );
}

// ── Unified ────────────────────────────────────────────────────────────

const isEqualOp = (o: LineOp) => o.kind === "equal";

const UNI = {
  equal: { bg: "", sign: " ", signTone: "text-text-ghost", text: "text-text-muted" },
  insert: { bg: "bg-success/13", sign: "+", signTone: "text-success", text: "text-code-sage" },
  delete: { bg: "bg-error/13", sign: "−", signTone: "text-error", text: "text-code-rose" },
} as const;

export function UnifiedView({ ops, changeStarts, activeChange, changeRefs }: ListingProps & { ops: LineOp[] }) {
  const { items, expand } = useFolding(ops, isEqualOp);
  const changeAt = useChangeIndex(changeStarts);

  return (
    <div className={CODE}>
      {items.map((item) => {
        if (item.type === "gap") return <GapRow key={`g${item.start}`} item={item} onExpand={expand} />;
        const op = ops[item.index];
        const look = UNI[op.kind];
        const ci = changeAt.get(item.index);
        return (
          <div
            key={item.index}
            ref={ci === undefined ? undefined : (el) => void (changeRefs.current[ci] = el)}
            className={cn("flex scroll-mt-24", look.bg, ci !== undefined && ci === activeChange && ACTIVE_EDGE)}
          >
            <span className="w-[34px] shrink-0 pr-1.5 text-right text-text-ghost select-none">{op.kind === "insert" ? "" : op.left}</span>
            <span className="w-[34px] shrink-0 pr-2 text-right text-text-ghost select-none">{op.kind === "delete" ? "" : op.right}</span>
            <span aria-hidden className={cn("w-[18px] shrink-0 font-bold select-none", look.signTone)}>
              {look.sign}
            </span>
            {op.kind !== "equal" && <span className="sr-only">{op.kind === "insert" ? "added: " : "removed: "}</span>}
            <span className={cn("min-w-0 grow pr-3.5 break-words whitespace-pre-wrap", look.text)}>{op.text}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Split ──────────────────────────────────────────────────────────────

const isEqualRow = (r: SideRow) => r.kind === "equal";

type HalfTone = "equal" | "delete" | "insert" | "empty";

const HALF_BG: Record<HalfTone, string> = {
  equal: "",
  delete: "bg-error/13",
  insert: "bg-success/13",
  empty: "bg-text/2",
};
const HALF_TEXT: Record<HalfTone, string> = {
  equal: "text-text-muted",
  delete: "text-code-rose",
  insert: "text-code-sage",
  empty: "",
};

export function SplitView({ rows, changeStarts, activeChange, changeRefs }: ListingProps & { rows: SideRow[] }) {
  const { items, expand } = useFolding(rows, isEqualRow);
  const changeAt = useChangeIndex(changeStarts);

  return (
    <div className={CODE}>
      {items.map((item) => {
        if (item.type === "gap") return <GapRow key={`g${item.start}`} item={item} onExpand={expand} />;
        const row = rows[item.index];
        const ci = changeAt.get(item.index);
        return (
          <div
            key={item.index}
            ref={ci === undefined ? undefined : (el) => void (changeRefs.current[ci] = el)}
            className={cn("grid scroll-mt-24 grid-cols-2", ci !== undefined && ci === activeChange && ACTIVE_EDGE)}
          >
            <SplitRowHalves row={row} />
          </div>
        );
      })}
    </div>
  );
}

function SplitRowHalves({ row }: { row: SideRow }) {
  switch (row.kind) {
    case "equal":
      return (
        <>
          <Half tone="equal" num={row.leftLine} text={row.text} divider />
          <Half tone="equal" num={row.rightLine} text={row.text} />
        </>
      );
    case "delete":
      return (
        <>
          <Half tone="delete" num={row.leftLine} text={row.text} divider />
          <Half tone="empty" />
        </>
      );
    case "insert":
      return (
        <>
          <Half tone="empty" divider />
          <Half tone="insert" num={row.rightLine} text={row.text} />
        </>
      );
    case "changed":
      return (
        <>
          <Half tone="delete" num={row.leftLine} words={row.leftWords} divider />
          <Half tone="insert" num={row.rightLine} words={row.rightWords} />
        </>
      );
  }
}

function Half({
  tone,
  num,
  text,
  words,
  divider,
}: {
  tone: HalfTone;
  num?: number;
  text?: string;
  words?: WordOp[];
  divider?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0", HALF_BG[tone], divider && "border-r border-border-subtle")}>
      <span className="w-[38px] shrink-0 pr-2.5 text-right text-text-ghost select-none">{num ?? ""}</span>
      <span className={cn("min-w-0 grow pr-3 break-words whitespace-pre-wrap", HALF_TEXT[tone])}>
        {words ? words.map((w, i) => <Word key={`${i}-${w.kind}`} word={w} />) : text}
      </span>
    </div>
  );
}

/** Word-level highlight inside a changed line — shows WHICH word moved. */
function Word({ word }: { word: WordOp }) {
  if (word.kind === "equal") return <>{word.text}</>;
  return (
    <span className={cn("rounded-sm", word.kind === "insert" ? "bg-success/30 text-success-text" : "bg-error/30 text-error-text")}>
      {word.text}
    </span>
  );
}
