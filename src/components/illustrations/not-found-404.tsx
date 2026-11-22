import { LineArt } from "./line-art";

/** "404" — an unplugged cable: plug and socket apart, clay sparks, "404". */
export function NotFound404({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 320 130" className={className}>
      <path d="M10 80C40 80 50 70 80 70" stroke="var(--illus-mid)" />
      <rect x="80" y="56" width="44" height="28" rx="8" stroke="var(--illus-strong)" />
      <path d="M124 64h14M124 76h14" stroke="var(--illus-strong)" />
      <rect x="196" y="52" width="44" height="36" rx="10" stroke="var(--illus-strong)" />
      <circle cx="210" cy="66" r="2.5" fill="var(--illus-strong)" stroke="none" />
      <circle cx="210" cy="76" r="2.5" fill="var(--illus-strong)" stroke="none" />
      <path d="M240 70C270 70 280 84 310 84" stroke="var(--illus-mid)" />
      <path d="M146 58l8 -8M160 54l2 -10M168 58l8 -6" stroke="var(--illus-accent)" />
      <text x="167" y="104" textAnchor="middle" fill="var(--illus-accent)" fontSize="13">
        404
      </text>
    </LineArt>
  );
}
