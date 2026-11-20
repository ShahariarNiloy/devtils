"use client";

import { BarChart2, ChevronDown, ExternalLink, FileCheck, MoreHorizontal, Search, Share2, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { stashHandoffInput } from "@/components/json-converter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { Tooltip } from "@/components/primitives/tooltip";
import { cn } from "@/lib/cn";
import { formatJsonText } from "../json-formatter.lib";
import type { ConvertTarget, IndentStyle, SortOrder } from "../json-formatter.types";
import type { JsonFormatterState } from "../use-json-formatter";

type Mode = "format" | "minify" | "sort";

interface WorkspaceToolbarProps {
  state: JsonFormatterState;
  isMobile: boolean;
  onShare: () => void;
  sharing: boolean;
  onToggleSearch: () => void;
  searchActive: boolean;
  onOpenMore: () => void;
}

const INDENTS: { value: IndentStyle; label: string; short: string }[] = [
  { value: "2", label: "2 spaces", short: "2 sp" },
  { value: "4", label: "4 spaces", short: "4 sp" },
  { value: "tab", label: "Tab", short: "Tab" },
];

const isIndent = (v: string): v is IndentStyle => v === "2" || v === "4" || v === "tab";

/** Which transform produced the current output (none after a conversion). */
function activeMode(state: JsonFormatterState): Mode | null {
  if (state.conversionResult) return null;
  if (state.minifyStats) return "minify";
  if (state.sortOrder !== "none") return "sort";
  return "format";
}

/**
 * v2 workspace toolbar: Format / Minify / Sort keys segments, indent, Repair
 * (lit up when the input is invalid), then secondary actions and the cream
 * "Convert to…" menu. Mobile stacks it as two rows (mockup).
 */
export function WorkspaceToolbar({ state, isMobile, onShare, sharing, onToggleSearch, searchActive, onOpenMore }: WorkspaceToolbarProps) {
  const hasInput = state.input.trim().length > 0;
  const invalid = state.validation.status === "invalid";
  const mode = activeMode(state);
  const sortDir: SortOrder = state.sortOrder === "none" ? "asc" : state.sortOrder;

  const pick = (m: Mode) => {
    if (m === "format") state.formatWith("none");
    else if (m === "minify") state.minify();
    else {
      // Clicking the active Sort segment flips its direction.
      const flipped: SortOrder = sortDir === "asc" ? "desc" : "asc";
      state.formatWith(mode === "sort" ? flipped : "asc");
    }
  };

  const segments = (
    <div
      role="group"
      aria-label="Transform"
      className={cn("flex gap-0.5 border border-border-subtle bg-[#0d0d0c] p-[3px]", isMobile ? "rounded-[11px]" : "rounded-[10px]")}
    >
      {(
        [
          ["format", "Format"],
          ["minify", "Minify"],
          ["sort", "Sort keys"],
        ] as const
      ).map(([m, label]) => {
        const on = mode === m && hasInput && !invalid;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            disabled={!hasInput || invalid}
            onClick={() => pick(m)}
            title={m === "sort" ? `Sort keys ${sortDir === "asc" ? "A → Z" : "Z → A"} (click again to flip)` : undefined}
            className={cn(
              "inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              isMobile ? "min-h-10 flex-1 basis-0 rounded-lg text-sm" : "min-h-[34px] rounded-[7px] px-3 text-[13px]",
              on
                ? "bg-selected text-text shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
                : "text-text-tertiary enabled:hover:bg-white/6 enabled:hover:text-text",
            )}
          >
            {label}
            {m === "format" && !isMobile && <span className="font-mono text-[10px] text-text-faint">⌘↵</span>}
            {m === "sort" && on && <span className="font-mono text-[10px] text-text-faint">{sortDir === "asc" ? "A–Z" : "Z–A"}</span>}
          </button>
        );
      })}
    </div>
  );

  const indent = (
    <label
      className={cn(
        "inline-flex items-center gap-2 border border-border text-[13px] text-text-tertiary",
        isMobile ? "min-h-11 flex-1 basis-0 justify-between gap-1.5 rounded-[10px] px-3" : "min-h-10 rounded-[9px] px-2.5",
      )}
    >
      Indent
      <select
        value={state.indent}
        onChange={(e) => {
          if (isIndent(e.target.value)) state.setIndent(e.target.value);
        }}
        className={cn("cursor-pointer border-0 bg-transparent font-semibold text-text outline-none [&>option]:bg-surface", isMobile ? "text-sm" : "text-[13px]")}
      >
        {INDENTS.map((i) => (
          <option key={i.value} value={i.value}>{isMobile ? i.short : i.label}</option>
        ))}
      </select>
    </label>
  );

  const repair = (
    <button
      type="button"
      onClick={state.repair}
      disabled={!hasInput}
      className={cn(
        "inline-flex items-center justify-center gap-2 border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        isMobile ? "min-h-11 flex-1 basis-0 rounded-[10px] text-sm" : "min-h-10 rounded-[9px] px-3 text-[13px]",
        invalid
          ? "border-error-border bg-[rgba(224,121,95,.14)] text-error-text"
          : "border-border text-text-tertiary enabled:hover:bg-white/6 enabled:hover:text-text",
      )}
    >
      <Wrench size={isMobile ? 15 : 14} aria-hidden />
      Repair
    </button>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col gap-2 border-b border-border-subtle bg-toolbar p-2.5">
        {segments}
        <div className="flex gap-2">
          {indent}
          {repair}
          <IconSquare label="Share" onClick={onShare} disabled={!hasInput || sharing}>
            <Share2 size={16} aria-hidden />
          </IconSquare>
          <IconSquare label="More actions" onClick={onOpenMore}>
            <MoreHorizontal size={16} aria-hidden />
          </IconSquare>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-toolbar px-3 py-2.5">
      {segments}
      {indent}
      {repair}
      <span className="grow" />
      {/* Tools the mockup doesn't show live in one quiet menu. */}
      <DropdownMenu>
        <Tooltip content="More tools" side="bottom">
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More tools"
              className="flex size-10 items-center justify-center rounded-[9px] text-text-tertiary transition-colors hover:bg-white/6 hover:text-text"
            >
              <MoreHorizontal size={16} aria-hidden />
            </button>
          </DropdownMenuTrigger>
        </Tooltip>
        <DropdownMenuContent align="end" className="min-w-56">
          <MenuRow icon={<Search size={14} />} label="Search" hint="⌘/" onClick={onToggleSearch} checked={searchActive} disabled={!hasInput} />
          <MenuRow icon={<FileCheck size={14} />} label="Validate against schema" onClick={() => state.setShowSchema(!state.showSchema)} checked={state.showSchema} />
          <MenuRow icon={<BarChart2 size={14} />} label="Stats" onClick={() => state.setShowStats(!state.showStats)} checked={state.showStats} />
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        type="button"
        onClick={onShare}
        disabled={!hasInput || sharing}
        className="inline-flex min-h-10 items-center gap-[7px] rounded-[9px] px-3 text-[13px] font-semibold text-text-tertiary transition-colors enabled:hover:bg-white/6 enabled:hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Share2 size={14} aria-hidden />
        {sharing ? "Sharing…" : "Share"}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={!hasInput || invalid}
            className="btn-action inline-flex min-h-10 items-center gap-2 rounded-[9px] px-3.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Convert to…
            <ChevronDown size={13} strokeWidth={2.2} aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <ConvertItem state={state} target="typescript" slug="json-to-typescript" label="TypeScript" />
          <ConvertItem state={state} target="zod" slug="json-to-zod" label="Zod" />
          <ConvertItem state={state} target="schema" slug="json-schema" label="JSON Schema" />
          <DropdownMenuSeparator />
          <ConvertItem state={state} target="go" slug="json-to-go" label="Go" />
          <ConvertItem state={state} target="python" slug="json-to-python" label="Python" />
          <ConvertItem state={state} target="rust" slug="json-to-rust" label="Rust" />
          <DropdownMenuSeparator />
          <ConvertItem state={state} target="yaml" slug="json-to-yaml" label="YAML" />
          <ConvertItem state={state} target="xml" slug="json-to-xml" label="XML" />
          <ConvertItem state={state} target="csv" slug="json-to-csv" label="CSV" />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MenuRow({ icon, label, hint, onClick, checked, disabled }: { icon: ReactNode; label: string; hint?: string; onClick: () => void; checked?: boolean; disabled?: boolean }) {
  return (
    <DropdownMenuItem onClick={onClick} disabled={disabled} className="flex items-center gap-2.5">
      <span aria-hidden="true" className="text-text-faint">{icon}</span>
      <span className="grow">{label}</span>
      {checked && <span className="text-xs text-success-text">On</span>}
      {hint && <span className="font-mono text-[11px] text-text-faint">{hint}</span>}
    </DropdownMenuItem>
  );
}

function IconSquare({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border text-text-tertiary disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Handoff text for a dedicated tool: the source text, formatted losslessly. */
export function handoffText(state: JsonFormatterState): string {
  try {
    return formatJsonText(state.input, "2", "none");
  } catch {
    return state.input;
  }
}

/**
 * Menu row with two affordances: the row converts in place; the ↗ button
 * opens the dedicated tool with this input handed off (no re-paste).
 */
function ConvertItem({ state, target, slug, label }: { state: JsonFormatterState; target: ConvertTarget; slug: string; label: string }) {
  const router = useRouter();
  const openDedicated = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = handoffText(state);
    if (text.trim()) stashHandoffInput(text);
    router.push(`/tools/${slug}`);
  };
  return (
    <DropdownMenuItem onClick={() => state.convert(target)} className="group flex items-center justify-between gap-2 pr-1">
      <span>JSON → {label}</span>
      <button
        type="button"
        onClick={openDedicated}
        aria-label={`Open the ${label} tool with this input`}
        title={`Open the ${label} tool with this input`}
        className="inline-flex size-6 items-center justify-center rounded text-text-faint transition-colors hover:bg-surface-soft hover:text-text"
      >
        <ExternalLink size={12} aria-hidden />
      </button>
    </DropdownMenuItem>
  );
}
