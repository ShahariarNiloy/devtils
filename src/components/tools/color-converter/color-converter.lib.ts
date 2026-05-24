import {
  hsbToRgb,
  oklchToRgb,
  parseCmyk,
  parseHex,
  parseHsb,
  parseHsl,
  parseOklch,
  parseRgb,
  parseLab,
  parseLch,
  relativeLuminance,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  rgbToHsb,
  rgbToOklch,
  rgbToLab,
  rgbToLch,
  rgbToString,
  cmykToString,
  hslToString,
  hsbToString,
  oklchToString,
  labToString,
  lchToString,
  contrastRatio,
  type RGB,
} from "./color.lib";
import type {
  Format,
  ShadeEntry,
  WcagResult,
  TailwindMatch,
  NamedMatch,
} from "./color-converter.types";

// ── Named CSS colors ───────────────────────────────────────────────
const NAMED: Record<string, string> = {
  aliceblue:"#f0f8ff",antiquewhite:"#faebd7",aqua:"#00ffff",aquamarine:"#7fffd4",
  azure:"#f0ffff",beige:"#f5f5dc",bisque:"#ffe4c4",black:"#000000",
  blanchedalmond:"#ffebcd",blue:"#0000ff",blueviolet:"#8a2be2",brown:"#a52a2a",
  burlywood:"#deb887",cadetblue:"#5f9ea0",chartreuse:"#7fff00",chocolate:"#d2691e",
  coral:"#ff7f50",cornflowerblue:"#6495ed",cornsilk:"#fff8dc",crimson:"#dc143c",
  cyan:"#00ffff",darkblue:"#00008b",darkcyan:"#008b8b",darkgoldenrod:"#b8860b",
  darkgray:"#a9a9a9",darkgreen:"#006400",darkkhaki:"#bdb76b",darkmagenta:"#8b008b",
  darkolivegreen:"#556b2f",darkorange:"#ff8c00",darkorchid:"#9932cc",darkred:"#8b0000",
  darksalmon:"#e9967a",darkseagreen:"#8fbc8f",darkslateblue:"#483d8b",darkturquoise:"#00ced1",
  darkviolet:"#9400d3",deeppink:"#ff1493",deepskyblue:"#00bfff",dimgray:"#696969",
  dodgerblue:"#1e90ff",firebrick:"#b22222",floralwhite:"#fffaf0",forestgreen:"#228b22",
  fuchsia:"#ff00ff",gainsboro:"#dcdcdc",ghostwhite:"#f8f8ff",gold:"#ffd700",
  goldenrod:"#daa520",gray:"#808080",green:"#008000",greenyellow:"#adff2f",
  grey:"#808080",honeydew:"#f0fff0",hotpink:"#ff69b4",indianred:"#cd5c5c",
  indigo:"#4b0082",ivory:"#fffff0",khaki:"#f0e68c",lavender:"#e6e6fa",
  lavenderblush:"#fff0f5",lawngreen:"#7cfc00",lemonchiffon:"#fffacd",lightblue:"#add8e6",
  lightcoral:"#f08080",lightcyan:"#e0ffff",lightgray:"#d3d3d3",lightgreen:"#90ee90",
  lightpink:"#ffb6c1",lightsalmon:"#ffa07a",lightseagreen:"#20b2aa",lightskyblue:"#87cefa",
  lightsteelblue:"#b0c4de",lightyellow:"#ffffe0",lime:"#00ff00",limegreen:"#32cd32",
  linen:"#faf0e6",magenta:"#ff00ff",maroon:"#800000",mediumaquamarine:"#66cdaa",
  mediumblue:"#0000cd",mediumorchid:"#ba55d3",mediumpurple:"#9370db",mediumseagreen:"#3cb371",
  mediumturquoise:"#48d1cc",mediumvioletred:"#c71585",midnightblue:"#191970",mintcream:"#f5fffa",
  mistyrose:"#ffe4e1",moccasin:"#ffe4b5",navajowhite:"#ffdead",navy:"#000080",
  olive:"#808000",olivedrab:"#6b8e23",orange:"#ffa500",orangered:"#ff4500",
  orchid:"#da70d6",palegoldenrod:"#eee8aa",palegreen:"#98fb98",paleturquoise:"#afeeee",
  palevioletred:"#db7093",papayawhip:"#ffefd5",peachpuff:"#ffdab9",peru:"#cd853f",
  pink:"#ffc0cb",plum:"#dda0dd",powderblue:"#b0e0e6",purple:"#800080",
  rebeccapurple:"#663399",red:"#ff0000",rosybrown:"#bc8f8f",royalblue:"#4169e1",
  saddlebrown:"#8b4513",salmon:"#fa8072",sandybrown:"#f4a460",seagreen:"#2e8b57",
  seashell:"#fff5ee",sienna:"#a0522d",silver:"#c0c0c0",skyblue:"#87ceeb",
  slateblue:"#6a5acd",slategray:"#708090",snow:"#fffafa",springgreen:"#00ff7f",
  steelblue:"#4682b4",tan:"#d2b48c",teal:"#008080",thistle:"#d8bfd8",
  tomato:"#ff6347",turquoise:"#40e0d0",violet:"#ee82ee",wheat:"#f5deb3",
  white:"#ffffff",whitesmoke:"#f5f5f5",yellow:"#ffff00",yellowgreen:"#9acd32",
};

function parseBareRgb(s: string): RGB | null {
  const m = s.match(/^(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d*(?:\.\d+)?))?$/);
  if (!m) return null;
  const [r, g, b] = [m[1], m[2], m[3]].map(Number);
  const a = m[4] !== undefined && m[4] !== "" ? Number(m[4]) : 1;
  if ([r, g, b].some((v) => v < 0 || v > 255)) return null;
  if (a < 0 || a > 1) return null;
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a };
}

export function parseAnyColor(input: string): RGB | null {
  const s = input.trim();
  if (!s) return null;
  const hex = s.startsWith("#") ? s : /^[0-9a-fA-F]{3,8}$/.test(s) ? `#${s}` : null;
  if (hex) { const r = parseHex(hex); if (r) return r; }
  if (/^rgba?/i.test(s)) { const r = parseRgb(s); if (r) return r; }
  if (/^hsla?/i.test(s)) { const r = parseHsl(s); if (r) return r; }
  if (/^hs[bv]a?/i.test(s)) { const r = parseHsb(s); if (r) return r; }
  if (/^oklch/i.test(s)) { const r = parseOklch(s); if (r) return r; }
  if (/^cmyk/i.test(s)) { const r = parseCmyk(s); if (r) return r; }
  if (/^lab/i.test(s))   { const r = parseLab(s);   if (r) return r; }
  if (/^lch/i.test(s))   { const r = parseLch(s);   if (r) return r; }
  const bareRgb = parseBareRgb(s);
  if (bareRgb) return bareRgb;
  const named = NAMED[s.toLowerCase().replace(/\s+/g, "")];
  if (named) return parseHex(named);
  return null;
}

export function formatColor(rgb: RGB, fmt: Format): string {
  switch (fmt) {
    case "hex":   return rgbToHex(rgb);
    case "rgb":   return rgbToString(rgb);
    case "hsl":   return hslToString(rgbToHsl(rgb));
    case "hsb":   return hsbToString(rgbToHsb(rgb));
    case "oklch": return oklchToString(rgbToOklch(rgb));
    case "cmyk":  return cmykToString(rgbToCmyk(rgb));
    case "lab":   return labToString(rgbToLab(rgb));
    case "lch":   return lchToString(rgbToLch(rgb));
    case "named": {
      const m = closestNamedColor(rgb);
      return m.exact ? m.name : `~ ${m.name}`;
    }
  }
}

export function parseFormatInput(val: string, fmt: Format): RGB | null {
  const s = val.trim();
  switch (fmt) {
    case "hex": {
      const h = s.startsWith("#") ? s : /^[0-9a-fA-F]{3,8}$/.test(s) ? `#${s}` : null;
      return h ? parseHex(h) : null;
    }
    case "rgb":   return parseRgb(s) ?? parseBareRgb(s);
    case "hsl":   return parseHsl(s);
    case "hsb":   return parseHsb(s);
    case "oklch": return parseOklch(s);
    case "cmyk":  return parseCmyk(s);
    case "lab":   return parseLab(s);
    case "lch":   return parseLch(s);
    case "named": {
      const key = s.toLowerCase().replace(/[~\s]+/g, "");
      const hex = NAMED[key];
      return hex ? parseHex(hex) : null;
    }
  }
}

// Fixed OKLCH lightness targets per stop — tuned to mirror Tailwind v3's
// perceptual progression so the ramp stays monotonic light→dark no matter
// what base color the user picked. Chroma is scaled from the base
// color's chroma so vivid inputs produce vivid ramps and muted inputs
// produce muted ramps, while the curve (peak vividness around 500–600,
// taper at the extremes) stays consistent.
const RAMP: Array<{ stop: number; l: number; cScale: number }> = [
  { stop:  50, l: 0.97, cScale: 0.08 },
  { stop: 100, l: 0.93, cScale: 0.18 },
  { stop: 200, l: 0.88, cScale: 0.35 },
  { stop: 300, l: 0.80, cScale: 0.55 },
  { stop: 400, l: 0.70, cScale: 0.80 },
  { stop: 500, l: 0.62, cScale: 1.00 },
  { stop: 600, l: 0.54, cScale: 1.00 },
  { stop: 700, l: 0.47, cScale: 0.95 },
  { stop: 800, l: 0.40, cScale: 0.80 },
  { stop: 900, l: 0.32, cScale: 0.60 },
];

export function generateShades(hue: number, sat: number, bri: number): ShadeEntry[] {
  const base = hsbToRgb(hue, sat, bri, 1);
  const { c: C0, h: H0 } = rgbToOklch(base);
  return RAMP.map(({ stop, l, cScale }) => {
    const c = Math.max(0, C0 * cScale);
    const rgb = oklchToRgb({ l, c, h: H0, a: 1 });
    return { stop, rgb, hex: rgbToHex(rgb) };
  });
}

export function getTextOnColor(rgb: RGB): string {
  return relativeLuminance(rgb) > 0.35 ? "#1a1a18" : "#f5f0e5";
}

export function evaluateWcag(fg: RGB, bg: RGB): WcagResult {
  const ratio = contrastRatio(fg, bg);
  return {
    ratio,
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

// ── Full Tailwind v3 palette ───────────────────────────────────────
// [name, r, g, b]
const TW: [string, number, number, number][] = [
  // slate
  ["slate-100",241,245,249],["slate-200",226,232,240],["slate-300",203,213,225],
  ["slate-400",148,163,184],["slate-500",100,116,139],["slate-600",71,85,105],
  ["slate-700",51,65,85],["slate-800",30,41,59],["slate-900",15,23,42],
  // gray
  ["gray-100",243,244,246],["gray-200",229,231,235],["gray-300",209,213,219],
  ["gray-400",156,163,175],["gray-500",107,114,128],["gray-600",75,85,99],
  ["gray-700",55,65,81],["gray-800",31,41,55],["gray-900",17,24,39],
  // zinc
  ["zinc-100",244,244,245],["zinc-200",228,228,231],["zinc-300",212,212,216],
  ["zinc-400",161,161,170],["zinc-500",113,113,122],["zinc-600",82,82,91],
  ["zinc-700",63,63,70],["zinc-800",39,39,42],["zinc-900",24,24,27],
  // stone
  ["stone-100",245,245,244],["stone-200",231,229,228],["stone-300",214,211,209],
  ["stone-400",168,162,158],["stone-500",120,113,108],["stone-600",87,83,78],
  ["stone-700",68,64,60],["stone-800",41,37,36],["stone-900",28,25,23],
  // red
  ["red-100",254,226,226],["red-200",254,202,202],["red-300",252,165,165],
  ["red-400",248,113,113],["red-500",239,68,68],["red-600",220,38,38],
  ["red-700",185,28,28],["red-800",153,27,27],["red-900",127,29,29],
  // orange
  ["orange-100",255,237,213],["orange-200",254,215,170],["orange-300",253,186,116],
  ["orange-400",251,146,60],["orange-500",249,115,22],["orange-600",234,88,12],
  ["orange-700",194,65,12],["orange-800",154,52,18],["orange-900",124,45,18],
  // amber
  ["amber-100",254,243,199],["amber-200",253,230,138],["amber-300",252,211,77],
  ["amber-400",251,191,36],["amber-500",245,158,11],["amber-600",217,119,6],
  ["amber-700",180,83,9],["amber-800",146,64,14],["amber-900",120,53,15],
  // yellow
  ["yellow-100",254,249,195],["yellow-200",254,240,138],["yellow-300",253,224,71],
  ["yellow-400",250,204,21],["yellow-500",234,179,8],["yellow-600",202,138,4],
  ["yellow-700",161,98,7],["yellow-800",133,77,14],["yellow-900",113,63,18],
  // lime
  ["lime-100",236,252,203],["lime-200",217,249,157],["lime-300",190,242,100],
  ["lime-400",163,230,53],["lime-500",132,204,22],["lime-600",101,163,13],
  ["lime-700",77,124,15],["lime-800",63,98,18],["lime-900",54,83,20],
  // green
  ["green-100",220,252,231],["green-200",187,247,208],["green-300",134,239,172],
  ["green-400",74,222,128],["green-500",34,197,94],["green-600",22,163,74],
  ["green-700",21,128,61],["green-800",22,101,52],["green-900",20,83,45],
  // emerald
  ["emerald-100",209,250,229],["emerald-200",167,243,208],["emerald-300",110,231,183],
  ["emerald-400",52,211,153],["emerald-500",16,185,129],["emerald-600",5,150,105],
  ["emerald-700",4,120,87],["emerald-800",6,95,70],["emerald-900",6,78,59],
  // teal
  ["teal-100",204,251,241],["teal-200",153,246,228],["teal-300",94,234,212],
  ["teal-400",45,212,191],["teal-500",20,184,166],["teal-600",13,148,136],
  ["teal-700",15,118,110],["teal-800",17,94,89],["teal-900",19,78,74],
  // cyan
  ["cyan-100",207,250,254],["cyan-200",165,243,252],["cyan-300",103,232,249],
  ["cyan-400",34,211,238],["cyan-500",6,182,212],["cyan-600",8,145,178],
  ["cyan-700",14,116,144],["cyan-800",21,94,117],["cyan-900",22,78,99],
  // sky
  ["sky-100",224,242,254],["sky-200",186,230,253],["sky-300",125,211,252],
  ["sky-400",56,189,248],["sky-500",14,165,233],["sky-600",2,132,199],
  ["sky-700",3,105,161],["sky-800",7,89,133],["sky-900",12,74,110],
  // blue
  ["blue-100",219,234,254],["blue-200",191,219,254],["blue-300",147,197,253],
  ["blue-400",96,165,250],["blue-500",59,130,246],["blue-600",37,99,235],
  ["blue-700",29,78,216],["blue-800",30,64,175],["blue-900",30,58,138],
  // indigo
  ["indigo-100",224,231,255],["indigo-200",199,210,254],["indigo-300",165,180,252],
  ["indigo-400",129,140,248],["indigo-500",99,102,241],["indigo-600",79,70,229],
  ["indigo-700",67,56,202],["indigo-800",55,48,163],["indigo-900",49,46,129],
  // violet
  ["violet-100",237,233,254],["violet-200",221,214,254],["violet-300",196,181,253],
  ["violet-400",167,139,250],["violet-500",139,92,246],["violet-600",124,58,237],
  ["violet-700",109,40,217],["violet-800",91,33,182],["violet-900",76,29,149],
  // purple
  ["purple-100",243,232,255],["purple-200",233,213,255],["purple-300",216,180,254],
  ["purple-400",192,132,252],["purple-500",168,85,247],["purple-600",147,51,234],
  ["purple-700",126,34,206],["purple-800",107,33,168],["purple-900",88,28,135],
  // fuchsia
  ["fuchsia-100",250,232,255],["fuchsia-200",245,208,254],["fuchsia-300",240,171,252],
  ["fuchsia-400",232,121,249],["fuchsia-500",217,70,239],["fuchsia-600",192,38,211],
  ["fuchsia-700",162,28,175],["fuchsia-800",134,25,143],["fuchsia-900",112,26,117],
  // pink
  ["pink-100",252,231,243],["pink-200",251,207,232],["pink-300",249,168,212],
  ["pink-400",244,114,182],["pink-500",236,72,153],["pink-600",219,39,119],
  ["pink-700",190,24,93],["pink-800",157,23,77],["pink-900",131,24,67],
  // rose
  ["rose-100",255,228,230],["rose-200",254,205,211],["rose-300",253,164,175],
  ["rose-400",251,113,133],["rose-500",244,63,94],["rose-600",225,29,72],
  ["rose-700",190,18,60],["rose-800",159,18,57],["rose-900",136,19,55],
  // white / black
  ["white",255,255,255],["black",0,0,0],
];

// ── Closest CSS named color ────────────────────────────────────────
// Heuristic split into spaces — works for common compound names like
// "cornflowerblue" → "Cornflower Blue", "darkkhaki" → "Dark Khaki".
const NAME_PREFIXES = [
  "light", "dark", "medium", "pale", "deep", "hot", "cold",
  "lemon", "navajo", "papaya", "peach", "powder", "lavender",
  "alice", "antique", "blanched", "burly", "cadet", "corn",
  "rebecca", "rosy", "royal", "saddle", "sandy", "sea",
  "sky", "slate", "spring", "steel", "midnight", "forest",
  "floral", "ghost", "golden", "indian", "mint", "misty",
  "old", "olive", "orange", "yellow",
];
const NAME_SUFFIXES = [
  "blue", "green", "red", "yellow", "white", "gray", "grey",
  "black", "pink", "violet", "purple", "orange", "cyan",
  "almond", "wood", "rod", "chiffon", "lace", "smoke",
  "drab", "puff", "stitch", "whip", "wood", "cream",
  "brick", "salmon", "khaki", "drab",
];
function prettyName(name: string): string {
  const lower = name.toLowerCase();
  for (const p of NAME_PREFIXES) {
    if (lower.startsWith(p) && lower.length > p.length) {
      return cap(p) + " " + cap(lower.slice(p.length));
    }
  }
  for (const s of NAME_SUFFIXES) {
    if (lower.endsWith(s) && lower.length > s.length) {
      return cap(lower.slice(0, -s.length)) + " " + cap(s);
    }
  }
  return cap(lower);
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function closestNamedColor(rgb: RGB): NamedMatch {
  let best: { name: string; hex: string; dist: number } | null = null;
  for (const [name, hex] of Object.entries(NAMED)) {
    const p = parseHex(hex);
    if (!p) continue;
    const dr = p.r - rgb.r;
    const dg = p.g - rgb.g;
    const db = p.b - rgb.b;
    // 2.4·R, 4·G, 3·B weights (rough perceptual) — keeps green dominant
    // and matches human sensitivity better than plain Euclidean.
    const dist = Math.sqrt(2.4 * dr * dr + 4 * dg * dg + 3 * db * db);
    if (!best || dist < best.dist) best = { name, hex, dist };
  }
  if (!best) return { name: "black", display: "Black", hex: "#000000", exact: false, distance: Infinity };
  return {
    name: best.name,
    display: prettyName(best.name),
    hex: best.hex,
    exact: best.dist < 0.5,
    distance: best.dist,
  };
}

export function nearestTailwindColor(rgb: RGB): TailwindMatch {
  let best = { name: TW[0][0] as string, dist: Infinity, r: TW[0][1] as number, g: TW[0][2] as number, b: TW[0][3] as number };
  for (const [name, r, g, b] of TW) {
    const dr = (r as number) - rgb.r;
    const dg = (g as number) - rgb.g;
    const db = (b as number) - rgb.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < best.dist) best = { name: name as string, dist, r: r as number, g: g as number, b: b as number };
  }
  return { name: best.name, swatch: { r: best.r, g: best.g, b: best.b, a: 1 } };
}
