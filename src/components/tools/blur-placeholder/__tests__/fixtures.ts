/**
 * Deterministic test images for the blur-placeholder tests: a photo-like
 * gradient with texture, a transparent logo-like shape, a 1×1 pixel, and
 * extreme aspect ratios.
 */

export interface Fixture {
  name: string;
  w: number;
  h: number;
  px: Uint8ClampedArray;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function photo(w: number, h: number, seed: number): Uint8ClampedArray {
  const r = rng(seed);
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const sky = y / h;
      px[i] = 40 + 180 * (1 - sky) + 40 * Math.sin(x / 7) + r() * 30;
      px[i + 1] = 30 + 90 * sky + 50 * Math.cos((x + y) / 11) + r() * 30;
      px[i + 2] = 80 + 120 * sky * (x / w) + r() * 30;
      px[i + 3] = 255;
    }
  return px;
}

function logo(w: number, h: number): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const d = Math.hypot(x - w / 2, y - h / 2) / (Math.min(w, h) / 2);
      px[i] = x < w / 2 ? 224 : 246;
      px[i + 1] = x < w / 2 ? 160 : 242;
      px[i + 2] = x < w / 2 ? 114 : 234;
      px[i + 3] = d < 0.6 ? 255 : Math.max(0, Math.round(255 * (0.8 - d) * 5));
    }
  return px;
}

export const FIXTURES: Fixture[] = [
  { name: "photo 100×62", w: 100, h: 62, px: photo(100, 62, 1) },
  { name: "photo portrait 75×100", w: 75, h: 100, px: photo(75, 100, 2) },
  { name: "transparent logo 100×100", w: 100, h: 100, px: logo(100, 100) },
  { name: "transparent wide 100×40", w: 100, h: 40, px: logo(100, 40) },
  { name: "1×1", w: 1, h: 1, px: new Uint8ClampedArray([200, 90, 30, 255]) },
  { name: "1×1 transparent", w: 1, h: 1, px: new Uint8ClampedArray([200, 90, 30, 128]) },
  { name: "extreme 100×3", w: 100, h: 3, px: photo(100, 3, 3) },
  { name: "extreme 2×100", w: 2, h: 100, px: photo(2, 100, 4) },
  { name: "fully transparent 10×10", w: 10, h: 10, px: new Uint8ClampedArray(400) },
];
