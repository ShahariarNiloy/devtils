import styles from "./hero-toolbox.module.css";

// ── Palette (SVG attrs can't reference CSS vars) ─────────────────────────────
const C = {
  // box structure
  boxTop: "#566048",
  boxBody: "#3D4435",
  boxDark: "#2C3127",
  boxDeep: "#1E2419",
  boxSeam: "#3A4030",
  boxHighlight: "#566048",
  boxInner: "#252B20",
  boxInnerTop: "#2C3127",
  // hardware
  latchSage: "#7E8A6C",
  latchDark: "#5A6450",
  handleDark: "#2C3127",
  handleHi: "#A8B89A",
  // clip hardware (clay = brass-like accent)
  clayDark: "#9B6B3F",
  clayHi: "#E0B88A",
  // palette
  sageOlive: "#7E8A6C",
  mistSage: "#DDE0D0",
  oliveInk: "#3D4435",
  clay: "#C58E5E",
  charcoal: "#1A1A18",
  surface: "#FBFAF5",
  surfaceSoft: "#ECE6D4",
  textFaint: "#6B7264",
  textMuted: "#8A9080",
  // tier badges
  freeBg: "#DDE0D0",
  freeText: "#3D4435",
  aiBg: "#D4D8C5",
  aiText: "#2C3127",
  proBg: "#EFE0CC",
  proText: "#8E5D36",
  // card header bands (distinct per tool)
  hdrJson: "#3D4435", // dark olive   — JSON Formatter (hero)
  hdrRegex: "#EFE0CC", // warm cream   — Regex Tester
  hdrColor: "#C0C9AE", // muted sage   — Color Converter
  hdrBase64: "#E8DFD0", // warm neutral — Base64
  hdrZod: "#D4D8C5", // cool sage    — Zod AI
} as const;

// ── ToolCard ──────────────────────────────────────────────────────────────────

interface CardProps {
  x: number;
  y: number;
  w: number;
  h: number;
  deg: number;
  origin: string;
  delayClass: string;
  headerFill: string;
  headerH?: number;
  children: React.ReactNode;
}

function ToolCard({
  x,
  y,
  w,
  h,
  deg,
  origin,
  delayClass,
  headerFill,
  headerH = 26,
  children,
}: CardProps) {
  return (
    <g className={`${styles.card} ${delayClass}`}>
      <g className={styles.cardHover}>
        <g transform={`rotate(${deg} ${origin.replace(" ", ",")})`}>
          {/* card shadow */}
          <rect
            x={x + 2}
            y={y + 4}
            width={w}
            height={h}
            rx={10}
            fill={C.charcoal}
            opacity="0.13"
            style={{ filter: "blur(6px)" }}
          />
          {/* card body */}
          <rect x={x} y={y} width={w} height={h} rx={10} fill={C.surface} />
          {/* header band */}
          <rect
            x={x}
            y={y}
            width={w}
            height={headerH}
            rx={10}
            fill={headerFill}
          />
          <rect
            x={x}
            y={y + headerH - 8}
            width={w}
            height={8}
            fill={headerFill}
          />
          {/* header bottom border */}
          <rect
            x={x}
            y={y + headerH}
            width={w}
            height={0.75}
            fill={C.charcoal}
            opacity="0.08"
          />
          {children}
        </g>
      </g>
    </g>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function HeroToolbox() {
  return (
    <div className="relative w-full flex justify-center items-end">
      <svg
        viewBox="0 0 420 400"
        className="w-full"
        style={{ overflow: "visible", display: "block" }}
        role="img"
        aria-label="Open devtils toolbox with developer tool cards"
      >
        <defs>
          {/* box depth gradients */}
          <linearGradient id="grad-box-v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.boxHighlight} stopOpacity="0.22" />
            <stop offset="28%" stopColor={C.boxHighlight} stopOpacity="0" />
            <stop offset="100%" stopColor={C.charcoal} stopOpacity="0.32" />
          </linearGradient>
          <linearGradient id="grad-box-h" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={C.charcoal} stopOpacity="0.26" />
            <stop offset="14%" stopColor={C.charcoal} stopOpacity="0" />
            <stop offset="86%" stopColor={C.charcoal} stopOpacity="0" />
            <stop offset="100%" stopColor={C.charcoal} stopOpacity="0.26" />
          </linearGradient>
          <linearGradient id="grad-lid-v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.handleHi} stopOpacity="0.14" />
            <stop offset="100%" stopColor={C.charcoal} stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id="grad-inner-v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.boxInnerTop} stopOpacity="1" />
            <stop offset="30%" stopColor={C.boxInner} stopOpacity="1" />
            <stop offset="100%" stopColor={C.boxDeep} stopOpacity="1" />
          </linearGradient>
          {/* ambient glow */}
          <radialGradient id="dtb-glow" cx="50%" cy="55%" r="50%">
            <stop offset="0%" stopColor={C.mistSage} stopOpacity="0.48" />
            <stop offset="100%" stopColor={C.mistSage} stopOpacity="0" />
          </radialGradient>
          {/* filters */}
          <filter id="dtb-box" x="-15%" y="-5%" width="130%" height="130%">
            <feDropShadow
              dx="0"
              dy="12"
              stdDeviation="18"
              floodColor={C.charcoal}
              floodOpacity="0.18"
            />
          </filter>
          <filter id="dtb-lid" x="-15%" y="-40%" width="130%" height="200%">
            <feDropShadow
              dx="0"
              dy="8"
              stdDeviation="13"
              floodColor={C.charcoal}
              floodOpacity="0.20"
            />
          </filter>
        </defs>

        {/* ── ambient atmosphere ── */}
        <ellipse cx="210" cy="308" rx="205" ry="135" fill="url(#dtb-glow)" />

        {/* ── ground shadow ── */}
        <ellipse
          cx="210"
          cy="394"
          rx="158"
          ry="8"
          fill={C.charcoal}
          opacity="0.09"
        />

        {/* ══ BOX BODY ══ */}
        <rect
          x="20"
          y="200"
          width="380"
          height="182"
          rx="15"
          fill={C.boxBody}
          filter="url(#dtb-box)"
        />
        {/* depth: vertical gradient */}
        <rect
          x="20"
          y="200"
          width="380"
          height="182"
          rx="15"
          fill="url(#grad-box-v)"
        />
        {/* depth: side shadows */}
        <rect
          x="20"
          y="200"
          width="380"
          height="182"
          rx="15"
          fill="url(#grad-box-h)"
        />
        {/* top edge highlight */}
        <rect
          x="20"
          y="200"
          width="380"
          height="4"
          rx="2"
          fill={C.boxHighlight}
        />

        {/* interior recess */}
        <rect
          x="33"
          y="212"
          width="354"
          height="162"
          rx="9"
          fill="url(#grad-inner-v)"
        />
        {/* interior rim highlight */}
        <rect
          x="33"
          y="212"
          width="354"
          height="2"
          rx="1"
          fill={C.sageOlive}
          opacity="0.18"
        />

        {/* centre divider */}
        <rect
          x="206"
          y="216"
          width="8"
          height="152"
          rx="3"
          fill={C.boxDark}
          opacity="0.55"
        />

        {/* corner rivets */}
        {([42, 378] as const).map((cx) =>
          ([262, 318] as const).map((cy) => (
            <circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r="4"
              fill={C.boxInner}
              stroke={C.boxHighlight}
              strokeWidth="1.3"
            />
          ))
        )}

        {/* top latch */}
        <rect
          x="176"
          y="204"
          width="70"
          height="15"
          rx="7"
          fill={C.latchSage}
        />
        <rect x="186" y="208" width="48" height="8" rx="4" fill={C.latchDark} />
        <circle
          cx="210"
          cy="212"
          r="3.2"
          fill={C.oliveInk}
          stroke={C.latchSage}
          strokeWidth="1"
        />

        {/* foot */}
        <rect x="20" y="372" width="380" height="14" rx="8" fill={C.boxDark} />

        {/* ══ CLIPS — sit at the lid/box seam, open before the lid lifts ══ */}

        {/* left clip hook */}
        <g className={styles.clipL}>
          <rect x="102" y="208" width="12" height="20" rx="3.5" fill={C.clay} />
          <rect
            x="103"
            y="209"
            width="4"
            height="16"
            rx="1.5"
            fill={C.clayHi}
            opacity="0.26"
          />
          <rect
            x="102"
            y="224"
            width="12"
            height="4"
            rx="2"
            fill={C.clayDark}
            opacity="0.35"
          />
        </g>

        {/* right clip hook */}
        <g className={styles.clipR}>
          <rect x="306" y="208" width="12" height="20" rx="3.5" fill={C.clay} />
          <rect
            x="313"
            y="209"
            width="4"
            height="16"
            rx="1.5"
            fill={C.clayHi}
            opacity="0.26"
          />
          <rect
            x="306"
            y="224"
            width="12"
            height="4"
            rx="2"
            fill={C.clayDark}
            opacity="0.35"
          />
        </g>

        {/* ══ LID ══ */}
        <g className={styles.lid}>
          {/* lid body */}
          <rect
            x="20"
            y="106"
            width="380"
            height="92"
            rx="15"
            fill={C.boxBody}
            filter="url(#dtb-lid)"
          />
          {/* lid depth */}
          <rect
            x="20"
            y="106"
            width="380"
            height="92"
            rx="15"
            fill="url(#grad-lid-v)"
          />
          {/* lid top highlight */}
          <rect
            x="20"
            y="106"
            width="380"
            height="5"
            rx="3"
            fill={C.boxHighlight}
          />

          {/* label plate */}
          <rect
            x="106"
            y="130"
            width="210"
            height="50"
            rx="8"
            fill={C.boxDeep}
            opacity="0.7"
          />
          <rect
            x="107"
            y="131"
            width="208"
            height="50"
            rx="7"
            fill={C.boxDark}
          />
          <text
            x="211"
            y="149"
            textAnchor="middle"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="10"
            fontWeight="500"
            fill={C.sageOlive}
            letterSpacing="2.2"
          >
            DEVELOPER UTILITY BELT
          </text>
          <text
            x="211"
            y="172"
            textAnchor="middle"
            fontFamily="Manrope,sans-serif"
            fontSize="20"
            fontWeight="800"
            fill={C.mistSage}
            letterSpacing="-0.5"
          >
            devtils
          </text>

          {/* lid rivets */}
          <circle
            cx="40"
            cy="150"
            r="4"
            fill={C.boxDeep}
            stroke={C.boxHighlight}
            strokeWidth="1.3"
          />
          <circle
            cx="380"
            cy="150"
            r="4"
            fill={C.boxDeep}
            stroke={C.boxHighlight}
            strokeWidth="1.3"
          />
          {/* seam */}
          <rect x="20" y="196" width="380" height="6" rx="2" fill={C.boxSeam} />

          {/* ── handle ── */}
          <rect
            x="144"
            y="98"
            width="40"
            height="16"
            rx="5"
            fill={C.oliveInk}
            stroke={C.boxHighlight}
            strokeWidth="1"
          />
          <rect
            x="236"
            y="98"
            width="40"
            height="16"
            rx="5"
            fill={C.oliveInk}
            stroke={C.boxHighlight}
            strokeWidth="1"
          />
          <path
            d="M165 101 C165 49,255 49,255 101"
            stroke={C.handleDark}
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M165 101 C165 49,255 49,255 101"
            stroke={C.latchSage}
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M173 87 C178 55,242 55,247 87"
            stroke={C.handleHi}
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.38"
          />
          <path
            d="M167 100 C167 53,253 53,253 100"
            stroke={C.latchDark}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.3"
          />

          {/* clip mount plates — inside lid so they paint on top and move with it */}
          <rect
            x="88"
            y="194"
            width="40"
            height="14"
            rx="5"
            fill={C.clayDark}
          />
          <rect x="89" y="195" width="38" height="12" rx="4" fill={C.clay} />
          <rect
            x="90"
            y="196"
            width="36"
            height="5"
            rx="2"
            fill={C.clayHi}
            opacity="0.22"
          />
          <circle cx="108" cy="201" r="2.8" fill={C.clayDark} />
          <rect
            x="292"
            y="194"
            width="40"
            height="14"
            rx="5"
            fill={C.clayDark}
          />
          <rect x="293" y="195" width="38" height="12" rx="4" fill={C.clay} />
          <rect
            x="294"
            y="196"
            width="36"
            height="5"
            rx="2"
            fill={C.clayHi}
            opacity="0.22"
          />
          <circle cx="312" cy="201" r="2.8" fill={C.clayDark} />
        </g>

        {/* ══ TOOL CARDS — back to front (paint order = z-order) ══ */}

        {/* ── c5: Color Converter  ·  far-left  ·  -9° ── */}
        <ToolCard
          x={30}
          y={222}
          w={110}
          h={96}
          deg={-9}
          origin="85 334"
          delayClass={styles.d1}
          headerFill={C.hdrColor}
        >
          {/* header: 3 color circles + label */}
          <circle cx="46" cy="235" r="6.5" fill={C.clay} />
          <circle cx="59" cy="235" r="6.5" fill={C.sageOlive} />
          <circle cx="72" cy="235" r="6.5" fill={C.oliveInk} />
          <text
            x="82"
            y="239"
            fontFamily="Manrope,sans-serif"
            fontSize="7"
            fontWeight="700"
            fill={C.oliveInk}
          >
            Color
          </text>

          {/* large swatch */}
          <circle cx="55" cy="268" r="17" fill={C.clay} />
          <circle cx="50" cy="263" r="6" fill="white" opacity="0.14" />

          {/* hex + format labels */}
          <text
            x="78"
            y="261"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="7"
            fontWeight="700"
            fill={C.clay}
          >
            #C58E5E
          </text>
          <text
            x="78"
            y="271"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="5.5"
            fill={C.textFaint}
          >
            HEX · RGB
          </text>
          <text
            x="78"
            y="280"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="5.5"
            fill={C.textFaint}
          >
            OKLCH · HSL
          </text>

          {/* FREE badge */}
          <rect x="78" y="286" width="28" height="10" rx="5" fill={C.freeBg} />
          <text
            x="92"
            y="293"
            textAnchor="middle"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="5.5"
            fill={C.freeText}
          >
            FREE
          </text>
        </ToolCard>

        {/* ── c4: Base64  ·  far-right  ·  +8° ── */}
        <ToolCard
          x={280}
          y={218}
          w={114}
          h={96}
          deg={8}
          origin="337 330"
          delayClass={styles.d2}
          headerFill={C.hdrBase64}
        >
          {/* header: == glyph + title */}
          <text
            x="292"
            y="235"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="12"
            fontWeight="700"
            fill={C.clay}
          >
            ==
          </text>
          <text
            x="317"
            y="232"
            fontFamily="Manrope,sans-serif"
            fontSize="7.5"
            fontWeight="700"
            fill={C.oliveInk}
          >
            Base64
          </text>
          <text
            x="317"
            y="241"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="5.5"
            fill={C.textFaint}
          >
            Encode · Decode
          </text>

          {/* encode row */}
          <text
            x="292"
            y="254"
            fontFamily="Manrope,sans-serif"
            fontSize="5"
            fill={C.textMuted}
            letterSpacing="0.5"
          >
            INPUT
          </text>
          <rect
            x="292"
            y="257"
            width="96"
            height="13"
            rx="3"
            fill={C.surfaceSoft}
          />
          <text
            x="296"
            y="266"
            fontFamily="Manrope,sans-serif"
            fontSize="6"
            fill={C.oliveInk}
          >
            Hello World
          </text>

          {/* arrow */}
          <text
            x="334"
            y="278"
            textAnchor="middle"
            fontFamily="Manrope,sans-serif"
            fontSize="8"
            fill={C.clay}
          >
            ↓
          </text>

          {/* decode row */}
          <text
            x="292"
            y="282"
            fontFamily="Manrope,sans-serif"
            fontSize="5"
            fill={C.textMuted}
            letterSpacing="0.5"
          >
            OUTPUT
          </text>
          <rect
            x="292"
            y="285"
            width="96"
            height="13"
            rx="3"
            fill={C.boxInner}
          />
          <text
            x="296"
            y="294"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="5.5"
            fill={C.sageOlive}
          >
            SGVsbG8gV29ybGQ=
          </text>

          {/* badge */}
          <rect x="292" y="302" width="28" height="10" rx="5" fill={C.freeBg} />
          <text
            x="306"
            y="309"
            textAnchor="middle"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="5.5"
            fill={C.freeText}
          >
            FREE
          </text>
        </ToolCard>

        {/* ── c3: Regex Tester  ·  left-of-center  ·  -3° ── */}
        <ToolCard
          x={96}
          y={206}
          w={122}
          h={102}
          deg={-3}
          origin="157 322"
          delayClass={styles.d3}
          headerFill={C.hdrRegex}
        >
          {/* header: .* glyph + title */}
          <text
            x="109"
            y="223"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="14"
            fontWeight="700"
            fill={C.clay}
          >
            .*
          </text>
          <text
            x="133"
            y="222"
            fontFamily="Manrope,sans-serif"
            fontSize="8"
            fontWeight="700"
            fill={C.oliveInk}
          >
            Regex Tester
          </text>

          {/* pattern input */}
          <rect
            x="100"
            y="233"
            width="110"
            height="14"
            rx="3.5"
            fill={C.surfaceSoft}
            stroke={C.mistSage}
            strokeWidth="0.7"
          />
          <text
            x="104"
            y="243"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="6"
            fill={C.oliveInk}
          >
            /hello|world/gi
          </text>

          {/* match count */}
          <text
            x="100"
            y="257"
            fontFamily="Manrope,sans-serif"
            fontSize="5.5"
            fill={C.textFaint}
          >
            2 matches found
          </text>

          {/* match highlights */}
          <rect
            x="100"
            y="260"
            width="27"
            height="11"
            rx="2.5"
            fill={C.clay}
            opacity="0.18"
          />
          <text
            x="113.5"
            y="267.5"
            textAnchor="middle"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="6"
            fill={C.clay}
          >
            hello
          </text>
          <rect
            x="133"
            y="260"
            width="27"
            height="11"
            rx="2.5"
            fill={C.clay}
            opacity="0.18"
          />
          <text
            x="146.5"
            y="267.5"
            textAnchor="middle"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="6"
            fill={C.clay}
          >
            world
          </text>

          {/* badges row */}
          <rect x="100" y="278" width="28" height="10" rx="5" fill={C.freeBg} />
          <text
            x="114"
            y="285"
            textAnchor="middle"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="5.5"
            fill={C.freeText}
          >
            FREE
          </text>
          <rect
            x="133"
            y="278"
            width="22"
            height="10"
            rx="5"
            fill={C.surfaceSoft}
          />
          <text
            x="144"
            y="285"
            textAnchor="middle"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="5.5"
            fill={C.oliveInk}
          >
            gi
          </text>
        </ToolCard>

        {/* ── c2: Zod from JSON  ·  right-of-center  ·  +4° ── */}
        <ToolCard
          x={222}
          y={200}
          w={126}
          h={102}
          deg={4}
          origin="285 318"
          delayClass={styles.d4}
          headerFill={C.hdrZod}
        >
          {/* header: ✦ + title + badges */}
          <text
            x="235"
            y="219"
            fontFamily="Manrope,sans-serif"
            fontSize="13"
            fill={C.oliveInk}
            opacity="0.7"
          >
            ✦
          </text>
          <text
            x="252"
            y="218"
            fontFamily="Manrope,sans-serif"
            fontSize="8"
            fontWeight="700"
            fill={C.aiText}
          >
            Zod from JSON
          </text>
          <rect x="252" y="221" width="20" height="9" rx="4.5" fill={C.aiBg} />
          <text
            x="262"
            y="227"
            textAnchor="middle"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="5.5"
            fill={C.aiText}
          >
            AI
          </text>

          {/* dark code block */}
          <rect
            x="230"
            y="230"
            width="110"
            height="54"
            rx="5"
            fill={C.boxDeep}
          />
          <rect
            x="230"
            y="230"
            width="110"
            height="3"
            rx="2"
            fill={C.sageOlive}
            opacity="0.35"
          />
          <text
            x="235"
            y="244"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="6.5"
            fill={C.sageOlive}
          >
            z.object{"({"}
          </text>
          <text
            x="235"
            y="255"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="5.5"
            fill={C.mistSage}
            opacity="0.65"
          >
            {"  name: z.string(),"}
          </text>
          <text
            x="235"
            y="265"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="5.5"
            fill={C.mistSage}
            opacity="0.65"
          >
            {"  tools: z.number()"}
          </text>
          <text
            x="235"
            y="276"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="6.5"
            fill={C.sageOlive}
          >
            {"});"}
          </text>

          {/* badges */}
          <rect x="230" y="290" width="28" height="10" rx="5" fill={C.proBg} />
          <text
            x="244"
            y="297"
            textAnchor="middle"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="5.5"
            fill={C.proText}
          >
            PRO
          </text>
          <text
            x="264"
            y="297"
            fontFamily="Manrope,sans-serif"
            fontSize="5.5"
            fill={C.textFaint}
          >
            AI-generated schema
          </text>
        </ToolCard>

        {/* ── c1: JSON Formatter  ·  front-center  ·  0°  (hero card) ── */}
        <ToolCard
          x={148}
          y={172}
          w={142}
          h={122}
          deg={0}
          origin="219 302"
          delayClass={styles.d5}
          headerFill={C.hdrJson}
          headerH={30}
        >
          {/* header: icon chip + title + sub */}
          <rect
            x="160"
            y="181"
            width="19"
            height="19"
            rx="4.5"
            fill={C.sageOlive}
            opacity="0.22"
          />
          <text
            x="163"
            y="194"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="9.5"
            fontWeight="600"
            fill={C.mistSage}
          >
            {"{}"}
          </text>
          <text
            x="185"
            y="191"
            fontFamily="Manrope,sans-serif"
            fontSize="8.5"
            fontWeight="700"
            fill={C.mistSage}
          >
            JSON Formatter
          </text>
          <text
            x="185"
            y="201"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="5.5"
            fill={C.sageOlive}
            letterSpacing="0.5"
          >
            NO.01 · JSON
          </text>

          {/* syntax-highlighted code lines */}
          {/* line 1: { */}
          <text
            x="162"
            y="220"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="7.5"
            fill={C.oliveInk}
            opacity="0.7"
          >
            {"{"}
          </text>
          {/* line 2: "name": "devtils" */}
          <rect
            x="170"
            y="224"
            width="2"
            height="38"
            rx="1"
            fill={C.mistSage}
            opacity="0.15"
          />
          <rect
            x="175"
            y="225"
            width="30"
            height="5.5"
            rx="1.5"
            fill={C.textMuted}
            opacity="0.55"
          />
          <rect
            x="209"
            y="225"
            width="22"
            height="5.5"
            rx="1.5"
            fill={C.clay}
            opacity="0.75"
          />
          {/* line 3: "version": "1.0" */}
          <rect
            x="175"
            y="235"
            width="24"
            height="5.5"
            rx="1.5"
            fill={C.textMuted}
            opacity="0.55"
          />
          <rect
            x="203"
            y="235"
            width="14"
            height="5.5"
            rx="1.5"
            fill={C.clay}
            opacity="0.75"
          />
          {/* line 4: "tools": 42 */}
          <rect
            x="175"
            y="245"
            width="20"
            height="5.5"
            rx="1.5"
            fill={C.textMuted}
            opacity="0.55"
          />
          <rect
            x="199"
            y="245"
            width="12"
            height="5.5"
            rx="1.5"
            fill={C.sageOlive}
            opacity="0.85"
          />
          {/* line 5: } */}
          <text
            x="162"
            y="260"
            fontFamily="'JetBrains Mono',monospace"
            fontSize="7.5"
            fill={C.oliveInk}
            opacity="0.7"
          >
            {"}"}
          </text>

          {/* action buttons */}
          <rect
            x="162"
            y="267"
            width="44"
            height="15"
            rx="7.5"
            fill={C.oliveInk}
          />
          <text
            x="184"
            y="277"
            textAnchor="middle"
            fontFamily="Manrope,sans-serif"
            fontSize="7"
            fontWeight="700"
            fill={C.mistSage}
          >
            Format
          </text>
          <rect
            x="211"
            y="267"
            width="36"
            height="15"
            rx="7.5"
            fill={C.surfaceSoft}
          />
          <text
            x="229"
            y="277"
            textAnchor="middle"
            fontFamily="Manrope,sans-serif"
            fontSize="7"
            fontWeight="600"
            fill={C.oliveInk}
          >
            Minify
          </text>
          <rect
            x="252"
            y="267"
            width="28"
            height="15"
            rx="7.5"
            fill={C.surfaceSoft}
          />
          <text
            x="266"
            y="277"
            textAnchor="middle"
            fontFamily="Manrope,sans-serif"
            fontSize="7"
            fontWeight="600"
            fill={C.oliveInk}
          >
            Diff
          </text>
        </ToolCard>

        {/* ══ FRONT PANEL — redrawn over card bottoms for depth ══ */}
        <rect
          x="20"
          y="362"
          width="380"
          height="6"
          fill={C.boxHighlight}
          opacity="0.6"
        />
        <rect x="20" y="366" width="380" height="16" fill={C.boxBody} />
        {/* depth overlay on front panel */}
        <rect x="20" y="366" width="380" height="16" fill="url(#grad-box-h)" />
        {/* front latch */}
        <rect
          x="174"
          y="372"
          width="72"
          height="14"
          rx="7"
          fill={C.boxInner}
          stroke={C.boxHighlight}
          strokeWidth="1"
        />
        <rect
          x="185"
          y="376"
          width="48"
          height="7"
          rx="3.5"
          fill={C.oliveInk}
        />
        <circle
          cx="209"
          cy="380"
          r="3"
          fill={C.latchDark}
          stroke={C.latchSage}
          strokeWidth="0.9"
        />
      </svg>
    </div>
  );
}
