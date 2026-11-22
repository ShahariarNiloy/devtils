import { LineArt } from "./line-art";

/** Landing "Why utilyx" · 02 Simple — paste → detected (JSON) → copied. */
export function LandingSimpleArt({ className }: { className?: string }) {
  const label = "rgba(246,242,234,.45)";
  return (
    <LineArt viewBox="0 0 300 170" className={className}>
      <rect x="18" y="38" width="66" height="88" rx="10" stroke="var(--illus-strong)" />
      <rect x="36" y="30" width="30" height="14" rx="5" stroke="var(--illus-strong)" />
      <path d="M31 64H71" stroke="var(--illus-mid)" />
      <path d="M31 78H61" stroke="var(--illus-mid)" />
      <path d="M31 92H67" stroke="var(--illus-mid)" />
      <path d="M31 106H53" stroke="var(--illus-mid)" />
      <path className="illus-flow" d="M92 82C110 82 112 82 126 82" stroke="var(--illus-mid)" />
      <rect x="132" y="38" width="100" height="88" rx="10" stroke="var(--illus-strong)" />
      <rect x="144" y="48" width="50" height="18" rx="9" stroke="var(--illus-accent)" fill="rgba(224,160,114,.12)" />
      <text x="169" y="61" textAnchor="middle" fill="var(--illus-accent)" fontSize="10">JSON</text>
      <path d="M146 80H156" stroke="var(--illus-mid)" />
      <path d="M154 91H202" stroke="var(--illus-strong)" />
      <path d="M154 102H192" stroke="var(--illus-strong)" />
      <path d="M146 113H156" stroke="var(--illus-mid)" />
      <path className="illus-flow" d="M240 82H256" stroke="var(--illus-mid)" />
      <rect x="262" y="66" width="24" height="28" rx="6" stroke="var(--illus-mid)" />
      <rect x="268" y="72" width="24" height="28" rx="6" stroke="var(--illus-accent)" />
      <path d="M274 87l4 4 8-8" stroke="var(--illus-accent)" />
      <text x="52" y="150" textAnchor="middle" fill={label} fontSize="10">paste</text>
      <text x="182" y="150" textAnchor="middle" fill={label} fontSize="10">detected</text>
      <text x="278" y="150" textAnchor="middle" fill={label} fontSize="10">copied</text>
    </LineArt>
  );
}
