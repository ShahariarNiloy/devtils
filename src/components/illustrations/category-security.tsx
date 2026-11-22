import { LineArt } from "./line-art";

/** "Security" category — a shield with a clay keyhole. */
export function CategorySecurity({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 240 140" className={className}>
      <path d="M120 16l40 14v34c0 28-18 46-40 56c-22-10-40-28-40-56V30z" stroke="var(--illus-strong)" />
      <circle cx="120" cy="62" r="9" stroke="var(--illus-accent)" />
      <path d="M120 71v18" stroke="var(--illus-accent)" />
      <path d="M30 70h36M174 70h36" stroke="var(--illus-faint)" strokeDasharray="3 5" />
    </LineArt>
  );
}
