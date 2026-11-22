/** Right-column placeholder for an empty or unreadable token (mockup). */
export function EmptyState({ error }: { error: string | null }) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-white/10 p-6 text-center">
      <div className="w-[150px]">
        <svg viewBox="0 0 200 130" width="100%" aria-hidden="true" className="block overflow-visible">
          <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
            <rect x="64" y="34" width="72" height="88" rx="12" stroke="rgba(246,242,234,.55)" vectorEffect="non-scaling-stroke" strokeDasharray="4 5" />
            <rect x="84" y="26" width="32" height="14" rx="5" stroke="rgba(246,242,234,.55)" vectorEffect="non-scaling-stroke" />
            <path d="M100 52v34" stroke="var(--color-clay-light)" vectorEffect="non-scaling-stroke" />
            <path d="M88 74l12 12 12-12" stroke="var(--color-clay-light)" vectorEffect="non-scaling-stroke" />
            <path d="M82 104h36" stroke="rgba(246,242,234,.28)" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
      </div>
      {error === null ? (
        <>
          <span className="text-base font-bold">Paste a token to decode it</span>
          <span className="max-w-[340px] text-sm text-text-tertiary">It&apos;s decoded and checked right here. Or pick one of the examples above.</span>
        </>
      ) : (
        <>
          <span className="text-base font-bold">That doesn&apos;t look like a JWT</span>
          <span aria-live="polite" className="max-w-[360px] text-sm text-error-text">
            {error}
          </span>
        </>
      )}
    </div>
  );
}
