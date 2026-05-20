"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import type { FormatOutputs } from "../timestamp-converter.types";

interface Entry {
  key: keyof FormatOutputs;
  label: string;
}

const FEATURED: Entry[] = [
  { key: "unixS", label: "Unix seconds" },
  { key: "unixMs", label: "Unix milliseconds" },
  { key: "iso8601Primary", label: "ISO 8601 · primary" },
  { key: "iso8601Utc", label: "ISO 8601 · UTC" },
];

const REST: Entry[] = [
  { key: "rfc2822", label: "RFC 2822" },
  { key: "rfc3339", label: "RFC 3339" },
  { key: "unixUs", label: "Unix microseconds" },
  { key: "unixNs", label: "Unix nanoseconds" },
  { key: "localeString", label: "Locale string" },
  { key: "customFormat", label: "Custom format" },
];

interface Props {
  formats: FormatOutputs | null;
}

export function FormatsGrid({ formats }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const onCopy = async (label: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      toast.success(`Copied ${label}`);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1300);
    } catch {
      toast.error("Couldn't access clipboard");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
          Most used
        </span>
        <span className="text-[12px] text-text-muted">
          Click any to copy →
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {FEATURED.map((e) => (
          <FeatureCard
            key={e.key}
            entry={e}
            value={formats?.[e.key] ?? ""}
            copied={copied === e.label}
            onCopy={onCopy}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-surface px-4 py-2 text-sm text-text-muted transition-colors hover:text-text cursor-pointer"
      >
        <span>
          {open ? "Hide" : "Show"} 6 more formats — RFC 2822, RFC 3339, µs/ns,
          locale, custom
        </span>
        <ChevronDown
          size={15}
          aria-hidden
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {REST.map((e, i) => (
              <CompactRow
                key={e.key}
                entry={e}
                value={formats?.[e.key] ?? ""}
                copied={copied === e.label}
                onCopy={onCopy}
                idx={i}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({
  entry,
  value,
  copied,
  onCopy,
}: {
  entry: Entry;
  value: string;
  copied: boolean;
  onCopy: (l: string, v: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={!value}
      onClick={() => onCopy(entry.label, value)}
      aria-label={`Copy ${entry.label}`}
      className="group relative flex flex-col items-start gap-1.5 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-border-strong/60 hover:bg-surface-soft/40 disabled:cursor-default disabled:opacity-50 cursor-pointer"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
        {entry.label}
      </span>
      <span className="block w-full overflow-x-auto whitespace-nowrap font-mono text-base text-text [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {value || "—"}
      </span>
      <span
        aria-hidden
        className={cn(
          "absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[11px] shadow-card transition-opacity",
          copied
            ? "text-brand opacity-100"
            : "text-text-muted opacity-0 group-hover:opacity-100",
        )}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

function CompactRow({
  entry,
  value,
  copied,
  onCopy,
  idx,
}: {
  entry: Entry;
  value: string;
  copied: boolean;
  onCopy: (l: string, v: string) => void;
  idx: number;
}) {
  return (
    <button
      type="button"
      disabled={!value}
      onClick={() => onCopy(entry.label, value)}
      aria-label={`Copy ${entry.label}`}
      className={cn(
        "group relative flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-soft disabled:cursor-default disabled:opacity-50 cursor-pointer",
        idx >= 2 && "border-t border-border-subtle md:border-t",
        idx < 2 && "md:border-b-0",
        idx > 0 && "border-t border-border-subtle md:[&:nth-child(2)]:border-t-0",
      )}
    >
      <span className="w-32 shrink-0 text-sm text-text-muted">
        {entry.label}
      </span>
      <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-right font-mono text-sm text-text [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {value || "—"}
      </span>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[11px] shadow-card transition-opacity",
          copied
            ? "text-brand opacity-100"
            : "text-text-muted opacity-0 group-hover:opacity-100",
        )}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}
