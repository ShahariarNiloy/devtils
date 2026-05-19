"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import type { FormatOutputs } from "../timestamp-converter.types";

const ROWS: { key: keyof FormatOutputs; label: string }[] = [
  { key: "unixS", label: "Unix seconds" },
  { key: "unixMs", label: "Unix milliseconds" },
  { key: "unixUs", label: "Unix microseconds" },
  { key: "unixNs", label: "Unix nanoseconds" },
  { key: "iso8601Primary", label: "ISO 8601 (primary)" },
  { key: "iso8601Utc", label: "ISO 8601 (UTC)" },
  { key: "rfc2822", label: "RFC 2822" },
  { key: "rfc3339", label: "RFC 3339" },
  { key: "localeString", label: "Locale string" },
  { key: "customFormat", label: "Custom format" },
];

interface Props {
  formats: FormatOutputs | null;
}

export function FormatsGrid({ formats }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const onCopy = async (label: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      toast.success(`Copied ${label}`);
      setTimeout(
        () => setCopied((c) => (c === label ? null : c)),
        1300,
      );
    } catch {
      toast.error("Couldn't access clipboard");
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {ROWS.map((r, i) => {
        const value = formats ? formats[r.key] : "";
        const isCopied = copied === r.label;
        return (
          <button
            key={r.key}
            type="button"
            disabled={!value}
            onClick={() => onCopy(r.label, value)}
            aria-label={`Copy ${r.label}`}
            className={
              "group flex w-full items-center gap-4 px-4 py-2.5 text-left transition-colors hover:bg-surface-soft disabled:cursor-default disabled:opacity-50 cursor-pointer" +
              (i > 0 ? " border-t border-border-subtle" : "")
            }
          >
            <span className="w-44 shrink-0 text-sm text-text-faint">
              {r.label}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-sm text-text">
              {value || "—"}
            </span>
            <span
              aria-hidden
              className="shrink-0 text-text-faint group-hover:text-text"
            >
              {isCopied ? (
                <Check size={14} className="text-brand" />
              ) : (
                <Copy size={14} />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
