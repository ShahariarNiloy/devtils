import { LineArt } from "./line-art";

const SRC = [
  { x: 20, ch: "a" },
  { x: 46, ch: "b" },
  { x: 72, ch: "c" },
];
const OUT = [
  { x: 144, ch: "Y" },
  { x: 166, ch: "W" },
  { x: 188, ch: "J" },
  { x: 210, ch: "j" },
];

/** "Encoding" category — "abc" keys through a clay arrow into Base64 "YWJj". */
export function CategoryEncoding({ className }: { className?: string }) {
  return (
    <LineArt viewBox="0 0 240 140" className={className}>
      {SRC.map(({ x, ch }) => (
        <g key={ch}>
          <rect x={x} y="50" width="22" height="32" rx="6" stroke="var(--illus-strong)" />
          <text x={x + 11} y="71" textAnchor="middle" fill="var(--color-brand)" fillOpacity={0.65} fontSize="12">
            {ch}
          </text>
        </g>
      ))}
      <path d="M106 66h28M126 58l8 8-8 8" stroke="var(--illus-accent)" />
      {OUT.map(({ x, ch }) => (
        <g key={ch}>
          <rect x={x} y="50" width="18" height="32" rx="5" stroke="var(--illus-mid)" />
          <text x={x + 9} y="71" textAnchor="middle" fill="var(--color-brand)" fillOpacity={0.5} fontSize="11">
            {ch}
          </text>
        </g>
      ))}
      <path d="M20 100h70M144 100h84" stroke="var(--illus-faint)" />
    </LineArt>
  );
}
