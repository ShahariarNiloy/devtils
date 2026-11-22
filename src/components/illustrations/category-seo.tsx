import { LineArt } from "./line-art";

/** "SEO" category — a globe branching to en / ja / bn locale pills (ja in clay). */
export function CategorySeo({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 240 140" className={className}>
      <circle cx="96" cy="70" r="44" stroke="var(--illus-strong)" />
      <ellipse cx="96" cy="70" rx="18" ry="44" stroke="var(--illus-mid)" />
      <path d="M52 70h88M60 48h72M60 92h72" stroke="var(--illus-mid)" />
      <path d="M142 70C160 70 160 34 178 34" stroke="var(--illus-faint)" />
      <rect x="178" y="23" width="40" height="22" rx="11" stroke="var(--illus-strong)" />
      <text x="198" y="38" textAnchor="middle" fill="var(--illus-text)" fontSize="10">
        en
      </text>
      <path d="M142 70C160 70 160 70 178 70" stroke="var(--illus-accent)" />
      <rect x="178" y="59" width="40" height="22" rx="11" stroke="var(--illus-accent)" />
      <text x="198" y="74" textAnchor="middle" fill="var(--illus-accent)" fontSize="10">
        ja
      </text>
      <path d="M142 70C160 70 160 106 178 106" stroke="var(--illus-faint)" />
      <rect x="178" y="95" width="40" height="22" rx="11" stroke="var(--illus-strong)" />
      <text x="198" y="110" textAnchor="middle" fill="var(--illus-text)" fontSize="10">
        bn
      </text>
    </LineArt>
  );
}
