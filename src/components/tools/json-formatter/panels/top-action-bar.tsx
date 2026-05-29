"use client";

import {
  AlignLeft,
  ArrowDownUp,
  ArrowUpAZ,
  ArrowDownAZ,
  BarChart2,
  ChevronDown,
  ExternalLink,
  Link2,
  Minimize2,
  RotateCcw,
  Search,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { stashHandoffInput } from "@/components/json-converter";
import { cn } from "@/lib/cn";
import { Kbd } from "@/components/primitives/kbd";
import { Tooltip } from "@/components/primitives/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import type { IndentStyle } from "../json-formatter.types";
import type { JsonFormatterState } from "../use-json-formatter";

interface TopActionBarProps {
  state: JsonFormatterState;
  onShare: () => void;
  /** Toggle the unified Search panel (Fuzzy + JSONPath). */
  onToggleSearch: () => void;
  /** Whether the Search panel is open (drives the active state). */
  searchActive?: boolean;
  sharing: boolean;
}

export function TopActionBar({
  state,
  onShare,
  onToggleSearch,
  searchActive,
  sharing,
}: TopActionBarProps) {
  const hasInput = state.input.trim().length > 0;
  const invalid = state.validation.status === "invalid";
  const canFormat = hasInput && !invalid;

  return (
    <div className="flex h-11 shrink-0 items-center gap-0.5 bg-surface px-2">
      {/* ── Primary CTA: Format — solid brand, lifted, and fenced off by
            a divider so it reads as the tool's action, not a selected tab. */}
      <Tooltip content="Format" shortcut="⌘↵" side="bottom">
        <button
          type="button"
          onClick={state.format}
          disabled={!canFormat}
          className={cn(
            "group inline-flex h-8 items-center gap-1.5 rounded-lg px-3 lg:pr-2 text-sm font-semibold transition-[background,color,box-shadow,transform] duration-150 ease-out select-none cursor-pointer",
            "bg-brand text-bg shadow-btn-primary hover:bg-brand-hover hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
            "disabled:bg-surface-soft disabled:text-text-faint disabled:shadow-none disabled:cursor-not-allowed disabled:translate-y-0 disabled:active:scale-100",
          )}
        >
          <AlignLeft size={14} />
          <span className="hidden lg:inline">Format</span>
          <Kbd className="hidden lg:inline-flex ml-0.5 h-5 border-transparent bg-bg/15 px-1 text-[10.5px] tracking-tight text-bg/80 group-disabled:opacity-50">
            ⌘↵
          </Kbd>
        </button>
      </Tooltip>

      <Divider />

      {/* ── Transform cluster ────────────────────────────────────────── */}
      <ToolButton
        onClick={state.minify}
        disabled={!hasInput}
        icon={<Minimize2 size={13} />}
        label="Minify"
        tooltip="Minify"
        shortcut="⌘⇧M"
      />

      <ToolDropdown
        disabled={!hasInput}
        icon={<ArrowUpAZ size={13} />}
        label="Sort"
        tooltip="Sort keys"
        shortcut="⌘⇧S"
      >
        <DropdownMenuItem onClick={() => state.sortKeys("asc")}>
          <ArrowUpAZ size={13} className="mr-2 text-text-faint" />
          A → Z
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => state.sortKeys("desc")}>
          <ArrowDownAZ size={13} className="mr-2 text-text-faint" />
          Z → A
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => state.sortKeys("none")}>
          Remove sort
        </DropdownMenuItem>
      </ToolDropdown>

      <ToolButton
        onClick={state.repair}
        disabled={!hasInput}
        icon={<Wand2 size={13} />}
        label="Repair"
        tooltip="Repair"
        shortcut="⌘⇧R"
      />

      <Divider />

      {/* ── Utility cluster ──────────────────────────────────────────── */}
      {state.output && (
        <ToolButton
          icon={<RotateCcw size={13} />}
          label="Restore"
          onClick={state.restoreFromMinify}
          tooltip="Restore unminified"
        />
      )}

      <ToolButton
        icon={<Search size={13} />}
        label="Search"
        onClick={onToggleSearch}
        active={searchActive}
        disabled={!hasInput}
        tooltip="Search — fuzzy find or JSONPath"
        shortcut="⌘/"
      />

      <ToolButton
        icon={<BarChart2 size={13} />}
        label="Stats"
        onClick={() => state.setShowStats(!state.showStats)}
        active={state.showStats}
        tooltip="Toggle stats panel"
      />

      <ToolButton
        icon={<Link2 size={13} />}
        label={sharing ? "Sharing…" : "Share"}
        onClick={onShare}
        disabled={!hasInput || sharing}
        tooltip="Copy a sharable link"
        pulse={sharing}
      />

      {/* ── Right-aligned: Convert + Indent ──────────────────────────── */}
      <div className="ml-auto flex items-center gap-0.5 pl-2">
        <ToolDropdown
          disabled={!hasInput}
          icon={<ArrowDownUp size={13} />}
          label="Convert"
          tooltip="Convert format"
          menuClassName="min-w-[200px]"
        >
          <ConvertItem state={state} target="csv"        slug="json-to-csv"        label="CSV" />
          <ConvertItem state={state} target="yaml"       slug="json-to-yaml"       label="YAML" />
          <ConvertItem state={state} target="typescript" slug="json-to-typescript" label="TypeScript" />
          <ConvertItem state={state} target="xml"        slug="json-to-xml"        label="XML" />
          <ConvertItem state={state} target="zod"        slug="json-to-zod"        label="Zod" />
          <ConvertItem state={state} target="schema"     slug="json-schema"        label="JSON Schema" />
          <DropdownMenuSeparator />
          <ConvertItem state={state} target="go"     slug="json-to-go"     label="Go" />
          <ConvertItem state={state} target="python" slug="json-to-python" label="Python" />
          <ConvertItem state={state} target="rust"   slug="json-to-rust"   label="Rust" />
        </ToolDropdown>

        <Select
          value={state.indent}
          onValueChange={(v) => state.setIndent(v as IndentStyle)}
        >
          <SelectTrigger
            size="sm"
            className="h-8 w-[108px] rounded-md border-border-subtle bg-transparent text-text-muted hover:bg-surface-soft hover:border-border-subtle data-[state=open]:bg-surface-soft"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 spaces</SelectItem>
            <SelectItem value="4">4 spaces</SelectItem>
            <SelectItem value="tab">Tab</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ── Internal building blocks ────────────────────────────────────────────────

interface ConvertItemProps {
  state: JsonFormatterState;
  target: ConvertTargetForState;
  slug: string;
  label: string;
}

/**
 * Dropdown row with two affordances: clicking the label converts the input
 * in place (existing behaviour); clicking the ↗ icon opens the dedicated
 * tool page in the same tab, handing off the current input via
 * sessionStorage so the user doesn't paste twice.
 */
function ConvertItem({ state, target, slug, label }: ConvertItemProps) {
  const router = useRouter();
  const openDedicated = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentInput =
      state.parsedValue !== null && state.parsedValue !== undefined
        ? JSON.stringify(state.parsedValue, null, 2)
        : state.input;
    if (currentInput.trim()) stashHandoffInput(currentInput);
    router.push(`/tools/${slug}`);
  };
  return (
    <DropdownMenuItem
      onClick={() => state.convert(target)}
      className="group flex items-center justify-between gap-2 pr-1"
    >
      <span>JSON &rarr; {label}</span>
      <Tooltip content={`Open ${label} tool with this input`} side="right">
        <button
          type="button"
          onClick={openDedicated}
          aria-label={`Open dedicated ${label} tool`}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-text-faint hover:bg-surface-soft hover:text-text transition-colors"
        >
          <ExternalLink size={12} aria-hidden />
        </button>
      </Tooltip>
    </DropdownMenuItem>
  );
}

type ConvertTargetForState = Parameters<JsonFormatterState["convert"]>[0];

function Divider() {
  return <div className="mx-1 h-4 w-px bg-border-subtle/70" aria-hidden />;
}

const TOOL_BUTTON_BASE =
  "group inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 lg:px-2.5 text-sm font-medium transition-[background,color] duration-150 ease-out select-none cursor-pointer";

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  tooltip: string;
  shortcut?: string;
  pulse?: boolean;
}

function ToolButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  tooltip,
  shortcut,
  pulse,
}: ToolButtonProps) {
  const btn = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={tooltip}
      aria-pressed={active}
      className={cn(
        TOOL_BUTTON_BASE,
        active
          ? "bg-surface-soft text-text shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-brand),transparent_70%)]"
          : "text-text-muted hover:bg-surface-soft hover:text-text",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-muted",
        pulse && "animate-pulse",
      )}
    >
      <span
        className={cn(
          "transition-colors",
          active ? "text-brand" : "text-text-faint group-hover:text-text-muted",
        )}
      >
        {icon}
      </span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
  return (
    <Tooltip content={tooltip} shortcut={shortcut} side="bottom">
      {btn}
    </Tooltip>
  );
}

interface ToolDropdownProps {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  tooltip: string;
  shortcut?: string;
  menuClassName?: string;
  children: React.ReactNode;
}

function ToolDropdown({
  icon,
  label,
  disabled,
  tooltip,
  shortcut,
  menuClassName,
  children,
}: ToolDropdownProps) {
  return (
    <DropdownMenu>
      <Tooltip content={tooltip} shortcut={shortcut} side="bottom">
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={tooltip}
            className={cn(
              TOOL_BUTTON_BASE,
              "group/dropdown pr-1.5 text-text-muted hover:bg-surface-soft hover:text-text",
              "data-[state=open]:bg-surface-soft data-[state=open]:text-text",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-muted",
            )}
          >
            <span className="text-text-faint transition-colors group-hover/dropdown:text-text-muted group-data-[state=open]/dropdown:text-text-muted">
              {icon}
            </span>
            <span className="hidden lg:inline">{label}</span>
            <ChevronDown
              size={11}
              className="ml-0.5 text-text-faint transition-transform duration-150 group-data-[state=open]/dropdown:rotate-180 group-data-[state=open]/dropdown:text-text-muted"
            />
          </button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent
        side="bottom"
        align="start"
        className={cn("min-w-[160px]", menuClassName)}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
