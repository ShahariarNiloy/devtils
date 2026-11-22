import type { ReactNode } from "react";

/**
 * Blog cover for "AVIF vs WebP vs JPEG": three file-size bars measured at
 * the same perceived quality (a dashed equal-quality marker on the left),
 * the shortest one in clay. 240×140, cream strokes at 55/28/14%, exactly
 * one clay accent.
 */
const S = "var(--illus-strong)";
const M = "var(--illus-mid)";
const F = "var(--illus-faint)";
const A = "var(--illus-accent)";
const T45 = "rgba(246,242,234,.45)";
const T50 = "rgba(246,242,234,.5)";
const T65 = "rgba(246,242,234,.65)";

export const coverFormats: ReactNode = (
  <>
    <path d="M70 22v96" stroke={F} strokeDasharray="3 4" />
    <text x="70" y="132" textAnchor="middle" fill={T45} fontSize="10">
      same quality
    </text>
    <text x="60" y="47" textAnchor="end" fill={T50} fontSize="10">
      jpeg
    </text>
    <rect x="70" y="36" width="140" height="14" rx="3" stroke={S} />
    <text x="60" y="75" textAnchor="end" fill={T50} fontSize="10">
      webp
    </text>
    <rect x="70" y="64" width="104" height="14" rx="3" stroke={M} />
    <text x="60" y="103" textAnchor="end" fill={T65} fontSize="10">
      avif
    </text>
    <rect x="70" y="92" width="82" height="14" rx="3" stroke={A} />
    <path d="M216 43h8M180 71h8M158 99h8" stroke={F} />
  </>
);
