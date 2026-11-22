import {
  KEY_COLS,
  KEY_LEGENDS,
  KEY_ROWS,
  keyCenter,
  ALL_KEYS,
  LIT_HOME,
  PRESSED_KEYS,
} from "./hero-keyfield.data";
import { HeroLitKey } from "./hero-lit-key";

/**
 * The hero's keyboard floor: a field of diamond keycaps tilted away in
 * perspective, faded at the sides and bottom, and one clay key (the logo's
 * warm key) that pulses and wanders. Server-rendered; only the wandering
 * key is a tiny client island.
 *
 * The design board drew every keycap as two <rect>s (990 nodes, ~168 KB of
 * markup). Here one <symbol> is reused by every key, so the field costs
 * about a tenth of that and the browser rasterises it once into the 3D layer.
 */
const special = new Set(PRESSED_KEYS.map(([x, y]) => `${x},${y}`));

const KEYS: [number, number][] = [];
for (let r = 0; r < KEY_ROWS; r++) {
  for (let c = 0; c < KEY_COLS; c++) {
    const [x, y] = keyCenter(r, c);
    if (!special.has(`${x},${y}`)) KEYS.push([x, y]);
  }
}

export function HeroKeyfield() {
  return (
    <div
      data-keyfield
      className="absolute inset-x-0 top-0 -bottom-[180px] overflow-hidden"
    >
      <div className="absolute inset-0 [mask-image:linear-gradient(to_right,transparent_4%,#000_28%,#000_72%,transparent_96%)]">
        <div className="absolute top-[calc(100%-380px)] left-1/2 -ml-[1000px] h-[900px] w-[2000px] origin-top [transform:perspective(900px)_rotateX(60deg)] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,.6),#000_20%,#000_55%,transparent_85%)]">
          <svg
            viewBox="0 0 2000 900"
            width="2000"
            height="900"
            className="block overflow-visible"
          >
            <defs>
              <linearGradient id="hk-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#1d1c19" />
                <stop offset="1" stopColor="#0f0f0d" />
              </linearGradient>
              <symbol id="hk-key" overflow="visible">
                <g transform="rotate(45)">
                  <rect
                    x="-31"
                    y="-31"
                    width="62"
                    height="62"
                    rx="13"
                    fill="url(#hk-fill)"
                    stroke="rgba(246,242,234,.15)"
                    strokeWidth="1"
                  />
                  <rect
                    x="-26"
                    y="-26"
                    width="52"
                    height="52"
                    rx="10"
                    fill="none"
                    stroke="rgba(255,255,255,.05)"
                    strokeWidth="1"
                  />
                </g>
              </symbol>
            </defs>
            {KEYS.map(([x, y]) => (
              <use key={`${x},${y}`} href="#hk-key" x={x} y={y} />
            ))}
            {PRESSED_KEYS.map(([x, y]) => (
              <rect
                key={`p${x},${y}`}
                x="-31"
                y="-31"
                width="62"
                height="62"
                rx="13"
                transform={`translate(${x} ${y}) rotate(45)`}
                fill="#16150f"
                stroke="rgba(246,242,234,.15)"
                strokeWidth="1"
              />
            ))}
          </svg>
          <HeroLitKey home={LIT_HOME} keys={ALL_KEYS} />
          {/* Legends on top, so the ⇧ on a lit key stays readable (board order). */}
          <svg
            viewBox="0 0 2000 900"
            width="2000"
            height="900"
            className="absolute inset-0 overflow-visible"
          >
            <g
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="var(--font-mono)"
            >
              {KEY_LEGENDS.map(([x, y, ch, accent]) => (
                <text
                  key={`t${x},${y}`}
                  x={x}
                  y={y}
                  fontSize={accent ? 22 : 18}
                  fill={
                    accent ? "rgba(240,201,160,.45)" : "rgba(246,242,234,.22)"
                  }
                >
                  {ch}
                </text>
              ))}
            </g>
          </svg>
        </div>
      </div>
      {/* Fade the floor out before the next section's heading (the board let
          keys run behind "Paste anything, or press ⌘K"; clearer without). */}
      <div className="absolute inset-x-0 bottom-0 h-[300px] bg-[linear-gradient(to_bottom,rgba(11,11,10,0),var(--color-bg)_62%)]" />
    </div>
  );
}
