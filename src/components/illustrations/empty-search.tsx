import { LineArt } from "./line-art";

/** Backdrop of tool keys (faint) for the "Empty search" lens. */
const KEYS = [26, 56, 86].flatMap((y) => [40, 72, 104, 136].map((x) => ({ x, y })));

/**
 * "Empty search" — a magnifier over a grid of tool keys. ⌘K palette, no
 * results. The lens is filled to knock out the keys behind it.
 */
export function EmptySearch({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 200 130" className={className}>
      {KEYS.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="22" height="20" rx="5" stroke="var(--illus-faint)" />
      ))}
      <circle cx="104" cy="66" r="30" stroke="var(--illus-strong)" fill="#0f0f0e" />
      <path d="M126 88L150 112" stroke="var(--illus-strong)" />
      <path d="M92 60h24M92 72h14" stroke="var(--illus-mid)" />
      <circle cx="118" cy="72" r="3" fill="var(--illus-accent)" stroke="none" />
    </LineArt>
  );
}
