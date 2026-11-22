"use client";

import { cn } from "@/lib/cn";
import type { DiffCounts } from "../json-diff.engine";
import type { DiffKind } from "../json-diff.lib";
import type { ChangeFilter, ResultView } from "../use-json-diff";
import { KIND_LOOK, KIND_ORDER } from "./look";
import { Seg } from "./toolbar";

const COUNT_KEY: Record<DiffKind, keyof DiffCounts> = {
  added: "added",
  removed: "removed",
  changed: "changed",
  type: "type",
  moved: "moved",
};

/**
 * Summary strip: total + per-kind filter chips (or "No differences" / the
 * input problem), then Hide inputs and the Hide unchanged switch.
 */
export function SummaryBar({
  state,
  counts,
  badMsg,
  pending,
  filter,
  onFilter,
  inputsOpen,
  onToggleInputs,
  hideUnchanged,
  onHideUnchanged,
}: {
  state: "some" | "none" | "bad" | "failed" | "loading";
  counts: DiffCounts;
  badMsg: string;
  pending: boolean;
  filter: ChangeFilter;
  onFilter: (f: ChangeFilter) => void;
  inputsOpen: boolean;
  onToggleInputs: () => void;
  hideUnchanged: boolean;
  onHideUnchanged: (b: boolean) => void;
}) {
  const chips: Array<{ key: ChangeFilter; label: string; n: number; text: string }> = [
    { key: "all", label: "All", n: counts.total, text: "text-text" },
  ];
  for (const k of KIND_ORDER) {
    const n = counts[COUNT_KEY[k]];
    if (n > 0) chips.push({ key: k, label: KIND_LOOK[k].chip, n, text: KIND_LOOK[k].text });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-border-subtle bg-surface px-3.5 py-2.5">
      {state === "some" && (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold tracking-[-0.02em] tabular-nums">{counts.total.toLocaleString()}</span>
            <span className="text-[13px] text-text-tertiary">{counts.total === 1 ? "difference" : "differences"}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => {
              const on = filter === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onFilter(c.key)}
                  className={cn(
                    "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-colors sm:min-h-[30px]",
                    on ? "border-white/22 bg-white/9" : "border-white/8 hover:border-white/16",
                    c.text,
                  )}
                >
                  <span className="font-mono">{c.n.toLocaleString()}</span>
                  {c.label}
                </button>
              );
            })}
            {counts.ignored > 0 && (
              <span className="inline-flex min-h-11 items-center rounded-full border border-dashed border-white/14 px-2.5 text-xs text-text-faint sm:min-h-[30px]">
                {counts.ignored.toLocaleString()} ignored
              </span>
            )}
          </div>
        </>
      )}
      {state === "none" && <span className="text-sm font-bold text-success-text">No differences</span>}
      {state === "bad" && <span className="text-sm font-semibold text-error-text">{badMsg}</span>}
      {state === "failed" && <span className="text-sm font-semibold text-error-text">Couldn&rsquo;t compare</span>}
      {state === "loading" && <span className="text-sm text-text-faint">Comparing…</span>}
      {pending && state !== "loading" && (
        <span className="text-xs text-text-faint" aria-hidden>
          Updating…
        </span>
      )}
      <span className="grow" />
      <button
        type="button"
        onClick={onToggleInputs}
        aria-expanded={inputsOpen}
        className="min-h-11 cursor-pointer rounded-lg px-2.5 text-xs font-semibold text-text-tertiary transition-colors hover:bg-white/6 hover:text-text sm:min-h-8"
      >
        {inputsOpen ? "Hide inputs" : "Edit inputs"}
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={hideUnchanged}
        onClick={() => onHideUnchanged(!hideUnchanged)}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 px-1.5 text-xs font-semibold text-text-strong sm:min-h-8"
      >
        <span aria-hidden className={cn("relative h-4 w-[30px] rounded-full transition-colors", hideUnchanged ? "bg-clay-light" : "bg-white/14")}>
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-3 rounded-full bg-text transition-transform motion-reduce:transition-none",
              hideUnchanged && "translate-x-3.5",
            )}
          />
        </span>
        Hide unchanged
      </button>
    </div>
  );
}

/** View tabs + current change and ↑ ↓ navigation. */
export function ViewBar({
  views,
  view,
  onView,
  navigable,
  curPath,
  curClass,
  navPos,
  onPrev,
  onNext,
}: {
  views: ReadonlyArray<readonly [ResultView, string]>;
  view: ResultView;
  onView: (v: ResultView) => void;
  navigable: boolean;
  curPath: string;
  curClass: string;
  navPos: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-subtle px-3.5 py-2">
      <Seg label="View" role="tablist" value={view} options={views} onChange={onView} />
      <span className="grow" />
      {navigable && (
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("max-w-[260px] truncate font-mono text-xs", curClass)}>{curPath}</span>
          <span className="shrink-0 font-mono text-xs text-text-faint tabular-nums">{navPos}</span>
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous change (p)"
            title="Previous change (p)"
            className="surface-key size-11 shrink-0 cursor-pointer rounded-lg text-sm text-text-key sm:size-8"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next change (n)"
            title="Next change (n)"
            className="surface-key size-11 shrink-0 cursor-pointer rounded-lg text-sm text-text-key sm:size-8"
          >
            ↓
          </button>
          <span className="hidden text-[11px] text-text-ghost sm:inline">n / p</span>
        </div>
      )}
    </div>
  );
}

/** Mockup status line. */
export function StatusBar({ modeLabel }: { modeLabel: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border-subtle bg-surface px-3.5 py-[9px] font-mono text-[11px] text-text-faint">
      <span className="text-success-text">● Semantic compare</span>
      <span>key order ignored</span>
      <span>{modeLabel}</span>
      <span className="grow" />
      <span className="text-success-text">Local-only</span>
    </div>
  );
}
