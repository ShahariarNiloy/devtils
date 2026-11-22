import { LineArt } from "./line-art";

/** "JSON" category — three nested brace pairs, the innermost in clay. */
export function CategoryJson({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 240 140" className={className}>
      <path d="M44 18c-10 0-12 4-12 12v30 c0 6-3 9-8 10c5 1 8 4 8 10v30 c0 8 2 12 12 12" stroke="var(--illus-mid)" />
      <path d="M196 18c10 0 12 4 12 12v30 c0 6 3 9 8 10c-5 1-8 4-8 10v30 c0 8-2 12-12 12" stroke="var(--illus-mid)" />
      <path d="M72 32c-10 0-12 4-12 12v16 c0 6-3 9-8 10c5 1 8 4 8 10v16 c0 8 2 12 12 12" stroke="var(--illus-strong)" />
      <path d="M168 32c10 0 12 4 12 12v16 c0 6 3 9 8 10c-5 1-8 4-8 10v16 c0 8-2 12-12 12" stroke="var(--illus-strong)" />
      <path d="M100 46c-10 0-12 4-12 12v2 c0 6-3 9-8 10c5 1 8 4 8 10v2 c0 8 2 12 12 12" stroke="var(--illus-accent)" />
      <path d="M140 46c10 0 12 4 12 12v2 c0 6 3 9 8 10c-5 1-8 4-8 10v2 c0 8-2 12-12 12" stroke="var(--illus-accent)" />
      <circle cx="120" cy="70" r="4" fill="var(--illus-accent)" stroke="none" />
    </LineArt>
  );
}
