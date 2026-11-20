"use client";

import { buildSideRows, diffLines, type SideRow, type WordOp } from "@/lib/diff";
import { cn } from "@/lib/cn";
import { useMemo } from "react";

/**
 * Original ↔ output, side by side — the answer to "did the formatter change
 * anything but whitespace?". Rendered inside the output pane's body.
 */
export function FormatterDiff({ before, after }: { before: string; after: string }) {
  const rows = useMemo(() => buildSideRows(diffLines(before, after, { ignoreWhitespace: false })), [before, after]);
  return (
    <div className="h-[max(var(--ws-min,440px),calc(100dvh-var(--chrome-top,165px)-176px))] grow overflow-auto font-mono text-[12.5px] leading-[1.75] text-syntax-plain">
      <table className="w-full min-w-[560px] table-fixed border-collapse">
        <caption className="sr-only">Input compared with output, line by line</caption>
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-10" />
          <col />
        </colgroup>
        <tbody>
          {rows.map((r, i) => (
            <DiffRow key={i} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiffRow({ row }: { row: SideRow }) {
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
        <Gutter num={row.leftLine} tone="del" />
        <Cell text={row.text} tone="del" />
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
        <Gutter num={row.rightLine} tone="add" />
        <Cell text={row.text} tone="add" />
      </tr>
    );
  }
  return (
    <tr>
      <Gutter num={row.leftLine} tone="del" />
      <Cell tone="del" words={row.leftWords} />
      <Gutter num={row.rightLine} tone="add" />
      <Cell tone="add" words={row.rightWords} />
    </tr>
  );
}

type Tone = "add" | "del" | "empty";

const ROW_BG: Record<Tone, string> = {
  add: "bg-success-bg",
  del: "bg-error-bg",
  empty: "bg-white/[.02]",
};

function Gutter({ num, tone }: { num?: number; tone?: Exclude<Tone, "empty"> }) {
  return (
    <td
      className={cn(
        "select-none pr-3 text-right align-top tabular-nums",
        tone === "add" ? "bg-success-bg text-success" : tone === "del" ? "bg-error-bg text-error" : "text-text-ghost",
      )}
    >
      {num ?? ""}
    </td>
  );
}

function Cell({ text, tone, words }: { text?: string; tone?: Tone; words?: WordOp[] }) {
  return (
    <td className={cn("whitespace-pre-wrap break-all pr-3.5 align-top", tone && ROW_BG[tone])}>
      {words
        ? words.map((w, i) =>
            w.kind === "equal" ? (
              <span key={i}>{w.text}</span>
            ) : (
              <span key={i} className={cn("rounded-sm", w.kind === "insert" ? "bg-success/25 text-success-text" : "bg-error/25 text-error-text")}>
                {w.text}
              </span>
            ),
          )
        : text}
    </td>
  );
}
