import { LineArt } from "./line-art";

/** "Design" category — four overlapping swatch circles (one clay) above a ruler. Ported from the SitePage board. */
export function CategoryDesign({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 240 140" className={className}>
      <circle cx="56" cy="56" r="20" stroke="var(--illus-strong)" />
      <circle cx="88" cy="56" r="20" stroke="var(--illus-mid)" />
      <circle cx="120" cy="56" r="20" stroke="var(--illus-accent)" />
      <circle cx="152" cy="56" r="20" stroke="var(--illus-mid)" />
      <rect
        x="30"
        y="96"
        width="180"
        height="20"
        rx="4"
        stroke="var(--illus-mid)"
      />
      <path d="M38 96v8" stroke="var(--illus-strong)" />
      <path d="M47 96v4" stroke="var(--illus-faint)" />
      <path d="M56 96v4" stroke="var(--illus-faint)" />
      <path d="M65 96v4" stroke="var(--illus-faint)" />
      <path d="M74 96v8" stroke="var(--illus-strong)" />
      <path d="M83 96v4" stroke="var(--illus-faint)" />
      <path d="M92 96v4" stroke="var(--illus-faint)" />
      <path d="M101 96v4" stroke="var(--illus-faint)" />
      <path d="M110 96v8" stroke="var(--illus-strong)" />
      <path d="M119 96v4" stroke="var(--illus-faint)" />
      <path d="M128 96v4" stroke="var(--illus-faint)" />
      <path d="M137 96v4" stroke="var(--illus-faint)" />
      <path d="M146 96v8" stroke="var(--illus-strong)" />
      <path d="M155 96v4" stroke="var(--illus-faint)" />
      <path d="M164 96v4" stroke="var(--illus-faint)" />
      <path d="M173 96v4" stroke="var(--illus-faint)" />
      <path d="M182 96v8" stroke="var(--illus-strong)" />
      <path d="M191 96v4" stroke="var(--illus-faint)" />
      <path d="M200 96v4" stroke="var(--illus-faint)" />
      <text
        x="120"
        y="132"
        textAnchor="middle"
        fill="rgba(246,242,234,.45)"
        fontSize="10"
      >
        16px = 1rem
      </text>
    </LineArt>
  );
}
