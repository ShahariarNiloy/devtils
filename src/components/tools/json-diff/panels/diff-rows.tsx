"use client";

import { memo } from "react";
import { cn } from "@/lib/cn";
import {
  lineView,
  ROW_ADD,
  ROW_CHG,
  ROW_DEL,
  ROW_IGN,
  TOK_FALSE,
  TOK_NULL,
  TOK_NUMBER,
  TOK_STRING,
  TOK_TRUE,
  type LineTable,
  type RowTable,
} from "../json-diff.lib";
import type { DisplayList } from "../json-diff.view";
import { CUR_RING } from "./look";
import { VirtualList, type ScrollRequest } from "./virtual-list";

/**
 * The row diff: both documents pretty-printed and aligned line by line
 * (split, desktop) or interleaved −/+ (unified, mobile). Unchanged runs
 * fold behind "⋯ N unchanged lines"; ignored lines stay, dimmed. Clicking a
 * changed row selects its change.
 */

const STRIPE = "bg-[repeating-linear-gradient(135deg,rgba(255,255,255,.035)_0_6px,transparent_6px_12px)]";
const RED = "bg-error/10";
const GREEN = "bg-success/10";

const SPLIT_BG: Record<number, [string, string]> = {
  [ROW_ADD]: [STRIPE, GREEN],
  [ROW_DEL]: [RED, STRIPE],
  [ROW_CHG]: ["bg-error/7", "bg-success/7"],
};

function toneClass(tok: number): string {
  switch (tok) {
    case TOK_STRING:
      return "text-syntax-string";
    case TOK_NUMBER:
      return "text-syntax-number";
    case TOK_TRUE:
    case TOK_FALSE:
      return "text-syntax-boolean";
    case TOK_NULL:
    default:
      return "text-syntax-punctuation";
  }
}

/** One side's code: key, value token (highlighted when changed), comma. */
function Code({ rows, table, line, hl }: { rows: RowTable; table: LineTable; line: number; hl?: "red" | "green" }) {
  const v = lineView(rows, table, line);
  return (
    <span
      className="min-w-0 flex-auto whitespace-pre-wrap [overflow-wrap:anywhere]"
      style={{ paddingLeft: `calc(${v.ind} * var(--jd-ind))` }}
    >
      {v.key !== null && (
        <>
          <span className="text-syntax-key">{v.key}</span>
          <span className="text-syntax-punctuation">: </span>
        </>
      )}
      <span className={cn(toneClass(v.tok), "rounded-[3px]", hl === "red" && "bg-error/26", hl === "green" && "bg-success/26")}>{v.text}</span>
      {v.comma && <span className="text-syntax-punctuation">,</span>}
    </span>
  );
}

function Fold({ count, onExpand }: { count: number; onExpand: () => void }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="block min-h-11 w-full cursor-pointer border-y border-white/4 bg-white/[0.025] font-mono text-xs text-text-faint transition-colors hover:text-text sm:min-h-[30px]"
    >
      ⋯ {count} unchanged lines
    </button>
  );
}

interface RowsProps {
  rows: RowTable;
  list: DisplayList;
  cur: number;
  onPick: (cid: number) => void;
  onExpand: (row: number) => void;
  scrollEl: HTMLElement | null;
  scrollTo: ScrollRequest | null;
}

export const SplitRows = memo(function SplitRows({ rows, list, cur, onPick, onExpand, scrollEl, scrollTo }: RowsProps) {
  const render = (i: number) => {
    const item = list.items[i];
    if (item < 0) return <Fold count={-item} onExpand={() => onExpand(list.first[i])} />;
    const kind = rows.kind[item];
    const cid = rows.cid[item];
    const l = rows.l[item];
    const r = rows.r[item];
    const [lbg, rbg] = SPLIT_BG[kind] ?? ["", ""];
    const chg = kind === ROW_CHG;
    return (
      <div
        onClick={cid >= 0 ? () => onPick(cid) : undefined}
        className={cn(
          "grid grid-cols-2",
          kind === ROW_IGN && "opacity-[.42]",
          cid >= 0 && "cursor-pointer",
          cid >= 0 && cid === cur && CUR_RING,
        )}
      >
        <div className={cn("flex min-w-0 border-r border-border-subtle", lbg)}>
          <span className="flex-[0_0_40px] pr-2.5 text-right text-[#4f4e48] select-none">{l >= 0 ? l + 1 : ""}</span>
          {l >= 0 ? <Code rows={rows} table={rows.left} line={l} hl={chg ? "red" : undefined} /> : <span className="flex-auto" />}
        </div>
        <div className={cn("flex min-w-0", rbg)}>
          <span className="flex-[0_0_40px] pr-2.5 text-right text-[#4f4e48] select-none">{r >= 0 ? r + 1 : ""}</span>
          {r >= 0 ? <Code rows={rows} table={rows.right} line={r} hl={chg ? "green" : undefined} /> : <span className="flex-auto" />}
          {kind === ROW_IGN && (l >= 0 || r >= 0) && (
            <span className="mr-2.5 shrink-0 self-center rounded px-1.5 text-[10px] leading-[1.6] text-text-faint bg-white/6">ignored</span>
          )}
        </div>
      </div>
    );
  };
  return (
    <>
      <div className="sticky top-0 z-[1] grid grid-cols-2 border-b border-border-subtle bg-surface text-xs font-bold">
        <span className="flex items-center gap-[7px] border-r border-border-subtle px-3.5 py-2">
          <span aria-hidden className="size-[7px] rounded-[2px] bg-error" />
          Original
        </span>
        <span className="flex items-center gap-[7px] px-3.5 py-2">
          <span aria-hidden className="size-[7px] rounded-[2px] bg-success" />
          Changed
        </span>
      </div>
      <VirtualList
        count={list.count}
        estimate={21.25}
        scrollEl={scrollEl}
        scrollTo={scrollTo}
        render={render}
        className="font-mono text-[12.5px] leading-[1.7] [--jd-ind:16px]"
      />
    </>
  );
});

export const UnifiedRows = memo(function UnifiedRows({ rows, list, cur, onPick, onExpand, scrollEl, scrollTo }: RowsProps) {
  const render = (i: number) => {
    const item = list.items[i];
    if (item < 0) return <Fold count={-item} onExpand={() => onExpand(list.first[i])} />;
    const row = item >> 1;
    const right = (item & 1) === 1;
    const kind = rows.kind[row];
    const cid = rows.cid[row];
    const quiet = kind !== ROW_ADD && kind !== ROW_DEL && kind !== ROW_CHG;
    const line = right ? rows.r[row] : rows.l[row];
    const table = right ? rows.right : rows.left;
    let sign = right ? "+" : "−";
    let signCls = right ? "text-success-text" : "text-error-text";
    let tint = right ? GREEN : RED;
    if (quiet) {
      sign = " ";
      signCls = "text-text-ghost";
      tint = "";
    }
    let hl: "red" | "green" | undefined;
    if (kind === ROW_CHG) hl = right ? "green" : "red";
    return (
      <div
        onClick={cid >= 0 ? () => onPick(cid) : undefined}
        className={cn(
          "flex min-w-0",
          tint,
          kind === ROW_IGN && "opacity-[.42]",
          cid >= 0 && "cursor-pointer",
          cid >= 0 && cid === cur && CUR_RING,
        )}
      >
        <span className="flex-[0_0_30px] pr-1.5 text-right text-[#4f4e48] select-none">{line + 1}</span>
        <span aria-hidden className={cn("flex-[0_0_14px] select-none", signCls)}>
          {sign}
        </span>
        {!quiet && <span className="sr-only">{right ? "added line" : "removed line"}</span>}
        <span className="flex min-w-0 flex-auto pr-2.5">
          <Code rows={rows} table={table} line={line} hl={hl} />
        </span>
      </div>
    );
  };
  return (
    <VirtualList
      count={list.count}
      estimate={20.4}
      scrollEl={scrollEl}
      scrollTo={scrollTo}
      render={render}
      className="py-1.5 font-mono text-[12px] leading-[1.7] [--jd-ind:12px] sm:text-[12.5px]"
    />
  );
});
