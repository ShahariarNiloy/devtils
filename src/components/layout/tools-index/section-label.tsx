export function SectionLabel({ live, count }: { live: boolean; count: number }) {
  return (
    <div className="flex items-center gap-2.5">
      {live ? (
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
            style={{ background: "var(--color-success)" }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: "var(--color-success)" }}
          />
        </span>
      ) : (
        <span className="h-2 w-2 rounded-full border-2 border-border shrink-0" />
      )}
      <span className="text-sm font-bold uppercase tracking-[0.14em] text-text-faint">
        {live ? "Available now" : "Coming soon"}
      </span>
      <span className="text-sm text-text-faint opacity-70">
        · {count} tool{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
