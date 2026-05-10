"use client";

import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}

export function SearchBar({ value, onChange, onClear }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2.5 h-9 rounded-lg border border-border bg-surface px-3 flex-1 sm:max-w-72 transition-[border-color,box-shadow] duration-150 focus-within:border-border-strong focus-within:shadow-[0_0_0_3px_var(--color-mist-sage)]">
      <Search size={13} className="text-text-faint shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search tools…"
        className="flex-1 bg-transparent text-sm text-text placeholder:text-text-faint outline-none min-w-0"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded text-text-muted hover:text-text transition-colors cursor-pointer"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
