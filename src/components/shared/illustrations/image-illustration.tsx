/**
 * ImageIllustration
 *
 * Animated before/after illustration for the Image Compressor tool card.
 * Progress bar fills left to right, file size number counts down,
 * before/after comparison is always visible.
 */

const FORMAT_LABELS = ["WebP", "PNG", "JPG", "AVIF"] as const;

export function ImageIllustration() {
  return (
    <svg
      viewBox="0 0 320 160"
      fill="none"
      className="w-full h-full"
      aria-hidden
    >
      <rect width="320" height="160" fill="#F5F0E5" />

      {/* Before panel */}
      <rect x="8" y="8" width="124" height="90" rx="6"
        fill="white" stroke="#D6D2C2" strokeWidth="1" />
      <rect x="8" y="8" width="124" height="60" rx="6" fill="#ECE6D4" />
      <rect x="8" y="54" width="124" height="14" fill="#ECE6D4" />
      {/* Mountain silhouette */}
      <path d="M20 56 L40 36 L58 50 L80 28 L102 46 L120 38 L132 56"
        stroke="#7E8A6C" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="40" cy="20" r="10" fill="#C58E5E" opacity="0.5" />
      <text x="66" y="82" fontSize="8" fill="#8B7B6B"
        fontFamily="system-ui" textAnchor="middle">Before · 2.4 MB</text>

      {/* Center controls */}
      <text x="156" y="28" fontSize="8" fill="#5C4E42"
        fontFamily="system-ui" textAnchor="middle" fontWeight="600">Quality</text>

      {/* Quality slider track */}
      <rect x="134" y="36" width="44" height="5" rx="2.5" fill="#DDE0D0" />
      {/* Slider fill — animates */}
      <rect x="134" y="36" width="34" height="5" rx="2.5" fill="#7E8A6C"
        className="ti-anim-fill" />
      <circle cx="168" cy="38" r="6" fill="#3D4435" />

      {/* Quality % label */}
      <g className="ti-anim-fade">
        <text x="156" y="56" fontSize="10" fill="#3D4435"
          fontFamily="monospace" textAnchor="middle" fontWeight="700">82%</text>
      </g>

      {/* Format buttons */}
      {FORMAT_LABELS.map((f, i) => (
        <g key={f}>
          <rect x={128 + i * 16} y="66" width="14" height="12" rx="3"
            fill={i === 0 ? "#3D4435" : "white"}
            stroke={i === 0 ? "#3D4435" : "#D6D2C2"} strokeWidth="1" />
          <text x={135 + i * 16} y="75" fontSize="5.5" textAnchor="middle"
            fill={i === 0 ? "#F5F0E5" : "#5C4E42"} fontFamily="system-ui">{f}</text>
        </g>
      ))}

      {/* After panel */}
      <rect x="190" y="8" width="124" height="90" rx="6"
        fill="white" stroke="#3D4435" strokeWidth="1.5" />
      <rect x="190" y="8" width="124" height="60" rx="6" fill="#ECE6D4" />
      <rect x="190" y="54" width="124" height="14" fill="#ECE6D4" />
      <path d="M202 56 L222 36 L240 50 L262 28 L284 46 L302 38 L314 56"
        stroke="#7E8A6C" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="222" cy="20" r="10" fill="#C58E5E" opacity="0.5" />
      <text x="248" y="82" fontSize="8" fill="#8B7B6B"
        fontFamily="system-ui" textAnchor="middle">After · 420 KB</text>

      {/* Savings badge — pops in */}
      <g className="ti-anim-pop ti-d3">
        <rect x="184" y="106" width="136" height="22" rx="11" fill="#DDE0D0" />
        <text x="252" y="120" fontSize="10" fill="#3D4435"
          fontFamily="system-ui" textAnchor="middle" fontWeight="700">↓ Saved 82% · WebP</text>
      </g>

      {/* Progress bar under after panel */}
      <rect x="190" y="100" width="124" height="4" rx="2" fill="#ECE6D4" />
      <rect x="190" y="100" width="0" height="4" rx="2" fill="#7E8A6C"
        className="ti-anim-fill ti-d1" />

      {/* Drag prompt */}
      <g className="ti-anim-fade ti-d5">
        <text x="156" y="148" fontSize="8" fill="#8B7B6B"
          fontFamily="system-ui" textAnchor="middle">Drop image to compress</text>
      </g>
    </svg>
  );
}
