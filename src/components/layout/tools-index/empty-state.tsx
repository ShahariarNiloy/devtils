import { Search } from "lucide-react";

export function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "var(--color-surface-soft)" }}
      >
        <Search size={20} className="text-text-faint" />
      </div>
      <p className="display text-lg font-semibold tracking-tight text-text">Nothing matched</p>
      <p className="mt-2 text-sm text-text-faint max-w-xs">
        Try a different keyword or clear your filters to browse all tools.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-4 h-9 text-sm font-semibold text-text transition-colors hover:border-border-strong cursor-pointer"
      >
        Clear filters
      </button>
    </div>
  );
}
