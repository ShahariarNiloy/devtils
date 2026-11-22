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

export interface QuantizeOptions {
  /** 1–100, like pngquant's --quality: higher = more faithful, may use more colours. */
  quality: number;
  /** Palette budget including the transparent entry (2–256, default 256). */
  maxColors?: number;
  noDither?: boolean;
}

export interface QuantizeResult {
  imageData: ImageData;
  paletteSize: number;
  meanDeltaE: number;
  durationMs: number;
}

/** Palette + per-pixel indices, ready to write as an indexed PNG. */
export interface IndexedQuantizeResult {
  width: number;
  height: number;
  /** RGBA, 4 bytes per entry. */
  palette: Uint8Array;
  paletteSize: number;
  /** One palette index per pixel, row-major. */
  indices: Uint8Array;
  durationMs: number;
}
