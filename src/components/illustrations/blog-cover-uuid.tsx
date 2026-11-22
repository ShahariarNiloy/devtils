/**
 * Blog cover for the UUID v4 / v7 / ULID post: a 128-bit UUID v7 drawn as
 * one bar, with the 48-bit timestamp prefix as the single clay accent, the
 * version and variant nibbles as dividers, and random bits as dashes.
 * Same style as `blog-covers.tsx` (240×140, cream strokes, no motion).
 */
const S = "var(--illus-strong)";
const M = "var(--illus-mid)";
const F = "var(--illus-faint)";
const A = "var(--illus-accent)";
const T45 = "rgba(246,242,234,.45)";
const T50 = "rgba(246,242,234,.5)";
const T65 = "rgba(246,242,234,.65)";

export const coverUuid = (
  <>
    <text x="20" y="34" fill={T65} fontSize="11">
      019535d9-3df7-7…
    </text>
    {/* 128 bits → 200px: timestamp 48 bits = 75px, ver at 48–51, var at 64–65. */}
    <rect x="20" y="48" width="200" height="30" rx="8" stroke={S} />
    <rect x="20" y="48" width="75" height="30" rx="8" stroke={A} />
    <path d="M101 48v30M120 48v30M123 48v30" stroke={M} />
    <text x="98" y="67" textAnchor="middle" fill={T50} fontSize="9">
      7
    </text>
    <path d="M30 63h8M44 63h8M58 63h8M72 63h8" stroke={M} />
    <path
      d="M106 63h8M130 63h10M146 63h10M162 63h10M178 63h10M194 63h10M210 63h4"
      stroke={F}
    />
    <text x="57" y="96" textAnchor="middle" fill={T45} fontSize="10">
      unix_ts_ms
    </text>
    <text x="171" y="96" textAnchor="middle" fill={T45} fontSize="10">
      rand
    </text>
    <path d="M20 112h75M101 112h119" stroke={F} />
    <path d="M20 108v8M95 108v8M101 108v8M220 108v8" stroke={F} />
    <text x="57" y="128" textAnchor="middle" fill={T50} fontSize="10">
      48
    </text>
    <text x="160" y="128" textAnchor="middle" fill={T50} fontSize="10">
      74
    </text>
  </>
);
