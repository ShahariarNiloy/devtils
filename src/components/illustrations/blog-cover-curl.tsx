/**
 * Blog cover: curl → code. A terminal window holding a curl command, the one
 * clay accent is the arrow carrying it into the code window on the right.
 * 240×140, same stroke/text palette as `blog-covers.tsx`, no motion.
 */
const S = "var(--illus-strong)";
const M = "var(--illus-mid)";
const F = "var(--illus-faint)";
const A = "var(--illus-accent)";
const T45 = "rgba(246,242,234,.45)";
const T65 = "rgba(246,242,234,.65)";

export const coverCurl = (
  <>
    {/* terminal */}
    <rect x="16" y="26" width="94" height="88" rx="9" stroke={S} />
    <path d="M16 40h94" stroke={F} />
    <circle cx="25" cy="33" r="2" stroke={M} />
    <circle cx="32" cy="33" r="2" stroke={M} />
    <circle cx="39" cy="33" r="2" stroke={M} />
    <text x="24" y="56" fill={T65} fontSize="9">
      $ curl
    </text>
    <text x="30" y="70" fill={T45} fontSize="9">
      -H auth
    </text>
    <text x="30" y="84" fill={T45} fontSize="9">
      -d {"{…}"}
    </text>
    <text x="30" y="98" fill={T45} fontSize="9">
      -m 30
    </text>

    {/* the translation */}
    <path d="M116 70h18" stroke={A} />
    <path d="M129 65l5 5-5 5" stroke={A} />

    {/* code */}
    <rect x="140" y="26" width="84" height="88" rx="9" stroke={M} />
    <text x="148" y="46" fill={T65} fontSize="9">
      fetch(
    </text>
    <path d="M156 58h44" stroke={F} />
    <path d="M156 70h54" stroke={F} />
    <path d="M164 82h36" stroke={F} />
    <path d="M156 94h28" stroke={F} />
    <text x="148" y="106" fill={T45} fontSize="9">
      )
    </text>
  </>
);
