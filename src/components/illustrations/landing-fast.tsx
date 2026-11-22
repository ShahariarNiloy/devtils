import { LineArt } from "./line-art";

/** Landing "Why utilyx" · 01 Fast — ⌘ K → jwt → ↵ opens the tool. */
export function LandingFastArt({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 300 170" className={className}>
      <rect x="14" y="40" width="44" height="44" rx="10" stroke="var(--illus-strong)" />
      <path d="M20 88H52" stroke="var(--illus-faint)" />
      <text x="36" y="68" textAnchor="middle" fill="var(--color-text)" fontSize="17">⌘</text>
      <rect x="66" y="40" width="44" height="44" rx="10" stroke="var(--illus-accent)" />
      <path d="M72 88H104" stroke="var(--illus-faint)" />
      <text x="88" y="68" textAnchor="middle" fill="var(--illus-accent)" fontSize="17">K</text>
      <path className="illus-flow" d="M118 62H140" stroke="var(--illus-mid)" />
      <rect x="146" y="44" width="70" height="36" rx="18" stroke="var(--illus-strong)" />
      <text x="181" y="67" textAnchor="middle" fill="rgba(246,242,234,.8)" fontSize="13">jwt</text>
      <path className="illus-flow" d="M222 62H240" stroke="var(--illus-mid)" />
      <rect x="246" y="40" width="44" height="44" rx="10" stroke="var(--illus-strong)" />
      <path d="M276 54v10h-14M266 60l-4 4 4 4" stroke="var(--illus-strong)" />
      <rect x="14" y="112" width="276" height="44" rx="10" stroke="var(--illus-mid)" />
      <path d="M30 128H96M30 140H70" stroke="var(--illus-mid)" />
      <path d="M150 128H230M150 140H196" stroke="var(--illus-accent)" />
      <path d="M116 134H134M128 128l6 6-6 6" stroke="var(--illus-strong)" />
    </LineArt>
  );
}
