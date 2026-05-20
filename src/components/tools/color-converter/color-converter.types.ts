import type { RGB } from "./color.lib";
export type { RGB };

export type Format =
  | "hex"
  | "rgb"
  | "hsl"
  | "hsb"
  | "oklch"
  | "cmyk"
  | "lab"
  | "lch"
  | "named";

export const FORMATS: Format[] = [
  "hex",
  "rgb",
  "hsl",
  "hsb",
  "oklch",
  "cmyk",
  "lab",
  "lch",
  "named",
];

export const FORMAT_LABEL: Record<Format, string> = {
  hex: "HEX",
  rgb: "RGB",
  hsl: "HSL",
  hsb: "HSB",
  oklch: "OKLCH",
  cmyk: "CMYK",
  lab: "LAB",
  lch: "LCH",
  named: "NAMED",
};

export interface HistoryEntry {
  hex: string;
  ts: number;
}

export interface ShadeEntry {
  stop: number;
  rgb: RGB;
  hex: string;
}

export interface WcagResult {
  ratio: number;
  aa: boolean;
  aaLarge: boolean;
  aaa: boolean;
  aaaLarge: boolean;
}

export interface TailwindMatch {
  name: string;
  swatch: RGB;
}

export interface NamedMatch {
  name: string;     // raw CSS name e.g. "cornflowerblue"
  display: string;  // pretty form e.g. "Cornflower Blue"
  hex: string;      // canonical hex of the named color
  exact: boolean;   // true if rgb matches the named color exactly
  distance: number; // perceptual-ish distance
}
