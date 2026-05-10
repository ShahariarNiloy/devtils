"use client";

import { useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

interface OutputSearchBarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onClose: () => void;
  matchCount: number;
  deferredSearch: string;
}

export function OutputSearchBar({
  searchTerm,
  onSearchTermChange,
  onClose,
  matchCount,
  deferredSearch,
}: OutputSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle bg-surface-soft px-3 py-1.5">
      <Search size={13} className="text-text-faint shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        placeholder="Search output…"
        className="flex-1 bg-transparent text-sm text-text placeholder:text-text-faint outline-none"
      />
      {deferredSearch && (
        <span className="text-sm text-text-faint shrink-0">
          {matchCount} match{matchCount !== 1 ? "es" : ""}
        </span>
      )}
      <button
        type="button"
        onClick={onClose}
        className="text-text-faint hover:text-text transition-colors cursor-pointer"
      >
        <X size={13} />
      </button>
    </div>
  );
}
