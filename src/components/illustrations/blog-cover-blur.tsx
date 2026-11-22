import type { ReactNode } from "react";

/**
 * Blog cover for "Blur placeholders, measured": a 4×3 pixel grid (left)
 * stretched into a soft, blurred frame (right). 240×140, cream strokes at
 * 55/28/14%, exactly one clay accent (one placeholder pixel).
 */
const S = "var(--illus-strong)";
const M = "var(--illus-mid)";
const F = "var(--illus-faint)";
const A = "var(--illus-accent)";
const T45 = "rgba(246,242,234,.45)";
const T50 = "rgba(246,242,234,.5)";
const T65 = "rgba(246,242,234,.65)";

/** 4×3 grid of 14px cells; one cell is the clay accent. */
const CELLS: { x: number; y: number; stroke: string }[] = [];
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 4; col++) {
    let stroke = row === 0 ? S : M;
    if (row === 1 && col === 2) stroke = A;
    CELLS.push({ x: 20 + col * 18, y: 44 + row * 18, stroke });
  }
}

export const coverBlur: ReactNode = (
  <>
    <text x="20" y="28" fill={T65} fontSize="11">
      blurDataURL
    </text>
    {CELLS.map(({ x, y, stroke }) => (
      <rect key={`${x}-${y}`} x={x} y={y} width="14" height="14" rx="2" stroke={stroke} />
    ))}
    <text x="54" y="116" textAnchor="middle" fill={T45} fontSize="10">
      4×3
    </text>
    <path d="M100 69h26" stroke={M} />
    <path d="M119 62l7 7-7 7" stroke={M} />
    <rect x="138" y="40" width="84" height="58" rx="8" stroke={S} />
    <ellipse cx="180" cy="69" rx="34" ry="22" stroke={F} />
    <ellipse cx="180" cy="69" rx="24" ry="15" stroke={M} />
    <ellipse cx="180" cy="69" rx="12" ry="7" stroke={S} />
    <text x="180" y="116" textAnchor="middle" fill={T50} fontSize="10">
      162 chars
    </text>
  </>
);
