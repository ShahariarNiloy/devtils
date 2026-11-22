import { LineArt } from "./line-art";

/** "Ready for input" — a dashed clipboard with a clay drop-in arrow. JSON formatter, empty start. */
export function ReadyForInput({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 200 130" className={className}>
      <rect x="64" y="34" width="72" height="88" rx="12" stroke="var(--illus-strong)" strokeDasharray="4 5" />
      <rect x="84" y="26" width="32" height="14" rx="5" stroke="var(--illus-strong)" />
      <path d="M100 52v34M88 74l12 12 12-12" stroke="var(--illus-accent)" />
      <path d="M82 104h36" stroke="var(--illus-mid)" />
    </LineArt>
  );
}
