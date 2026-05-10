/**
 * JsonIllustration
 *
 * Animated JSON code block illustration for the JSON Formatter tool card.
 * Code tokens appear line by line (staggered), then a green ✓ Valid badge
 * pops in at the end of each 5s loop.
 */

export function JsonIllustration() {
  return (
    <svg
      viewBox="0 0 320 160"
      fill="none"
      className="w-full h-full"
      aria-hidden
    >
      <rect width="320" height="160" fill="#F5F0E5" />

      {/* Line number gutter */}
      <rect x="0" y="0" width="28" height="160" fill="#ECE6D4" />
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <rect key={i} x="6" y={14 + i * 22} width="16" height="6" rx="2" fill="#D6D2C2" />
      ))}

      {/* Brace open — always visible */}
      <rect x="36" y="12" width="10" height="9" rx="2" fill="#7E8A6C" />

      {/* Line 1 — key + string */}
      <g className="ti-anim-l1">
        <rect x="44" y="34" width="36" height="8" rx="2" fill="#C58E5E" />
        <rect x="84" y="34" width="2" height="8" rx="1" fill="#7E8A6C" />
        <rect x="90" y="34" width="52" height="8" rx="2" fill="#3D4435" />
      </g>

      {/* Line 2 — key + number */}
      <g className="ti-anim-l2 ti-d1">
        <rect x="44" y="56" width="24" height="8" rx="2" fill="#C58E5E" />
        <rect x="72" y="56" width="2" height="8" rx="1" fill="#7E8A6C" />
        <rect x="78" y="56" width="22" height="8" rx="2" fill="#8E5D36" />
      </g>

      {/* Line 3 — key + boolean */}
      <g className="ti-anim-l3 ti-d2">
        <rect x="44" y="78" width="38" height="8" rx="2" fill="#C58E5E" />
        <rect x="86" y="78" width="2" height="8" rx="1" fill="#7E8A6C" />
        <rect x="92" y="78" width="28" height="8" rx="2" fill="#7E8A6C" />
      </g>

      {/* Line 4 — nested object key */}
      <g className="ti-anim-l4 ti-d3">
        <rect x="44" y="100" width="46" height="8" rx="2" fill="#C58E5E" />
        <rect x="94" y="100" width="2" height="8" rx="1" fill="#7E8A6C" />
        <rect x="100" y="100" width="10" height="8" rx="2" fill="#7E8A6C" />
      </g>

      {/* Line 5 — nested key + value */}
      <g className="ti-anim-l5 ti-d4">
        <rect x="56" y="122" width="32" height="8" rx="2" fill="#C58E5E" />
        <rect x="92" y="122" width="2" height="8" rx="1" fill="#7E8A6C" />
        <rect x="98" y="122" width="60" height="8" rx="2" fill="#3D4435" />
      </g>

      {/* Brace close — always visible */}
      <rect x="36" y="144" width="10" height="9" rx="2" fill="#7E8A6C" />

      {/* ✓ Valid JSON badge — pops in after lines appear */}
      <g className="ti-anim-pop ti-d5">
        <rect x="168" y="14" width="140" height="24" rx="12" fill="#DDE0D0" />
        <circle cx="186" cy="26" r="6" fill="#5D6A4D" />
        <text x="184" y="30" fontSize="8" fill="white" fontFamily="system-ui" fontWeight="700">✓</text>
        <text x="198" y="30" fontSize="10" fill="#3D4435" fontFamily="system-ui" fontWeight="600">Valid JSON · 4.2 KB</text>
      </g>

      {/* Stats row — fades in last */}
      <g className="ti-anim-fade ti-d6">
        <rect x="168" y="50" width="60" height="8" rx="2" fill="#DDE0D0" />
        <rect x="168" y="66" width="44" height="8" rx="2" fill="#DDE0D0" />
        <rect x="168" y="82" width="52" height="8" rx="2" fill="#DDE0D0" />
        <text x="236" y="58" fontSize="9" fill="#5C4E42" fontFamily="monospace">18 keys</text>
        <text x="236" y="74" fontSize="9" fill="#5C4E42" fontFamily="monospace">depth 3</text>
        <text x="236" y="90" fontSize="9" fill="#5C4E42" fontFamily="monospace">24 lines</text>
      </g>

      {/* Cursor blink in input */}
      <rect
        x="36" y="56" width="2" height="10" rx="1" fill="#3D4435"
        className="ti-anim-blink"
      />
    </svg>
  );
}
