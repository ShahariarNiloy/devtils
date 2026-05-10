/**
 * RegexIllustration
 *
 * Animated regex tester illustration for the Regex Tester tool card.
 * Cursor blinks in the regex input, then match highlights sweep across
 * the test string one by one.
 */

export function RegexIllustration() {
  return (
    <svg
      viewBox="0 0 320 160"
      fill="none"
      className="w-full h-full"
      aria-hidden
    >
      <rect width="320" height="160" fill="#F5F0E5" />

      {/* Regex input box */}
      <rect x="8" y="8" width="248" height="26" rx="6" fill="white" stroke="#D6D2C2" strokeWidth="1" />
      <text x="16" y="25" fontSize="11" fill="#7E8A6C" fontFamily="monospace">/</text>
      <text x="22" y="25" fontSize="11" fill="#C58E5E" fontFamily="monospace">^[a-z0-9._%+-]+</text>
      <text x="22" y="25" fontSize="11" fill="#3D4435" fontFamily="monospace" dy="0" dx="108">@</text>
      <text x="22" y="25" fontSize="11" fill="#C58E5E" fontFamily="monospace" dy="0" dx="118">[a-z0-9.-]+</text>
      <text x="22" y="25" fontSize="11" fill="#7E8A6C" fontFamily="monospace" dy="0" dx="188">/i</text>

      {/* Cursor in regex input */}
      <rect x="220" y="13" width="2" height="14" rx="1" fill="#3D4435" className="ti-anim-blink" />

      {/* Flag pills */}
      {["g", "i", "m"].map((f, i) => (
        <rect key={f} x={264 + i * 18} y="8" width="14" height="26" rx="4"
          fill={i === 1 ? "#3D4435" : "white"}
          stroke={i === 1 ? "#3D4435" : "#D6D2C2"} strokeWidth="1" />
      ))}
      {["g", "i", "m"].map((f, i) => (
        <text key={f} x={271 + i * 18} y="25" fontSize="9" textAnchor="middle"
          fill={i === 1 ? "#F5F0E5" : "#5C4E42"} fontFamily="monospace" fontWeight="600">{f}</text>
      ))}

      {/* Test string textarea */}
      <rect x="8" y="42" width="304" height="72" rx="6" fill="white" stroke="#D6D2C2" strokeWidth="1" />

      {/* Test lines */}
      <text x="16" y="62" fontSize="11" fill="#1A1A18" fontFamily="monospace">hello@world.com</text>
      <text x="16" y="80" fontSize="11" fill="#1A1A18" fontFamily="monospace">not-valid-email</text>
      <text x="16" y="98" fontSize="11" fill="#1A1A18" fontFamily="monospace">dev@toolbox.io</text>

      {/* Match highlight sweeps — line 1 */}
      <rect
        x="16" y="51" width="114" height="14" rx="2" fill="#DDE0D0" opacity="0.8"
        className="ti-anim-sweep ti-d1"
      />
      {/* Match highlight — line 3 */}
      <rect
        x="16" y="87" width="98" height="14" rx="2" fill="#DDE0D0" opacity="0.8"
        className="ti-anim-sweep ti-d3"
      />

      {/* Match count badge */}
      <g className="ti-anim-pop ti-d2">
        <rect x="260" y="48" width="44" height="18" rx="9" fill="#DDE0D0" />
        <text x="282" y="60" fontSize="9" fill="#3D4435" fontFamily="system-ui" textAnchor="middle" fontWeight="700">2 matches</text>
      </g>

      {/* Results panel */}
      <g className="ti-anim-rise ti-d4">
        <rect x="8" y="122" width="304" height="32" rx="6" fill="#ECE6D4" />
        <rect x="14" y="128" width="8" height="8" rx="2" fill="#DDE0D0" />
        <text x="26" y="136" fontSize="9" fill="#3D4435" fontFamily="monospace">{'[0] "hello@world.com"'}</text>
        <rect x="160" y="128" width="8" height="8" rx="2" fill="#DDE0D0" />
        <text x="172" y="136" fontSize="9" fill="#3D4435" fontFamily="monospace">{'[1] "dev@toolbox.io"'}</text>
        <rect x="14" y="140" width="136" height="6" rx="2" fill="#DDE0D0" />
        <rect x="160" y="140" width="100" height="6" rx="2" fill="#DDE0D0" />
      </g>
    </svg>
  );
}
