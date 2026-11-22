import { LineArt } from "./line-art";

const DASH_WIDE = { strokeDasharray: "4 6" } as const;

/**
 * Landing "Why utilyx" · 03 Private — data flows input → utilyx → output
 * inside the browser window; the request to servers outside is crossed out.
 */
export function LandingPrivateArt({ className }: { className?: string }) {
  const label = "rgba(246,242,234,.45)";
  return (
    <LineArt
      viewBox="0 0 560 320"
      className={className}
      label="A browser window where data flows from input, through utilyx, to output, without ever leaving the window. A request to a server outside is crossed out."
    >
      <rect x="20" y="30" width="400" height="260" rx="18" stroke="var(--illus-strong)" />
      <path d="M20 70H420" stroke="var(--illus-mid)" />
      <circle cx="44" cy="50" r="4.5" stroke="var(--illus-mid)" />
      <circle cx="60" cy="50" r="4.5" stroke="var(--illus-mid)" />
      <circle cx="76" cy="50" r="4.5" stroke="var(--illus-mid)" />
      <rect x="120" y="40" width="200" height="20" rx="10" stroke="var(--illus-faint)" />
      <text x="220" y="54" textAnchor="middle" fill="rgba(246,242,234,.5)" fontSize="10">utilyx.dev</text>

      <rect x="48" y="104" width="92" height="132" rx="10" stroke="var(--illus-strong)" />
      <path d="M62 124H106" stroke="var(--illus-mid)" />
      <path d="M70 140H122" stroke="var(--illus-mid)" />
      <path d="M70 156H106" stroke="var(--illus-mid)" />
      <path d="M78 172H108" stroke="var(--illus-mid)" />
      <path d="M70 188H118" stroke="var(--illus-mid)" />
      <path d="M62 204H82" stroke="var(--illus-mid)" />
      <text x="94" y="254" textAnchor="middle" fill={label} fontSize="10">input</text>

      <rect x="300" y="104" width="92" height="132" rx="10" stroke="var(--illus-strong)" />
      <path d="M314 124H326" stroke="var(--illus-mid)" />
      <path d="M322 140H362" stroke="var(--illus-accent)" />
      <path d="M330 156H360" stroke="var(--illus-mid)" />
      <path d="M330 172H374" stroke="var(--illus-accent)" />
      <path d="M322 188H348" stroke="var(--illus-mid)" />
      <path d="M314 204H326" stroke="var(--illus-mid)" />
      <text x="346" y="254" textAnchor="middle" fill={label} fontSize="10">output</text>

      {/* the utilyx mark */}
      <g transform="translate(220 170) rotate(45)">
        <rect x="-21" y="-21" width="19" height="19" rx="5" stroke="var(--illus-accent)" fill="rgba(224,160,114,.18)" />
        <rect x="2" y="-21" width="19" height="19" rx="5" stroke="var(--illus-strong)" />
        <rect x="2" y="2" width="19" height="19" rx="5" stroke="var(--illus-strong)" />
        <rect x="-21" y="2" width="19" height="19" rx="5" stroke="var(--illus-strong)" />
      </g>
      <path className="illus-flow" style={DASH_WIDE} d="M140 150C168 150 178 140 192 146M248 146C262 140 272 150 300 150" stroke="var(--illus-accent)" />
      <path className="illus-flow" style={DASH_WIDE} d="M300 196C270 196 262 210 220 212C178 210 170 196 140 196" stroke="var(--illus-mid)" />

      {/* blocked request to servers outside the window */}
      <path d="M420 160H462" stroke="var(--illus-faint)" strokeDasharray="3 5" />
      <path d="M434 150L446 170M446 150L434 170" stroke="var(--illus-accent)" strokeWidth="1.75" />
      <g stroke="var(--illus-faint)">
        <rect x="474" y="126" width="66" height="22" rx="6" />
        <circle cx="488" cy="137" r="2.5" />
        <rect x="474" y="152" width="66" height="22" rx="6" />
        <circle cx="488" cy="163" r="2.5" />
        <rect x="474" y="178" width="66" height="22" rx="6" />
        <circle cx="488" cy="189" r="2.5" />
      </g>
      <text x="507" y="218" textAnchor="middle" fill="rgba(246,242,234,.35)" fontSize="10">0 requests</text>
    </LineArt>
  );
}
