import type { ReactNode } from "react";

/**
 * Blog cover for "How lossy PNG compression works": a smooth pixel ramp
 * (left) mapped onto a short palette strip (right). 240×140, cream strokes
 * at 55/28/14%, exactly one clay accent (the chosen palette entry).
 */
const S = "var(--illus-strong)";
const M = "var(--illus-mid)";
const F = "var(--illus-faint)";
const A = "var(--illus-accent)";
const T45 = "rgba(246,242,234,.45)";
const T50 = "rgba(246,242,234,.5)";

/** 6×4 pixel grid; stroke strength fades left→right like a gradient. */
const GRID_STROKES = [S, S, M, M, F, F];
const GRID: { x: number; y: number; stroke: string }[] = [];
for (let col = 0; col < 6; col++) {
  for (let row = 0; row < 4; row++) {
    GRID.push({ x: 22 + col * 16, y: 36 + row * 16, stroke: GRID_STROKES[col] });
  }
}

export const coverPng: ReactNode = (
  <>
    {GRID.map(({ x, y, stroke }) => (
      <rect key={`${x}-${y}`} x={x} y={y} width="12" height="12" rx="2" stroke={stroke} />
    ))}
    <text x="66" y="118" textAnchor="middle" fill={T45} fontSize="10">
      14,096 colours
    </text>
    <path d="M128 68h30" stroke={M} />
    <path d="M151 61l7 7-7 7" stroke={M} />
    <rect x="172" y="28" width="20" height="16" rx="3" stroke={S} />
    <rect x="172" y="48" width="20" height="16" rx="3" stroke={S} />
    <rect x="172" y="68" width="20" height="16" rx="3" stroke={A} />
    <rect x="172" y="88" width="20" height="16" rx="3" stroke={M} />
    <path d="M182 108v4M182 116v2" stroke={F} />
    <text x="206" y="80" fill={T50} fontSize="10">
      PLTE
    </text>
    <text x="182" y="132" textAnchor="middle" fill={T45} fontSize="10">
      256
    </text>
  </>
);
