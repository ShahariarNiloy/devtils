import { LineArt } from "./line-art";

/** Text lines of each document, as drawn on the board. */
const LEFT = ["M46 44h30", "M46 56h40", "M46 68h24", "M46 80h36"];
const RIGHT = ["M118 44h30", "M118 56h40", "M118 68h24", "M118 80h36"];

/**
 * "No differences" — two matching documents joined by a clay "=" with a
 * check badge. JSON diff, identical inputs. The badge is filled to sit
 * cleanly over the page edge.
 */
export function NoDifferences({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 200 130" className={className}>
      <rect x="34" y="26" width="60" height="78" rx="10" stroke="var(--illus-mid)" />
      {LEFT.map((d) => (
        <path key={d} d={d} stroke="var(--illus-faint)" />
      ))}
      <rect x="106" y="26" width="60" height="78" rx="10" stroke="var(--illus-strong)" />
      {RIGHT.map((d) => (
        <path key={d} d={d} stroke="var(--illus-mid)" />
      ))}
      <path d="M96 64h8M96 70h8" stroke="var(--illus-accent)" />
      <circle cx="100" cy="112" r="13" stroke="var(--illus-accent)" fill="#0f0f0e" />
      <path d="M94 112l4 4 8-8" stroke="var(--illus-accent)" />
    </LineArt>
  );
}
