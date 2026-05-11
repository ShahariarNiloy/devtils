"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlignLeft,
  ArrowDownUp,
  ArrowUpAZ,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  History,
  Link2,
  Minimize2,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface MobileMoreSheetProps {
  open: boolean;
  onClose: () => void;

  hasInput: boolean;
  hasOutput: boolean;
  canFormat: boolean;
  isQueryOpen: boolean;
  isStatsOpen: boolean;

  onFormat: () => void;
  onMinify: () => void;
  onSortAsc: () => void;
  onSortDesc: () => void;
  onRepair: () => void;

  onConvert: (kind: string) => void;
  onToggleQuery: () => void;
  onToggleStats: () => void;

  onShare: () => void;
  onDownload: () => void;
  onOpenFind: () => void;
  recentCount: number;
  sharing: boolean;
}

type View = "root" | "convert";

const CONVERT_ITEMS: { kind: string; label: string; group: number }[] = [
  { kind: "csv", label: "JSON → CSV", group: 1 },
  { kind: "yaml", label: "JSON → YAML", group: 1 },
  { kind: "typescript", label: "JSON → TypeScript", group: 1 },
  { kind: "xml", label: "JSON → XML", group: 1 },
  { kind: "zod", label: "JSON → Zod", group: 1 },
  { kind: "schema", label: "JSON → JSON Schema", group: 1 },
  { kind: "go", label: "JSON → Go", group: 2 },
  { kind: "python", label: "JSON → Python", group: 2 },
  { kind: "rust", label: "JSON → Rust", group: 2 },
  { kind: "csv-to-json", label: "CSV → JSON", group: 3 },
  { kind: "yaml-to-json", label: "YAML → JSON", group: 3 },
];

/**
 * Slide-up bottom sheet for secondary actions, grouped Transform / Convert &
 * Query / Document. The Convert option drills into a second view inside the
 * same sheet rather than opening another menu — easier one-handed.
 */
export function MobileMoreSheet({
  open,
  onClose,
  hasInput,
  hasOutput,
  canFormat,
  isQueryOpen,
  isStatsOpen,
  onFormat,
  onMinify,
  onSortAsc,
  onSortDesc,
  onRepair,
  onConvert,
  onToggleQuery,
  onToggleStats,
  onShare,
  onDownload,
  onOpenFind,
  recentCount,
  sharing,
}: MobileMoreSheetProps) {
  // Track the previous `open` so we can reset the inner view at the moment
  // the sheet opens — done as derived state from props (sync-during-render)
  // so we don't need an effect, and `close()` also resets on dismiss for
  // the normal interaction path.
  const [view, setView] = useState<View>("root");
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setView("root");
  }

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = useCallback(() => {
    setView("root");
    onClose();
  }, [onClose]);

  const dispatch = useCallback(
    (fn: () => void) => () => {
      fn();
      close();
    },
    [close],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col justify-end bg-charcoal/40 animate-[fade-in_140ms_ease-out]"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="More actions"
    >
      <div
        className="rounded-t-xl border border-b-0 border-border bg-surface pb-[max(0.625rem,env(safe-area-inset-bottom))] animate-[slide-up_200ms_cubic-bezier(0.2,0.9,0.4,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          <SheetHandle />

          {view === "root" && (
            <RootView
              hasInput={hasInput}
              hasOutput={hasOutput}
              canFormat={canFormat}
              isQueryOpen={isQueryOpen}
              isStatsOpen={isStatsOpen}
              sharing={sharing}
              recentCount={recentCount}
              onOpenConvert={() => setView("convert")}
              onFormat={dispatch(onFormat)}
              onMinify={dispatch(onMinify)}
              onSortAsc={dispatch(onSortAsc)}
              onSortDesc={dispatch(onSortDesc)}
              onRepair={dispatch(onRepair)}
              onToggleQuery={dispatch(onToggleQuery)}
              onToggleStats={dispatch(onToggleStats)}
              onShare={dispatch(onShare)}
              onDownload={dispatch(onDownload)}
              onOpenFind={dispatch(onOpenFind)}
              onClose={close}
            />
          )}

          {view === "convert" && (
            <ConvertView
              disabled={!hasInput}
              onBack={() => setView("root")}
              onConvert={(k) => {
                onConvert(k);
                close();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Subviews ────────────────────────────────────────────────────────────────

function RootView({
  hasInput,
  hasOutput,
  canFormat,
  isQueryOpen,
  isStatsOpen,
  sharing,
  recentCount,
  onOpenConvert,
  onFormat,
  onMinify,
  onSortAsc,
  onSortDesc,
  onRepair,
  onToggleQuery,
  onToggleStats,
  onShare,
  onDownload,
  onOpenFind,
  onClose,
}: {
  hasInput: boolean;
  hasOutput: boolean;
  canFormat: boolean;
  isQueryOpen: boolean;
  isStatsOpen: boolean;
  sharing: boolean;
  recentCount: number;
  onOpenConvert: () => void;
  onFormat: () => void;
  onMinify: () => void;
  onSortAsc: () => void;
  onSortDesc: () => void;
  onRepair: () => void;
  onToggleQuery: () => void;
  onToggleStats: () => void;
  onShare: () => void;
  onDownload: () => void;
  onOpenFind: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <SheetHeader title="More actions" onClose={onClose} />

      <SheetGroup title="Transform">
        <SheetItem
          icon={<AlignLeft size={17} />}
          label="Format"
          shortcut="⌘↵"
          onClick={onFormat}
          disabled={!canFormat}
        />
        <SheetItem
          icon={<Minimize2 size={17} />}
          label="Minify"
          shortcut="⌘⇧M"
          onClick={onMinify}
          disabled={!hasInput}
        />
        <SheetItem
          icon={<ArrowUpAZ size={17} />}
          label="Sort keys A → Z"
          shortcut="⌘⇧S"
          onClick={onSortAsc}
          disabled={!hasInput}
        />
        <SheetItem
          icon={<ArrowUpAZ size={17} className="rotate-180" />}
          label="Sort keys Z → A"
          onClick={onSortDesc}
          disabled={!hasInput}
        />
        <SheetItem
          icon={<Wand2 size={17} />}
          label="Repair"
          shortcut="⌘⇧R"
          onClick={onRepair}
          disabled={!hasInput}
        />
      </SheetGroup>

      <SheetDivider />

      <SheetGroup title="Convert & query">
        <SheetItem
          icon={<ArrowDownUp size={17} />}
          label="Convert to…"
          trailing={<ChevronRight size={14} className="text-text-faint" />}
          onClick={onOpenConvert}
          disabled={!hasInput}
        />
        <SheetItem
          icon={<Filter size={17} />}
          label="JSONPath query"
          active={isQueryOpen}
          onClick={onToggleQuery}
          disabled={!hasInput}
        />
        <SheetItem
          icon={<Sparkles size={17} />}
          label="Find in JSON"
          shortcut="⌘/"
          onClick={onOpenFind}
          disabled={!hasInput}
        />
        <SheetItem
          icon={<BarChart2 size={17} />}
          label="Stats"
          active={isStatsOpen}
          onClick={onToggleStats}
          disabled={!hasInput}
        />
      </SheetGroup>

      <SheetDivider />

      <SheetGroup title="Document">
        <SheetItem
          icon={<Link2 size={17} />}
          label={sharing ? "Sharing…" : "Share via link"}
          onClick={onShare}
          disabled={!hasInput || sharing}
        />
        <SheetItem
          icon={<Download size={17} />}
          label="Download .json"
          shortcut="⌘⇧D"
          onClick={onDownload}
          disabled={!hasOutput && !hasInput}
        />
        <SheetItem
          icon={<History size={17} />}
          label={`Recent${recentCount > 0 ? ` (${recentCount})` : ""}`}
          onClick={onClose}
          disabled={recentCount === 0}
        />
      </SheetGroup>
    </>
  );
}

function ConvertView({
  disabled,
  onBack,
  onConvert,
}: {
  disabled: boolean;
  onBack: () => void;
  onConvert: (k: string) => void;
}) {
  return (
    <>
      <div className="flex h-12 items-center gap-1 border-b border-border-subtle px-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text-muted hover:bg-surface-soft hover:text-text"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="flex-1 truncate text-center text-base font-semibold text-text">
          Convert
        </span>
        <span aria-hidden className="h-10 w-10" />
      </div>

      {[1, 2, 3].map((group, idx) => (
        <div key={group}>
          {idx > 0 && <SheetDivider />}
          {CONVERT_ITEMS.filter((it) => it.group === group).map((it) => (
            <SheetItem
              key={it.kind}
              icon={<ArrowDownUp size={17} />}
              label={it.label}
              onClick={() => onConvert(it.kind)}
              disabled={disabled}
            />
          ))}
        </div>
      ))}
    </>
  );
}

// ── Building blocks ─────────────────────────────────────────────────────────

function SheetHandle() {
  return (
    <div
      aria-hidden
      className="mx-auto my-2 h-1 w-9 rounded-full bg-border-strong/40"
    />
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex h-12 items-center gap-1 border-b border-border-subtle px-1">
      <span aria-hidden className="h-10 w-10" />
      <span className="flex-1 truncate text-center text-base font-semibold text-text">
        {title}
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text-muted hover:bg-surface-soft hover:text-text"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function SheetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pb-1.5 pt-2">
      <div className="px-4 pb-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-faint">
        {title}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function SheetDivider() {
  return <div aria-hidden className="mx-4 h-px bg-border-subtle" />;
}

interface SheetItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  trailing?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}

function SheetItem({
  icon,
  label,
  shortcut,
  trailing,
  onClick,
  disabled,
  active,
}: SheetItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[14.5px] text-text transition-colors",
        "hover:bg-surface-soft active:bg-surface-soft",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        active && "bg-surface-soft",
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center",
          active ? "text-brand" : "text-text-muted",
        )}
      >
        {icon}
      </span>
      <span className="flex-1 truncate font-medium">{label}</span>
      {shortcut && (
        <span className="font-mono text-[11px] text-text-faint">{shortcut}</span>
      )}
      {trailing}
    </button>
  );
}
