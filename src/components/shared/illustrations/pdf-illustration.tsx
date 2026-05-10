/**
 * PdfIllustration
 *
 * Animated PDF card stack illustration for the PDF Merger tool card.
 * Three PDF cards slide in from the left, arrow animates, merged doc
 * slides in from the right.
 */

export function PdfIllustration() {
  return (
    <svg
      viewBox="0 0 320 160"
      fill="none"
      className="w-full h-full"
      aria-hidden
    >
      <rect width="320" height="160" fill="#F5F0E5" />

      {/* PDF cards — slide in staggered */}
      {[0, 1, 2].map(i => (
        <g key={i} className={`ti-anim-sleft ti-d${i + 1}`}>
          <rect x={8 + i * 62} y="16" width="54" height="72" rx="5"
            fill="white" stroke="#D6D2C2" strokeWidth="1" />
          <rect x={8 + i * 62} y="16" width="54" height="18" rx="5"
            fill="#ECE6D4" />
          <rect x={8 + i * 62} y="25" width="54" height="9" fill="#ECE6D4" />
          <text x={35 + i * 62} y="29" fontSize="8" fill="#5C4E42"
            fontFamily="system-ui" textAnchor="middle" fontWeight="600">PDF</text>
          {[0, 1, 2, 3].map(j => (
            <rect key={j} x={14 + i * 62} y={42 + j * 10} width="42" height="5"
              rx="2" fill="#DDE0D0" />
          ))}
          <text x={35 + i * 62} y="100" fontSize="8" fill="#8B7B6B"
            fontFamily="system-ui" textAnchor="middle">doc-{i + 1}.pdf</text>
        </g>
      ))}

      {/* Animated arrow */}
      <g className="ti-anim-fade ti-d3">
        <path d="M200 52 L224 52" stroke="#7E8A6C" strokeWidth="2" strokeLinecap="round" />
        <path d="M218 46 L224 52 L218 58" stroke="#7E8A6C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Merged output — slides in from right */}
      <g className="ti-anim-sright ti-d4">
        <rect x="234" y="12" width="78" height="100" rx="6"
          fill="white" stroke="#3D4435" strokeWidth="1.5" />
        <rect x="234" y="12" width="78" height="24" rx="6" fill="#3D4435" />
        <rect x="234" y="26" width="78" height="10" fill="#3D4435" />
        <text x="273" y="28" fontSize="8" fill="#F5F0E5"
          fontFamily="system-ui" textAnchor="middle" fontWeight="700">MERGED</text>
        {[0, 1, 2, 3, 4].map(j => (
          <rect key={j} x="242" y={44 + j * 10} width="62" height="5" rx="2" fill="#DDE0D0" />
        ))}
        <rect x="242" y="100" width="62" height="8" rx="3" fill="#DDE0D0" />
        <text x="273" y="107" fontSize="7" fill="#3D4435"
          fontFamily="system-ui" textAnchor="middle">3 files · 12 pages</text>
      </g>

      {/* Drop zone */}
      <rect x="8" y="100" width="188" height="52" rx="6"
        fill="white" stroke="#DDE0D0" strokeWidth="1.5" strokeDasharray="4 3" />

      {/* Upload icon animation */}
      <g className="ti-anim-rise ti-d2">
        <path d="M96 118 L96 126 M90 122 L96 116 L102 122"
          stroke="#7E8A6C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="96" y="142" fontSize="9" fill="#8B7B6B"
          fontFamily="system-ui" textAnchor="middle">Drop PDFs here</text>
      </g>

      {/* Page count badge */}
      <g className="ti-anim-pop ti-d5">
        <rect x="8" y="122" width="60" height="16" rx="8" fill="#DDE0D0" />
        <text x="38" y="133" fontSize="8" fill="#3D4435"
          fontFamily="system-ui" textAnchor="middle" fontWeight="600">✓ Merged</text>
      </g>
    </svg>
  );
}
