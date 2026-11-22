/**
 * Blog cover for the dropped-keystrokes post: a row of keycaps typed in
 * order, with one key ("d") fallen out of its slot as the single clay
 * accent, its empty slot dashed, and the text that actually arrived below.
 * Same style as `blog-covers.tsx` (240×140, cream strokes, no motion).
 */
const S = "var(--illus-strong)";
const M = "var(--illus-mid)";
const F = "var(--illus-faint)";
const A = "var(--illus-accent)";
const T45 = "rgba(246,242,234,.45)";
const T50 = "rgba(246,242,234,.5)";
const T65 = "rgba(246,242,234,.65)";

/** Keycaps that stayed in the row: [x, letter]. */
const KEYS: [number, string][] = [
  [22, "a"],
  [56, "b"],
  [90, "c"],
  [158, "e"],
  [192, "f"],
];

export const coverKeys = (
  <>
    {KEYS.map(([x, ch]) => (
      <g key={ch}>
        <rect x={x} y="30" width="26" height="28" rx="6" stroke={S} />
        <rect x={x + 4} y="33" width="18" height="18" rx="4" stroke={F} />
        <text x={x + 13} y="46" textAnchor="middle" fill={T65} fontSize="11">
          {ch}
        </text>
      </g>
    ))}
    {/* The empty slot where "d" should have been. */}
    <rect x="124" y="30" width="26" height="28" rx="6" stroke={M} strokeDasharray="3 4" />
    <path d="M137 64v6M137 76v4" stroke={F} />
    {/* The dropped key, tipped over below the row. */}
    <g transform="rotate(16 137 98)">
      <rect x="124" y="84" width="26" height="28" rx="6" stroke={A} />
      <text x="137" y="102" textAnchor="middle" fill={A} fontSize="11">
        d
      </text>
    </g>
    <path d="M20 72h88M166 72h54" stroke={F} />
    <text x="22" y="98" fill={T45} fontSize="10">
      typed
    </text>
    <text x="22" y="124" fill={T50} fontSize="11">
      {'"abcef"'}
    </text>
    <path d="M70 115v12" stroke={M} />
  </>
);
