import { LineArt } from "./line-art";

/** "Image" category — a photo frame through a clay arrow into a smaller frame, "3.4 MB" → "−82%". Ported from the SitePage board. */
export function CategoryImage({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 240 140" className={className}>
      <rect
        x="22"
        y="26"
        width="92"
        height="74"
        rx="10"
        stroke="var(--illus-strong)"
      />
      <circle cx="46" cy="48" r="7" stroke="var(--illus-accent)" />
      <path d="M24 90l26-22 16 12 18-18 28 24" stroke="var(--illus-mid)" />
      <path d="M124 63h22" stroke="var(--illus-accent)" />
      <path d="M138 55l8 8-8 8" stroke="var(--illus-accent)" />
      <rect
        x="158"
        y="40"
        width="60"
        height="48"
        rx="8"
        stroke="var(--illus-strong)"
      />
      <path d="M160 82l14-12 9 7 10-10 23 17" stroke="var(--illus-mid)" />
      <text
        x="188"
        y="106"
        textAnchor="middle"
        fill="var(--illus-accent)"
        fontSize="10"
      >
        −82%
      </text>
      <text
        x="68"
        y="118"
        textAnchor="middle"
        fill="rgba(246,242,234,.45)"
        fontSize="10"
      >
        3.4 MB
      </text>
    </LineArt>
  );
}
