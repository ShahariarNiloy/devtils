"use client";

import { ChevronDown, CircleCheck, CircleX, ExternalLink, FileCheck, MoreHorizontal, Search, Share2, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import type { SchemaCheckResult } from "../schema-check";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { Tooltip } from "@/components/primitives/tooltip";
import { cn } from "@/lib/cn";
import { useHandoff } from "../hooks/use-handoff";
import type { ConvertTarget, IndentStyle, SortOrder } from "../json-formatter.types";
import type { JsonFormatterState } from "../use-json-formatter";

type Mode = "format" | "minify" | "sort";

/** Label while a large-document job for that action runs in the worker. */
const BUSY_LABEL: Record<Mode, string> = { format: "Formatting…", minify: "Minifying…", sort: "Sorting…" };

interface WorkspaceToolbarProps {
  state: JsonFormatterState;
  isMobile: boolean;
  onShare: () => void;
  sharing: boolean;
  onToggleSearch: () => void;
  searchActive: boolean;
  onOpenSchema: () => void;
  schemaActive: boolean;
  /** Result of the schema check; undefined when no schema has been entered. */
  schemaResult: SchemaCheckResult | null | undefined;
  onOpenMore: () => void;
}

const INDENTS: { value: IndentStyle; label: string; title: string }[] = [
  { value: "2", label: "2", title: "2 spaces" },
  { value: "4", label: "4", title: "4 spaces" },
  { value: "tab", label: "Tab", title: "Tabs" },
];

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
export function WorkspaceToolbar({
  state,
  isMobile,
  onShare,
  sharing,
  onToggleSearch,
  searchActive,
  onOpenSchema,
  schemaActive,
  schemaResult,
  onOpenMore,
}: WorkspaceToolbarProps) {
  const hasInput = state.input.trim().length > 0;
  const invalid = state.validation.status === "invalid";
  const mode = activeMode(state);
  const sortDir: SortOrder = state.sortOrder === "none" ? "asc" : state.sortOrder;
  const busy = state.busyAction;
  const handoff = useHandoff(state);

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
        const working = busy === m;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            aria-busy={working || undefined}
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
            {working ? <span className="animate-pulse">{BUSY_LABEL[m]}</span> : label}
            {m === "format" && !isMobile && <span className="font-mono text-[10px] text-text-faint">⌘↵</span>}
            {m === "sort" && on && <span className="font-mono text-[10px] text-text-faint">{sortDir === "asc" ? "A–Z" : "Z–A"}</span>}
          </button>
        );
      })}
    </div>
  );

  // Three options → a segmented toggle: every choice visible, one click,
  // and no OS-drawn <select> popup that ignores the dark theme.
  const indent = (
    <div
      role="radiogroup"
      aria-label="Indent"
      className={cn(
        "inline-flex items-center gap-0.5 border border-border p-[3px] text-text-tertiary",
        isMobile ? "min-h-11 flex-1 basis-0 rounded-[10px] pl-2.5" : "min-h-10 rounded-[9px] pl-2.5",
      )}
    >
      <span className={cn("mr-1 select-none", isMobile ? "text-[13px]" : "text-[13px]")}>Indent</span>
      {INDENTS.map((i) => {
        const on = state.indent === i.value;
        return (
          <button
            key={i.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={i.title}
            onClick={() => state.changeIndent(i.value)}
            className={cn(
              "inline-flex items-center justify-center rounded-[6px] font-mono font-semibold transition-colors",
              isMobile ? "min-h-9 min-w-9 flex-1 px-1.5 text-[12.5px]" : "min-h-8 min-w-8 px-2 text-[12.5px]",
              on ? "bg-selected text-text shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "hover:bg-white/6 hover:text-text",
            )}
          >
            {i.label}
          </button>
        );
      })}
    </div>
  );

  const repair = (
    <button
      type="button"
      onClick={state.repair}
      disabled={!hasInput}
      aria-busy={busy === "repair" || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        isMobile ? "min-h-11 flex-1 basis-0 rounded-[10px] text-sm" : "min-h-10 rounded-[9px] px-3 text-[13px]",
        invalid
          ? "border-error-border bg-[rgba(224,121,95,.14)] text-error-text"
          : "border-border text-text-tertiary enabled:hover:bg-white/6 enabled:hover:text-text",
      )}
    >
      <Wrench size={isMobile ? 15 : 14} aria-hidden className={busy === "repair" ? "animate-pulse" : undefined} />
      {busy === "repair" ? "Repairing…" : "Repair"}
    </button>
  );

  if (isMobile) {
    return (
      <div aria-busy={state.actionPending ? true : undefined} className="flex flex-col gap-2 border-b border-border-subtle bg-toolbar p-2.5">
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
    <div aria-busy={state.actionPending ? true : undefined} className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-toolbar px-3 py-2.5">
      {segments}
      {indent}
      {repair}
      <span className="grow" />
      <Tooltip content="Fuzzy-find keys & values, or run a JSONPath ($…)" side="bottom">
        <button
          type="button"
          onClick={onToggleSearch}
          disabled={!hasInput}
          aria-pressed={searchActive}
          className={ghostBtn}
        >
          <Search size={14} aria-hidden />
          Find
          <kbd className="font-mono text-[10px] text-text-faint">⌘/</kbd>
        </button>
      </Tooltip>
      <Tooltip content="Validate against a JSON Schema" side="bottom">
        <button type="button" onClick={onOpenSchema} aria-pressed={schemaActive} className={cn(ghostBtn, schemaActive && "bg-white/6 text-text")}>
          <FileCheck size={14} aria-hidden />
          Schema
          <SchemaBadge result={schemaResult} />
        </button>
      </Tooltip>
      <button type="button" onClick={onShare} disabled={!hasInput || sharing} className={ghostBtn}>
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
          <ConvertItem state={state} handoff={handoff} target="typescript" slug="json-to-typescript" label="TypeScript" />
          <ConvertItem state={state} handoff={handoff} target="zod" slug="json-to-zod" label="Zod" />
          <ConvertItem state={state} handoff={handoff} target="schema" slug="json-schema" label="JSON Schema" />
          <DropdownMenuSeparator />
          <ConvertItem state={state} handoff={handoff} target="go" slug="json-to-go" label="Go" />
          <ConvertItem state={state} handoff={handoff} target="python" slug="json-to-python" label="Python" />
          <ConvertItem state={state} handoff={handoff} target="rust" slug="json-to-rust" label="Rust" />
          <DropdownMenuSeparator />
          <ConvertItem state={state} handoff={handoff} target="yaml" slug="json-to-yaml" label="YAML" />
          <ConvertItem state={state} handoff={handoff} target="xml" slug="json-to-xml" label="XML" />
          <ConvertItem state={state} handoff={handoff} target="csv" slug="json-to-csv" label="CSV" />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const ghostBtn =
  "inline-flex min-h-10 items-center gap-[7px] rounded-[9px] px-3 text-[13px] font-semibold text-text-tertiary transition-colors enabled:hover:bg-white/6 enabled:hover:text-text disabled:cursor-not-allowed disabled:opacity-40";

/** Live schema outcome on the Schema button (nothing until a schema is entered). */
function SchemaBadge({ result }: { result: SchemaCheckResult | null | undefined }) {
  if (result === undefined) return null;
  if (result === null) return <span className="size-1.5 animate-pulse rounded-full bg-text-faint" aria-label="checking" />;
  if (result.status === "valid")
    return <CircleCheck size={13} className="text-success" aria-label="matches the schema" />;
  if (result.status === "schema-error")
    return <span className="rounded-[5px] bg-error-bg px-1.5 text-[11px] text-error-text">schema error</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-[5px] bg-error-bg px-1.5 text-[11px] text-error-text">
      <CircleX size={11} aria-hidden />
      {result.total} issue{result.total === 1 ? "" : "s"}
    </span>
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

/**
 * Menu row with two affordances: the row converts in place; the ↗ button
 * opens the dedicated tool with this input handed off (no re-paste).
 */
type Handoff = ReturnType<typeof useHandoff>;

function ConvertItem({ state, handoff, target, slug, label }: { state: JsonFormatterState; handoff: Handoff; target: ConvertTarget; slug: string; label: string }) {
  const openDedicated = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handoff.open(slug);
  };
  const busy = handoff.busySlug === slug;
  return (
    <DropdownMenuItem onClick={() => state.convert(target)} className="group flex items-center justify-between gap-2 pr-1">
      <span>JSON → {label}</span>
      <button
        type="button"
        onClick={openDedicated}
        aria-label={`Open the ${label} tool with this input`}
        aria-busy={handoff.pendingSlug === slug || undefined}
        title={busy ? "Preparing the input…" : `Open the ${label} tool with this input`}
        className="inline-flex size-6 items-center justify-center rounded text-text-faint transition-colors hover:bg-surface-soft hover:text-text"
      >
        <ExternalLink size={12} aria-hidden className={busy ? "animate-pulse" : undefined} />
      </button>
    </DropdownMenuItem>
  );
}
