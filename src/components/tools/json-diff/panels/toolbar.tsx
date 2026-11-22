"use client";

import { Check, ClipboardCopy, Eraser, FileText, Link2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { MoreButton } from "@/components/tools/diff-checker/parts/chrome";
import { cn } from "@/lib/cn";
import type { ArrayStrategy } from "../json-diff.lib";
import type { PointerStyle } from "../use-json-diff";

const MODES: ReadonlyArray<readonly [ArrayStrategy, string]> = [
  ["ordered", "Ordered"],
  ["set", "Ignore order"],
  ["identity", "By key"],
];

/** Mockup segmented control (Arrays mode, result views). */
export function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
  role = "group",
}: {
  label: string;
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (v: T) => void;
  /** "tablist" for the result views. */
  role?: "group" | "tablist";
}) {
  return (
    <div role={role} aria-label={label} className="flex gap-0.5 rounded-[10px] border border-white/7 bg-[#0d0d0c] p-[3px]">
      {options.map(([id, text]) => {
        const on = id === value;
        return (
          <button
            key={id}
            type="button"
            role={role === "tablist" ? "tab" : undefined}
            aria-selected={role === "tablist" ? on : undefined}
            aria-pressed={role === "group" ? on : undefined}
            onClick={() => onChange(id)}
            className={cn(
              "min-h-11 cursor-pointer rounded-[7px] text-[13px] font-semibold transition-colors sm:min-h-[30px]",
              role === "tablist" ? "px-3" : "px-[11px]",
              on ? "bg-selected text-text" : "text-text-tertiary hover:text-text",
            )}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

interface Props {
  arrayStrategy: ArrayStrategy;
  onArrayStrategy: (s: ArrayStrategy) => void;
  identityKey: string;
  onIdentityKey: (k: string) => void;
  ignore: readonly string[];
  onAddIgnore: (item: string) => void;
  onRemoveIgnore: (item: string) => void;
  onSwap: () => void;
  // ⋯ menu — everything the mockup doesn't draw.
  sortKeys: boolean;
  onSortKeys: (b: boolean) => void;
  pointerStyle: PointerStyle;
  onPointerStyle: (s: PointerStyle) => void;
  canCopyPatch: boolean;
  onCopyPatch: () => void;
  onShare: () => void;
  onLoadSample: () => void;
  onClear: () => void;
  canClear: boolean;
}

/**
 * Toolbar: Arrays mode (+ identity key while "By key"), the Ignore list
 * (chips + an input that takes a key name or a `$.path`), Swap, and ⋯.
 */
export function Toolbar(p: Props) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    if (draft.trim()) p.onAddIgnore(draft);
    setDraft("");
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-border-subtle bg-toolbar px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-faint">Arrays</span>
        <Seg label="Compare arrays" value={p.arrayStrategy} options={MODES} onChange={p.onArrayStrategy} />
        {p.arrayStrategy === "identity" && (
          <label className="inline-flex min-h-11 items-center gap-1.5 rounded-[9px] border border-white/10 bg-[#0d0d0c] pr-1 pl-2.5 text-xs text-text-faint focus-within:border-border-strong sm:min-h-9">
            key
            <input
              type="text"
              value={p.identityKey}
              onChange={(e) => p.onIdentityKey(e.target.value)}
              aria-label="Identity key for matching array items"
              spellCheck={false}
              autoComplete="off"
              className="min-h-7 w-16 border-0 bg-transparent font-mono text-xs text-[#f0c9a0] outline-none"
            />
          </label>
        )}
      </div>

      <span aria-hidden className="hidden h-[22px] w-px bg-white/8 sm:block" />

      <div className="flex min-w-0 flex-[1_1_280px] flex-wrap items-center gap-1.5">
        <span className="text-xs text-text-faint">Ignore</span>
        {p.ignore.map((g) => (
          <span
            key={g}
            className="inline-flex min-h-7 items-center gap-1 rounded-full bg-white/6 pr-1 pl-[9px] font-mono text-xs text-text-strong"
          >
            {g}
            <button
              type="button"
              aria-label={`Stop ignoring ${g}`}
              onClick={() => p.onRemoveIgnore(g)}
              className="relative size-[22px] cursor-pointer rounded-full text-sm leading-none text-text-faint transition-colors hover:bg-white/8 hover:text-text max-sm:after:absolute max-sm:after:-inset-[11px] max-sm:after:content-['']"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && !draft && p.ignore.length) {
              p.onRemoveIgnore(p.ignore[p.ignore.length - 1]);
            }
          }}
          placeholder="+ key or $.path"
          aria-label="Add a key or path to ignore"
          spellCheck={false}
          autoComplete="off"
          className="min-h-11 min-w-[90px] flex-[1_1_110px] rounded-full border border-dashed border-white/14 bg-transparent px-2.5 font-mono text-xs text-text outline-none placeholder:text-placeholder focus-visible:border-solid focus-visible:border-border-strong sm:min-h-[30px]"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={p.onSwap}
          aria-label="Swap original and changed"
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[9px] border border-white/12 px-3 text-[13px] font-semibold text-text-key transition-colors hover:bg-surface-soft sm:min-h-9"
        >
          <span aria-hidden>⇄</span> Swap
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <MoreButton className="size-11 rounded-[9px] border-white/12 sm:size-9" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuCheckboxItem checked={p.sortKeys} onCheckedChange={(v) => p.onSortKeys(v === true)}>
              Show keys sorted A–Z
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
            <DropdownMenuItem onSelect={p.onCopyPatch} disabled={!p.canCopyPatch}>
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
