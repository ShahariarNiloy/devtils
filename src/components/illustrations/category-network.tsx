import { LineArt } from "./line-art";

/** "Network" category — a URL taken apart. Ported from the SitePage board. */
export function CategoryNetwork({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 240 140" className={className}>
      <rect
        x="26"
        y="52"
        width="46"
        height="28"
        rx="7"
        stroke="var(--illus-mid)"
      />
      <text
        x="49.0"
        y="70"
        textAnchor="middle"
        fill="var(--illus-strong)"
        fontSize="9"
      >
        https
      </text>
      <rect
        x="74"
        y="52"
        width="22"
        height="28"
        rx="7"
        stroke="var(--illus-faint)"
      />
      <text
        x="85.0"
        y="70"
        textAnchor="middle"
        fill="var(--illus-strong)"
        fontSize="9"
      >
        ://
      </text>
      <rect
        x="98"
        y="52"
        width="74"
        height="28"
        rx="7"
        stroke="var(--illus-strong)"
      />
      <text
        x="135.0"
        y="70"
        textAnchor="middle"
        fill="var(--illus-strong)"
        fontSize="9"
      >
        utilyx.dev
      </text>
      <rect
        x="174"
        y="52"
        width="40"
        height="28"
        rx="7"
        stroke="var(--illus-accent)"
      />
      <text
        x="194.0"
        y="70"
        textAnchor="middle"
        fill="var(--illus-accent)"
        fontSize="9"
      >
        /tools
      </text>
      <path d="M49 80v18" stroke="var(--illus-faint)" />
      <path d="M135 80v18" stroke="var(--illus-faint)" />
      <path d="M194 80v18" stroke="var(--illus-faint)" />
      <path d="M30 104h180" stroke="var(--illus-faint)" strokeDasharray="3 5" />
    </LineArt>
  );
}
