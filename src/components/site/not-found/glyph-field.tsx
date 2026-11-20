const SET = ["{", "}", "[", "]", ":", ",", "0", "1", "=", "/", "#", ".", "*"];
const COLS = 30;
const ROWS = 10;

/**
 * Deterministic ring of code glyphs behind the 404 mark: a hashed
 * character per cell, brightened in clay along an ellipse and almost
 * invisible in the centre so the message stays readable. Pure decor.
 */
function cells() {
  const out: { id: string; ch: string; color: string }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const h = ((r * 73856093) ^ (c * 19349663)) >>> 0;
      const dx = (c - 14.5) / 15;
      const dy = (r - 3) / 5;
      const d = Math.sqrt(dx * dx + dy * dy);
      let k = Math.exp(-Math.pow(d - 0.7, 2) / 0.04) * 0.5 + (h % 29 === 0 && d > 0.5 ? 0.3 : 0);
      if (d < 0.5) k = 0.03;
      out.push({
        id: `${r}-${c}`,
        ch: SET[h % SET.length],
        color:
          k > 0.3
            ? `rgba(224,160,114,${Math.min(0.75, k).toFixed(2)})`
            : `rgba(246,242,234,${Math.max(0.04, k * 0.35).toFixed(2)})`,
      });
    }
  }
  return out;
}

const CELLS = cells();

export function GlyphField() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-[-40px] left-1/2 grid w-[1100px] -translate-x-1/2 grid-cols-[repeat(30,minmax(0,1fr))] font-mono text-sm leading-[30px] select-none"
    >
      {CELLS.map((g) => (
        <span key={g.id} style={{ color: g.color }}>
          {g.ch}
        </span>
      ))}
    </div>
  );
}
