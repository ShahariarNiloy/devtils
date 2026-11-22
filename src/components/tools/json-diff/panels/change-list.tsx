"use client";

import { memo } from "react";
import { cn } from "@/lib/cn";
import type { ChangeItem } from "../json-diff.engine";
import type { PointerStyle } from "../use-json-diff";
import { CUR_RING, KIND_LOOK } from "./look";
import { VirtualList, type ScrollRequest } from "./virtual-list";

/**
 * Changes view: one row per change in document order — sign tile, path,
 * kind (plus old → new type for type changes), then the old value struck
 * through and the new one. Filtered by the summary chips; virtualized.
 */
export const ChangeList = memo(function ChangeList({
  changes,
  indices,
  cur,
  onPick,
  pointerStyle,
  scrollEl,
  scrollTo,
}: {
  changes: ChangeItem[];
  /** Change indices passing the filter. */
  indices: readonly number[];
  cur: number;
  onPick: (i: number) => void;
  pointerStyle: PointerStyle;
  scrollEl: HTMLElement | null;
  scrollTo: ScrollRequest | null;
}) {
  if (indices.length === 0) {
    return <p className="m-0 px-3.5 py-7 text-center text-sm text-text-faint">No changes of this kind.</p>;
  }
  const render = (i: number) => {
    const ci = indices[i];
    const c = changes[ci];
    const look = KIND_LOOK[c.kind];
    const on = ci === cur;
    const path = pointerStyle === "json-pointer" ? c.pointer || "/" : c.path;
    const hasA = c.a !== undefined && c.kind !== "moved";
    const hasB = c.b !== undefined;
    return (
      <button
        type="button"
        onClick={() => onPick(ci)}
        aria-current={on || undefined}
        className={cn(
          "grid w-full cursor-pointer grid-cols-[28px_minmax(0,1fr)] gap-x-2.5 gap-y-1 border-b border-white/5 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.03]",
          on && "bg-clay-light/7",
          on && CUR_RING,
        )}
      >
        <span
          aria-hidden
          className={cn("row-span-2 flex size-6 items-center justify-center rounded-[7px] font-mono text-[13px] font-bold", look.tile, look.text)}
        >
          {look.sign}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-mono text-[13px] text-text [overflow-wrap:anywhere]">{path}</span>
          <span className={cn("text-[11px] font-bold", look.text)}>{look.label}</span>
          {c.types && <span className="font-mono text-[11px] text-[#c9a3e0]">{c.types}</span>}
          {c.move && (
            <span className="font-mono text-[11px] text-info-text">
              [{c.move[0]}] → [{c.move[1]}]
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs">
          {hasA && (
            <span className="rounded px-1.5 py-px text-error-text line-through decoration-error-text/50 [overflow-wrap:anywhere] bg-error/14">
              <span className="sr-only">was </span>
              {c.a}
            </span>
          )}
          {hasA && hasB && (
            <span aria-hidden className="text-text-ghost">
              →
            </span>
          )}
          {hasB && (
            <span className="rounded px-1.5 py-px text-success-text [overflow-wrap:anywhere] bg-success/14">
              {hasA && <span className="sr-only">now </span>}
              {c.b}
            </span>
          )}
          {c.kind === "moved" && c.a !== undefined && (
            <span className="rounded px-1.5 py-px text-info-text [overflow-wrap:anywhere] bg-info/14">{c.a}</span>
          )}
        </span>
      </button>
    );
  };
  return <VirtualList count={indices.length} estimate={64} scrollEl={scrollEl} scrollTo={scrollTo} render={render} />;
});
