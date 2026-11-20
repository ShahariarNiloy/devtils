"use client";

import { AlertTriangle, Check, ClipboardCopy, Eraser, FileText, Link2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { CountPill, MoreButton, SwapButton } from "@/components/tools/diff-checker/parts/chrome";
import type { ArrayStrategy, DiffResult } from "../json-diff.lib";
import type { PointerStyle, ResultView } from "../use-json-diff";

const STRATEGIES: { id: ArrayStrategy; label: string; help: string }[] = [
  { id: "ordered", label: "Ordered", help: "by position; detects moves" },
  { id: "set", label: "Set-like", help: "order doesn't matter" },
  { id: "identity", label: "By id", help: "match items by a key" },
];

const VIEWS: { id: ResultView; label: string }[] = [
  { id: "changes", label: "Change list" },
  { id: "patch", label: "JSON Patch (RFC 6902)" },
  { id: "side-by-side", label: "Text side-by-side" },
];

export function strategyLabel(s: ArrayStrategy): string {
  return STRATEGIES.find((x) => x.id === s)?.label ?? s;
}

interface Props {
  result: DiffResult | null;
  view: ResultView;
  onView: (v: ResultView) => void;
  arrayStrategy: ArrayStrategy;
  onArrayStrategy: (s: ArrayStrategy) => void;
  identityKey: string;
  onIdentityKey: (k: string) => void;
  sortKeys: boolean;
  onSortKeys: (b: boolean) => void;
  hideUnchanged: boolean;
  onHideUnchanged: (b: boolean) => void;
  pointerStyle: PointerStyle;
  onPointerStyle: (s: PointerStyle) => void;
  onSwap: () => void;
  onCopyPatch: () => void;
  onShare: () => void;
  onLoadSample: () => void;
  onClear: () => void;
  canClear: boolean;
}

/**
 * v2 JSON diff toolbar: added / removed / changed pills (plus type-change
 * and moved pills only when they occur), Swap, and ⋯ for the result view,
 * array strategy, key sorting, path style and the share / sample actions.
 * The identity-key field appears inline while "By id" is active — it's a
 * text input, which doesn't belong inside a menu.
 */
export function ControlsBar(p: Props) {
  const st = p.result?.stats;
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-border-subtle bg-toolbar p-3">
      <div className="flex flex-wrap gap-1.5">
        <CountPill tone="added">{st?.added ?? 0} added</CountPill>
        <CountPill tone="removed">{st?.removed ?? 0} removed</CountPill>
        <CountPill tone="changed" title={st?.typeChanges ? "Includes type changes" : undefined}>
          {(st?.changed ?? 0) + (st?.typeChanges ?? 0)} changed
        </CountPill>
        {st && st.typeChanges > 0 && (
          <CountPill tone="warning" title="A value changed type (e.g. number → string) — usually a bug">
            <AlertTriangle size={13} aria-hidden />
            {st.typeChanges} type change{st.typeChanges === 1 ? "" : "s"}
          </CountPill>
        )}
        {st && st.moves > 0 && <CountPill tone="info">{st.moves} moved</CountPill>}
      </div>
      <span className="grow" />
      {p.arrayStrategy === "identity" && (
        <label className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-border pr-1 pl-3 text-[13px] font-semibold text-text-key">
          Match arrays by
          <input
            type="text"
            value={p.identityKey}
            onChange={(e) => p.onIdentityKey(e.target.value)}
            placeholder="id"
            spellCheck={false}
            className="h-9 w-24 rounded-lg border border-border-subtle bg-[#0d0d0c] px-2 font-mono text-[13px] text-text outline-none focus-visible:border-border-strong"
          />
        </label>
      )}
      <SwapButton onClick={p.onSwap} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MoreButton />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          {VIEWS.map((v) => (
            <Choice key={v.id} on={p.view === v.id} onSelect={() => p.onView(v.id)}>
              {v.label}
            </Choice>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Compare arrays</DropdownMenuLabel>
          {STRATEGIES.map((s) => (
            <Choice key={s.id} on={p.arrayStrategy === s.id} onSelect={() => p.onArrayStrategy(s.id)}>
              {s.label}
              <span className="text-text-faint">{s.help}</span>
            </Choice>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={p.sortKeys} onCheckedChange={(v) => p.onSortKeys(v === true)}>
            Sort keys before comparing
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={p.hideUnchanged} onCheckedChange={(v) => p.onHideUnchanged(v === true)}>
            Fold unchanged lines (side-by-side)
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Paths</DropdownMenuLabel>
          <Choice on={p.pointerStyle === "dot"} onSelect={() => p.onPointerStyle("dot")}>
            <span className="font-mono">$.a.b</span>
          </Choice>
          <Choice on={p.pointerStyle === "json-pointer"} onSelect={() => p.onPointerStyle("json-pointer")}>
            <span className="font-mono">/a/b</span>
            <span className="text-text-faint">JSON Pointer</span>
          </Choice>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={p.onCopyPatch} disabled={!st?.total}>
            <ClipboardCopy size={13} aria-hidden />
            Copy JSON Patch
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={p.onShare}>
            <Link2 size={13} aria-hidden />
            Copy share link
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={p.onLoadSample}>
            <FileText size={13} aria-hidden />
            Load sample
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={p.onClear} disabled={!p.canClear}>
            <Eraser size={13} aria-hidden />
            Clear both
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Choice({ on, onSelect, children }: { on: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <DropdownMenuItem onSelect={onSelect}>
      <span className="inline-flex w-3.5 shrink-0 justify-center">{on && <Check size={13} aria-hidden />}</span>
      {children}
      {on && <span className="sr-only">(selected)</span>}
    </DropdownMenuItem>
  );
}
