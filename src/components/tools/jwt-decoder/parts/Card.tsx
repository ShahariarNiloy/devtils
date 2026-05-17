/**
 * Clean, neutral card — a white rounded box with an optional thin toolbar
 * (a left slot for a mono caption or toggle, a right slot for icon
 * actions). Section titles and status live OUTSIDE the card (see Section),
 * jwt.io-style, so the box itself stays uncluttered.
 */
export function Card({
  left,
  actions,
  children,
}: {
  left?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface">
      {(left || actions) && (
        <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-2.5">
          {left}
          {actions && (
            <div className="ml-auto flex items-center gap-1">{actions}</div>
          )}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

/**
 * A labelled block: a plain title (optionally with a right-aligned aside),
 * the card, and optional status text below it.
 */
export function Section({
  title,
  aside,
  status,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  status?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
      {children}
      {status && <div className="pt-0.5">{status}</div>}
    </div>
  );
}

/** Small mono caption for a card toolbar's left slot (e.g. ›_ Secret). */
export function CardCaption({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm text-text-faint">
      <span aria-hidden>{"›_"}</span>
      {children}
    </span>
  );
}

export function CardIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-text-faint transition-colors hover:bg-surface-soft hover:text-text"
    >
      {children}
    </button>
  );
}

/** Two-option segmented toggle (e.g. JSON / Claims). */
export function SegmentToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md bg-surface-soft p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={
            value === o.id
              ? "cursor-pointer rounded-sm bg-surface px-2.5 py-1 text-sm font-semibold text-text shadow-sm"
              : "cursor-pointer rounded-sm px-2.5 py-1 text-sm font-medium text-text-faint hover:text-text"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
