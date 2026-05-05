/**
 * Color-space conversions, parsing, and WCAG helpers — every value flows
 * through `RGB` (sRGB 0..255 + alpha) as the canonical representation.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export function rgbToHex({ r, g, b, a }: RGB): string {
  const hex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  const base = `#${hex(r)}${hex(g)}${hex(b)}`;
  if (a >= 1) return base;
  return `${base}${hex(a * 255)}`;
}

export function parseHex(input: string): RGB | null {
  const trimmed = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]+$/.test(trimmed)) return null;
  const expanded =
    trimmed.length === 3 || trimmed.length === 4
      ? trimmed.split("").map((c) => c + c).join("")
      : trimmed;
  if (![6, 8].includes(expanded.length)) return null;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  const a = expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

export function rgbToString({ r, g, b, a }: RGB): string {
  if (a >= 1) return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`;
}

export function parseRgb(input: string): RGB | null {
  const m = input.match(/rgba?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const [r, g, b, alpha] = parts;
  const rN = Number(r), gN = Number(g), bN = Number(b);
  if ([rN, gN, bN].some(Number.isNaN)) return null;
  let a = 1;
  if (alpha !== undefined) {
    a = alpha.endsWith("%") ? Number(alpha.slice(0, -1)) / 100 : Number(alpha);
    if (Number.isNaN(a)) a = 1;
  }
  return { r: clamp(rN, 0, 255), g: clamp(gN, 0, 255), b: clamp(bN, 0, 255), a: clamp(a, 0, 1) };
}

interface HSL {
  h: number;
  s: number;
  l: number;
  a: number;
}

export function rgbToHsl({ r, g, b, a }: RGB): HSL {
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  let h = 0;
  let s: number;
  const l = (max + min) / 2;
  if (max === min) {
    h = 0;
    s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rN:
        h = (gN - bN) / d + (gN < bN ? 6 : 0);
        break;
      case gN:
        h = (bN - rN) / d + 2;
        break;
      default:
        h = (rN - gN) / d + 4;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100, a };
}

const hueToRgb = (p: number, q: number, t: number) => {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
};

export function hslToRgb({ h, s, l, a }: HSL): RGB {
  const sN = s / 100, lN = l / 100;
  if (sN === 0) {
    const v = lN * 255;
    return { r: v, g: v, b: v, a };
  }
  const q = lN < 0.5 ? lN * (1 + sN) : lN + sN - lN * sN;
  const p = 2 * lN - q;
  const hN = (((h % 360) + 360) % 360) / 360;
  return {
    r: hueToRgb(p, q, hN + 1 / 3) * 255,
    g: hueToRgb(p, q, hN) * 255,
    b: hueToRgb(p, q, hN - 1 / 3) * 255,
    a,
  };
}

export function hslToString({ h, s, l, a }: HSL): string {
  const fmt = (n: number) => Math.round(n * 10) / 10;
  if (a >= 1) return `hsl(${fmt(h)} ${fmt(s)}% ${fmt(l)}%)`;
  return `hsla(${fmt(h)} ${fmt(s)}% ${fmt(l)}% / ${a.toFixed(2)})`;
}

export function parseHsl(input: string): RGB | null {
  const m = input.match(/hsla?\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const h = Number(parts[0]);
  const s = Number(parts[1].replace("%", ""));
  const l = Number(parts[2].replace("%", ""));
  if ([h, s, l].some(Number.isNaN)) return null;
  let a = 1;
  if (parts[3]) {
    a = parts[3].endsWith("%") ? Number(parts[3].slice(0, -1)) / 100 : Number(parts[3]);
    if (Number.isNaN(a)) a = 1;
  }
  return hslToRgb({ h, s, l, a: clamp(a, 0, 1) });
}

interface HSB {
  h: number;
  s: number;
  b: number;
  a: number;
}

export function rgbToHsb({ r, g, b, a }: RGB): HSB {
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rN) h = ((gN - bN) / d) % 6;
    else if (max === gN) h = (bN - rN) / d + 2;
    else h = (rN - gN) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  return { h, s, b: max * 100, a };
}

export function hsbToString({ h, s, b, a }: HSB): string {
  const fmt = (n: number) => Math.round(n * 10) / 10;
  if (a >= 1) return `hsb(${fmt(h)} ${fmt(s)}% ${fmt(b)}%)`;
  return `hsba(${fmt(h)} ${fmt(s)}% ${fmt(b)}% / ${a.toFixed(2)})`;
}

export function parseHsb(input: string): RGB | null {
  const m = input.match(/hsba?\(([^)]+)\)/i) || input.match(/hsv\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const h = Number(parts[0]);
  const s = Number(parts[1].replace("%", "")) / 100;
  const v = Number(parts[2].replace("%", "")) / 100;
  if ([h, s, v].some(Number.isNaN)) return null;
  // HSB → RGB
  const c = v * s;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let rN = 0, gN = 0, bN = 0;
  if (hh < 1) [rN, gN, bN] = [c, x, 0];
  else if (hh < 2) [rN, gN, bN] = [x, c, 0];
  else if (hh < 3) [rN, gN, bN] = [0, c, x];
  else if (hh < 4) [rN, gN, bN] = [0, x, c];
  else if (hh < 5) [rN, gN, bN] = [x, 0, c];
  else [rN, gN, bN] = [c, 0, x];
  const offset = v - c;
  return {
    r: (rN + offset) * 255,
    g: (gN + offset) * 255,
    b: (bN + offset) * 255,
    a: 1,
  };
}

// OKLCH (via OKLab) — formulas from https://bottosson.github.io/posts/oklab/
interface Oklch {
  l: number;
  c: number;
  h: number;
  a: number;
}

const linearize = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const delinearize = (c: number) => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return v * 255;
};

export function rgbToOklch({ r, g, b, a }: RGB): Oklch {
  const lr = linearize(r), lg = linearize(g), lb = linearize(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: H, a };
}

export function oklchToString({ l, c, h, a }: Oklch): string {
  const fmt = (n: number, d = 3) => Number(n.toFixed(d));
  const head = `${fmt(l)} ${fmt(c)} ${fmt(h, 1)}`;
  return a >= 1 ? `oklch(${head})` : `oklch(${head} / ${a.toFixed(2)})`;
}

export function oklchToRgb({ l: L, c: C, h: H, a }: Oklch): RGB {
  const hr = (H * Math.PI) / 180;
  const A = Math.cos(hr) * C;
  const B = Math.sin(hr) * C;
  const l = L + 0.3963377774 * A + 0.2158037573 * B;
  const m = L - 0.1055613458 * A - 0.0638541728 * B;
  const s = L - 0.0894841775 * A - 1.291485548 * B;
  const lr = l * l * l, lg = m * m * m, lb = s * s * s;
  const rL = 4.0767416621 * lr - 3.3077115913 * lg + 0.2309699292 * lb;
  const gL = -1.2684380046 * lr + 2.6097574011 * lg - 0.3413193965 * lb;
  const bL = -0.0041960863 * lr - 0.7034186147 * lg + 1.707614701 * lb;
  return {
    r: clamp(delinearize(rL), 0, 255),
    g: clamp(delinearize(gL), 0, 255),
    b: clamp(delinearize(bL), 0, 255),
    a,
  };
}

export function parseOklch(input: string): RGB | null {
  const m = input.match(/oklch\(([^)]+)\)/i);
  if (!m) return null;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const l = Number(parts[0].replace("%", "")) * (parts[0].includes("%") ? 0.01 : 1);
  const c = Number(parts[1]);
  const h = Number(parts[2]);
  if ([l, c, h].some(Number.isNaN)) return null;
  let a = 1;
  if (parts[3]) {
    a = parts[3].endsWith("%") ? Number(parts[3].slice(0, -1)) / 100 : Number(parts[3]);
    if (Number.isNaN(a)) a = 1;
  }
  return oklchToRgb({ l, c, h, a: clamp(a, 0, 1) });
}

// WCAG contrast
const luminanceChannel = (n: number) => {
  const v = n / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

export function relativeLuminance({ r, g, b }: RGB): number {
  return 0.2126 * luminanceChannel(r) + 0.7152 * luminanceChannel(g) + 0.0722 * luminanceChannel(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// Smallest possible Tailwind v3 default palette — just enough to find the
// nearest swatch. Light/dark stops chosen by perceptual spread.
export const TW_PALETTE: Array<{ name: string; rgb: RGB }> = [
  { name: "slate-900", rgb: { r: 15, g: 23, b: 42, a: 1 } },
  { name: "slate-700", rgb: { r: 51, g: 65, b: 85, a: 1 } },
  { name: "slate-500", rgb: { r: 100, g: 116, b: 139, a: 1 } },
  { name: "slate-300", rgb: { r: 203, g: 213, b: 225, a: 1 } },
  { name: "slate-100", rgb: { r: 241, g: 245, b: 249, a: 1 } },
  { name: "red-500", rgb: { r: 239, g: 68, b: 68, a: 1 } },
  { name: "orange-500", rgb: { r: 249, g: 115, b: 22, a: 1 } },
  { name: "amber-500", rgb: { r: 245, g: 158, b: 11, a: 1 } },
  { name: "yellow-400", rgb: { r: 250, g: 204, b: 21, a: 1 } },
  { name: "lime-500", rgb: { r: 132, g: 204, b: 22, a: 1 } },
  { name: "green-500", rgb: { r: 34, g: 197, b: 94, a: 1 } },
  { name: "emerald-500", rgb: { r: 16, g: 185, b: 129, a: 1 } },
  { name: "teal-500", rgb: { r: 20, g: 184, b: 166, a: 1 } },
  { name: "cyan-500", rgb: { r: 6, g: 182, b: 212, a: 1 } },
  { name: "sky-500", rgb: { r: 14, g: 165, b: 233, a: 1 } },
  { name: "blue-500", rgb: { r: 59, g: 130, b: 246, a: 1 } },
  { name: "indigo-500", rgb: { r: 99, g: 102, b: 241, a: 1 } },
  { name: "violet-500", rgb: { r: 139, g: 92, b: 246, a: 1 } },
  { name: "purple-500", rgb: { r: 168, g: 85, b: 247, a: 1 } },
  { name: "fuchsia-500", rgb: { r: 217, g: 70, b: 239, a: 1 } },
  { name: "pink-500", rgb: { r: 236, g: 72, b: 153, a: 1 } },
  { name: "rose-500", rgb: { r: 244, g: 63, b: 94, a: 1 } },
];

export function nearestTailwind(rgb: RGB): { name: string; distance: number } {
  let best = { name: TW_PALETTE[0].name, distance: Infinity };
  for (const swatch of TW_PALETTE) {
    const dr = swatch.rgb.r - rgb.r;
    const dg = swatch.rgb.g - rgb.g;
    const db = swatch.rgb.b - rgb.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    if (distance < best.distance) best = { name: swatch.name, distance };
  }
  return best;
}
