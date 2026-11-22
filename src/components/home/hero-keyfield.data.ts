/**
 * Hero keyboard floor (v2 landing board). A 25 × 20 lattice of diamond
 * keycaps in a 2000 × 900 field: rows every 46px from y = 60, columns every
 * 92px from x = -104 (odd rows shifted half a key). Only the special keys are
 * listed; everything else is drawn from one shared <symbol>.
 */
export const KEY_ROWS = 20;
export const KEY_COLS = 25;
export const keyCenter = (row: number, col: number): [number, number] => [
  (row % 2 === 0 ? -104 : -58) + col * 92,
  60 + row * 46,
];

/** Where the clay key starts, and rests when motion is reduced (left of centre). */
export const LIT_HOME: readonly [x: number, y: number] = [540, 244];

/** Every key position on the floor; the lit key picks visible ones at runtime. */
export const ALL_KEYS: readonly (readonly [x: number, y: number])[] = (() => {
  const out: [number, number][] = [];
  for (let r = 0; r < KEY_ROWS; r++)
    for (let c = 0; c < KEY_COLS; c++) out.push(keyCenter(r, c));
  return out;
})();

/** Darker "pressed" keys with no inner bevel. */
export const PRESSED_KEYS: readonly (readonly [x: number, y: number])[] = [
  [1828, 336],
  [1322, 382],
  [908, 428],
];

/** Faint key legends; `accent` ones are the clay ⌘ K pair under the CTA. */
export const KEY_LEGENDS: readonly (readonly [
  x: number,
  y: number,
  ch: string,
  accent?: true,
])[] = [
  [-12, 60, "4"],
  [1000, 60, "{"],
  [2012, 60, "⇧"],
  [218, 106, "{"],
  [1230, 106, "⇧"],
  [356, 152, "⇧"],
  [1368, 152, "}"],
  [586, 198, "}"],
  [1598, 198, "⌥"],
  [724, 244, "⌥"],
  [1736, 244, "/"],
  [-58, 290, "⌥"],
  [954, 290, "/"],
  [1966, 290, "↵"],
  [80, 336, "/"],
  [1092, 336, "↵"],
  [2104, 336, "*"],
  [310, 382, "↵"],
  [1322, 382, "*"],
  [448, 428, "*"],
  [1460, 428, "J"],
  [678, 474, "J"],
  [954, 474, "⌘", true],
  [1046, 474, "K", true],
  [1690, 474, "#"],
  [816, 520, "#"],
  [1828, 520, "W"],
  [34, 566, "#"],
  [1046, 566, "W"],
  [2058, 566, "6"],
  [172, 612, "W"],
  [1184, 612, "6"],
  [402, 658, "6"],
  [1414, 658, "T"],
  [540, 704, "T"],
  [1552, 704, "4"],
  [770, 750, "4"],
  [1782, 750, "{"],
  [-104, 796, "4"],
  [908, 796, "{"],
  [1920, 796, "⇧"],
  [126, 842, "{"],
  [1138, 842, "⇧"],
  [2150, 842, "}"],
  [264, 888, "⇧"],
  [1276, 888, "}"],
  [494, 934, "}"],
  [1506, 934, "⌥"],
];
