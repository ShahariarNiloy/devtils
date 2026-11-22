import { LineArt } from "./line-art";

/** "Text" category — "Aa" beside text lines, with a clay caret. */
export function CategoryText({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 240 140" className={className}>
      <text x="42" y="74" textAnchor="middle" fill="var(--color-brand)" fillOpacity={0.7} fontSize="34">
        Aa
      </text>
      <path d="M90 40h120" stroke="var(--illus-mid)" />
      <path d="M90 58h100" stroke="var(--illus-strong)" />
      <path d="M90 76h112" stroke="var(--illus-mid)" />
      <path d="M90 94h70" stroke="var(--illus-mid)" />
      <path d="M162 86v16" stroke="var(--illus-accent)" />
    </LineArt>
  );
}
