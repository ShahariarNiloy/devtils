"use client";

import { useEffect, useMemo, useRef } from "react";
import type {
  Hunk,
  LineOp,
  SideRow,
  WordOp,
} from "@/lib/diff";

/**
 * Diff renderers + the scroll-tracking glue that updates the toolbar's
 * "active hunk" indicator as you scroll. Both views own their own
 * scrollable container so the toolbar above stays put.
 *
 * Sticky `@@ … @@` headers in the unified view keep the hunk's location
 * visible while reading through its lines — same affordance as GitHub /
 * Linear's diff browser.
 */

export interface DiffViewProps {
  hunks: Hunk[];
  activeHunk: number;
  onActiveHunkChange: (idx: number) => void;
  /** Provided so keyboard nav can scrollIntoView the right element. */
  hunkRefs: React.RefObject<Array<HTMLDivElement | null>>;
}

// ── Active-hunk tracking on scroll ─────────────────────────────────────

/**
 * Picks "the most-visible hunk" by intersection ratio, with a stable tie-
 * break (earlier hunks win) so scrolling up doesn't bounce the indicator.
 * Updates the parent on change.
 */
function useHunkObserver(
  rootRef: React.RefObject<HTMLDivElement | null>,
  hunkRefs: React.RefObject<Array<HTMLDivElement | null>>,
  count: number,
  onChange: (idx: number) => void,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || count === 0) return;
    const visible = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number(
            (entry.target as HTMLElement).dataset.hunkIdx ?? "-1",
          );
          if (idx < 0) continue;
          if (entry.isIntersecting) {
            visible.set(idx, entry.intersectionRatio);
          } else {
            visible.delete(idx);
          }
        }
        if (visible.size === 0) return;
        let bestIdx = -1;
        let bestRatio = -1;
        for (const [idx, ratio] of visible) {
          if (ratio > bestRatio || (ratio === bestRatio && idx < bestIdx)) {
            bestRatio = ratio;
            bestIdx = idx;
          }
        }
        if (bestIdx >= 0) onChange(bestIdx);
      },
      {
        root,
        // Trip on small overlaps so quickly-scrolled-past hunks still register
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const el of hunkRefs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
    // We re-bind when the hunk count changes (refs swap underneath).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);
}

// ── Side-by-side view ──────────────────────────────────────────────────

export function SideBySideView({
  rows,
  hunks,
  activeHunk,
  onActiveHunkChange,
  hunkRefs,
}: DiffViewProps & { rows: SideRow[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useHunkObserver(rootRef, hunkRefs, hunks.length, onActiveHunkChange);

  // Map: which side-row index does each hunk start at?
  const hunkStartByIdx = useMemo(() => {
    const m = new Map<number, number>();
    for (let h = 0; h < hunks.length; h++) {
      const hunk = hunks[h];
      const startRow = rows.findIndex((r) => {
        if (r.kind === "equal" || r.kind === "changed")
          return r.leftLine === hunk.leftStart || r.rightLine === hunk.rightStart;
        if (r.kind === "delete") return r.leftLine === hunk.leftStart;
        return r.rightLine === hunk.rightStart;
      });
      if (startRow >= 0) m.set(h, startRow);
    }
    return m;
  }, [rows, hunks]);

  // Group consecutive rows into hunk-blocks (each gets a sticky header).
  // Rows outside any hunk are wrapped in a "gap" group with no header.
  const blocks = useMemo(() => {
    const result: Array<{ hunkIdx: number | null; rows: SideRow[] }> = [];
    let cursor = 0;
    for (let h = 0; h < hunks.length; h++) {
      const start = hunkStartByIdx.get(h) ?? cursor;
      if (start > cursor) {
        result.push({ hunkIdx: null, rows: rows.slice(cursor, start) });
      }
      const next = hunkStartByIdx.get(h + 1) ?? rows.length;
      result.push({ hunkIdx: h, rows: rows.slice(start, next) });
      cursor = next;
    }
    if (cursor < rows.length) {
      result.push({ hunkIdx: null, rows: rows.slice(cursor) });
    }
    return result;
  }, [rows, hunks, hunkStartByIdx]);

  return (
    <div
      ref={rootRef}
      className="max-h-[70vh] overflow-y-auto overflow-x-auto font-mono text-[12.5px] leading-[1.65]"
    >
      {blocks.map((block, bi) => {
        if (block.hunkIdx === null) {
          return (
            <table key={`gap-${bi}`} className="w-full table-fixed border-collapse">
              <ColGroups />
              <tbody>
                {block.rows.map((row, i) => (
                  <SideRowView key={i} row={row} />
                ))}
              </tbody>
            </table>
          );
        }
        const h = hunks[block.hunkIdx];
        const isActive = block.hunkIdx === activeHunk;
        return (
          <div
            key={`h-${block.hunkIdx}`}
            ref={(el) => {
              hunkRefs.current[block.hunkIdx!] = el;
            }}
            data-hunk-idx={block.hunkIdx}
          >
            <HunkHeader
              left={`−${h.leftStart},${h.leftLength}`}
              right={`+${h.rightStart},${h.rightLength}`}
              isActive={isActive}
            />
            <table className="w-full table-fixed border-collapse">
              <ColGroups />
              <tbody>
                {block.rows.map((row, i) => (
                  <SideRowView key={i} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function ColGroups() {
  // With `table-fixed`, columns without explicit widths share the
  // remaining space equally — so the two content columns (`<col>` with
  // no width) split 50/50 of (100% minus the two 3rem gutters), no matter
  // how long a single line is. Without table-fixed, a long unbroken
  // sentence on one side would push that column to ~90% of the width.
  return (
    <colgroup>
      <col className="w-12" />
      <col />
      <col className="w-12" />
      <col />
    </colgroup>
  );
}

function HunkHeader({
  left,
  right,
  isActive,
}: {
  left: string;
  right: string;
  isActive: boolean;
}) {
  return (
    <div
      className={`sticky top-0 z-10 flex items-center gap-3 border-y border-border-subtle bg-bg/95 px-3 py-1 text-sm backdrop-blur transition-colors ${
        isActive ? "text-text" : "text-text-faint"
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-1 w-1 rounded-full transition-colors ${
          isActive ? "bg-brand" : "bg-border-strong"
        }`}
      />
      <span className="font-mono">
        @@ {left} {right} @@
      </span>
    </div>
  );
}

function SideRowView({ row }: { row: SideRow }) {
  if (row.kind === "equal") {
    return (
      <tr>
        <Gutter num={row.leftLine} />
        <Cell text={row.text} />
        <Gutter num={row.rightLine} />
        <Cell text={row.text} />
      </tr>
    );
  }
  if (row.kind === "delete") {
    return (
      <tr>
        <Gutter num={row.leftLine} tone="danger" />
        <Cell text={row.text} tone="danger" />
        <Gutter />
        <Cell tone="empty" />
      </tr>
    );
  }
  if (row.kind === "insert") {
    return (
      <tr>
        <Gutter />
        <Cell tone="empty" />
        <Gutter num={row.rightLine} tone="success" />
        <Cell text={row.text} tone="success" />
      </tr>
    );
  }
  // changed
  return (
    <tr>
      <Gutter num={row.leftLine} tone="danger" />
      <Cell tone="danger" words={row.leftWords} />
      <Gutter num={row.rightLine} tone="success" />
      <Cell tone="success" words={row.rightWords} />
    </tr>
  );
}

function Gutter({ num, tone }: { num?: number; tone?: "success" | "danger" }) {
  const toneClass =
    tone === "success"
      ? "text-success bg-success/5"
      : tone === "danger"
        ? "text-danger bg-danger/5"
        : "text-text-faint";
  return (
    <td
      className={`select-none border-r border-border-subtle px-2 text-right align-top tabular-nums ${toneClass}`}
    >
      {num ?? ""}
    </td>
  );
}

function Cell({
  text,
  tone,
  words,
}: {
  text?: string;
  tone?: "success" | "danger" | "empty";
  words?: WordOp[];
}) {
  const bg =
    tone === "success"
      ? "bg-success/5"
      : tone === "danger"
        ? "bg-danger/5"
        : tone === "empty"
          ? "bg-border-subtle/30"
          : "";

  if (words) {
    return (
      <td className={`whitespace-pre-wrap break-all px-3 py-0.5 align-top ${bg}`}>
        {words.map((w, i) => {
          if (w.kind === "equal") return <span key={i}>{w.text}</span>;
          const isInsert = w.kind === "insert";
          const cls = isInsert
            ? "bg-success/25 text-success"
            : "bg-danger/25 text-danger";
          return (
            <span key={i} className={`rounded-sm ${cls}`}>
              {w.text}
            </span>
          );
        })}
      </td>
    );
  }

  return (
    <td className={`whitespace-pre-wrap break-all px-3 py-0.5 align-top ${bg}`}>
      {text}
    </td>
  );
}

// ── Unified view ───────────────────────────────────────────────────────

export function UnifiedView({
  hunks,
  activeHunk,
  onActiveHunkChange,
  hunkRefs,
}: DiffViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useHunkObserver(rootRef, hunkRefs, hunks.length, onActiveHunkChange);

  return (
    <div
      ref={rootRef}
      className="max-h-[70vh] overflow-y-auto overflow-x-auto font-mono text-[12.5px] leading-[1.65]"
    >
      {hunks.map((h, hi) => {
        const isActive = hi === activeHunk;
        return (
          <div
            key={hi}
            ref={(el) => {
              hunkRefs.current[hi] = el;
            }}
            data-hunk-idx={hi}
          >
            <HunkHeader
              left={`−${h.leftStart},${h.leftLength}`}
              right={`+${h.rightStart},${h.rightLength}`}
              isActive={isActive}
            />
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-12" />
                <col className="w-12" />
                <col className="w-6" />
                <col />
              </colgroup>
              <tbody>
                {h.ops.map((op, i) => (
                  <UnifiedRow key={i} op={op} />
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function UnifiedRow({ op }: { op: LineOp }) {
  const tone =
    op.kind === "insert" ? "success" : op.kind === "delete" ? "danger" : undefined;
  const sym = op.kind === "insert" ? "+" : op.kind === "delete" ? "−" : " ";
  const bg =
    tone === "success" ? "bg-success/5" : tone === "danger" ? "bg-danger/5" : "";
  const tx =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-text";
  return (
    <tr className={bg}>
      <td className="select-none border-r border-border-subtle px-2 text-right align-top text-text-faint tabular-nums">
        {op.kind === "insert" ? "" : op.left}
      </td>
      <td className="select-none border-r border-border-subtle px-2 text-right align-top text-text-faint tabular-nums">
        {op.kind === "delete" ? "" : op.right}
      </td>
      <td
        className={`select-none border-r border-border-subtle px-1 text-center align-top ${tx}`}
      >
        {sym}
      </td>
      <td className={`whitespace-pre-wrap break-all px-3 align-top ${tx}`}>
        {op.text}
      </td>
    </tr>
  );
}
