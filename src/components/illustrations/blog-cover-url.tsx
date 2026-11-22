/**
 * Blog cover: URL encoding. An address bar where the one clay accent is the
 * `%20` escape, wired down to the dashed space it replaced in the source text.
 * 240×140, same stroke/text palette as `blog-covers.tsx`, no motion.
 */
const S = "var(--illus-strong)";
const M = "var(--illus-mid)";
const F = "var(--illus-faint)";
const A = "var(--illus-accent)";
const T45 = "rgba(246,242,234,.45)";
const T50 = "rgba(246,242,234,.5)";

export const coverUrl = (
  <>
    <rect x="20" y="30" width="200" height="32" rx="16" stroke={S} />
    <circle cx="38" cy="46" r="5" stroke={M} />
    <text x="52" y="50" fill={T50} fontSize="11">
      ?q=fish
    </text>
    <text x="100" y="50" fill={A} fontSize="11">
      %20
    </text>
    <text x="122" y="50" fill={T50} fontSize="11">
      chips
    </text>
    <path d="M110 66v14" stroke={F} strokeDasharray="2 3" />
    <text x="98" y="97" textAnchor="end" fill={T45} fontSize="10">
      fish
    </text>
    <rect x="102" y="84" width="16" height="18" rx="4" stroke={M} strokeDasharray="3 3" />
    <text x="122" y="97" fill={T45} fontSize="10">
      chips
    </text>
    <path d="M20 118h200" stroke={F} />
  </>
);
