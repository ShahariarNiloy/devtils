/**
 * Blog cover: "time". A timeline with a missing hour (the spring-forward
 * gap) and one clay hop across it. Same drawing rules as `blog-covers.tsx`:
 * 240×140, cream strokes at strong/mid/faint, one clay accent, no motion.
 */
const S = "var(--illus-strong)";
const M = "var(--illus-mid)";
const F = "var(--illus-faint)";
const A = "var(--illus-accent)";
const T45 = "rgba(246,242,234,.45)";
const T50 = "rgba(246,242,234,.5)";

const TICKS = [20, 42, 64, 86, 108, 152, 174, 196, 218];

export const coverTime = (
  <>
    <text x="120" y="32" textAnchor="middle" fill={T50} fontSize="12">
      1795255200
    </text>
    <path d="M20 86h88M152 86h68" stroke={S} />
    <path d="M108 86h44" stroke={F} strokeDasharray="3 4" />
    {TICKS.map((x) => (
      <path key={x} d={`M${x} 80v12`} stroke={M} />
    ))}
    <path d="M108 74C116 52 144 52 152 74M145 69l7 5 1-8" stroke={A} />
    <text x="108" y="110" textAnchor="middle" fill={T45} fontSize="10">
      02:00
    </text>
    <text x="152" y="110" textAnchor="middle" fill={T45} fontSize="10">
      03:00
    </text>
  </>
);
