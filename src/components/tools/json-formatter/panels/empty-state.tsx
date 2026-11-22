"use client";

import { Clock, X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { ReadyForInput } from "@/components/illustrations/ready-for-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu";
import type { HistoryEntry } from "../hooks/use-history";
import { formatBytes, SAMPLE_DATA } from "../json-formatter.lib";

interface EmptyStateProps {
  onLoadSample: (key: string) => void;
  onLoadBroken: () => void;
  onLoadFile: (file: File) => void;
  onOpenFetchUrl: () => void;
  recent: HistoryEntry[];
  onRestoreRecent: (entry: HistoryEntry) => void;
  onRemoveRecent: (id: string) => void;
  onClearRecent: () => void;
}

const START =
  "flex flex-col items-start gap-0.5 rounded-xl border border-white/10 bg-transparent px-3.5 py-3 text-left text-text transition-colors hover:border-clay-light/45 hover:bg-white/[.03]";

function StartCard({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <span className="text-sm font-bold">{title}</span>
      <span className="text-xs text-text-faint">{sub}</span>
    </>
  );
}

/** Output pane before there's any input: four ways to start, plus Recent. */
export function EmptyState({
  onLoadSample,
  onLoadBroken,
  onLoadFile,
  onOpenFetchUrl,
  recent,
  onRestoreRecent,
  onRemoveRecent,
  onClearRecent,
}: EmptyStateProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 overflow-auto px-6 py-10 text-center">
      <input
        ref={fileRef}
        type="file"
        accept=".json,.txt,.csv"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onLoadFile(file);
            e.target.value = "";
          }
        }}
      />
      <ReadyForInput className="w-[150px]" />
      <div>
        <div className="text-lg font-bold">Paste JSON to get started</div>
        <div className="max-w-[360px] text-sm text-text-tertiary">
          It&apos;s formatted and checked the moment you paste, right here in your browser.
        </div>
      </div>
      <div className="grid w-full max-w-[420px] grid-cols-2 gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={START}>
              <StartCard title="Try a sample" sub="An example API response" />
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
        <button type="button" onClick={onLoadBroken} className={START}>
          <StartCard title="Try broken JSON" sub="See Repair in action" />
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={START}>
          <StartCard title="Upload a file" sub="or drop a .json anywhere" />
        </button>
        <button type="button" onClick={onOpenFetchUrl} className={START}>
          <StartCard title="Fetch from URL" sub="Load any public endpoint" />
        </button>
      </div>
      {recent.length > 0 && (
        <RecentMenu recent={recent} onRestoreRecent={onRestoreRecent} onRemoveRecent={onRemoveRecent} onClearRecent={onClearRecent}>
          <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-text-tertiary hover:text-text">
            <Clock size={13} aria-hidden />
            Recent · {recent.length}
          </button>
        </RecentMenu>
      )}
    </div>
  );
}

function RecentMenu({
  recent,
  onRestoreRecent,
  onRemoveRecent,
  onClearRecent,
  children,
}: {
  recent: HistoryEntry[];
  onRestoreRecent: (entry: HistoryEntry) => void;
  onRemoveRecent: (id: string) => void;
  onClearRecent: () => void;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="max-w-[420px] min-w-[320px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Recent</span>
          <button type="button" onClick={onClearRecent} className="text-sm text-text-faint transition-colors hover:text-text">
            Clear
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recent.map((entry) => (
          <DropdownMenuItem key={entry.id} onClick={() => onRestoreRecent(entry)} className="group/item flex items-start gap-2 py-2">
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm font-medium text-text">{entry.name}</div>
              <div className="truncate font-mono text-sm text-text-faint">{entry.snippet}</div>
              <div className="mt-0.5 text-sm text-text-faint">{formatBytes(entry.bytes)}</div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveRecent(entry.id);
              }}
              className="shrink-0 rounded p-1 text-text-faint opacity-0 transition-opacity group-hover/item:opacity-100 hover:text-danger"
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

/** Output pane while the input is invalid and there's no earlier output. */
export function InvalidState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <span aria-hidden="true" className="font-mono text-[22px] text-error">{"{ ✕ }"}</span>
      <div className="text-base font-bold">Can&apos;t format invalid JSON yet</div>
      <div className="max-w-[340px] text-sm text-text-tertiary">
        Problems like these are common in copied or AI-generated JSON. Repair fixes them and keeps everything else as is.
      </div>
    </div>
  );
}

/** For "Try broken JSON": two classic near-misses (single quotes, trailing commas). */
export const BROKEN_SAMPLE = `{
  'id': "usr_9f2a",
  "name": "Ada Lovelace",
  "verified": true,
  "roles": ["admin", "editor",],
}`;
