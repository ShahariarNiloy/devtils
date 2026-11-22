import { LineArt } from "./line-art";

/** "Code" category — chevron brackets around indented lines; one clay line. Ported from the SitePage board. */
export function CategoryCode({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 240 140" className={className}>
      <path d="M52 30L30 70l22 40" stroke="var(--illus-strong)" />
      <path d="M188 30l22 40-22 40" stroke="var(--illus-strong)" />
      <path d="M70 38h64" stroke="var(--illus-mid)" />
      <path d="M86 51h80" stroke="var(--illus-strong)" />
      <path d="M86 64h52" stroke="var(--illus-mid)" />
      <path d="M102 77h48" stroke="var(--illus-accent)" />
      <path d="M86 90h70" stroke="var(--illus-mid)" />
      <path d="M70 103h30" stroke="var(--illus-mid)" />
    </LineArt>
  );
}
