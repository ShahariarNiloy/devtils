/**
 * ColorIllustration
 *
 * Animated color picker illustration for the Color Converter tool card.
 * The picker canvas hue rotates slowly (8s loop), format values update,
 * shades strip shifts color.
 */

export function ColorIllustration() {
  return (
    <svg
      viewBox="0 0 320 160"
      fill="none"
      className="w-full h-full"
      aria-hidden
    >
      <rect width="320" height="160" fill="#F5F0E5" />

      {/* Picker canvas — hue rotates via CSS filter */}
      <g className="ti-anim-hue">
        <defs>
          <linearGradient id="cc-sat" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="white" />
            <stop offset="1" stopColor="#C58E5E" />
          </linearGradient>
          <linearGradient id="cc-bri" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="transparent" />
            <stop offset="1" stopColor="#1A1A18" />
          </linearGradient>
        </defs>
        <rect x="8" y="8" width="108" height="88" rx="7" fill="url(#cc-sat)" />
        <rect x="8" y="8" width="108" height="88" rx="7" fill="url(#cc-bri)" />
      </g>

      {/* Picker handle */}
      <circle cx="80" cy="36" r="7" stroke="white" strokeWidth="2" fill="none" />
      <circle cx="80" cy="36" r="3" fill="white" opacity="0.6" />

      {/* Hue slider */}
      <defs>
        <linearGradient id="cc-hue" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#ff0000" />
          <stop offset="0.17" stopColor="#ffff00" />
          <stop offset="0.33" stopColor="#00ff00" />
          <stop offset="0.50" stopColor="#00ffff" />
          <stop offset="0.67" stopColor="#0000ff" />
          <stop offset="0.83" stopColor="#ff00ff" />
          <stop offset="1"    stopColor="#ff0000" />
        </linearGradient>
      </defs>
      <rect x="8" y="104" width="108" height="10" rx="5" fill="url(#cc-hue)" />
      <circle cx="76" cy="109" r="8" stroke="white" strokeWidth="2" fill="#C58E5E" className="ti-anim-hue" />

      {/* Current swatch */}
      <rect x="8" y="122" width="36" height="30" rx="6" fill="#C58E5E" className="ti-anim-hue" />

      {/* Color name */}
      <g className="ti-anim-rise ti-d1">
        <text x="50" y="134" fontSize="9" fill="#3D4435" fontFamily="system-ui" fontWeight="600">Burnished Clay</text>
        <text x="50" y="146" fontSize="8" fill="#8B7B6B" fontFamily="monospace">#C58E5E</text>
      </g>

      {/* Format rows — slide in from right */}
      <g className="ti-anim-sleft ti-d1">
        <rect x="124" y="8"  width="24" height="7" rx="2" fill="#DDE0D0" />
        <text x="152" y="15" fontSize="9" fill="#3D4435" fontFamily="monospace">#C58E5E</text>
        <rect x="124" y="22" width="24" height="7" rx="2" fill="#DDE0D0" />
        <text x="152" y="29" fontSize="9" fill="#3D4435" fontFamily="monospace">rgb(197, 142, 94)</text>
        <rect x="124" y="36" width="20" height="7" rx="2" fill="#DDE0D0" />
        <text x="148" y="43" fontSize="9" fill="#3D4435" fontFamily="monospace">hsl(28, 44%, 57%)</text>
        <rect x="124" y="50" width="28" height="7" rx="2" fill="#DDE0D0" />
        <text x="156" y="57" fontSize="9" fill="#3D4435" fontFamily="monospace">oklch(0.64 0.09 56)</text>
      </g>

      {/* Tailwind match */}
      <g className="ti-anim-rise ti-d2">
        <rect x="124" y="68" width="184" height="18" rx="6" fill="#ECE6D4" />
        <rect x="130" y="73" width="8" height="8" rx="2" fill="#C58E5E" />
        <text x="142" y="81" fontSize="9" fill="#3D4435" fontFamily="system-ui" fontWeight="600">orange-400 · nearest Tailwind</text>
      </g>

      {/* Shades strip */}
      <g className="ti-anim-fade ti-d3">
        {["#F5E8D8","#EDD4B4","#E0B880","#C58E5E","#A8724A","#8A5836","#6B3F24"].map((c, i) => (
          <rect key={i} x={124 + i * 26} y="96" width="22" height="22" rx={i === 0 ? "4 0 0 4" : i === 6 ? "0 4 4 0" : "0"}
            fill={c} />
        ))}
        <text x="216" y="130" fontSize="8" fill="#8B7B6B" fontFamily="system-ui" textAnchor="middle">Shades</text>
      </g>

      {/* WCAG */}
      <g className="ti-anim-pop ti-d4">
        <rect x="124" y="138" width="184" height="18" rx="6" fill="#DDE0D0" />
        <text x="216" y="150" fontSize="9" fill="#3D4435" fontFamily="system-ui" textAnchor="middle" fontWeight="600">WCAG · 3.2:1 · AA Large ✓</text>
      </g>
    </svg>
  );
}
