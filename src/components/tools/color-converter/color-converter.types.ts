import type { RGB } from "./color.lib";
export type { RGB };

export type Format = "hex" | "rgb" | "hsl" | "hsb" | "oklch" | "cmyk";

export const FORMATS: Format[] = ["hex", "rgb", "hsl", "hsb", "oklch", "cmyk"];

export const FORMAT_LABEL: Record<Format, string> = {
  hex: "HEX",
  rgb: "RGB",
  hsl: "HSL",
  hsb: "HSB",
  oklch: "OKLCH",
  cmyk: "CMYK",
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
