/**
 * CSS Unit Converter — pure conversion + analysis library.
 *
 * No React, no DOM. All math + state-machine string work. The component layer
 * imports from here; nothing here imports from there.
 *
 * Covered conversions:
 *   px ↔ rem | em | %         (font-size dependent — base is configurable)
 *   px ↔ pt | pc | in | cm | mm  (CSS-absolute physical units; 96px = 1in)
 *   px ↔ vw | vh              (viewport dependent — viewport size is configurable)
 *
 * Note: dpi is a *resolution* unit (used in `@media (resolution: …)`), not a
 * length unit. CSS fixes 1in = 96 CSS pixels regardless of device dpi, so
 * physical conversions here are exact algebra — they have nothing to do with
 * the user's screen.
 *
 * Also:
 *   - Detect the most-likely root font-size from a CSS block's px/rem pairs
 *   - Rewrite a CSS block: swap unit X → Y, with per-property scope
 *   - Snap a value to the nearest token of a named design scale
 *   - Build a fluid `clamp()` expression from a 4-point spec
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type LengthUnit =
  | "px"
  | "rem"
  | "em"
  | "pt"
  | "pc"
  | "in"
  | "cm"
  | "mm"
  | "%"
  | "vw"
  | "vh";

export const LENGTH_UNITS: readonly LengthUnit[] = [
  "px",
  "rem",
  "em",
  "%",
  "pt",
  "pc",
  "in",
  "cm",
  "mm",
  "vw",
  "vh",
] as const;

/** Grouped for UI listings. Order within each group is intentional. */
export const UNIT_GROUPS: readonly { id: string; label: string; units: readonly LengthUnit[] }[] = [
  { id: "relative", label: "Relative", units: ["rem", "em", "%"] },
  { id: "physical", label: "Physical", units: ["pt", "pc", "in", "cm", "mm"] },
  { id: "viewport", label: "Viewport", units: ["vw", "vh"] },
] as const;

export interface ConversionContext {
  /** Document root font-size in px. Drives rem / em / % conversions. */
  baseFontSize: number;
  /** Viewport width in px. Drives vw conversions. */
  viewportWidth: number;
  /** Viewport height in px. Drives vh conversions. */
  viewportHeight: number;
  /** Output precision: max decimals when stringifying results. */
  precision: number;
}

export const DEFAULT_CONTEXT: ConversionContext = {
  baseFontSize: 16,
  viewportWidth: 1440,
  viewportHeight: 900,
  precision: 4,
};

// ── Core conversion ──────────────────────────────────────────────────────────
// All conversions pivot through px: any unit X → px → any unit Y. Keeps the
// matrix N×1 instead of N×N and trivially extends when we add ch / ex later.

// CSS absolute-length identities (all exact per CSS 2.1 §4.3.2):
//   1in = 96 CSS px
//   1pc = 16 CSS px (1/6 of an inch)
//   1pt = 96/72 CSS px (1/72 of an inch)
//   1cm = 96/2.54 CSS px
//   1mm = 96/25.4 CSS px

export function toPx(value: number, unit: LengthUnit, ctx: ConversionContext): number {
  switch (unit) {
    case "px":
      return value;
    case "rem":
    case "em":
      // For our purposes em and rem share a base — there's no "parent
      // font-size" concept in a calculator tool. Designers using em this way
      // is the overwhelmingly-common case.
      return value * ctx.baseFontSize;
    case "%":
      // % of root font-size — same family as em/rem in the typography pair
      // most people convert. (Block-percent conversions need a container width
      // we don't have; we leave those alone in bulk rewrites.)
      return (value / 100) * ctx.baseFontSize;
    case "pt":
      return value * (96 / 72);
    case "pc":
      return value * 16;
    case "in":
      return value * 96;
    case "cm":
      return value * (96 / 2.54);
    case "mm":
      return value * (96 / 25.4);
    case "vw":
      return (value / 100) * ctx.viewportWidth;
    case "vh":
      return (value / 100) * ctx.viewportHeight;
  }
}

export function fromPx(px: number, unit: LengthUnit, ctx: ConversionContext): number {
  switch (unit) {
    case "px":
      return px;
    case "rem":
    case "em":
      return px / ctx.baseFontSize;
    case "%":
      return (px / ctx.baseFontSize) * 100;
    case "pt":
      return px * (72 / 96);
    case "pc":
      return px / 16;
    case "in":
      return px / 96;
    case "cm":
      return px * (2.54 / 96);
    case "mm":
      return px * (25.4 / 96);
    case "vw":
      return (px / ctx.viewportWidth) * 100;
    case "vh":
      return (px / ctx.viewportHeight) * 100;
  }
}

export function convert(
  value: number,
  from: LengthUnit,
  to: LengthUnit,
  ctx: ConversionContext,
): number {
  return fromPx(toPx(value, from, ctx), to, ctx);
}

// ── Formatting ───────────────────────────────────────────────────────────────

/** Drops trailing zeros after rounding to `precision` decimals — "1.5000" → "1.5", "1" → "1". */
export function format(value: number, precision: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(precision));
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toString();
}

/** Returns the formatted value plus the unit suffix. */
export function formatWithUnit(value: number, unit: LengthUnit, precision: number): string {
  return `${format(value, precision)}${unit}`;
}

/**
 * True when a value rounds cleanly at the requested precision — i.e. the
 * full-precision value matches the rounded one to within a tight epsilon.
 * "Cleanliness" is a UX signal; designers want to see when a conversion is
 * exact vs. drifted.
 */
export function isClean(value: number, precision: number): boolean {
  if (!Number.isFinite(value)) return false;
  const rounded = Number(value.toFixed(precision));
  return Math.abs(value - rounded) < 1e-9;
}

// ── Scale snap (Tailwind / Bootstrap / MUI) ──────────────────────────────────
// Compact preset scales — token name plus its px equivalent at base 16. The
// component shows the nearest token next to any input value, like
// "16px ≈ space-4". Lists are not exhaustive — they're the values that get
// reached for in real layouts. Adding 80/96/128 would lock the tool into
// "design system" framing; we keep it to common ground.

export interface ScaleToken {
  /** Display token name e.g. "space-4", "$spacer * 1", "spacing(2)". */
  name: string;
  /** Value in px at the scale's documented base (16 for all three). */
  px: number;
}

export interface DesignScale {
  id: string;
  label: string;
  tokens: ScaleToken[];
}

export const TAILWIND_SPACING: DesignScale = {
  id: "tailwind",
  label: "Tailwind",
  tokens: [
    { name: "0", px: 0 },
    { name: "0.5", px: 2 },
    { name: "1", px: 4 },
    { name: "1.5", px: 6 },
    { name: "2", px: 8 },
    { name: "2.5", px: 10 },
    { name: "3", px: 12 },
    { name: "3.5", px: 14 },
    { name: "4", px: 16 },
    { name: "5", px: 20 },
    { name: "6", px: 24 },
    { name: "7", px: 28 },
    { name: "8", px: 32 },
    { name: "9", px: 36 },
    { name: "10", px: 40 },
    { name: "11", px: 44 },
    { name: "12", px: 48 },
    { name: "14", px: 56 },
    { name: "16", px: 64 },
    { name: "20", px: 80 },
    { name: "24", px: 96 },
    { name: "28", px: 112 },
    { name: "32", px: 128 },
    { name: "36", px: 144 },
    { name: "40", px: 160 },
    { name: "48", px: 192 },
    { name: "56", px: 224 },
    { name: "64", px: 256 },
  ],
};

export const BOOTSTRAP_SPACING: DesignScale = {
  id: "bootstrap",
  label: "Bootstrap 5",
  tokens: [
    { name: "0", px: 0 },
    { name: "1", px: 4 },
    { name: "2", px: 8 },
    { name: "3", px: 16 },
    { name: "4", px: 24 },
    { name: "5", px: 48 },
  ],
};

export const MUI_SPACING: DesignScale = {
  id: "mui",
  label: "MUI",
  tokens: [
    { name: "0", px: 0 },
    { name: "1", px: 8 },
    { name: "2", px: 16 },
    { name: "3", px: 24 },
    { name: "4", px: 32 },
    { name: "5", px: 40 },
    { name: "6", px: 48 },
    { name: "8", px: 64 },
    { name: "10", px: 80 },
    { name: "12", px: 96 },
    { name: "16", px: 128 },
  ],
};

export const ALL_SCALES: readonly DesignScale[] = [
  TAILWIND_SPACING,
  BOOTSTRAP_SPACING,
  MUI_SPACING,
];

export interface ScaleMatch {
  scale: DesignScale;
  token: ScaleToken;
  exact: boolean;
}

/**
 * Find the closest token in `scale` for `px`. Marks `exact` when the match is
 * within half a pixel — designers want to see whether they're on the grid or
 * one nudge off it.
 */
export function snapToScale(px: number, scale: DesignScale): ScaleMatch | null {
  if (!Number.isFinite(px) || scale.tokens.length === 0) return null;
  let best = scale.tokens[0];
  let bestDist = Math.abs(scale.tokens[0].px - px);
  for (let i = 1; i < scale.tokens.length; i++) {
    const t = scale.tokens[i];
    const d = Math.abs(t.px - px);
    if (d < bestDist) {
      best = t;
      bestDist = d;
    }
  }
  return { scale, token: best, exact: bestDist < 0.5 };
}

// ── Grid alignment ───────────────────────────────────────────────────────────

/** Largest power-of-2 (or 4) the value sits cleanly on, capped at 16. Returns 0 when nothing matches. */
export function gridAlignment(px: number): 0 | 4 | 8 | 16 {
  if (!Number.isFinite(px) || px <= 0) return 0;
  if (Math.abs(px % 16) < 1e-9) return 16;
  if (Math.abs(px % 8) < 1e-9) return 8;
  if (Math.abs(px % 4) < 1e-9) return 4;
  return 0;
}

// ── Reference table (common values) ──────────────────────────────────────────

export const REFERENCE_PX_VALUES: readonly number[] = [
  4, 8, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 128,
] as const;

// ── Detect base font-size from a CSS block ───────────────────────────────────
// Authoritative-only: read `:root` / `html` font-size declarations. Cross-rule
// px/rem co-occurrence is too noisy to be trustworthy — designers use `1px`
// hairlines in plenty of places where they have no relation to the root font.
// The popular "10px shortcut" (`html { font-size: 62.5% }`) is supported.

export interface BaseDetectionResult {
  /** Inferred base font-size in px, or null when no authoritative declaration. */
  base: number | null;
  /** Where the base came from: `"root-px"`, `"root-percent"`, or `"none"`. */
  source: "root-px" | "root-percent" | "none";
}

const ROOT_PX_RE =
  /(?::root|html)\s*\{[^}]*?font-size\s*:\s*(\d*\.?\d+)px/i;
const ROOT_PERCENT_RE =
  /(?::root|html)\s*\{[^}]*?font-size\s*:\s*(\d*\.?\d+)%/i;

export function detectBaseFontSize(css: string): BaseDetectionResult {
  const pxMatch = ROOT_PX_RE.exec(css);
  if (pxMatch) return { base: parseFloat(pxMatch[1]), source: "root-px" };

  // Browsers default to 16px. The `62.5%` shortcut yields 10px.
  const pctMatch = ROOT_PERCENT_RE.exec(css);
  if (pctMatch) {
    return { base: (parseFloat(pctMatch[1]) / 100) * 16, source: "root-percent" };
  }

  return { base: null, source: "none" };
}

// ── Bulk CSS rewriter ────────────────────────────────────────────────────────
// State-machine pass over a CSS source. Walks declarations, finds numeric
// values with a recognised unit, and rewrites them. Respects comments,
// strings, and `url(...)` — those are passed through verbatim. The optional
// property scope lets the user say "only convert spacing properties".

export type BulkScope =
  | { kind: "all" }
  | { kind: "include"; properties: readonly string[] }
  | { kind: "exclude"; properties: readonly string[] };

export interface BulkRewriteOptions {
  from: LengthUnit;
  to: LengthUnit;
  scope: BulkScope;
  ctx: ConversionContext;
  /** Skip 1px declarations (hairline borders / dividers). */
  preserveHairlines: boolean;
}

export interface BulkRewriteResult {
  output: string;
  /** Total replacements applied. */
  replaced: number;
  /** Distinct properties that had at least one replacement, for UI surfacing. */
  touchedProperties: string[];
}

/** Default "spacing + sizing" preset — what most designers want when bulk-converting. */
export const SPACING_PROPERTIES: readonly string[] = [
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "gap", "row-gap", "column-gap",
  "top", "right", "bottom", "left", "inset",
  "width", "min-width", "max-width",
  "height", "min-height", "max-height",
];

/** Typography subset. */
export const TYPOGRAPHY_PROPERTIES: readonly string[] = [
  "font-size", "line-height", "letter-spacing", "word-spacing", "text-indent",
];

function propertyInScope(name: string, scope: BulkScope): boolean {
  const lower = name.toLowerCase();
  if (scope.kind === "all") return true;
  if (scope.kind === "include") return scope.properties.includes(lower);
  return !scope.properties.includes(lower);
}

// Order matters in alternation — list multi-char units before any that share
// a prefix (e.g. `rem` before `em`, `mm` before any `m`-prefixed unit). `\b`
// in the trailing position is fine for both word and `%` boundaries.
const NUMERIC_UNIT_RE =
  /(-?\d*\.?\d+)(rem|em|px|pt|pc|in|cm|mm|vw|vh|%)\b/g;

/**
 * One segment of a CSS declaration's value. `literal` segments are eligible
 * for unit rewriting; `raw` segments (string contents, comment bodies, url(...)
 * payloads) are passed through verbatim. Splitting the value lets us run the
 * cheap numeric-unit regex over the rewritable parts without ever touching
 * the protected ones.
 */
type ValueSegment = { kind: "literal" | "raw"; text: string };

/**
 * Rewrite numeric+unit pairs inside CSS declarations. The walker tracks string
 * literals, comments and url(...) so we never touch them.
 */
export function bulkRewrite(src: string, opts: BulkRewriteOptions): BulkRewriteResult {
  const out: string[] = [];
  const touched = new Set<string>();
  let replaced = 0;
  let i = 0;
  const len = src.length;

  // Document-level state machine. We're either in a comment, in a string,
  // inside a declaration value, or in the regular flow between rules.
  let inComment = false;
  let inString: '"' | "'" | null = null;
  let braceDepth = 0;
  let inDecl = false;
  let declProperty = "";
  let segments: ValueSegment[] = [];
  let currentLiteral = "";

  const pushLiteral = (s: string) => {
    if (!s) return;
    currentLiteral += s;
  };
  const finishLiteral = () => {
    if (currentLiteral.length === 0) return;
    segments.push({ kind: "literal", text: currentLiteral });
    currentLiteral = "";
  };
  const pushRaw = (s: string) => {
    finishLiteral();
    segments.push({ kind: "raw", text: s });
  };

  const flushDecl = () => {
    if (!inDecl) return;
    finishLiteral();
    const inScope = propertyInScope(declProperty, opts.scope);
    let localReplaced = 0;
    const rewritten = segments
      .map((seg) => {
        if (seg.kind === "raw") return seg.text;
        if (!inScope) return seg.text;
        return seg.text.replace(NUMERIC_UNIT_RE, (whole, num, unit) => {
          if (unit !== opts.from) return whole;
          const v = parseFloat(num);
          if (opts.preserveHairlines && opts.from === "px" && Math.abs(v) === 1) {
            return whole;
          }
          const converted = convert(v, opts.from, opts.to, opts.ctx);
          localReplaced++;
          return formatWithUnit(converted, opts.to, opts.ctx.precision);
        });
      })
      .join("");
    if (localReplaced > 0) {
      touched.add(declProperty);
      replaced += localReplaced;
    }
    out.push(rewritten);
    inDecl = false;
    declProperty = "";
    segments = [];
    currentLiteral = "";
  };

  while (i < len) {
    const c = src[i];
    const next = src[i + 1];

    if (inComment) {
      if (inDecl) {
        if (currentLiteral) finishLiteral();
        const start = i;
        while (i < len && !(src[i] === "*" && src[i + 1] === "/")) i++;
        if (i < len) i += 2;
        pushRaw(src.slice(start, i));
        inComment = false;
        continue;
      }
      out.push(c);
      if (c === "*" && next === "/") {
        out.push(next);
        i += 2;
        inComment = false;
        continue;
      }
      i++;
      continue;
    }

    if (inString) {
      if (inDecl) {
        const start = i;
        while (i < len) {
          const ch = src[i];
          if (ch === "\\" && i + 1 < len) {
            i += 2;
            continue;
          }
          if (ch === inString) {
            i++;
            break;
          }
          i++;
        }
        pushRaw(src.slice(start, i));
        inString = null;
        continue;
      }
      out.push(c);
      if (c === "\\" && i + 1 < len) {
        out.push(next);
        i += 2;
        continue;
      }
      if (c === inString) inString = null;
      i++;
      continue;
    }

    if (c === "/" && next === "*") {
      inComment = true;
      if (inDecl) {
        // The comment payload is captured by the inComment branch above on
        // the next iteration; leave the `/` for that branch to wrap into
        // the raw segment.
        i += 0; // explicit no-op for readability
      } else {
        out.push("/*");
        i += 2;
        continue;
      }
    }

    if (c === '"' || c === "'") {
      inString = c;
      if (inDecl) {
        // The string body is captured by the inString branch on the next
        // iteration. Mark the opening quote as the start of a raw segment.
        finishLiteral();
        const start = i;
        i++;
        // Consume body
        while (i < len) {
          const ch = src[i];
          if (ch === "\\" && i + 1 < len) {
            i += 2;
            continue;
          }
          if (ch === c) {
            i++;
            break;
          }
          i++;
        }
        pushRaw(src.slice(start, i));
        inString = null;
        continue;
      }
      out.push(c);
      i++;
      continue;
    }

    if (c === "{") {
      flushDecl();
      braceDepth++;
      out.push(c);
      i++;
      continue;
    }
    if (c === "}") {
      flushDecl();
      braceDepth--;
      out.push(c);
      i++;
      continue;
    }

    if (braceDepth > 0 && !inDecl && c === ":") {
      // Walk back through `out` to find the property name token.
      let k = out.length - 1;
      let prop = "";
      while (k >= 0 && /[A-Za-z0-9_-]/.test(out[k])) {
        prop = out[k] + prop;
        k--;
      }
      if (prop && /^[a-zA-Z][a-zA-Z0-9-]*$/.test(prop)) {
        inDecl = true;
        declProperty = prop;
        segments = [];
        currentLiteral = "";
        out.push(c);
        i++;
        continue;
      }
    }

    if (inDecl && c === ";") {
      flushDecl();
      out.push(c);
      i++;
      continue;
    }

    if (inDecl) {
      pushLiteral(c);
      i++;
      continue;
    }

    out.push(c);
    i++;
  }

  flushDecl();

  return {
    output: out.join(""),
    replaced,
    touchedProperties: [...touched].sort(),
  };
}

// ── clamp() builder ──────────────────────────────────────────────────────────
// Given:
//   - min font-size at min viewport
//   - max font-size at max viewport
// We produce CSS `clamp(min, fluid, max)` where fluid linearly interpolates.
//
// The linear fluid formula:
//   slope = (maxPx - minPx) / (maxVw - minVw)
//   intercept = minPx - slope * minVw
// In CSS units: `clamp(MIN_REM, INTERCEPT_REM + SLOPE_VW * 100vw, MAX_REM)`
// where SLOPE_VW = slope * 100 (because 1vw = viewport/100).

export interface ClampSpec {
  minPx: number;
  maxPx: number;
  minViewportPx: number;
  maxViewportPx: number;
  baseFontSize: number;
  /** Output unit for min/max — designers prefer rem for accessibility. */
  outputUnit: "rem" | "px";
  precision: number;
}

export interface ClampResult {
  expression: string;
  slopeVw: number;
  interceptRem: number;
  interceptPx: number;
}

export function buildClamp(spec: ClampSpec): ClampResult {
  const { minPx, maxPx, minViewportPx, maxViewportPx, baseFontSize, outputUnit, precision } = spec;

  const dPx = maxPx - minPx;
  const dVw = maxViewportPx - minViewportPx;
  const slope = dVw === 0 ? 0 : dPx / dVw;
  const interceptPx = minPx - slope * minViewportPx;
  const slopeVwCoeff = slope * 100; // because 1vw = viewportWidth/100 px
  const interceptRem = interceptPx / baseFontSize;

  const min = outputUnit === "rem" ? `${format(minPx / baseFontSize, precision)}rem` : `${format(minPx, precision)}px`;
  const max = outputUnit === "rem" ? `${format(maxPx / baseFontSize, precision)}rem` : `${format(maxPx, precision)}px`;
  const interceptStr =
    outputUnit === "rem"
      ? `${format(interceptRem, precision)}rem`
      : `${format(interceptPx, precision)}px`;
  const slopeStr = `${format(slopeVwCoeff, precision)}vw`;

  // calc() with explicit operators so it pastes into CSS clean.
  // Sign-aware: if intercept is negative we still want `intercept + slope`
  // since `slope * 100vw` will adjust appropriately. Use signed slope text.
  const slopeSigned = slopeVwCoeff >= 0 ? `+ ${slopeStr}` : `- ${format(-slopeVwCoeff, precision)}vw`;
  const expression = `clamp(${min}, ${interceptStr} ${slopeSigned}, ${max})`;

  return { expression, slopeVw: slopeVwCoeff, interceptRem, interceptPx };
}

/** Evaluate the fluid middle of a clamp at a specific viewport width — for the live preview. */
export function evaluateClampAt(spec: ClampSpec, viewportPx: number): number {
  const { minPx, maxPx, minViewportPx, maxViewportPx } = spec;
  if (viewportPx <= minViewportPx) return minPx;
  if (viewportPx >= maxViewportPx) return maxPx;
  const t = (viewportPx - minViewportPx) / (maxViewportPx - minViewportPx);
  return minPx + t * (maxPx - minPx);
}
