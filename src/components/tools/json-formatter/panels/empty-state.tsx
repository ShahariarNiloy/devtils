"use client";

import { useRef } from "react";
import {
  Clock,
  Globe,
  Sparkles,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { Kbd } from "@/components/primitives/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import { SAMPLE_DATA, formatBytes } from "../json-formatter.lib";
import type { HistoryEntry } from "../hooks/use-history";

interface EmptyStateProps {
  onLoadSample: (key: string) => void;
  onLoadFile: (file: File) => void;
  onOpenFetchUrl: () => void;
  recent: HistoryEntry[];
  onRestoreRecent: (entry: HistoryEntry) => void;
  onRemoveRecent: (id: string) => void;
  onClearRecent: () => void;
}

export function EmptyState({
  onLoadSample,
  onLoadFile,
  onOpenFetchUrl,
  recent,
  onRestoreRecent,
  onRemoveRecent,
  onClearRecent,
}: EmptyStateProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <input
        ref={fileRef}
        type="file"
        accept=".json,.txt,.csv"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { onLoadFile(file); e.target.value = ""; }
        }}
      />

      {/* Soft brand glyph */}
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-border-subtle bg-surface shadow-card">
        <div className="h-5 w-5 rounded-md bg-gradient-to-br from-[var(--color-mist-sage)] to-[var(--color-surface-soft)]" />
      </div>

      <h2 className="text-lg font-semibold tracking-tight text-text">
        Format and explore JSON
      </h2>
      <p className="mt-1.5 max-w-[34ch] text-center text-sm leading-relaxed text-text-faint">
        Paste JSON on the left to format, validate, query, and visualise — all
        in your browser, nothing sent anywhere.
      </p>

      {/* 2x2 quick-action grid */}
      <div className="mt-7 grid w-full max-w-[460px] grid-cols-2 gap-2.5">
        <SampleCard onLoadSample={onLoadSample} />

        <ActionCard
          icon={Globe}
          title="Fetch from URL"
          subtitle="Load JSON from any endpoint"
          onClick={onOpenFetchUrl}
        />

        <ActionCard
          icon={Upload}
          title="Upload file"
          subtitle="Drop a .json file here"
          onClick={() => fileRef.current?.click()}
        />

        <RecentCard
          recent={recent}
          onRestoreRecent={onRestoreRecent}
          onRemoveRecent={onRemoveRecent}
          onClearRecent={onClearRecent}
        />
      </div>

      {/* Keyboard shortcut hints */}
      <div className="mt-7 flex w-full max-w-[460px] items-center justify-center gap-5 border-t border-border-subtle pt-4 text-sm text-text-faint">
        <ShortcutHint keys={["⌘", "↵"]} label="Format" />
        <ShortcutHint keys={["⌘", "K"]} label="Search" />
        <ShortcutHint keys={["?"]} label="Shortcuts" />
      </div>
    </div>
  );
}

// ── Cards ──────────────────────────────────────────────────────────────────

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onClick: () => void;
}

function ActionCard({ icon: Icon, title, subtitle, onClick }: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-3 text-left transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-border hover:shadow-card"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-soft text-text-muted transition-colors group-hover:border-border-strong group-hover:text-text">
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-text">{title}</div>
        <div className="mt-0.5 truncate text-sm text-text-faint">{subtitle}</div>
      </div>
    </button>
  );
}

interface SampleCardProps {
  onLoadSample: (key: string) => void;
}

function SampleCard({ onLoadSample }: SampleCardProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group relative flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-3 text-left transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-border hover:shadow-card"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-soft text-text-muted transition-colors group-hover:border-border-strong group-hover:text-text">
            <Sparkles size={15} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-text">Try a sample</div>
            <div className="mt-0.5 truncate text-sm text-text-faint">
              Load example API response
            </div>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        <DropdownMenuLabel>Pick a sample</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(SAMPLE_DATA).map(([key, { label }]) => (
          <DropdownMenuItem key={key} onClick={() => onLoadSample(key)}>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface RecentCardProps {
  recent: HistoryEntry[];
  onRestoreRecent: (entry: HistoryEntry) => void;
  onRemoveRecent: (id: string) => void;
  onClearRecent: () => void;
}

function RecentCard({
  recent,
  onRestoreRecent,
  onRemoveRecent,
  onClearRecent,
}: RecentCardProps) {
  const hasRecent = recent.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={!hasRecent}>
        <button
          type="button"
          disabled={!hasRecent}
          className="group relative flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-3 text-left transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-border hover:shadow-card disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-border-subtle disabled:hover:shadow-none"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-soft text-text-muted transition-colors group-hover:border-border-strong group-hover:text-text">
            <Clock size={15} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-text">Recent</div>
            <div className="mt-0.5 truncate text-sm text-text-faint">
              {hasRecent ? `${recent.length} item${recent.length === 1 ? "" : "s"}` : "Nothing yet"}
            </div>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[320px] max-w-[420px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Recent</span>
          <button
            type="button"
            onClick={onClearRecent}
            className="text-sm text-text-faint hover:text-text transition-colors"
          >
            Clear
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recent.map((entry) => (
          <DropdownMenuItem
            key={entry.id}
            onClick={() => onRestoreRecent(entry)}
            className="group/item flex items-start gap-2 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text">{entry.name}</div>
              <div className="truncate text-sm text-text-faint font-mono">{entry.snippet}</div>
              <div className="mt-0.5 text-sm text-text-faint">{formatBytes(entry.bytes)}</div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemoveRecent(entry.id); }}
              className="shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity p-1 rounded text-text-faint hover:text-danger"
              aria-label="Remove from recent"
            >
              <X size={13} />
            </button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Shortcut hint ──────────────────────────────────────────────────────────

function ShortcutHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center gap-0.5">
        {keys.map((k) => (
          <Kbd key={k} className="px-1.5 text-sm">{k}</Kbd>
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
}
