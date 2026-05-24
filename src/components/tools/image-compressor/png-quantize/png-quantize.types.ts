export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export interface OKLab {
  L: number;
  a: number;
  b: number;
}

export interface WeightedColor {
  rgba: RGBA;
  linearRgb: { r: number; g: number; b: number }; // linear-light, used for centroid math
  oklab: OKLab;
  weight: number;
  count: number;
}

export interface PaletteEntry {
  rgba: RGBA;
  oklab: OKLab;
}

export interface QuantizeOptions {
  quality: number;       // 1–100
  maxColors?: number;
  noDither?: boolean;
}

export interface QuantizeResult {
  imageData: ImageData;
  paletteSize: number;
  meanDeltaE: number;
  durationMs: number;
}
