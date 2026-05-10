/**
 * ZodIllustration
 *
 * Animated schema generator illustration for the Zod from JSON tool card.
 * JSON keys appear on the left, Zod types appear on the right with a slight
 * delay, AI sparkle pulses in the middle.
 */

export function ZodIllustration() {
  return (
    <svg
      viewBox="0 0 320 160"
      fill="none"
      className="w-full h-full"
      aria-hidden
    >
      <rect width="320" height="160" fill="#F5F0E5" />

      {/* Input JSON panel */}
      <rect x="8" y="8" width="128" height="144" rx="6"
        fill="white" stroke="#D6D2C2" strokeWidth="1" />
      <text x="16" y="26" fontSize="9" fill="#7E8A6C" fontFamily="monospace">{"{"}</text>

      {/* JSON lines appear staggered */}
      <g className="ti-anim-l1">
        <text x="24" y="42" fontSize="9" fill="#C58E5E" fontFamily="monospace">{'"name":'}</text>
        <text x="72" y="42" fontSize="9" fill="#3D4435" fontFamily="monospace">{'"Alice"'}</text>
      </g>
      <g className="ti-anim-l2 ti-d1">
        <text x="24" y="58" fontSize="9" fill="#C58E5E" fontFamily="monospace">{'"age":'}</text>
        <text x="66" y="58" fontSize="9" fill="#8E5D36" fontFamily="monospace">30</text>
      </g>
      <g className="ti-anim-l3 ti-d2">
        <text x="24" y="74" fontSize="9" fill="#C58E5E" fontFamily="monospace">{'"email":'}</text>
        <text x="74" y="74" fontSize="9" fill="#3D4435" fontFamily="monospace">{'"a@b.io"'}</text>
      </g>
      <g className="ti-anim-l4 ti-d3">
        <text x="24" y="90" fontSize="9" fill="#C58E5E" fontFamily="monospace">{'"active":'}</text>
        <text x="78" y="90" fontSize="9" fill="#7E8A6C" fontFamily="monospace">true</text>
      </g>
      <g className="ti-anim-l5 ti-d4">
        <text x="24" y="106" fontSize="9" fill="#C58E5E" fontFamily="monospace">{'"role":'}</text>
        <text x="68" y="106" fontSize="9" fill="#3D4435" fontFamily="monospace">{'"admin"'}</text>
      </g>
      <text x="16" y="122" fontSize="9" fill="#7E8A6C" fontFamily="monospace">{"}"}</text>

      {/* AI transform arrow — pulses */}
      <g className="ti-anim-pulse">
        <rect x="144" y="60" width="28" height="28" rx="10" fill="#D4D8C5" />
        <text x="158" y="79" fontSize="16" fill="#2C3127"
          fontFamily="system-ui" textAnchor="middle">✦</text>
      </g>
      <text x="158" y="100" fontSize="7" fill="#5C4E42"
        fontFamily="system-ui" textAnchor="middle" fontWeight="600">AI</text>

      {/* Zod output panel */}
      <rect x="180" y="8" width="132" height="144" rx="6"
        fill="white" stroke="#D6D2C2" strokeWidth="1" />

      {/* Zod lines — delayed appearance */}
      <g className="ti-anim-l1 ti-d2">
        <text x="188" y="24" fontSize="8" fill="#5C4E42" fontFamily="monospace">const schema =</text>
        <text x="188" y="36" fontSize="8" fill="#3D4435" fontFamily="monospace">z.object{"({"}</text>
      </g>
      <g className="ti-anim-l2 ti-d3">
        <text x="196" y="50" fontSize="8" fill="#C58E5E" fontFamily="monospace">name:</text>
        <text x="228" y="50" fontSize="8" fill="#3D4435" fontFamily="monospace">z.string(),</text>
      </g>
      <g className="ti-anim-l3 ti-d3">
        <text x="196" y="64" fontSize="8" fill="#C58E5E" fontFamily="monospace">age:</text>
        <text x="224" y="64" fontSize="8" fill="#8E5D36" fontFamily="monospace">z.number(),</text>
      </g>
      <g className="ti-anim-l4 ti-d4">
        <text x="196" y="78" fontSize="8" fill="#C58E5E" fontFamily="monospace">email:</text>
        <text x="232" y="78" fontSize="8" fill="#3D4435" fontFamily="monospace">z.string()</text>
        <text x="204" y="90" fontSize="8" fill="#3D4435" fontFamily="monospace">.email(),</text>
      </g>
      <g className="ti-anim-l5 ti-d5">
        <text x="196" y="104" fontSize="8" fill="#C58E5E" fontFamily="monospace">active:</text>
        <text x="240" y="104" fontSize="8" fill="#7E8A6C" fontFamily="monospace">z.boolean(),</text>
        <text x="196" y="118" fontSize="8" fill="#C58E5E" fontFamily="monospace">role:</text>
        <text x="224" y="118" fontSize="8" fill="#3D4435" fontFamily="monospace">z.string(),</text>
        <text x="188" y="132" fontSize="8" fill="#3D4435" fontFamily="monospace">{"});"}</text>
      </g>

      {/* Type export — pops in last */}
      <g className="ti-anim-pop ti-d6">
        <rect x="184" y="140" width="120" height="8" rx="3" fill="#D4D8C5" />
        <text x="244" y="147" fontSize="7" fill="#2C3127"
          fontFamily="system-ui" textAnchor="middle" fontWeight="600">✦ 5 types inferred</text>
      </g>
    </svg>
  );
}
