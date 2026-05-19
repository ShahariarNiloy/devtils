"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { searchTimezones } from "../timestamp-converter.lib";

interface Props {
  value: string;
  onChange: (tz: string) => void;
}

/**
 * Lightweight searchable timezone disclosure. No Radix Popover primitive
 * exists in this repo; this is a self-contained accessible dropdown
 * (button + filtered listbox, click-outside to close).
 */
export function TimezonePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const results = searchTimezones(query).slice(0, 60);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-subtle bg-surface-soft px-2.5 text-sm text-text-muted transition-colors hover:text-text cursor-pointer"
      >
        {value}
        <ChevronDown size={13} aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-72 overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2">
            <Search size={14} aria-hidden className="text-text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search timezones…"
              aria-label="Search timezones"
              className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-faint"
            />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {results.map((t) => (
              <li key={t.iana}>
                <button
                  type="button"
                  role="option"
                  aria-selected={t.iana === value}
                  onClick={() => {
                    onChange(t.iana);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface-soft cursor-pointer",
                    t.iana === value ? "text-text" : "text-text-muted",
                  )}
                >
                  <span className="truncate">{t.iana}</span>
                  <span className="shrink-0 font-mono text-[11px] text-text-faint">
                    {t.offset}
                  </span>
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3 py-3 text-center text-sm text-text-faint">
                No match
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
