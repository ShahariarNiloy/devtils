import { LineArt } from "./line-art";

/** Twelve hour ticks, coordinates as drawn on the board (ticks at 3, 6, 9, 12 are longer). */
const TICKS = [
  "M120.0 34.0L120.0 24.0",
  "M140.0 35.4L143.0 30.2",
  "M154.6 50.0L159.8 47.0",
  "M156.0 70.0L166.0 70.0",
  "M154.6 90.0L159.8 93.0",
  "M140.0 104.6L143.0 109.8",
  "M120.0 106.0L120.0 116.0",
  "M100.0 104.6L97.0 109.8",
  "M85.4 90.0L80.2 93.0",
  "M84.0 70.0L74.0 70.0",
  "M85.4 50.0L80.2 47.0",
  "M100.0 35.4L97.0 30.2",
];

/** "Calc / Cron" category — a clock with a clay quarter-hour arc and "*\/15". */
export function CategoryCalc({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 240 140" className={className}>
      <circle cx="120" cy="70" r="50" stroke="var(--illus-strong)" />
      {TICKS.map((d) => (
        <path key={d} d={d} stroke="var(--illus-mid)" />
      ))}
      <path d="M120 20A50 50 0 0 1 163.3 45" stroke="var(--illus-accent)" strokeWidth={2.25} />
      <path d="M120 70V42M120 70l18 10" stroke="var(--illus-strong)" />
      <text x="198" y="128" textAnchor="middle" fill="var(--color-brand)" fillOpacity={0.45} fontSize="10">
        */15
      </text>
    </LineArt>
  );
}
