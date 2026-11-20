import { cn } from "@/lib/cn";

/** The Quad mark: four rounded squares turned 45°, one clay, three cream. */
export function QuadMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" className={cn("shrink-0", className)}>
      <g transform="rotate(45 32 32)">
        <rect x="11" y="11" width="19" height="19" rx="5" fill="var(--color-clay-light)" />
        <rect x="34" y="11" width="19" height="19" rx="5" fill="var(--color-text)" />
        <rect x="34" y="34" width="19" height="19" rx="5" fill="var(--color-text)" />
        <rect x="11" y="34" width="19" height="19" rx="5" fill="var(--color-text)" />
      </g>
    </svg>
  );
}

/**
 * v2 brand: the Quad mark plus the wordmark. Server-safe (no state), so both
 * the nav and the footer render it without shipping JS.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-[9px] text-base font-bold tracking-[-0.02em]", className)}>
      <QuadMark />
      <span className="wm">utilyx</span>
    </span>
  );
}

/** Small raised key used for shortcut hints (⌘, K, ↵ …). */
export function Keycap({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "surface-key inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-[6px] px-1 font-mono text-xs text-text-key",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
