"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Props for {@link Logo}.
 *
 * `variant` toggles between the full lowercase wordmark and the naked-u
 * glyph (also used as the favicon). `className` is forwarded to the root
 * SVG — typical use sizes height via the `h-logo` token, with width
 * computed from the SVG's viewBox via `w-auto`.
 */
export interface LogoProps {
  variant?: "wordmark" | "glyph";
  className?: string;
}

/**
 * utilyx brand mark — inlined SVG so the S1 gradient renders without
 * losing colour control across light/dark themes. Light variant uses the
 * two-stop olive → sage gradient; dark variant uses a two-stop sage → mist
 * gradient so the mark still reads on a charcoal background.
 *
 * Hydration: until `next-themes` resolves the user's theme on the client,
 * we render the light variant (matches the SSR HTML). This avoids the
 * "tree hydrated but some attributes…" warning the project documents in
 * its root layout.
 */
export function Logo({ variant = "wordmark", className }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Standard next-themes hydration guard: SSR can't know the user's theme,
  // so we render the light variant first and swap once mounted. The lint
  // rule against set-state-in-effect doesn't have a cleaner equivalent
  // for this pattern; the cost is one re-render on first mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  return variant === "glyph" ? (
    <GlyphSvg dark={dark} className={className} />
  ) : (
    <WordmarkSvg dark={dark} className={className} />
  );
}

// ── SVGs ─────────────────────────────────────────────────────────────────────
// Geometry is identical between light/dark (and between S1/S2) — only the
// gradient stops change. The unique gradient ids ensure no collision if both
// variants happen to mount on the same page.

const WORDMARK_VB = "-33.8 -789.8 2541.4 1083.1";
const GLYPH_VB = "-61.5 -581.5 680.0 680.0";

// UCLAY S1 gradient. Light: olive → sage. Dark: sage → mist so the mark
// stays visible on the warm-charcoal background.
const GRAD_LIGHT_STOPS = (
  <>
    <stop offset="0" stopColor="#3D4435" />
    <stop offset="1" stopColor="#7E8A6C" />
  </>
);
const GRAD_DARK_STOPS = (
  <>
    <stop offset="0" stopColor="#7E8A6C" />
    <stop offset="1" stopColor="#DDE0D0" />
  </>
);

function WordmarkSvg({
  dark,
  className,
}: {
  dark: boolean;
  className?: string;
}) {
  const gradId = dark ? "ux-grad-dark" : "ux-grad-light";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={WORDMARK_VB}
      role="img"
      aria-label="utilyx"
      // Height pulled from the `--spacing-logo` token so all logo
      // surfaces stay consistent without a Tailwind utility (the v4 JIT
      // doesn't always re-emit new @theme vars during HMR). Width follows
      // the viewBox aspect ratio automatically.
      style={{ height: "var(--spacing-logo, 1.375rem)", width: "auto" }}
      className={className}
    >
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1="36.2"
          y1="0"
          x2="2437.6"
          y2="0"
        >
          {dark ? GRAD_DARK_STOPS : GRAD_LIGHT_STOPS}
        </linearGradient>
      </defs>
      <g fill={`url(#${gradId})`}>
        {WORDMARK_PATHS.map((d) => (
          // Path data is the natural identity here — the array is a fixed
          // const and each glyph has a unique d string.
          <path key={d.slice(0, 24)} d={d} />
        ))}
      </g>
    </svg>
  );
}

function GlyphSvg({ dark, className }: { dark: boolean; className?: string }) {
  const gradId = dark ? "u-grad-dark" : "u-grad-light";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={GLYPH_VB}
      role="img"
      aria-label="utilyx"
      style={{ height: "var(--spacing-logo, 1.375rem)", width: "auto" }}
      className={className}
    >
      <defs>
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1="36.2"
          y1="0"
          x2="520.8"
          y2="0"
        >
          {dark ? GRAD_DARK_STOPS : GRAD_LIGHT_STOPS}
        </linearGradient>
      </defs>
      <path fill={`url(#${gradId})`} d={GLYPH_PATH} />
    </svg>
  );
}

// ── Path data (extracted from utilyx-logos source SVGs) ──────────────────────
// Six paths for the wordmark (u-t-i-l-y-x) and one for the naked glyph.
// Kept as constants so light/dark variants don't duplicate the geometry.

const GLYPH_PATH =
  "M256.25 8.25Q209.5 8.25 169.375 -9.625Q129.25 -27.5 99.25 -60.25Q69.25 -93.0 52.75 -137.375Q36.25 -181.75 36.25 -235.0V-416.0Q36.25 -436.0 39.875 -453.0Q43.5 -470.0 59.375 -480.75Q75.25 -491.5 111.5 -491.5Q148.75 -491.5 164.25 -480.625Q179.75 -469.75 183.375 -452.375Q187 -435 187 -415V-234.75Q187.0 -205.5 197.375 -184.375Q207.75 -163.25 228.125 -151.875Q248.5 -140.5 277.0 -140.5Q305.75 -140.5 326.5 -152.25Q347.25 -164.0 358.75 -185.125Q370.25 -206.25 370.25 -234.75V-416.75Q370.25 -436.75 373.875 -453.75Q377.5 -470.75 393.375 -481.125Q409.25 -491.5 445.75 -491.5Q482.75 -491.5 498.125 -480.625Q513.5 -469.75 517.125 -452.375Q520.75 -435.0 520.75 -415.75V-64.0Q520.75 -45.25 517.125 -28.75Q513.5 -12.25 497.75 -1.875Q482.0 8.5 445.5 8.5Q419.0 8.5 403.875 2.5Q388.75 -3.5 382.0 -12.875Q375.25 -22.25 373.75 -32.125Q372.25 -42.0 372.25 -49.75L385.0 -60.75Q381.75 -56.5 371.75 -45.5Q361.75 -34.5 345.25 -22.0Q328.75 -9.5 306.625 -0.625Q284.5 8.25 256.25 8.25Z";

const WORDMARK_PATHS: readonly string[] = [
  GLYPH_PATH,
  "M830.25 9.5Q779.25 9.5 742.375 -1.5Q705.5 -12.5 681.625 -35.5Q657.75 -58.5 646.375 -94.125Q635.0 -129.75 635.0 -178.5V-584.5Q635.0 -604.75 638.625 -621.0Q642.25 -637.25 658.0 -647.375Q673.75 -657.5 710.0 -657.5Q745.75 -657.5 761.625 -646.75Q777.5 -636.0 781.25 -618.75Q785.0 -601.5 785.0 -582.25V-184.75Q785.0 -168.75 787.5 -158.5Q790.0 -148.25 795.125 -143.0Q800.25 -137.75 809.0 -135.625Q817.75 -133.5 830.75 -133.5Q853.25 -133.5 870.25 -129.875Q887.25 -126.25 896.625 -112.0Q906.0 -97.75 906 -65Q906.0 -28.5 894.75 -12.75Q883.5 3.0 866.125 6.25Q848.75 9.5 830.25 9.5ZM603.75 -483.0 713.75 -482.5 852.0 -486.75Q871.25 -486.75 888.25 -483.125Q905.25 -479.5 916.125 -463.75Q927 -448 927 -411Q927.0 -376.75 916.25 -360.875Q905.5 -345.0 888.625 -340.625Q871.75 -336.25 851.75 -336.25L721.25 -339.0L600.25 -338.5Q570.75 -340.0 559.5 -356.625Q548.25 -373.25 548.25 -411.75Q548.25 -447.75 562.0 -465.375Q575.75 -483.0 603.75 -483.0Z",
  "M1035.5 9.5Q999.25 9.5 983.375 -1.375Q967.5 -12.25 964.25 -29.625Q961 -47 961.0 -66.25V-415.25Q961.0 -434.5 964.625 -451.5Q968.25 -468.5 984.125 -479.25Q1000 -490 1036.5 -490.0Q1073 -490 1088.375 -479.125Q1103.75 -468.25 1107.375 -450.875Q1111.0 -433.5 1111.0 -413.25V-65.25Q1111 -46 1107.375 -28.625Q1103.75 -11.25 1088.25 -0.875Q1072.75 9.5 1035.5 9.5ZM1035.5 -562.75Q998.25 -562.75 982.0 -573.875Q965.75 -585.0 962.25 -603.0Q958.75 -621.0 958.75 -641.0Q958.75 -661.75 962.625 -679.125Q966.5 -696.5 982.875 -707.125Q999.25 -717.75 1036.5 -717.75Q1073.75 -717.75 1089.625 -706.625Q1105.5 -695.5 1109.375 -677.625Q1113.25 -659.75 1113.25 -639.5Q1113.25 -619.75 1109.375 -601.875Q1105.5 -584.0 1089.625 -573.375Q1073.75 -562.75 1035.5 -562.75Z",
  "M1362.0 9.5Q1320.5 9.5 1289.0 5.0Q1257.5 0.5 1235.25 -11.5Q1213.0 -23.5 1198.875 -44.875Q1184.75 -66.25 1178.125 -99.625Q1171.5 -133.0 1171.5 -181.5V-643.75Q1171.5 -664.0 1175.125 -681.0Q1178.75 -698.0 1194.625 -708.875Q1210.5 -719.75 1246.75 -719.75Q1283.25 -719.75 1298.75 -709.0Q1314.25 -698.25 1318.0 -681.0Q1321.75 -663.75 1321.75 -643.75V-189.25Q1321.75 -172.5 1323.375 -162.0Q1325.0 -151.5 1329.5 -145.625Q1334.0 -139.75 1342.0 -138.0Q1350.0 -136.25 1362.5 -136.25Q1375.25 -136.25 1387.75 -133.0Q1400.25 -129.75 1408.875 -115.0Q1417.5 -100.25 1417.5 -65.25Q1417.5 -28.75 1408.875 -12.875Q1400.25 3.0 1387.375 6.25Q1374.5 9.5 1362.0 9.5Z",
  "M1584.5 210.75Q1544.0 192.75 1537.375 170.75Q1530.75 148.75 1548.25 112.5L1798.75 -448.5Q1816.25 -487.75 1836.375 -495.5Q1856.5 -503.25 1897.75 -486.5Q1937.5 -468.25 1944.375 -447.25Q1951.25 -426.25 1935.25 -391.0L1683.0 174.25Q1666.25 213.5 1646.0 221.125Q1625.75 228.75 1584.5 210.75ZM1671.5 -22.0 1436.75 -379.5Q1415 -413 1419.25 -435.125Q1423.5 -457.25 1459.0 -479.5Q1497.75 -503.5 1519.25 -498.125Q1540.75 -492.75 1563.25 -458.5L1736.0 -193.5Z",
  "M2405.5 -469.75Q2427.75 -448.5 2434.375 -432.0Q2441.0 -415.5 2434.0 -399.125Q2427.0 -382.75 2406.25 -361.25L2088.25 -17.0Q2068.5 3.5 2052.5 11.0Q2036.5 18.5 2020.375 12.125Q2004.25 5.75 1982.75 -13.5Q1961.75 -34.75 1955.125 -51.125Q1948.5 -67.5 1956.125 -84.25Q1963.75 -101.0 1982.75 -121.0L2300.75 -466.0Q2332.0 -496.75 2353.25 -498.5Q2374.5 -500.25 2405.5 -469.75ZM1983.25 -469.75Q2004.25 -489.75 2020.375 -495.625Q2036.5 -501.5 2052.5 -494.25Q2068.5 -487.0 2088 -466L2406 -121Q2426.0 -100.25 2433.5 -83.875Q2441.0 -67.5 2434.875 -51.125Q2428.75 -34.75 2406.0 -13.5Q2384.5 6.5 2368.75 12.5Q2353.0 18.5 2337.375 11.0Q2321.75 3.5 2300.5 -17.0L1982.5 -361.25Q1962.75 -382.0 1955.625 -398.5Q1948.5 -415.0 1955.125 -431.875Q1961.75 -448.75 1983.25 -469.75Z",
];
