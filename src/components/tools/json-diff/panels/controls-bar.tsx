"use client";

import { AlertTriangle, ArrowLeftRight, Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { Input } from "@/components/primitives/input";
import { cn } from "@/lib/cn";
import type { ArrayStrategy, DiffResult } from "../json-diff.lib";
import type { PointerStyle } from "../use-json-diff";

const STRATEGIES: { id: ArrayStrategy; label: string; help: string }[] = [
  { id: "ordered", label: "Ordered", help: "Match items by position; detect moves" },
  { id: "set", label: "Set-like", help: "Treat arrays as unordered collections" },
  { id: "identity", label: "By id", help: "Match items by an identity key (e.g. id)" },
];

/**
 * Strip of inline toggles that affect the diff result + display. Order
 * mirrors importance: array strategy first (highest-impact decision), then
 * sort-keys / hide-unchanged / pointer-style. Type-change warning sits at
 * the right when present — visible at all times so you don't miss a bug.
 */
export function ControlsBar({
  result,
  arrayStrategy,
  onArrayStrategy,
  identityKey,
  onIdentityKey,
  sortKeys,
  onSortKeys,
  hideUnchanged,
  onHideUnchanged,
  pointerStyle,
  onPointerStyle,
  onSwap,
}: {
  result: DiffResult | null;
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
}) {
  const activeStrategy =
    STRATEGIES.find((s) => s.id === arrayStrategy) ?? STRATEGIES[0];
  const typeChanges = result?.stats.typeChanges ?? 0;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
      {/* Array strategy */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-text-muted">Arrays:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 text-xs-plus font-medium text-text transition-colors hover:bg-surface"
            >
              {activeStrategy.label}
              <ChevronDown size={12} className="text-text-faint" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>How to compare arrays</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STRATEGIES.map((s) => (
              <DropdownMenuItem key={s.id} onClick={() => onArrayStrategy(s.id)}>
                {arrayStrategy === s.id ? <Check size={12} /> : <span className="w-3" />}
                <span className="ml-1.5">
                  <span className="font-medium">{s.label}</span>
                  <span className="ml-2 text-text-faint">{s.help}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {arrayStrategy === "identity" && (
          <Input
            type="text"
            value={identityKey}
            onChange={(e) => onIdentityKey(e.target.value)}
            placeholder="id"
            className="h-8 w-28 font-mono text-base"
            aria-label="Identity key"
          />
        )}
      </div>

      <Divider />

      {/* Sort keys */}
      <Toggle
        label="Sort keys"
        checked={sortKeys}
        onChange={onSortKeys}
        title="Canonicalize both sides — recursively sort object keys before compare"
      />

      {/* Hide unchanged */}
      <Toggle
        label="Hide unchanged"
        checked={hideUnchanged}
        onChange={onHideUnchanged}
        title="Collapse the unchanged branches of the result tree"
      />

      <Divider />

      {/* Pointer style */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-text-muted">Paths:</span>
        <div className="inline-flex rounded-md border border-border bg-surface-2 p-0.5">
          {(
            [
              { id: "json-pointer", label: "/a/b" },
              { id: "dot", label: "a.b" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPointerStyle(p.id as PointerStyle)}
              className={cn(
                "h-6 rounded-sm px-2 text-xs font-mono transition-colors",
                pointerStyle === p.id
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-muted hover:text-text",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Type-change warning — only when present, but prominent */}
        {typeChanges > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-md border border-warning-border bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-text"
            title="Type changes are almost always bugs — check these first"
          >
            <AlertTriangle size={11} />
            {typeChanges} type change{typeChanges === 1 ? "" : "s"}
          </span>
        )}

        {/* Swap sides */}
        <button
          type="button"
          onClick={onSwap}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs-plus text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          aria-label="Swap sides"
          title="Swap left and right"
        >
          <ArrowLeftRight size={12} />
          Swap
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  title,
}: {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
  title?: string;
}) {
  return (
    <label
      className="inline-flex cursor-pointer items-center gap-1.5 text-xs-plus text-text-muted"
      title={title}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 cursor-pointer accent-brand"
      />
      {label}
    </label>
  );
}

function Divider() {
  return <span className="hidden text-text-faint sm:inline">·</span>;
}
