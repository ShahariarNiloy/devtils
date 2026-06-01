"use client";

import { cn } from "@/lib/cn";
import { buildSideRows, diffLines, type WordOp } from "@/lib/diff";
import { ChevronsUpDown, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { canonicalize, type JsonValue } from "../json-diff.lib";

/**
 * Text-level side-by-side diff. Default landing view — most reviewers
 * scan diffs textually first, then drop into the Tree / Patch tabs for
 * structural detail. Reuses the project's Myers diff + side-row builder
 * so the visual matches diff-checker; the column tinting follows the
 * diff-checker convention of bg-success/5 and bg-danger/5 (subtle 5%
 * opacity over the surface) plus bg-border-subtle/30 for "no content"
 * cells. Word-level changes inside a changed row get a stronger 25%
 * tint on just the changed substring.
 *
 * When `hideUnchanged` is on, long runs of equal rows collapse into a
 * single "…N unchanged lines…" placeholder, leaving 3 lines of context
 * either side of each change (git-style).
 */
export function SideBySideView({
  leftValue,
  rightValue,
  sortKeys,
  hideUnchanged,
}: {
  leftValue: JsonValue | undefined;
  rightValue: JsonValue | undefined;
  sortKeys: boolean;
  hideUnchanged: boolean;
}) {
  const { leftText, rightText } = useMemo(() => {
    if (leftValue === undefined || rightValue === undefined) {
      return { leftText: "", rightText: "" };
    }
    const lv = sortKeys ? canonicalize(leftValue) : leftValue;
    const rv = sortKeys ? canonicalize(rightValue) : rightValue;
    return {
      leftText: JSON.stringify(lv, null, 2),
      rightText: JSON.stringify(rv, null, 2),
    };
  }, [leftValue, rightValue, sortKeys]);

  const rows = useMemo<SideRow[]>(() => {
    if (!leftText && !rightText) return [];
    return buildSideRows(diffLines(leftText, rightText));
  }, [leftText, rightText]);

  const items = useMemo<RenderItem[]>(
    () =>
      hideUnchanged
        ? collapseEqualRuns(rows, 3)
        : rows.map((r) => ({ row: r })),
    [rows, hideUnchanged],
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface px-4 py-12 text-center text-sm text-text-faint">
        Enter valid JSON on both sides to see the side-by-side diff.
      </div>
    );
  }

  if (rows.every((r) => r.kind === "equal")) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-xl border border-success-border bg-success-bg px-4 py-8 text-success-text">
        <Sparkles size={16} />
        <span className="text-sm font-medium">
          No textual differences after canonicalization
        </span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <table className="w-full table-fixed border-collapse font-mono text-[14px] leading-[1.65]">
        <colgroup>
          <col className="w-[44px]" />
          <col />
          <col className="w-[44px]" />
          <col />
        </colgroup>
        <tbody>
          {items.map((item, i) =>
            "skip" in item ? (
              <SkipRow key={`skip-${i}-${item.skip}`} count={item.skip} />
            ) : (
              <Row
                key={`r-${i}-${item.row.kind}-${rowKey(item.row)}`}
                row={item.row}
              />
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

type SideRow = ReturnType<typeof buildSideRows>[number];
type RenderItem = { row: SideRow } | { skip: number };

function rowKey(row: SideRow): string {
  if (row.kind === "equal" || row.kind === "changed") {
    return `${row.leftLine}-${row.rightLine}`;
  }
  if (row.kind === "delete") return `${row.leftLine}-`;
  return `-${row.rightLine}`;
}

/**
 * Replace runs of consecutive equal rows longer than `2*context + 1` with
 * a single placeholder. Standard git-style context-line collapse. Keeps
 * the head/tail equal rows so changes have visual context; only the
 * middle of a long unchanged block disappears.
 */
function collapseEqualRuns(rows: SideRow[], context: number): RenderItem[] {
  const out: RenderItem[] = [];
  let i = 0;
  while (i < rows.length) {
    if (rows[i].kind !== "equal") {
      out.push({ row: rows[i] });
      i++;
      continue;
    }
    const runStart = i;
    while (i < rows.length && rows[i].kind === "equal") i++;
    const runEnd = i;
    const runLen = runEnd - runStart;
    const isStart = runStart === 0;
    const isEnd = runEnd === rows.length;
    const headKeep = isStart ? 0 : context;
    const tailKeep = isEnd ? 0 : context;
    if (runLen <= headKeep + tailKeep + 1) {
      for (let k = runStart; k < runEnd; k++) out.push({ row: rows[k] });
      continue;
    }
    for (let k = runStart; k < runStart + headKeep; k++) out.push({ row: rows[k] });
    out.push({ skip: runLen - headKeep - tailKeep });
    for (let k = runEnd - tailKeep; k < runEnd; k++) out.push({ row: rows[k] });
  }
  return out;
}

function Row({ row }: { row: SideRow }) {
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
  return (
    <tr>
      <Gutter num={row.leftLine} tone="danger" />
      <Cell tone="danger" words={row.leftWords} />
      <Gutter num={row.rightLine} tone="success" />
      <Cell tone="success" words={row.rightWords} />
    </tr>
  );
}

function SkipRow({ count }: { count: number }) {
  return (
    <tr className="bg-surface-2/40">
      <td
        colSpan={4}
        className="select-none px-3 py-1.5 text-center text-xs text-text-faint"
      >
        <span className="inline-flex items-center gap-1.5">
          <ChevronsUpDown size={11} />
          {count} unchanged line{count === 1 ? "" : "s"}
        </span>
      </td>
    </tr>
  );
}

// Earth-tone palette per UCLAY tokens: gutter uses the *-border shade (a
// deeper tint than the cell body), text uses *-text for confident contrast.
// Solid colours rather than opacity blends — diff rows need to read
// instantly without squinting.
const GUTTER_TONE_CLASSES: Record<"success" | "danger", string> = {
  success: "bg-success-border text-success-text",
  danger: "bg-error-border text-error-text",
};

function Gutter({ num, tone }: { num?: number; tone?: "success" | "danger" }) {
  const cls = tone ? GUTTER_TONE_CLASSES[tone] : "text-text-faint";
  return (
    <td
      className={cn(
        "select-none border-r border-border-subtle px-2 py-px text-right align-top text-[11px] tabular-nums",
        cls,
      )}
    >
      {num ?? ""}
    </td>
  );
}

type CellTone = "success" | "danger" | "empty";

// Solid pale-tone backgrounds — much more readable than the previous /5
// opacity blends. `empty` cells (the opposite-side blank on add/del rows)
// take a faint surface tint so the row still reads as present.
const CELL_TONE_BG: Record<CellTone, string> = {
  success: "bg-success-bg",
  danger: "bg-error-bg",
  empty: "bg-surface-2/40",
};

function Cell({
  text,
  tone,
  words,
}: {
  text?: string;
  tone?: CellTone;
  words?: ReadonlyArray<WordOp>;
}) {
  const bg = tone ? CELL_TONE_BG[tone] : "";
  const wordTone: "success" | "danger" = tone === "success" ? "success" : "danger";

  return (
    <td
      className={cn("border-r border-border-subtle px-3 py-px align-top", bg)}
    >
      {words ? (
        <pre className="whitespace-pre-wrap break-all text-text">
          {words.map((w, i) => (
            <WordSpan
              key={`${w.kind}-${i}-${w.text.length}`}
              word={w}
              tone={wordTone}
            />
          ))}
        </pre>
      ) : (
        <pre className="whitespace-pre-wrap break-all text-text">
          {text || " "}
        </pre>
      )}
    </td>
  );
}

function WordSpan({ word, tone }: { word: WordOp; tone: "success" | "danger" }) {
  if (word.kind === "equal") {
    return <span>{word.text}</span>;
  }
  // Word-level highlight: deeper than the cell tint, with confident text
  // colour. Reuses the `*-border` background + `*-text` foreground so the
  // changed substring really pops without leaving the earth palette.
  return (
    <span
      className={
        tone === "success"
          ? "rounded-sm bg-success-border px-0.5 text-success-text"
          : "rounded-sm bg-error-border px-0.5 text-error-text"
      }
    >
      {word.text}
    </span>
  );
}
